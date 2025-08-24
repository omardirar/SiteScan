import type { CrawlRequestRecord, TrackerEvent } from '../../schema/types.js';
import { detectAll } from './providers/index.js';

type StagedRequest = CrawlRequestRecord & {
  stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
};

export function parseRequests(requests: StagedRequest[]): (TrackerEvent & {
  stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
  request: CrawlRequestRecord;
})[] {
  const found: (TrackerEvent & {
    stage: 'preConsent' | 'afterOptOut' | 'afterOptIn';
    request: CrawlRequestRecord;
  })[] = [];
  // TODO: Replace console logging with a logger; add trace id per run
  console.log(`Parsing ${requests.length} requests...`);
  for (const r of requests) {
    const es = detectAll(r.url);
    if (es.length) {
      // TODO: Make verbose parsing logs optional behind DEBUG flag
      console.log(`Found ${es.length} tracker events for URL: ${r.url}`);
      for (const e of es) {
        found.push({ ...e, stage: r.stage, request: r });
      }
    }
  }
  console.log(`Total tracker events found: ${found.length}`);
  return found;
}
