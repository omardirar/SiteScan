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
  for (const r of requests) {
    const es = detectAll(r.url);
    if (es.length) {
      for (const e of es) {
        found.push({ ...e, stage: r.stage, request: r });
      }
    }
  }
  return found;
}
