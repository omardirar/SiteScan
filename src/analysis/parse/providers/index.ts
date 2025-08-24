import type { TrackerEvent } from '../../../schema/types.js';
import { providers as libraryProviders } from './library/registry.js';

type DetectorFn = (url: string) => TrackerEvent | null;

function buildDetectorFromProvider(p: any): DetectorFn {
  return (url: string) => {
    try {
      if (!p?._pattern?.test?.(url)) return null;
      const res = p.parseUrl(url);
      if (!res || !res.data || !res.provider) return null;

      const providerKey: string = String(
        res.provider.key || p._key || 'unknown',
      );

      const details: Record<string, string | number | boolean | null> = {};

      // Provider metadata
      // TODO: Tighten provider typing and avoid magic __keys (use nested objects)
      if (res.provider.name) details['__provider.name'] = res.provider.name;
      if (res.provider.type) details['__provider.type'] = res.provider.type;
      if (res.provider.key) details['__provider.key'] = res.provider.key;

      // Provider declared columns and groups (names only)
      if (res.provider.columns && typeof res.provider.columns === 'object') {
        for (const [colName, colKey] of Object.entries(res.provider.columns)) {
          details[`__column.${colName}`] = String(colKey);
        }
      }
      if (Array.isArray(res.provider.groups)) {
        res.provider.groups.forEach((g: any, idx: number) => {
          if (g && g.key) details[`__group.${idx}.key`] = String(g.key);
          if (g && g.name) details[`__group.${idx}.name`] = String(g.name);
        });
      }

      // All provider data entries with full context preserved
      // TODO: Consider size limits and redaction for potentially sensitive values
      for (const d of res.data as any[]) {
        if (!d || typeof d !== 'object' || !('key' in d)) continue;
        const key = String(d.key);
        const value = 'value' in d ? (d.value as any) : null;
        details[key] = value as any;
        if ('field' in d && d.field != null)
          details[`field:${key}`] = String(d.field);
        if ('group' in d && d.group != null)
          details[`group:${key}`] = String(d.group);
        if ('hidden' in d) details[`hidden:${key}`] = Boolean(d.hidden as any);
      }

      return {
        providerKey: providerKey as any,
        name: res.provider.name || 'Unknown',
        url,
        details,
      } satisfies TrackerEvent;
    } catch {
      return null;
    }
  };
}

const detectors: DetectorFn[] = Array.isArray(libraryProviders)
  ? libraryProviders.map((p: any) => buildDetectorFromProvider(p))
  : [];

export function detectAll(url: string): TrackerEvent[] {
  const events: TrackerEvent[] = [];
  for (const d of detectors) {
    const e = d(url);
    if (e) events.push(e);
  }
  return events;
}
