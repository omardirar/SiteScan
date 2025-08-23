import { launchBrowser } from './engine/browser.js';
import { autoConsent } from './autoconsent/index.js';
import { CookiePopupsCollector } from './collectors/CookiePopupsCollector.js';
import type { CookiePopupsCollectorOptions } from './collectors/types.js';
import { isThirdParty } from './thirdparty.js';
import type { CrawlOutput, CookieBanner, CrawlRequestRecord } from '../core/model/types.js';

const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 45000);
const POST_CONSENT_WAIT_MS = Number(process.env.POST_CONSENT_WAIT_MS || 10000);

export async function crawlOne(targetUrl: string, mode: 'optIn' | 'optOut', autoconsentAction: 'optIn' | 'optOut' | null = null): Promise<CrawlOutput> {
  const startedAt = new Date().toISOString();
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) auditor-service/0.1');
  const requests: CrawlRequestRecord[] = [];

  const firstParty = targetUrl;
  page.on('response', async (resp) => {
    try {
      const req = resp.request();
      const url = req.url();
      if (!isThirdParty(url, firstParty)) return;
      const headers = resp.headers();
      requests.push({
        url,
        method: req.method(),
        resourceType: (req as any).resourceType ? (req as any).resourceType() : undefined,
        status: resp.status(),
        headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])),
      });
    } catch {
      // ignore
    }
  });

  let cookieBanner: CookieBanner = { detected: false, provider: null, action: null, error: null };
  let finalUrl: string | null = null;
  let cookiePopups: any | undefined = undefined;

  try {
    const collectorOptions: CookiePopupsCollectorOptions = {
      autoconsentAction,
      scrapeTimeoutMs: Number(process.env.AUTOCONSENT_SCRAPE_TIMEOUT_MS || 12000),
      actionTimeoutMs: Number(process.env.AUTOCONSENT_ACTION_TIMEOUT_MS || 10000),
      detectTimeoutMs: Number(process.env.AUTOCONSENT_DETECT_TIMEOUT_MS || 5000),
      foundTimeoutMs: Number(process.env.AUTOCONSENT_FOUND_TIMEOUT_MS || 5000),
      totalBudgetMs: Number(process.env.AUTOCONSENT_TOTAL_BUDGET_MS || 20000),
      collectorExtraTimeMs: Number(process.env.COLLECTOR_EXTRA_TIME_MS || 4000),
      shortTimeouts: false,
    };
    const cookieCollector = new CookiePopupsCollector(collectorOptions);
    await page.goto(targetUrl, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: NAV_TIMEOUT_MS });
    finalUrl = page.url();
    await cookieCollector.start(page);
    cookieBanner = await autoConsent(page, mode);
    const collectorResultPromise = cookieCollector.awaitResult();
    await new Promise((r) => setTimeout(r, POST_CONSENT_WAIT_MS));
    const collectorResult = await Promise.race([
      collectorResultPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), collectorOptions.totalBudgetMs + collectorOptions.collectorExtraTimeMs)),
    ]);
    cookiePopups = collectorResult === null ? undefined : collectorResult;
  } finally {
    const finishedAt = new Date().toISOString();
    await browser.close();
    return {
      version: '1.0.0',
      url: targetUrl,
      finalUrl,
      mode,
      thirdPartyOnly: true,
      cookieBanner,
      cookiePopups,
      requests,
      meta: {
        startedAt,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
        userAgent: 'auditor-service/0.1',
      },
    };
  }
}


