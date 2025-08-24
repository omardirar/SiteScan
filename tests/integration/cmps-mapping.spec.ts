import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/analysis/crawl/crawlOne.js';
import { runScan } from '../../src/analysis/scan.js';

describe('CMP mapping', () => {
  it('generates ruleKey and merges CMPs from both crawls without duplicates', async () => {
    const mk = (url: string, mode: 'optIn' | 'optOut') => ({
      version: '1.0.0',
      url,
      finalUrl: url,
      mode,
      cookieBanner: {} as any,
      cookiePopups: {
        cmps: mode === 'optOut' ? [{ name: 'OneTrust' }] : [{ name: 'OneTrust' }, { name: 'Didomi' }],
        scrapedFrames: [],
        timing: { actionTimestamp: Date.now() - 1000 },
      },
      requests: [],
      meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), userAgent: 'test-agent' },
      actionTimestamp: Date.now() - 1000,
    } as any);

    vi.spyOn(crawl, 'crawlOne')
      .mockImplementationOnce(async (url: string, mode: 'optIn' | 'optOut') => mk(url, 'optOut'))
      .mockImplementationOnce(async (url: string, mode: 'optIn' | 'optOut') => mk(url, 'optIn'));

    const out = await runScan('https://example.com');
    expect(out.cmps.length).toBe(2);
    const names = out.cmps.map((c) => c.name).sort();
    expect(names).toEqual(['Didomi', 'OneTrust']);
    const oneTrust = out.cmps.find((c) => c.name === 'OneTrust');
    expect(oneTrust?.ruleKey).toBe('onetrust');
    // sanity on defaulted fields
    expect(typeof oneTrust?.cosmetic).toBe('boolean');
    expect(typeof oneTrust?.firstLayerRejectAll).toBe('boolean');
  });
});


