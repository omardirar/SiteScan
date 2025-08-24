import { describe, it, expect, vi } from 'vitest';
import * as crawl from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/crawl/crawlOne.js';
import { runScan } from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/scan.js';
import { ApiResponseV1Schema } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/validator.js';

describe('runScan (mocked crawl)', () => {
  it('returns a valid ApiResponseV1 with events and trackers', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementation(async (url: string, mode: 'optIn' | 'optOut') => ({
      version: '1.0.0', url, finalUrl: url, mode, thirdPartyOnly: true,
      cookieBanner: { detected: true, provider: 'MockCMP', action: mode, error: null } as any,
      requests: mode === 'optOut'
        ? [{ url: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC', method: 'GET', timestamp: Date.now(), status: 200 }]
        : [{ url: 'https://www.google-analytics.com/g/collect?v=2', method: 'GET', timestamp: Date.now(), status: 200 }],
      meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), userAgent: 'test-agent' },
    } as any));

    const out = await runScan('https://example.com');
    const validation = ApiResponseV1Schema.safeParse(out);
    expect(validation.success, validation.success ? '' : JSON.stringify(validation.error.flatten(), null, 2)).toBe(true);
    expect(out.events.length).toBeGreaterThan(0);
    expect(out.trackers.length).toBeGreaterThan(0);
  });
});


