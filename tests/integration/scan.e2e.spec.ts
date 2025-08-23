import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/crawl/crawlOne.js';
import { scanUrl } from '../../src/core/scan.js';

describe('scanUrl (mocked crawl)', () => {
  it('returns ScanResult shape', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementation(async (url: string, mode: 'optIn' | 'optOut') => ({
      version: '1.0.0', url, finalUrl: url, mode, thirdPartyOnly: true,
      cookieBanner: { detected: true, provider: 'MockCMP', action: mode, error: null },
      requests: mode === 'optOut' ? [
        { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC', method: 'GET' },
      ] : [
        { url: 'https://www.google-analytics.com/g/collect?v=2', method: 'GET' },
      ],
      meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() },
    } as any));

    const out = await scanUrl('https://example.com');
    expect(out.url).toBe('https://example.com');
    expect(out.cookieBanner.detected).toBe(true);
    expect(out.eventsOptOut.length).toBeGreaterThanOrEqual(1);
    expect(out.eventsOptIn.length).toBeGreaterThanOrEqual(1);
    expect(out.trackers['GTM']).toBe(true);
    expect(out.trackers['GA4']).toBe(true);
    expect(out.dataLeak).toHaveProperty('leakDetected');
  });
});


