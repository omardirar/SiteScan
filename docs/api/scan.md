# /scan API

POST /scan accepts JSON and returns an aggregated analysis for a given URL.

Request body:
```json
{
  "url": "https://example.com",
  "autoconsentAction": "optOut"
}
```
- `autoconsentAction` (optional): "optIn" | "optOut". If provided, the CookiePopupsCollector will trigger the requested action after scraping completes when a CMP popup is found.

Response body (new contract):
```json
{
  "cmps": [ /* CMPInfo[] */ ],
  "trackers": [ { "name": "Google Ads", "key": "GOOGLEADS", "type": "Marketing" } ],
  "events": [ /* AuditEvent[] */ ],
  "leaks": [ /* AuditEvent[] (subset of events) */ ]
}
```

Types:
- CMPInfo (no shape change):
  - name, final, open, started, succeeded, selfTestFail, errors[], patterns[], snippets[], filterListMatched
- NormalizedTracker:
  - { name: string, key: string, type: string }
- AuditEvent:
  - { event: "webRequest", timestamp: number, resourceType: string, provider: ProviderInfo, data: EventDataItem[], seenInOptIn: boolean, seenInOptOut: boolean }
- ProviderInfo:
  - { name: string, key: string, type: string, columns: Record<string,string>, groups: {key:string, name:string}[] }
- EventDataItem:
  - { key: string, field?: string, value?: string|number|boolean|null, group?: string, hidden?: boolean|string }

Semantics:
- `events` are deduped across opt-in and opt-out using a stable key: providerKey + protocol//host + path + sorted query.
- `seenInOptIn` / `seenInOptOut` indicate in which crawl(s) this event occurred.
- `trackers` is the unique set of providers present across all events.
- `leaks` are events present only in the opt-out crawl (seenInOptOut == true && seenInOptIn == false).

Example request:
```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com","autoconsentAction":"optOut"}'
```

Notes:
- Timeouts and budgets can affect CMP detection; see `../config/timeouts.md` for knobs.
- The API returns HTTP 200 on success; operational crawl errors are reflected inside the output by virtue of empty cmps/events or inferred from timing.
