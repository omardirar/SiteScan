import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/crawl/crawlOne.js';
import { scanUrl } from '../../src/core/scan.js';

describe('scanUrl (mocked crawl)', () => {
  it('returns standardized array with cmp/trackers/leaks', async () => {
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
    expect(out).toHaveProperty('events');
    expect(out).toHaveProperty('trackers');
  });
});


