import { z } from 'zod';

const RunMetaSchema = z.object({
  id: z.string(),
  url: z.string(),
  normalizedUrl: z.string(),
  domain: z.string(),
  locale: z.string(),
  jurisdiction: z.string(),
  userAgent: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  gpcEnabled: z.boolean(),
});

const SummarySchema = z.object({
  verdict: z.enum(['pass', 'warn', 'fail']),
  reasons: z.array(z.string()),
  totals: z.object({
    events: z.number(),
    providers: z.number(),
    preConsent: z.number(),
    afterOptOut: z.number(),
    afterOptIn: z.number(),
    leaks: z.number(),
  }),
  timingsMs: z.object({
    startedAt: z.number(),
    endedAt: z.number(),
    total: z.number(),
    preConsentObserve: z.number(),
    cmpDetect: z.number(),
    optOutAction: z.number(),
    postOptOutObserve: z.number(),
    optInAction: z.number(),
    postOptInObserve: z.number(),
  }),
});

const CmpSchema = z.object({
  name: z.string(),
  ruleKey: z.string(),
  detected: z.boolean(),
  cosmetic: z.boolean(),
  firstLayerRejectAll: z.boolean(),
  secondLayerOnly: z.boolean(),
  detectedAtMs: z.number(),
  handledAtMs: z.number(),
  consent: z.object({
    tcf: z
      .object({
        enabled: z.boolean(),
        version: z.string().optional(),
        afterOptOut: z.record(z.unknown()).optional(),
        afterOptIn: z.record(z.unknown()).optional(),
      })
      .optional(),
    gpp: z
      .object({
        enabled: z.boolean(),
      })
      .optional(),
  }),
});

const TrackerSchema = z.object({
  name: z.string(),
  key: z.string(),
  type: z.string(),
});

const EventStagesSchema = z.object({
  preConsent: z.boolean(),
  afterOptOut: z.boolean(),
  afterOptIn: z.boolean(),
});

const RequestInfoSchema = z.object({
  method: z.string(),
  url: z.string(),
  host: z.string(),
  path: z.string(),
  queryKeys: z.array(z.string()),
});

const ResponseInfoSchema = z.object({
  status: z.number(),
  mime: z.string(),
  sizeB: z.number(),
});

const ProviderInfoSchema = z.object({
  name: z.string(),
  key: z.string(),
  type: z.string(),
  columns: z.record(z.string()),
  groups: z.array(z.object({ key: z.string(), name: z.string() })),
});

const EventDataItemSchema = z.object({
  key: z.string(),
  field: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  group: z.string().optional(),
  hidden: z.union([z.boolean(), z.string()]).optional(),
});

const AuditEventSchema = z.object({
  id: z.string(),
  hash: z.string(),
  event: z.literal('webRequest'),
  timestamp: z.number(),
  stage: z.enum(['preConsent', 'afterOptOut', 'afterOptIn']),
  stages: EventStagesSchema,
  seenInOptIn: z.boolean(),
  seenInOptOut: z.boolean(),
  leak: z.boolean(),
  thirdParty: z.boolean(),
  resourceType: z.string(),
  request: RequestInfoSchema,
  response: ResponseInfoSchema,
  provider: ProviderInfoSchema,
  data: z.array(EventDataItemSchema),
});

const ChecklistStageResultSchema = z.object({
  pass: z.boolean(),
  thirdPartyRequests: z.number(),
  vendors: z.array(
    z.object({ name: z.string(), key: z.string(), count: z.number() }),
  ),
  leakingVendors: z
    .array(z.object({ name: z.string(), key: z.string(), count: z.number() }))
    .optional(),
});

const ChecklistPopupResultSchema = z.object({
  pass: z.boolean(),
  cmp: z.string(),
  firstLayerRejectAll: z.boolean(),
  cosmetic: z.boolean(),
  appearedAtMs: z.number(),
  handledAtMs: z.number(),
});

const ChecklistTrackersResultSchema = z.object({
  uniqueProviders: z.number(),
  summary: z.array(
    z.object({
      name: z.string(),
      key: z.string(),
      type: z.string(),
      preConsent: z.number(),
      afterOptOut: z.number(),
      afterOptIn: z.number(),
    }),
  ),
});

const ChecklistSchema = z.object({
  url: z.string(),
  locale: z.string(),
  stages: z.object({
    preConsent: ChecklistStageResultSchema,
    popup: ChecklistPopupResultSchema,
    afterOptOut: ChecklistStageResultSchema,
    afterOptIn: ChecklistStageResultSchema,
    trackers: ChecklistTrackersResultSchema,
  }),
  verdict: z.enum(['pass', 'warn', 'fail']),
  notes: z.array(z.string()),
});

export const ApiResponseV1Schema = z.object({
  schemaVersion: z.literal('1.0'),
  run: RunMetaSchema,
  summary: SummarySchema,
  cmps: z.array(CmpSchema),
  trackers: z.array(TrackerSchema),
  events: z.array(AuditEventSchema),
  leaks: z.array(AuditEventSchema),
  checklist: ChecklistSchema,
});
