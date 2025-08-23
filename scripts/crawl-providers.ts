#!/usr/bin/env tsx
import { scanUrl } from '../src/core/scan.js';

type CliOptions = {
  json: boolean;
};

function parseArgs(argv: string[]): { urls: string[]; opts: CliOptions } {
  const urls: string[] = [];
  const opts: CliOptions = { json: false };
  for (const a of argv) {
    if (a === '--no-json') opts.json = false;
    else if (a === '--json') opts.json = true;
    else if (!a.startsWith('-')) urls.push(a);
  }
  return { urls, opts };
}

function usage(): string {
  return [
    'Usage: tsx scripts/crawl-providers.ts <url> [more-urls] [--json|--no-json]',
    '',
    'Crawls each URL with opt-out and opt-in flows and prints provider info.',
    'Default output is human-readable text. Pass --json to emit JSON.',
  ].join('\n');
}

async function main() {
  const { urls, opts } = parseArgs(process.argv.slice(2));
  if (!urls.length) {
    console.error(usage());
    process.exit(1);
  }

  const results = [] as any[];
  for (const url of urls) {
    try {
      const scan = await scanUrl(url);

      // Aggregate provider counts per mode
      const countMap: Record<string, { name: string; optOut: number; optIn: number }> = {};
      const keysMap: Record<string, Record<string, { optOut: number; optIn: number; sample: any; field?: string; group?: string; hidden?: boolean }>> = {};
      const metaMap: Record<string, { name?: string; type?: string; columns: Record<string, string>; groups: Record<string, { key?: string; name?: string }> }> = {};
      for (const e of scan.eventsOptOut) {
        if (!countMap[e.providerKey]) countMap[e.providerKey] = { name: e.name, optOut: 0, optIn: 0 };
        countMap[e.providerKey].optOut += 1;
        const details = e.details || {};
        // Capture provider metadata from normalized details
        if (!metaMap[e.providerKey]) metaMap[e.providerKey] = { name: undefined, type: undefined, columns: {}, groups: {} };
        if (typeof details['__provider.name'] === 'string') metaMap[e.providerKey].name = details['__provider.name'] as string;
        if (typeof details['__provider.type'] === 'string') metaMap[e.providerKey].type = details['__provider.type'] as string;
        for (const [dk, dv] of Object.entries(details)) {
          if (dk.startsWith('__column.')) {
            metaMap[e.providerKey].columns[dk.slice('__column.'.length)] = String(dv);
          } else if (dk.startsWith('__group.')) {
            const m = dk.match(/^__group\.(\d+)\.(key|name)$/);
            if (m) {
              const idx = m[1];
              metaMap[e.providerKey].groups[idx] = metaMap[e.providerKey].groups[idx] || {};
              (metaMap[e.providerKey].groups[idx] as any)[m[2]] = dv as any;
            }
          }
        }
        if (!keysMap[e.providerKey]) keysMap[e.providerKey] = {};
        for (const k of Object.keys(details)) {
          if (k.startsWith('__provider.') || k.startsWith('__column.') || k.startsWith('__group.') || k.startsWith('field:') || k.startsWith('group:') || k.startsWith('hidden:')) {
            continue;
          }
          if (!keysMap[e.providerKey][k]) keysMap[e.providerKey][k] = { optOut: 0, optIn: 0, sample: undefined };
          keysMap[e.providerKey][k].optOut += 1;
          if (keysMap[e.providerKey][k].sample === undefined && details[k] !== undefined) keysMap[e.providerKey][k].sample = details[k] as any;
          const f = details[`field:${k}`];
          const g = details[`group:${k}`];
          const h = details[`hidden:${k}`];
          if (typeof f === 'string') keysMap[e.providerKey][k].field = f as string;
          if (typeof g === 'string') keysMap[e.providerKey][k].group = g as string;
          if (typeof h === 'boolean') keysMap[e.providerKey][k].hidden = h as boolean;
        }
      }
      for (const e of scan.eventsOptIn) {
        if (!countMap[e.providerKey]) countMap[e.providerKey] = { name: e.name, optOut: 0, optIn: 0 };
        countMap[e.providerKey].optIn += 1;
        const details = e.details || {};
        if (!metaMap[e.providerKey]) metaMap[e.providerKey] = { name: undefined, type: undefined, columns: {}, groups: {} };
        if (typeof details['__provider.name'] === 'string') metaMap[e.providerKey].name = details['__provider.name'] as string;
        if (typeof details['__provider.type'] === 'string') metaMap[e.providerKey].type = details['__provider.type'] as string;
        for (const [dk, dv] of Object.entries(details)) {
          if (dk.startsWith('__column.')) {
            metaMap[e.providerKey].columns[dk.slice('__column.'.length)] = String(dv);
          } else if (dk.startsWith('__group.')) {
            const m = dk.match(/^__group\.(\d+)\.(key|name)$/);
            if (m) {
              const idx = m[1];
              metaMap[e.providerKey].groups[idx] = metaMap[e.providerKey].groups[idx] || {};
              (metaMap[e.providerKey].groups[idx] as any)[m[2]] = dv as any;
            }
          }
        }
        if (!keysMap[e.providerKey]) keysMap[e.providerKey] = {};
        for (const k of Object.keys(details)) {
          if (k.startsWith('__provider.') || k.startsWith('__column.') || k.startsWith('__group.') || k.startsWith('field:') || k.startsWith('group:') || k.startsWith('hidden:')) {
            continue;
          }
          if (!keysMap[e.providerKey][k]) keysMap[e.providerKey][k] = { optOut: 0, optIn: 0, sample: undefined };
          keysMap[e.providerKey][k].optIn += 1;
          if (keysMap[e.providerKey][k].sample === undefined && details[k] !== undefined) keysMap[e.providerKey][k].sample = details[k] as any;
          const f = details[`field:${k}`];
          const g = details[`group:${k}`];
          const h = details[`hidden:${k}`];
          if (typeof f === 'string') keysMap[e.providerKey][k].field = f as string;
          if (typeof g === 'string') keysMap[e.providerKey][k].group = g as string;
          if (typeof h === 'boolean') keysMap[e.providerKey][k].hidden = h as boolean;
        }
      }
      const providers = Object.entries(countMap)
        .sort((a, b) => (b[1].optOut + b[1].optIn) - (a[1].optOut + a[1].optIn))
        .map(([key, v]) => ({
          providerKey: key,
          name: metaMap[key]?.name || v.name,
          type: metaMap[key]?.type,
          counts: { optOut: v.optOut, optIn: v.optIn },
          columns: metaMap[key] ? metaMap[key].columns : {},
          groups: metaMap[key] ? Object.values(metaMap[key].groups).map(g => ({ key: g.key, name: g.name })) : [],
          keys: Object.entries(keysMap[key] || {})
            .map(([k, stats]) => ({ key: k, total: stats.optOut + stats.optIn, optOut: stats.optOut, optIn: stats.optIn, sample: stats.sample, field: stats.field, group: stats.group, hidden: stats.hidden }))
            .sort((a, b) => b.total - a.total),
        }));

      const summary = {
        url: scan.url,
        cookieBanner: scan.cookieBanner,
        totals: {
          optOut: scan.eventsOptOut.length,
          optIn: scan.eventsOptIn.length,
        },
        providers,
        events: {
          optOut: scan.eventsOptOut,
          optIn: scan.eventsOptIn,
        },
        meta: scan.meta,
      };

      results.push(summary);
    } catch (err: any) {
      results.push({ url, error: err?.message || String(err) });
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    for (const r of results) {
      if (r.error) {
        console.log(`URL: ${r.url} -> ERROR: ${r.error}`);
        continue;
      }
      console.log(`URL: ${r.url}`);
      console.log(`  Cookie Banner: detected=${r.cookieBanner?.detected} provider=${r.cookieBanner?.provider || ''} action=${r.cookieBanner?.action || ''}`);
      console.log(`  Totals: optOut=${r.totals.optOut} optIn=${r.totals.optIn}`);
      console.log('  Providers:');
      for (const p of r.providers) {
        console.log(`    - ${p.providerKey} (${p.name || ''})${p.type ? ` [${p.type}]` : ''}`);
        console.log(`      counts: optOut=${p.counts.optOut}, optIn=${p.counts.optIn}`);
        const cols = Object.entries(p.columns || {});
        if (cols.length) {
          console.log(`      columns (${cols.length}):`);
          for (const [ck, cv] of cols) console.log(`        ${ck}: ${cv}`);
        }
        const groups = p.groups || [];
        if (groups.length) {
          console.log(`      groups (${groups.length}):`);
          for (const g of groups) console.log(`        ${g.key || ''}: ${g.name || ''}`);
        }
        console.log(`      keys (${p.keys.length}):`);
        const byGroup: Record<string, any[]> = {};
        for (const k of p.keys) {
          const g = (k.group as string) || 'other';
          if (!byGroup[g]) byGroup[g] = [];
          byGroup[g].push(k);
        }
        for (const [gname, arr] of Object.entries(byGroup)) {
          console.log(`        group: ${gname}`);
          for (const k of arr) {
            console.log(`          - ${k.key}${k.field ? ` (${k.field})` : ''}${k.hidden ? ' [hidden]' : ''}: total=${k.total} (optOut=${k.optOut}, optIn=${k.optIn})`);
            if (k.sample !== undefined) {
              console.log(`            sample:`);
              if (k.sample && typeof k.sample === 'object') {
                const lines = JSON.stringify(k.sample, null, 2).split('\n');
                for (const line of lines) console.log(`              ${line}`);
              } else {
                console.log(`              ${k.sample}`);
              }
            }
          }
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


