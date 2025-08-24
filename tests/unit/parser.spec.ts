import { describe, it, expect } from 'vitest';
import { parseRequests } from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/parse/parser.js';
import type { CrawlRequestRecord } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/types.js';

const baseRequest: Omit<CrawlRequestRecord & { stage: 'preConsent' }, 'url'> = {
  method: 'GET',
  stage: 'preConsent',
  timestamp: Date.now(),
};

describe('parseRequests', () => {
  it('returns empty with no requests', () => {
    expect(parseRequests([])).toEqual([]);
  });

  it('detects GTM via /gtm.js', () => {
    const requests = [{ ...baseRequest, url: 'https://www.googletagmanager.com/gtm.js?id=GTM-XYZ' }];
    const events = parseRequests(requests);
    expect(events.some(e => e.providerKey === 'GOOGLETAGMAN')).toBe(true);
  });
});


