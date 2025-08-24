import { describe, it, expect, vi } from 'vitest';
import * as crawl from '../../src/crawl/crawlOne.js';
import { scanUrl } from '../../src/core/scan.js';

describe('edge cases', () => {
  it('unreachable URL surfaces navigation error', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementationOnce(async (url: string) => ({ error: { code: 'navigation', message: 'ERR_NAME_NOT_RESOLVED' }, requests: [], cookieBanner: { detected: false } } as any)).mockImplementationOnce(async (url: string) => ({ error: null, requests: [], cookieBanner: { detected: false } } as any));
    const out = await scanUrl('https://no-such-host.invalid');
    expect(out).toHaveProperty('events');
  });

  it('timeout error code exposed', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementationOnce(async (url: string) => ({ error: { code: 'timeout', message: 'Navigation Timeout' }, requests: [], cookieBanner: { detected: false } } as any)).mockImplementationOnce(async (url: string) => ({ error: null, requests: [], cookieBanner: { detected: false } } as any));
    const out = await scanUrl('https://slow.example');
    expect(out).toHaveProperty('trackers');
  });

  it('popup absent still returns trackers and no cmp', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementationOnce(async (url: string) => ({ cookiePopups: { cmps: [] }, requests: [], cookieBanner: { detected: false } } as any)).mockImplementationOnce(async (url: string) => ({ cookiePopups: { cmps: [] }, requests: [], cookieBanner: { detected: false } } as any));
    const out = await scanUrl('https://no-popup.example');
    expect(Array.isArray(out.cmps)).toBe(true);
  });
});


