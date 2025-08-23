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

describe('parseRequests', () => {
  it('returns empty with no requests', () => {
    const crawl: CrawlOutput = { ...baseCrawl, requests: [] };
    expect(parseRequests(crawl)).toEqual([]);
  });

  it('detects GA4', () => {
    const crawl: CrawlOutput = { ...baseCrawl, requests: [ { url: 'https://www.google-analytics.com/g/collect?v=2', method: 'GET' } ] };
    const events = parseRequests(crawl);
    expect(events.some(e => e.providerKey === 'GOOGLEANALYTICS4')).toBe(true);
  });

  it('dedupes by provider+url', () => {
    const url = 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC';
    const crawl: CrawlOutput = { ...baseCrawl, requests: [ { url, method: 'GET' }, { url, method: 'GET' } ] };
    const events = parseRequests(crawl);
    const gtmEvents = events.filter(e => e.providerKey === 'GOOGLETAGMAN');
    expect(gtmEvents.length).toBe(1);
  });
});


