# /scan API

POST /scan accepts JSON and returns a versioned, aggregated analysis for a given URL.

## Request body:
```json
{
  "url": "https://example.com",
  "autoconsentAction": "optOut"
}
```
- `autoconsentAction` (optional): "optIn" | "optOut". If provided, the CookiePopupsCollector will trigger the requested action.

## Response body (v1.0):
See `src/schema/types.ts` for the canonical `ApiResponseV1` interface and `src/schema/validator.ts` for the Zod schema.

A high-level overview:
```jsonc
{
  "schemaVersion": "1.0",
  "run": { /* RunMeta object */ },
  "summary": { /* Summary object */ },
  "cmps": [ /* Cmp[] object */ ],
  "trackers": [ /* Tracker[] object */ ],
  "events": [ /* AuditEvent[] object */ ],
  "leaks": [ /* AuditEvent[] object */ ],
  "checklist": { /* Checklist object */ }
}
```

### Key Object Shapes

- **RunMeta**: `id`, `url`, `normalizedUrl`, `domain`, `locale`, `jurisdiction`, `userAgent`, `viewport`, `gpcEnabled`.
- **Summary**: `verdict`, `reasons`, `totals` (counts for events, providers, stages), `timingsMs` (detailed performance timings).
- **Cmp**: `name`, `ruleKey`, `detected`, `cosmetic`, `firstLayerRejectAll`, timings, `consent` snapshots (TCF/GPP).
- **Tracker**: Normalized unique provider info: `{ name, key, type }`.
- **AuditEvent**: Deduped event with `id`, `hash`, `timestamp`, `stage`, `stages` (booleans for preConsent, afterOptOut, afterOptIn), `leak` flag, `request`/`response` info, `provider` details, and `data` parameters.
- **Checklist**: Staged results for reporting: `preConsent`, `popup`, `afterOptOut`, `afterOptIn`, `trackers`.

### Semantics

- **Staging**: Events are bucketed into `preConsent`, `afterOptOut`, or `afterOptIn` based on when they occurred relative to the consent action.
- **Deduplication**: `events` are deduped using a stable hash of `provider.key | host | path | sortedQueryString`.
- **Leaking**: `leaks` is a subset of `events` where `stages.afterOptOut` is true.

## Example request:
```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com","autoconsentAction":"optOut"}'
```
