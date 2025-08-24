Lightweight tracker audit API (TypeScript + Node) that scans a single URL, performs best-effort auto-consent, stages network requests, parses trackers, computes consent leakage, and returns a versioned JSON report.

## Quick start
1) Install deps
   `npm i`

2) Dev server
   `npm run dev`

3) Scan
   `curl -s localhost:3000/scan -H 'content-type: application/json' -d '{"url":"https://example.com"}'`

## Features
- **Staged Crawl**: Captures network requests during pre-consent, after opt-out, and after opt-in stages.
- **CMP Automation**: Uses `@duckduckgo/autoconsent` to detect and interact with common CMPs.
- **Event Normalization**: Parses requests from a library of provider definitions into structured `AuditEvent` objects.
- **Deduplication**: Events are deduped across stages using a stable hash for accurate analysis.
- **Leak Detection**: Identifies trackers that fire after an opt-out action.
- **Versioning**: API responses follow a versioned schema (`v1.0`) for predictable contracts.

## API

`POST /scan` body: `{ "url": string, "autoconsentAction"?: "optIn" | "optOut" }`

### Response Schema (`schemaVersion: "1.0"`)
The API returns a single object containing detailed information about the scan. See `src/schema/types.ts` for the full `ApiResponseV1` interface.

```json
{
  "schemaVersion": "1.0",
  "run": {
    "id": "e8a7e3c0-3b0f-4b1e-9e0a-1b1e3e8a7e3c",
    "url": "https://example.com/",
    "normalizedUrl": "https://www.example.com/",
    "domain": "example.com",
    "locale": "EU",
    "jurisdiction": "GDPR",
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1366, "height": 768 },
    "gpcEnabled": false
  },
  "summary": {
    "verdict": "fail",
    "reasons": ["Leaking vendors detected after opt-out"],
    "totals": { "events": 3, "providers": 2, "preConsent": 1, "afterOptOut": 1, "afterOptIn": 1, "leaks": 1 },
    "timingsMs": { /* ... */ }
  },
  "cmps": [ /* ... */ ],
  "trackers": [ { "name": "Google Analytics 4", "key": "GA4", "type": "Analytics" } /* ... */ ],
  "events": [ { /* ... AuditEvent object ... */ } ],
  "leaks": [ { /* ... AuditEvent object where leak=true ... */ } ],
  "checklist": { /* ... Staged checklist for reporting ... */ }
}
```

### Semantics
- **Verdict**: The `summary.verdict` can be `pass`, `warn`, or `fail` based on rule violations (e.g., pre-consent tracking, leaks).
- **Staging**: `events` are tagged with the `stage` (`preConsent`, `afterOptOut`, `afterOptIn`) in which they were first observed. The `stages` object indicates all stages in which the event was present.
- **Deduplication**: Events are deduped by a hash of `provider.key | host | path | sortedQueryString`.

## Development
- **Structure**: The project is organized into `src/app` (server), `src/analysis` (core logic), `src/schema` (types/validators), and `src/utils`.
- **Testing**: Run tests with `npm test`. Integration and unit tests are located in `tests/`.
- **Linting**: Run `npm run lint` to check for code style issues.
- **Building**: Run `npm run build` to compile the TypeScript source.


