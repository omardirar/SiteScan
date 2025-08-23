import { TrackerEvent } from '../model/types.js';

export function computeConsentLeak(optOut: TrackerEvent[], _optIn: TrackerEvent[]) {
  const leakedNames = Array.from(new Set(optOut.map((e) => e.name))).sort();
  return { leakDetected: leakedNames.length > 0, leakedTags: leakedNames };
}


