import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/analysis/crawl/crawlOne.js';
import { runScan } from '../../src/analysis/scan.js';

describe('deduplication and leak semantics', () => {
  it('merges same provider/url across stages and flags leaks on afterOptOut', async () => {
    const now = Date.now();
    const preTs = now - 2000;
    const actionTs = now - 1000;

    // Same canonical URL for GTM appears preConsent and afterOptIn
    const gtmUrlA = 'https://www.googletagmanager.com/gtm.js?id=GTM-XYZ&a=1&b=2';
    const gtmUrlB = 'https://www.googletagmanager.com/gtm.js?b=2&id=GTM-XYZ&a=1'; // different order
    // Leak: LinkedIn after opt-out only
    const liUrl = 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif';

    vi.spyOn(crawl, 'crawlOne')
      // optOut crawl
      .mockImplementationOnce(async (url: string) => ({
        version: '1.0.0',
        url,
        finalUrl: url,
        mode: 'optOut',
        cookieBanner: {} as any,
        cookiePopups: { cmps: [{ name: 'MockCMP' }], timing: { actionTimestamp: actionTs } },
        // PreConsent GTM, AfterOptOut LinkedIn
        requests: [
          { url: gtmUrlA, method: 'GET', timestamp: preTs, status: 200, resourceType: 'script' },
          { url: liUrl, method: 'GET', timestamp: now - 500, status: 200, resourceType: 'image' },
        ],
        meta: { startedAt: new Date(preTs - 1000).toISOString(), finishedAt: new Date().toISOString(), userAgent: 'test-agent' },
        actionTimestamp: actionTs,
      } as any))
      // optIn crawl
      .mockImplementationOnce(async (url: string) => ({
        version: '1.0.0',
        url,
        finalUrl: url,
        mode: 'optIn',
        cookieBanner: {} as any,
        cookiePopups: { cmps: [{ name: 'MockCMP' }], timing: { actionTimestamp: actionTs } },
        // AfterOptIn GTM with reordered query string
        requests: [
          { url: gtmUrlB, method: 'GET', timestamp: now - 100, status: 200, resourceType: 'script' },
        ],
        meta: { startedAt: new Date(preTs - 1000).toISOString(), finishedAt: new Date().toISOString(), userAgent: 'test-agent' },
        actionTimestamp: actionTs,
      } as any));

    const out = await runScan('https://example.com');

    // Events should be deduped to 2: GTM (seen pre + opt-in) and LinkedIn (opt-out leak)
    expect(out.events.length).toBe(2);

    const gtm = out.events.find((e) => e.provider.key === 'GOOGLETAGMAN');
    expect(gtm).toBeTruthy();
    expect(gtm?.stages.preConsent).toBe(true);
    expect(gtm?.stages.afterOptIn).toBe(true);
    expect(gtm?.stages.afterOptOut).toBe(false);
    expect(gtm?.leak).toBe(false);

    const li = out.events.find((e) => e.provider.key === 'LINKEDINPIXEL');
    expect(li).toBeTruthy();
    expect(li?.stages.afterOptOut).toBe(true);
    expect(li?.leak).toBe(true);

    // leaks array should include LinkedIn only
    expect(out.leaks.length).toBe(1);
    expect(out.leaks[0].provider.key).toBe('LINKEDINPIXEL');

    // trackers deduped by provider key
    const keys = out.trackers.map((t) => t.key).sort();
    expect(keys).toEqual(['GOOGLETAGMAN', 'LINKEDINPIXEL']);

    // Checklist vendor counting reflects stages
    const trackersSummary = out.checklist.stages.trackers.summary;
    const gtmSum = trackersSummary.find((s) => s.key === 'GOOGLETAGMAN');
    const liSum = trackersSummary.find((s) => s.key === 'LINKEDINPIXEL');
    expect(gtmSum?.preConsent).toBeGreaterThanOrEqual(1);
    expect(gtmSum?.afterOptIn).toBeGreaterThanOrEqual(1);
    expect(gtmSum?.afterOptOut).toBe(0);
    expect(liSum?.afterOptOut).toBeGreaterThanOrEqual(1);
  });
});


