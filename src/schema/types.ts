export interface ApiResponseV1 {
  schemaVersion: '1.0';
  run: RunMeta;
  summary: Summary;
  cmps: Cmp[];
  trackers: Tracker[];
  events: AuditEvent[];
  leaks: AuditEvent[];
  checklist: Checklist;
}

export interface RunMeta {
  id: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  locale: string;
  jurisdiction: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  gpcEnabled: boolean;
}

export interface Summary {
  verdict: 'pass' | 'warn' | 'fail';
  reasons: string[];
  totals: {
    events: number;
    providers: number;
    preConsent: number;
    afterOptOut: number;
    afterOptIn: number;
    leaks: number;
  };
  timingsMs: {
    startedAt: number;
    endedAt: number;
    total: number;
    preConsentObserve: number;
    cmpDetect: number;
    optOutAction: number;
    postOptOutObserve: number;
    optInAction: number;
    postOptInObserve: number;
  };
}

export interface Cmp {
  name: string;
  ruleKey: string;
  detected: boolean;
  cosmetic: boolean;
  firstLayerRejectAll: boolean;
  secondLayerOnly: boolean;
  detectedAtMs: number;
  handledAtMs: number;
  consent: {
    tcf?: {
      enabled: boolean;
      version?: string;
      afterOptOut?: Record<string, unknown>;
      afterOptIn?: Record<string, unknown>;
    };
    gpp?: {
      enabled: boolean;
    };
  };
}

export interface Tracker {
  name: string;
  key: string;
  type: string;
}

export interface AuditEvent {
  id: string;
  hash: string;
  event: 'webRequest';
  timestamp: number;
  stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
  stages: EventStages;
  seenInOptIn: boolean; // For back-compat
  seenInOptOut: boolean; // For back-compat
  leak: boolean;
  thirdParty: boolean;
  resourceType: string;
  request: RequestInfo;
  response: ResponseInfo;
  provider: ProviderInfo;
  data: EventDataItem[];
}

export interface EventStages {
  preConsent: boolean;
  afterOptOut: boolean;
  afterOptIn: boolean;
}

export interface RequestInfo {
  method: string;
  url: string;
  host: string;
  path: string;
  queryKeys: string[];
}

export interface ResponseInfo {
  status: number;
  mime: string;
  sizeB: number;
}

export interface ProviderInfo {
  name: string;
  key: string;
  type: string;
  columns: Record<string, string>;
  groups: Array<{ key: string; name: string }>;
}

export interface EventDataItem {
  key: string;
  field?: string;
  value?: string | number | boolean | null;
  group?: string;
  hidden?: boolean | string;
}

export interface Checklist {
  url: string;
  locale: string;
  stages: {
    preConsent: ChecklistStageResult;
    popup: ChecklistPopupResult;
    afterOptOut: ChecklistStageResult;
    afterOptIn: ChecklistStageResult;
    trackers: ChecklistTrackersResult;
  };
  verdict: 'pass' | 'warn' | 'fail';
  notes: string[];
}

export interface ChecklistStageResult {
  pass: boolean;
  thirdPartyRequests: number;
  vendors: { name: string; key: string; count: number }[];
  leakingVendors?: { name: string; key: string; count: number }[];
}

export interface ChecklistPopupResult {
  pass: boolean;
  cmp: string;
  firstLayerRejectAll: boolean;
  cosmetic: boolean;
  appearedAtMs: number;
  handledAtMs: number;
}

export interface ChecklistTrackersResult {
  uniqueProviders: number;
  summary: {
    name: string;
    key: string;
    type: string;
    preConsent: number;
    afterOptOut: number;
    afterOptIn: number;
  }[];
}

// --- Original types to be replaced ---

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
  timestamp: number; // Added for staging
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
  cookieBanner: CookieBanner;
  cookiePopups?: {
    cmps: any[];
    scrapedFrames: any[];
    timing?: {
      scrapeMs?: number;
      detectMs?: number;
      actionMs?: number;
      totalMs?: number;
      actionTimestamp?: number;
    };
    errors?: string[];
  };
  requests: CrawlRequestRecord[];
  meta: CrawlMeta;
  error?: {
    code: 'timeout' | 'navigation' | 'autoconsent' | 'unknown';
    message: string;
  } | null;
  actionTimestamp?: number;
}
