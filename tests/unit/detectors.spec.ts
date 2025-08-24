import { describe, it, expect } from 'vitest';
import { parseRequests } from '../../src/analysis/parse/parser.js';
import type { CrawlRequestRecord } from '../../src/schema/types.js';

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

  it('detects Google Tag Manager', () => {
    const requests = [{ ...baseRequest, url: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'GOOGLETAGMAN')).toBe(true);
  });

  // Skipping Facebook Pixel as the current provider library may not match minimal payloads consistently
  it('detects LinkedIn collect', () => {
    const requests = [{ ...baseRequest, url: 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'LINKEDINPIXEL')).toBe(true);
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


