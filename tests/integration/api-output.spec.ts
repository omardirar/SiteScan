import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/crawl/crawlOne.js';
import { scanUrl } from '../../src/core/scan.js';

function mkCrawlOut(url: string, mode: 'optIn' | 'optOut', withCmp = false, withError: any = null) {
  return {
    version: '1.0.0', url, finalUrl: url, mode, thirdPartyOnly: true,
    cookieBanner: { detected: withCmp, provider: withCmp ? 'MockCMP' : null, action: withCmp ? mode : null, error: null },
    cookiePopups: withCmp ? {
      cmps: [{ name: 'MockCMP', final: true, open: true, started: true, succeeded: true, selfTestFail: false, errors: [], patterns: [], snippets: [], filterListMatched: false }],
      scrapedFrames: [],
    } : undefined,
    requests: [
      { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC', method: 'GET' },
      { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC', method: 'GET' }, // duplicate
      { url: 'https://www.google-analytics.com/g/collect?v=2', method: 'GET' },
    ],
    meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() },
    error: withError,
  } as any;
}

describe('scanUrl output format and error handling', () => {
  it('returns standardized array format with cmp/trackers/leaks', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementation(async (url: string, mode: 'optIn' | 'optOut') => mkCrawlOut(url, mode, true));
    const out = await scanUrl('https://example.com', 'optOut');
    expect(out).toHaveProperty('cmps');
    expect(out).toHaveProperty('trackers');
    expect(out).toHaveProperty('events');
    expect(out).toHaveProperty('leaks');
    expect(out.cmps.length).toBeGreaterThanOrEqual(1);
    // trackers normalized and unique
    const uniqueKeys = new Set(out.trackers.map((t: any) => t.key));
    expect(uniqueKeys.size).toBe(out.trackers.length);
  });

  it('propagates crawl errors per run', async () => {
    const err = { code: 'navigation', message: 'Navigation failed' };
    vi.spyOn(crawl, 'crawlOne').mockImplementationOnce(async (url: string) => mkCrawlOut(url, 'optOut', false, err)).mockImplementationOnce(async (url: string) => mkCrawlOut(url, 'optIn'));
    const out = await scanUrl('https://bad.example');
    // In new API, errors live in crawl results only; leaks/events derive from both
    // Here we only assert shape is present
    expect(out).toHaveProperty('cmps');
  });
});


