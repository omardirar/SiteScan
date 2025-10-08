import { randomUUID } from 'crypto';
// TODO: This module is doing too much. Split into smaller files/modules:
// - crawl orchestration (runScan)
// - request staging (partitionRequests)
// - event normalization/dedup (buildNormalizedEventsAndTrackers)
// - summaries/checklists (buildChecklist)
// - CMP mapping (buildCmpsArray)
import { crawlOne } from './crawl/crawlOne.js';
import { parseRequests } from './parse/parser.js';
import type {
  ApiResponseV1,
  AuditEvent,
  CrawlOutput,
  CrawlRequestRecord,
  EventDataItem,
  ProviderInfo,
  Tracker,
  TrackerEvent,
  Cmp,
} from '../schema/types.js';
import { canonicalizeUrl } from '../utils/url.js';
import { sha1 } from '../utils/hash.js';
import { getDomain } from 'tldts';

type StagedRequest = CrawlRequestRecord & {
  stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
};

export async function runScan(url: string): Promise<ApiResponseV1> {
  const runId = randomUUID();
  const startedAt = Date.now();

  // Run both crawls in parallel, each with their respective consent action
  const [optOut, optIn] = await Promise.all([
    crawlOne(url, 'optOut', 'optOut'), // Always opt-out in optOut mode
    crawlOne(url, 'optIn', 'optIn'), // Always opt-in in optIn mode
  ]);

  // TODO: Replace console.log with a structured logger (debug levels, correlation IDs)
  console.log('DEBUG: optOut requests:', optOut.requests.length);
  console.log('DEBUG: optIn requests:', optIn.requests.length);

  const allRequests: StagedRequest[] = [];
  partitionRequests(optOut, 'optOut').forEach((r) => allRequests.push(r));
  partitionRequests(optIn, 'optIn').forEach((r) => allRequests.push(r));

  // TODO: capture per-stage timings here for the summary.timingsMs
  console.log('DEBUG: allRequests staged:', allRequests.length);

  const allTrackerEvents = parseRequests(allRequests);
  console.log('DEBUG: trackerEvents found:', allTrackerEvents.length);

  const { events, trackers } =
    buildNormalizedEventsAndTrackers(allTrackerEvents);

  console.log('DEBUG: normalized events:', events.length);
  console.log('DEBUG: normalized trackers:', trackers.length);

  const leaks = events.filter((e) => e.leak);

  const endedAt = Date.now();

  const cmps = buildCmpsArray(
    optOut.cookiePopups?.cmps,
    optIn.cookiePopups?.cmps,
  );
  const checklist = buildChecklist(url, 'EU', events, cmps);

  const response: ApiResponseV1 = {
    schemaVersion: '1.0',
    run: {
      id: runId,
      url: url,
      normalizedUrl: optOut.finalUrl || url,
      domain: getDomain(optOut.finalUrl || url) || '',
      locale: 'EU', // TODO: Detect locale/region from IP or configuration
      jurisdiction: 'GDPR', // TODO: Resolve from locale + product config
      userAgent: optOut.meta.userAgent || '',
      viewport: { width: 1366, height: 768 }, // TODO: Use actual viewport from crawler options
      gpcEnabled: false, // TODO: Wire through GPC setting from crawler/page
    },
    summary: {
      // TODO: Compute real verdict from staged events (preConsent/leaks/etc.)
      verdict: 'pass',
      reasons: [],
      totals: {
        events: events.length,
        providers: trackers.length,
        preConsent: events.filter((e) => e.stages.preConsent).length,
        afterOptOut: events.filter((e) => e.stages.afterOptOut).length,
        afterOptIn: events.filter((e) => e.stages.afterOptIn).length,
        leaks: leaks.length,
      },
      timingsMs: {
        startedAt,
        endedAt,
        total: endedAt - startedAt,
        preConsentObserve: 0, // TODO: Measure using crawl budgets/timestamps
        cmpDetect: 0, // TODO: Populate from collector timing
        optOutAction: 0, // TODO: Populate from action timestamps
        postOptOutObserve: 0, // TODO: Measure explicitly
        optInAction: 0, // TODO: Populate from action timestamps
        postOptInObserve: 0, // TODO: Measure explicitly
      },
    },
    cmps,
    trackers,
    events,
    leaks,
    checklist,
  };

  return response;
}

function partitionRequests(
  crawl: CrawlOutput,
  mode: 'optIn' | 'optOut',
): StagedRequest[] {
  const out: StagedRequest[] = [];
  const actionTimestamp = crawl.actionTimestamp;

  for (const req of crawl.requests) {
    if (!actionTimestamp || req.timestamp < actionTimestamp) {
      out.push({ ...req, stage: 'preConsent' });
    } else {
      out.push({
        ...req,
        stage: mode === 'optIn' ? 'afterOptIn' : 'afterOptOut',
      });
    }
  }
  return out;
}

function buildNormalizedEventsAndTrackers(
  trackerEvents: (TrackerEvent & {
    stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
    request: CrawlRequestRecord;
  })[],
): { events: AuditEvent[]; trackers: Tracker[] } {
  const merged = new Map<
    string,
    {
      stages: Set<'preConsent' | 'afterOptOut' | 'afterOptIn'>;
      firstSeen: TrackerEvent & {
        stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
        request: CrawlRequestRecord;
      };
    }
  >();

  for (const te of trackerEvents) {
    const canonical = canonicalizeUrl(te.url);
    const hash = sha1(
      `${te.providerKey}|${canonical.host}|${canonical.path}|${canonical.sortedQuery}`,
    );

    if (!merged.has(hash)) {
      merged.set(hash, { stages: new Set(), firstSeen: te });
    }
    const existing = merged.get(hash)!;
    existing.stages.add(te.stage);
  }

  const events: AuditEvent[] = Array.from(merged.entries())
    .map(([hash, data]) => {
      const { firstSeen, stages } = data;
      const provider = toProviderInfo(firstSeen);
      const eventData = toDataArray(firstSeen);
      const canonical = canonicalizeUrl(firstSeen.url);

      const stagesObj = {
        preConsent: stages.has('preConsent'),
        afterOptOut: stages.has('afterOptOut'),
        afterOptIn: stages.has('afterOptIn'),
      };

      const evt: AuditEvent = {
        id: `evt_${randomUUID()}`,
        hash,
        event: 'webRequest',
        timestamp: firstSeen.request.timestamp,
        stage: firstSeen.stage,
        stages: stagesObj,
        seenInOptIn: stages.has('afterOptIn'),
        seenInOptOut: stages.has('afterOptOut'),
        leak: stages.has('afterOptOut'),
        thirdParty: true, // Assuming all captured are third party for now
        resourceType: firstSeen.request.resourceType || 'Unknown',
        request: {
          method: firstSeen.request.method,
          url: firstSeen.request.url,
          host: canonical.host,
          path: canonical.path,
          queryKeys: canonical.queryKeys,
        },
        response: {
          status: firstSeen.request.status || 0,
          mime:
            firstSeen.request.headers?.['content-type'] ||
            'application/octet-stream',
          sizeB: Number(firstSeen.request.headers?.['content-length'] || 0),
        },
        provider: provider,
        data: eventData,
      };
      return evt;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const trackersSet = new Map<string, Tracker>();
  for (const ev of events) {
    const t: Tracker = {
      name: ev.provider.name,
      key: ev.provider.key,
      type: ev.provider.type,
    };
    trackersSet.set(t.key, t);
  }
  const trackers = Array.from(trackersSet.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { events, trackers };
}

function toProviderInfo(te: TrackerEvent): ProviderInfo {
  const name = String(te.name || te.details?.['__provider.name'] || 'Unknown');
  const key = String(
    te.details?.['__provider.key'] || te.providerKey || 'unknown',
  );
  const type = String(te.details?.['__provider.type'] || 'Unknown');
  const columns: Record<string, string> = {};
  const groups: Array<{ key: string; name: string }> = [];
  if (te.details) {
    for (const [dk, dv] of Object.entries(te.details)) {
      if (dk.startsWith('__column.'))
        columns[dk.slice('__column.'.length)] = String(dv);
    }
    const groupIdx = new Set<number>();
    for (const [dk] of Object.entries(te.details)) {
      const m = dk.match(/^__group\.(\d+)\.(key|name)$/);
      if (m) groupIdx.add(Number(m[1]));
    }
    for (const idx of Array.from(groupIdx).sort((a, b) => a - b)) {
      const gkey = String(te.details[`__group.${idx}.key`] || '');
      const gname = String(te.details[`__group.${idx}.name`] || '');
      if (gkey || gname) groups.push({ key: gkey, name: gname });
    }
  }
  return { name, key, type, columns, groups };
}

function toDataArray(te: TrackerEvent): EventDataItem[] {
  if (!te || !te.details) return [];
  const rows: EventDataItem[] = [];
  for (const [dk, dv] of Object.entries(te.details)) {
    if (
      dk.startsWith('__provider.') ||
      dk.startsWith('__column.') ||
      dk.startsWith('__group.')
    )
      continue;
    if (
      dk.startsWith('field:') ||
      dk.startsWith('group:') ||
      dk.startsWith('hidden:')
    )
      continue;
    const field = te.details[`field:${dk}`];
    const group = te.details[`group:${dk}`];
    const hidden = te.details[`hidden:${dk}`];
    rows.push({
      key: dk,
      field: field ? String(field) : undefined,
      value: dv,
      group: group ? String(group) : undefined,
      hidden: typeof hidden === 'boolean' ? hidden : undefined,
    });
  }
  return rows;
}

function buildChecklist(
  url: string,
  locale: string,
  events: AuditEvent[],
  cmps: Cmp[],
): ApiResponseV1['checklist'] {
  const preConsentEvents = events.filter((e) => e.stages.preConsent);
  const afterOptOutEvents = events.filter((e) => e.stages.afterOptOut);
  const afterOptInEvents = events.filter((e) => e.stages.afterOptIn);

  const preConsentVendors = countVendors(preConsentEvents);
  const leakingVendors = countVendors(afterOptOutEvents);
  const afterOptInVendors = countVendors(afterOptInEvents);

  const trackersSummary = buildTrackersSummary(events);

  const verdict: 'pass' | 'warn' | 'fail' = 'pass'; // Placeholder

  return {
    url,
    locale,
    stages: {
      preConsent: {
        pass: preConsentEvents.length === 0,
        thirdPartyRequests: preConsentEvents.length,
        vendors: preConsentVendors,
      },
      popup: {
        pass: cmps.length > 0,
        cmp: cmps.length > 0 ? cmps[0].name : 'Unknown',
        firstLayerRejectAll:
          cmps.length > 0 ? cmps[0].firstLayerRejectAll : false,
        cosmetic: cmps.length > 0 ? cmps[0].cosmetic : false,
        appearedAtMs: cmps.length > 0 ? cmps[0].detectedAtMs : 0,
        handledAtMs: cmps.length > 0 ? cmps[0].handledAtMs : 0,
      },
      afterOptOut: {
        pass: afterOptOutEvents.length === 0,
        thirdPartyRequests: afterOptOutEvents.length,
        vendors: leakingVendors,
        leakingVendors: leakingVendors,
      },
      afterOptIn: {
        pass: true,
        thirdPartyRequests: afterOptInEvents.length,
        vendors: afterOptInVendors,
      },
      trackers: {
        uniqueProviders: trackersSummary.length,
        summary: trackersSummary,
      },
    },
    verdict,
    notes: [],
  };
}

function buildCmpsArray(
  optOutCmps: any[] | undefined,
  optInCmps: any[] | undefined,
): Cmp[] {
  const cmps: Cmp[] = [];
  const processed = new Set<string>();

  // Process CMPs from both crawls, preferring opt-out data
  const allCmps = [...(optOutCmps || []), ...(optInCmps || [])];

  for (const cmp of allCmps) {
    if (!cmp.name || processed.has(cmp.name)) continue;
    processed.add(cmp.name);

    cmps.push({
      name: cmp.name,
      ruleKey: cmp.name.toLowerCase().replace(/\s+/g, '_'),
      detected: true,
      cosmetic: false, // We don't have this info yet
      firstLayerRejectAll: false, // We don't have this info yet
      secondLayerOnly: false,
      detectedAtMs: 0, // We don't have timing info yet
      handledAtMs: 0, // We don't have timing info yet
      consent: {
        tcf: {
          enabled: false,
        },
        gpp: {
          enabled: false,
        },
      },
    });
  }

  // Strictly use the DuckDuckGo autoconsent collector output only

  return cmps;
}

function countVendors(
  events: AuditEvent[],
): { name: string; key: string; count: number }[] {
  const counts = new Map<
    string,
    { name: string; key: string; count: number }
  >();
  for (const event of events) {
    const key = event.provider.key;
    if (!counts.has(key)) {
      counts.set(key, {
        name: event.provider.name,
        key: event.provider.key,
        count: 0,
      });
    }
    counts.get(key)!.count++;
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function buildTrackersSummary(
  events: AuditEvent[],
): ApiResponseV1['checklist']['stages']['trackers']['summary'] {
  const summary = new Map<
    string,
    {
      name: string;
      key: string;
      type: string;
      preConsent: number;
      afterOptOut: number;
      afterOptIn: number;
    }
  >();

  for (const event of events) {
    const key = event.provider.key;
    if (!summary.has(key)) {
      summary.set(key, {
        name: event.provider.name,
        key: event.provider.key,
        type: event.provider.type,
        preConsent: 0,
        afterOptOut: 0,
        afterOptIn: 0,
      });
    }
    const entry = summary.get(key)!;
    if (event.stages.preConsent) entry.preConsent++;
    if (event.stages.afterOptOut) entry.afterOptOut++;
    if (event.stages.afterOptIn) entry.afterOptIn++;
  }

  return Array.from(summary.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
