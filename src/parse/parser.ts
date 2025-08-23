import type { CrawlOutput, TrackerEvent } from '../core/model/types.js';
import { detectAll } from './providers/index.js';

export function parseRequests(crawl: CrawlOutput): TrackerEvent[] {
  const found: TrackerEvent[] = [];
  for (const r of crawl.requests) {
    const es = detectAll(r.url);
    if (es.length) found.push(...es);
  }
  // dedupe by providerKey+url
  const seen = new Set<string>();
  const deduped: TrackerEvent[] = [];
  for (const e of found) {
    const key = `${e.providerKey}:${e.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }
  return deduped;
}


