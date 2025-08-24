import { describe, it, expect } from 'vitest';
import { parseRequests } from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/parse/parser.js';
import type { CrawlRequestRecord } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/types.js';

const baseRequest: Omit<CrawlRequestRecord & { stage: 'preConsent' }, 'url'> = {
  method: 'GET',
  stage: 'preConsent',
  timestamp: Date.now(),
};

describe('ported detectors', () => {
  it('detects Google Ads conversion', () => {
    const requests = [{ ...baseRequest, url: 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'GOOGLEADS')).toBe(true);
  });

  it('detects Universal Analytics /collect', () => {
    const requests = [{ ...baseRequest, url: 'https://www.google-analytics.com/collect?v=1&t=pageview&tid=UA-1' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'UNIVERSALANALYTICS')).toBe(true);
  });

  it('detects Facebook Pixel /tr', () => {
    const requests = [{ ...baseRequest, url: 'https://www.facebook.com/tr/?id=123&ev=PageView' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'FACEBOOKPIXEL')).toBe(true);
  });

  it('detects LinkedIn collect', () => {
    const requests = [{ ...baseRequest, url: 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'LINKEDINPIXEL')).toBe(true);
  });

  it('does not false-positive on benign CDN', () => {
    const requests = [{ ...baseRequest, url: 'https://cdn.example.com/script.js' }];
    const events = parseRequests(requests);
    expect(events.length).toBe(0);
  });
});


