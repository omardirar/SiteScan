import { launchBrowser } from './engine/browser.js';
import { CookiePopupsCollector } from './consent/CookiePopupsCollector.js';
import type { CookiePopupsCollectorOptions } from './consent/types.js';
import type { CrawlOutput, CrawlRequestRecord } from '../../schema/types.js';

const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 45000);
const POST_CONSENT_WAIT_MS = Number(process.env.POST_CONSENT_WAIT_MS || 10000);

export async function crawlOne(
  targetUrl: string,
  mode: 'optIn' | 'optOut',
  autoconsentAction: 'optIn' | 'optOut' | null = null,
): Promise<CrawlOutput> {
  const startedAt = new Date().toISOString();
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) auditor-service/0.1',
  );
  // TODO: Make UA configurable via env/route param and consider mobile UA option
  const requests: CrawlRequestRecord[] = [];

  page.on('response', async (resp: any) => {
    try {
      const req = resp.request();
      const url = req.url();
      const headers = resp.headers();
      const timing = (req as any).timing ? (req as any).timing() : null;
      const requestRecord = {
        url,
        method: req.method(),
        resourceType: (req as any).resourceType
          ? (req as any).resourceType()
          : undefined,
        status: resp.status(),
        headers: Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(', ') : String(v),
          ]),
        ),
        timestamp: timing?.requestTime ? timing.requestTime * 1000 : Date.now(),
      };
      requests.push(requestRecord);
      console.log(`Captured request: ${url} - status: ${resp.status()}`);
    } catch (err) {
      console.error('Error capturing request:', err);
    }
  });
  // TODO: Capture request bodies for POSTs where size is reasonable (privacy guard)

  const cookieBanner: any = {
    detected: false,
    provider: null,
    action: null,
    error: null,
  };
  let finalUrl: string | null = null;
  let cookiePopups: any | undefined = undefined;
  let actionTimestamp: number | undefined;
  let errorInfo: {
    code: 'timeout' | 'navigation' | 'autoconsent' | 'unknown';
    message: string;
  } | null = null;
  let finishedAt: string = startedAt;

  try {
    // Only use CMP collector if an action is requested
    let cookieCollector: CookiePopupsCollector | undefined;

    if (autoconsentAction) {
      console.log(
        `Starting CMP collector for ${mode} with action: ${autoconsentAction}`,
      );
      const collectorOptions: CookiePopupsCollectorOptions = {
        autoconsentAction,
        scrapeTimeoutMs: Number(
          process.env.AUTOCONSENT_SCRAPE_TIMEOUT_MS || 20000,
        ),
        actionTimeoutMs: Number(
          process.env.AUTOCONSENT_ACTION_TIMEOUT_MS || 30000,
        ),
        detectTimeoutMs: Number(
          process.env.AUTOCONSENT_DETECT_TIMEOUT_MS || 8000,
        ),
        foundTimeoutMs: Number(
          process.env.AUTOCONSENT_FOUND_TIMEOUT_MS || 8000,
        ),
        totalBudgetMs: Number(process.env.AUTOCONSENT_TOTAL_BUDGET_MS || 35000),
        collectorExtraTimeMs: Number(
          process.env.COLLECTOR_EXTRA_TIME_MS || 5000,
        ),
        shortTimeouts: false,
      };
      cookieCollector = new CookiePopupsCollector(collectorOptions);
      // Start collector as early as possible
      await cookieCollector.start(page);
      console.log(`CMP collector started for ${mode}`);
    }

    await page.goto(targetUrl, {
      waitUntil: ['domcontentloaded', 'networkidle2'],
      timeout: NAV_TIMEOUT_MS,
    });
    finalUrl = page.url();

    // Only wait for collector if it was started
    if (cookieCollector && autoconsentAction) {
      const collectorOptions: CookiePopupsCollectorOptions = {
        autoconsentAction,
        scrapeTimeoutMs: Number(
          process.env.AUTOCONSENT_SCRAPE_TIMEOUT_MS || 20000,
        ),
        actionTimeoutMs: Number(
          process.env.AUTOCONSENT_ACTION_TIMEOUT_MS || 30000,
        ),
        detectTimeoutMs: Number(
          process.env.AUTOCONSENT_DETECT_TIMEOUT_MS || 8000,
        ),
        foundTimeoutMs: Number(
          process.env.AUTOCONSENT_FOUND_TIMEOUT_MS || 8000,
        ),
        totalBudgetMs: Number(process.env.AUTOCONSENT_TOTAL_BUDGET_MS || 35000),
        collectorExtraTimeMs: Number(
          process.env.COLLECTOR_EXTRA_TIME_MS || 5000,
        ),
        shortTimeouts: false,
      };
      const collectorResultPromise = cookieCollector.awaitResult();
      await new Promise((r) => setTimeout(r, POST_CONSENT_WAIT_MS));
      const collectorResult = await Promise.race([
        collectorResultPromise,
        new Promise<null>((resolve) =>
          setTimeout(
            () => resolve(null),
            collectorOptions.totalBudgetMs +
              collectorOptions.collectorExtraTimeMs,
          ),
        ),
      ]);
      cookiePopups = collectorResult === null ? undefined : collectorResult;
      actionTimestamp = cookiePopups?.timing?.actionTimestamp;
      console.log(
        `CMP collector result for ${mode}:`,
        JSON.stringify({
          cmps: cookiePopups?.cmps?.length || 0,
          timing: cookiePopups?.timing,
          errors: cookiePopups?.errors,
        }),
      );
    } else {
      // No CMP action, just wait a bit for page to settle
      await new Promise((r) => setTimeout(r, 3000));
    }
  } catch (e: any) {
    const message = e?.message || String(e);
    const code: any = /Navigation Timeout|timeout/i.test(message)
      ? 'timeout'
      : /net::ERR|navigation|goto/i.test(message)
        ? 'navigation'
        : 'unknown';
    errorInfo = { code, message };
  } finally {
    finishedAt = new Date().toISOString();
    await browser.close();
  }

  console.log(
    `Crawl complete for ${mode}: ${requests.length} requests captured`,
  );
  // TODO: Persist raw crawl artifacts behind a debug flag for offline inspection

  return {
    version: '1.0.0',
    url: targetUrl,
    finalUrl,
    mode,
    cookieBanner,
    cookiePopups,
    requests,
    meta: {
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      userAgent: 'auditor-service/0.1',
    },
    error: errorInfo,
    actionTimestamp,
  } as any;
}
