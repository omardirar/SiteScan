import { describe, it, expect, vi } from 'vitest';
import * as crawl from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/crawl/crawlOne.js';
import { runScan } from '/Users/omar/Documents/GitHub/website-auditor/src/analysis/scan.js';
import { ApiResponseV1Schema } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/validator.js';
import type { CrawlOutput } from '/Users/omar/Documents/GitHub/website-auditor/src/schema/types.js';

function mkCrawlOut(url: string, mode: 'optIn' | 'optOut'): CrawlOutput {
  const isOptOut = mode === 'optOut';
  return {
    version: '1.0.0',
    url,
    finalUrl: url,
    mode,
    cookieBanner: {} as any,
    cookiePopups: {
      cmps: [{ name: 'MockCMP', ruleKey: 'MOCKCMP', detected: true, cosmetic: false, firstLayerRejectAll: true, secondLayerOnly: false, detectedAtMs: 100, handledAtMs: 200, consent: {} }],
      scrapedFrames: [],
      timing: { actionTimestamp: Date.now() - 1000 },
    },
    requests: isOptOut
      ? [
          { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-PRECONSENT', method: 'GET', timestamp: Date.now() - 2000, status: 200, resourceType: 'script' },
          { url: 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif', method: 'GET', timestamp: Date.now() - 500, status: 200, resourceType: 'image' },
        ]
      : [
        { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-PRECONSENT', method: 'GET', timestamp: Date.now() - 2000, status: 200, resourceType: 'script' }, // Will be deduped
      ],
    meta: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), userAgent: 'test-agent' },
    error: null,
    actionTimestamp: Date.now() - 1000,
  };
}

describe('runScan output validation', () => {
  it('returns a valid ApiResponseV1 structure', async () => {
    vi.spyOn(crawl, 'crawlOne').mockImplementation(async (url: string, mode: 'optIn' | 'optOut') => mkCrawlOut(url, mode));

    const out = await runScan('https://example.com', 'optOut');

    // Validate against Zod schema
    const validation = ApiResponseV1Schema.safeParse(out);
    expect(validation.success, validation.success ? '' : JSON.stringify(validation.error.flatten(), null, 2)).toBe(true);
    
    // Check key properties
    expect(out.schemaVersion).toBe('1.0');
    expect(out.run.url).toBe('https://example.com');
    // Expect 2 unique events: GTM (preConsent) and LinkedIn (afterOptOut/leak)
    expect(out.events.length).toBe(2);
    
    const gtm = out.events.find(e => e.provider.key === 'GOOGLETAGMAN');
    expect(gtm?.stage).toBe('preConsent');
    expect(gtm?.stages.preConsent).toBe(true);

    const li = out.events.find(e => e.provider.key === 'LINKEDINPIXEL');
    expect(li?.stage).toBe('afterOptOut');
    expect(li?.stages.afterOptOut).toBe(true);
    expect(li?.leak).toBe(true);

    const ga4 = out.events.find(e => e.provider.key === 'GOOGLEANALYTICS4');
    if (ga4) {
      expect(ga4.stage).toBe('afterOptIn');
      expect(ga4.stages.afterOptIn).toBe(true);
      expect(ga4.leak).toBe(false);
    }
  });
});


