import { crawlOne } from '../crawl/crawlOne.js';
import { parseRequests } from '../parse/parser.js';
import type { ApiResponse, AuditEvent, NormalizedTracker, ProviderInfo } from './model/types.js';

export async function scanUrl(url: string, autoconsentAction: 'optIn' | 'optOut' | null = null): Promise<ApiResponse> {
  const startedAt = new Date().toISOString();

  const actionOptOut: 'optOut' | 'optIn' | null = autoconsentAction;
  const actionOptIn: 'optOut' | 'optIn' | null = autoconsentAction;
  const [optOut, optIn] = await Promise.all([
    crawlOne(url, 'optOut', actionOptOut),
    crawlOne(url, 'optIn', actionOptIn),
  ]);

  const eventsOptOut = parseRequests(optOut);
  const eventsOptIn = parseRequests(optIn);

  function buildKey(providerKey: string, urlStr: string): string {
    try {
      const u = new URL(urlStr);
      const params = Array.from(u.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const normQuery = params.map(([k, v]) => `${k}=${v}`).join('&');
      return `${providerKey}|${u.protocol}//${u.host}${u.pathname}?${normQuery}`;
    } catch {
      return `${providerKey}|${urlStr}`;
    }
  }

  type RawEvent = { key: string; source: 'optIn' | 'optOut'; te: typeof eventsOptOut[number] };
  const rawEvents: RawEvent[] = [];
  for (const e of eventsOptOut) rawEvents.push({ key: buildKey(e.providerKey, e.url), source: 'optOut', te: e });
  for (const e of eventsOptIn) rawEvents.push({ key: buildKey(e.providerKey, e.url), source: 'optIn', te: e });

  const merged = new Map<string, { optIn?: typeof eventsOptIn[number]; optOut?: typeof eventsOptOut[number] }>();
  for (const r of rawEvents) {
    const cur = merged.get(r.key) || {};
    cur[r.source] = r.te as any;
    merged.set(r.key, cur);
  }

  function toProviderInfo(te: typeof eventsOptIn[number] | typeof eventsOptOut[number] | undefined): ProviderInfo | null {
    if (!te) return null;
    const name = String(te.name || te.details?.['__provider.name'] || 'Unknown');
    const key = String(te.details?.['__provider.key'] || te.providerKey || 'unknown');
    const type = String(te.details?.['__provider.type'] || 'Unknown');
    const columns: Record<string, string> = {};
    const groups: Array<{ key: string; name: string }> = [];
    if (te.details) {
      for (const [dk, dv] of Object.entries(te.details)) {
        if (dk.startsWith('__column.')) columns[dk.slice('__column.'.length)] = String(dv);
      }
      const groupIdx = new Set<number>();
      for (const [dk, dv] of Object.entries(te.details)) {
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

  function toDataArray(te: typeof eventsOptIn[number] | typeof eventsOptOut[number] | undefined): { key: string; field?: string; value?: any; group?: string; hidden?: boolean }[] {
    if (!te || !te.details) return [];
    const rows: any[] = [];
    for (const [dk, dv] of Object.entries(te.details)) {
      if (dk.startsWith('__provider.') || dk.startsWith('__column.') || dk.startsWith('__group.')) continue;
      if (dk.startsWith('field:') || dk.startsWith('group:') || dk.startsWith('hidden:')) continue;
      const field = te.details[`field:${dk}`];
      const group = te.details[`group:${dk}`];
      const hidden = te.details[`hidden:${dk}`];
      rows.push({ key: dk, field: field ? String(field) : undefined, value: dv as any, group: group ? String(group) : undefined, hidden: typeof hidden === 'boolean' ? hidden : undefined });
    }
    return rows;
  }

  const events: AuditEvent[] = Array.from(merged.entries()).map(([key, pair]) => {
    const provider = toProviderInfo(pair.optIn || pair.optOut) as ProviderInfo;
    const data = toDataArray(pair.optIn || pair.optOut);
    const resourceType = 'Script';
    const timestamp = Date.now();
    return {
      event: 'webRequest',
      timestamp,
      resourceType,
      provider,
      data,
      seenInOptIn: Boolean(pair.optIn),
      seenInOptOut: Boolean(pair.optOut),
    } as AuditEvent;
  }).sort((a, b) => a.timestamp - b.timestamp);

  const trackersSet = new Map<string, NormalizedTracker>();
  for (const ev of events) {
    const t: NormalizedTracker = { name: ev.provider.name, key: ev.provider.key, type: ev.provider.type };
    trackersSet.set(`${t.key}`, t);
  }
  const trackers = Array.from(trackersSet.values()).sort((a, b) => a.name.localeCompare(b.name));

  const leaks = events.filter((e) => e.seenInOptOut && !e.seenInOptIn);

  const cmps = (optOut.cookiePopups?.cmps || []).concat(optIn.cookiePopups?.cmps || []);

  return { cmps, trackers, events, leaks } as ApiResponse;
}


