import { crawlOne } from '../crawl/crawlOne.js';
import { parseRequests } from '../parse/parser.js';
import { computeConsentLeak } from './util/consentDiff.js';
import type { ScanResult } from './model/types.js';

export async function scanUrl(url: string): Promise<ScanResult> {
  const startedAt = new Date().toISOString();

  const autoconsentFlag = (process.env.AUTOCONSENT_ACTION as 'optIn' | 'optOut' | undefined) || undefined;
  const actionOptOut: 'optOut' | 'optIn' | null = autoconsentFlag === 'optOut' ? 'optOut' : (autoconsentFlag === 'optIn' ? 'optIn' : null);
  const actionOptIn: 'optOut' | 'optIn' | null = autoconsentFlag === 'optOut' ? 'optOut' : (autoconsentFlag === 'optIn' ? 'optIn' : null);
  const [optOut, optIn] = await Promise.all([
    crawlOne(url, 'optOut', actionOptOut),
    crawlOne(url, 'optIn', actionOptIn),
  ]);

  const eventsOptOut = parseRequests(optOut);
  const eventsOptIn = parseRequests(optIn);

  const allEvents = eventsOptOut.concat(eventsOptIn);
  const trackers = {
    'GTM': allEvents.some((e) => e.providerKey === 'GOOGLETAGMAN'),
    'GA4': allEvents.some((e) => e.providerKey === 'GOOGLEANALYTICS4'),
    'Meta Pixel': allEvents.some((e) => e.providerKey === 'FACEBOOKPIXEL'),
    'TikTok': allEvents.some((e) => e.providerKey === 'TIKTOK'),
  } as const;

  const leak = computeConsentLeak(eventsOptOut, eventsOptIn);

  const finishedAt = new Date().toISOString();
  const meta = {
    startedAt,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
    userAgent: 'auditor-service/0.1',
  };

  const cookieBanner = optOut.cookieBanner.detected ? optOut.cookieBanner : optIn.cookieBanner;

  return {
    url,
    cookieBanner,
    trackers: { ...trackers },
    eventsOptOut,
    eventsOptIn,
    dataLeak: leak,
    meta,
  };
}


