# /scan API

POST /scan
- Content-Type: application/json
- Body:
```json
{ "url": "https://example.com" }
```

Response (v1.0)
- `schemaVersion`: "1.0"
- `run`: Run metadata (`id`, `url`, `normalizedUrl`, `domain`, `locale`, `jurisdiction`, `userAgent`, `viewport`, `gpcEnabled`)
- `summary`: verdict, reasons, counts per stage, timings
- `cmps`: CMP array detected by the autoconsent collector
- `trackers`: unique providers derived from events
- `events`: deduped tracker events with stage presence and data
- `leaks`: subset of `events` where `stages.afterOptOut` is true
- `checklist`: staged reporting-friendly output

Example
```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}' | jq '{cmps:(.cmps|length), trackers:(.trackers|length), events:(.events|length), leaks:(.leaks|length)}'
```

Semantics
- Staging is computed using the action timestamp from the CMP collector.
- Deduplication uses provider key + canonical URL host/path/sorted query.
- Leaks indicate non-compliance after an opt-out.
