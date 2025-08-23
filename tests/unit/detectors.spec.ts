import { describe, it, expect } from 'vitest';
import { parseRequests } from '../../src/parse/parser.js';
import type { CrawlOutput } from '../../src/core/model/types.js';

const baseCrawl: Omit<CrawlOutput, 'requests'> = {
  version: '1.0.0',
  url: 'https://example.com',
  finalUrl: 'https://example.com',
  mode: 'optOut',
  thirdPartyOnly: true,
  cookieBanner: { detected: false, provider: null, action: null, error: null },
  meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() },
};

describe('ported detectors', () => {
  it('detects Google Ads conversion', () => {
    const crawl: CrawlOutput = {
      ...baseCrawl,
      requests: [{ url: 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123', method: 'GET' }],
    } as any;
    const events = parseRequests(crawl);
    expect(events.some(e => e.providerKey === 'GOOGLEADS')).toBe(true);
  });

  it('detects Universal Analytics /collect', () => {
    const crawl: CrawlOutput = {
      ...baseCrawl,
      requests: [{ url: 'https://www.google-analytics.com/collect?v=1&t=pageview&tid=UA-1', method: 'GET' }],
    } as any;
    const events = parseRequests(crawl);
    expect(events.some(e => e.providerKey === 'UNIVERSALANALYTICS')).toBe(true);
  });

  it('detects Facebook Pixel /tr', () => {
    const crawl: CrawlOutput = {
      ...baseCrawl,
      requests: [{ url: 'https://www.facebook.com/tr/?id=123&ev=PageView', method: 'GET' }],
    } as any;
    const events = parseRequests(crawl);
    expect(events.some(e => e.providerKey === 'FACEBOOKPIXEL')).toBe(true);
  });

  it('detects LinkedIn collect', () => {
    const crawl: CrawlOutput = {
      ...baseCrawl,
      requests: [{ url: 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif', method: 'GET' }],
    } as any;
    const events = parseRequests(crawl);
    expect(events.some(e => e.providerKey === 'LINKEDINPIXEL')).toBe(true);
  });

  it('does not false-positive on benign CDN', () => {
    const crawl: CrawlOutput = {
      ...baseCrawl,
      requests: [{ url: 'https://cdn.example.com/script.js', method: 'GET' }],
    } as any;
    const events = parseRequests(crawl);
    expect(events.length).toBe(0);
  });
});


