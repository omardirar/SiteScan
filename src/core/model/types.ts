export type ProviderKey = 'gtm' | 'ga4' | 'meta' | 'tiktok' | (string & {});

export interface TrackerEvent {
  providerKey: ProviderKey;
  name: string;
  url: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface CookieBanner {
  detected: boolean;
  provider?: string | null;
  action?: 'optIn' | 'optOut' | null;
  error?: string | null;
}

export interface CrawlRequestRecord {
  url: string;
  method: string;
  resourceType?: string;
  status?: number;
  headers?: Record<string, string>;
  timingMs?: number;
}

export interface CrawlMeta {
  startedAt: string;
  finishedAt: string;
  durationMs?: number;
  userAgent?: string | null;
}

export interface CrawlOutput {
  version: string;
  url: string;
  finalUrl: string | null;
  mode: 'optIn' | 'optOut';
  thirdPartyOnly: boolean;
  cookieBanner: CookieBanner;
  // New: data parity with TRC CookiePopupsCollector
  cookiePopups?: {
    cmps: Array<{
      name: string;
      final: boolean;
      open: boolean;
      started: boolean;
      succeeded: boolean;
      selfTestFail: boolean;
      errors: string[];
      patterns: string[];
      snippets: string[];
      filterListMatched: boolean;
    }>;
    scrapedFrames: Array<{
      isTop: boolean;
      origin: string;
      cleanedText: string;
      buttons: Array<{ text: string; selector: string }>;
      potentialPopups: Array<{ text: string; selector: string; buttons: Array<{ text: string; selector: string }> }>;
      llmPopupDetected?: boolean;
      regexPopupDetected?: boolean;
      rejectButtons?: Array<{ text: string; selector: string }>;
      otherButtons?: Array<{ text: string; selector: string }>;
    }>;
    timing?: { scrapeMs?: number; detectMs?: number; actionMs?: number; totalMs?: number };
    errors?: string[];
  };
  requests: CrawlRequestRecord[];
  meta: CrawlMeta;
}

export interface ScanResult {
  url: string;
  cookieBanner: CookieBanner;
  trackers: Record<'GTM' | 'GA4' | 'Meta Pixel' | 'TikTok', boolean>;
  eventsOptOut: TrackerEvent[];
  eventsOptIn: TrackerEvent[];
  dataLeak: { leakDetected: boolean; leakedTags: string[] };
  meta: CrawlMeta;
}


