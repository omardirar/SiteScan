import { describe, it, expect, vi } from 'vitest';
import * as crawl from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/crawl/crawlOne.js';
import { runScan } from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/scan.js';
import { ApiResponseV1Schema } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/validator.js';

describe('runScan edge cases', () => {
  it('unreachable URL crawl errors do not crash the scan', async () => {
    vi.spyOn(crawl, 'crawlOne')
      .mockImplementationOnce(async (url: string) => ({ url, finalUrl: url, error: { code: 'navigation', message: 'ERR_NAME_NOT_RESOLVED' }, requests: [], meta: {} } as any))
      .mockImplementationOnce(async (url: string) => ({ url, finalUrl: url, error: { code: 'navigation', message: 'ERR_NAME_NOT_RESOLVED' }, requests: [], meta: {} } as any));

    const out = await runScan('https://no-such-host.invalid');
    const validation = ApiResponseV1Schema.safeParse(out);
    expect(validation.success, validation.success ? '' : JSON.stringify(validation.error.flatten(), null, 2)).toBe(true);
    expect(out.events.length).toBe(0);
  });

  it('timeout crawl errors do not crash the scan', async () => {
    vi.spyOn(crawl, 'crawlOne')
    .mockImplementationOnce(async (url: string) => ({ url, finalUrl: url, error: { code: 'timeout', message: 'Navigation Timeout' }, requests: [], meta: {} } as any))
    .mockImplementationOnce(async (url: string) => ({ url, finalUrl: url, error: { code: 'timeout', message: 'Navigation Timeout' }, requests: [], meta: {} } as any));
    const out = await runScan('https://slow.example');
    const validation = ApiResponseV1Schema.safeParse(out);
    expect(validation.success, validation.success ? '' : JSON.stringify(validation.error.flatten(), null, 2)).toBe(true);
    expect(out.trackers.length).toBe(0);
  });

  it('popup absent still returns valid schema', async () => {
    vi.spyOn(crawl, 'crawlOne')
      .mockImplementation(async (url: string) => ({ url, finalUrl: url, error: null, requests: [], cookiePopups: { cmps: [] }, meta: {} } as any));
    const out = await runScan('https://no-popup.example');
    const validation = ApiResponseV1Schema.safeParse(out);
    expect(validation.success, validation.success ? '' : JSON.stringify(validation.error.flatten(), null, 2)).toBe(true);
    expect(Array.isArray(out.cmps)).toBe(true);
    expect(out.cmps.length).toBe(0);
  });
});


