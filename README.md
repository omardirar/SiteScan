Lightweight tracker audit API (TypeScript + Node) that scans a single URL twice (optOut and optIn), performs best-effort auto-consent, filters third-party requests by eTLD+1, parses trackers (core + ported rules), computes consent leak, and returns a JSON report.

Quick start
1) Install deps
   npm i

2) Dev server
   npm run dev

3) Scan
   curl -s localhost:3000/scan -H 'content-type: application/json' -d '{"url":"https://example.com"}'

Design
- Fastify + zod route validation
- Puppeteer crawler (Chromium flags suitable for Cloud Run)
- eTLD+1 filtering via tldts
- Provider registry includes core and ported detectors:
  - Core: `gtm`, `ga4`, `meta` (Meta Pixel), `tiktok`
  - Ported: `googleads` (Google Ads), `ua` (Universal Analytics), `facebook` (Facebook Pixel), `linkedin` (LinkedIn Conversion), `binguet` (Bing Ads)
- External providers bridge: optionally loads additional detector stubs from repo-root `providers/` via `EXTERNAL_PROVIDERS_DIR`

Auto-consent
- CMP handlers: OneTrust, Cookiebot, Didomi, Quantcast, Sourcepoint, TrustArc, Usercentrics, plus a generic heuristic fallback
- Orchestrator retries with small backoff to allow dynamic banners to render

Autoconsent Cookie Popups Collector
- Per-frame isolated world injection of `@duckduckgo/autoconsent` with a CDP Runtime binding bridge.
- Full message protocol handling: `init`, `cmpDetected`, `popupFound`, `report`, `optOutResult`, `optInResult`, `autoconsentDone`, `selfTestResult`, `eval`, `autoconsentError`.
- Configurable autoconsent action and time budgets.

Environment variables
- `AUTOCONSENT_ACTION` = `optIn` | `optOut` (optional)
- `AUTOCONSENT_SCRAPE_TIMEOUT_MS` (default 12000)
- `AUTOCONSENT_ACTION_TIMEOUT_MS` (default 10000)
- `AUTOCONSENT_DETECT_TIMEOUT_MS` (default 5000)
- `AUTOCONSENT_FOUND_TIMEOUT_MS` (default 5000)
- `AUTOCONSENT_TOTAL_BUDGET_MS` (default 20000)
- `COLLECTOR_EXTRA_TIME_MS` (default 4000)

API
`POST /scan` body: `{ url: string, autoconsentAction?: 'optIn' | 'optOut' }`.

Response schema (default)
`{ cmps: CMPInfo[], trackers: {name,key,type}[], events: AuditEvent[], leaks: AuditEvent[] }`

Notes
- `events` are deduped across opt-in/opt-out and include `seenInOptIn`/`seenInOptOut` flags.
- `trackers` are normalized unique providers present in events.
- `leaks` = events present only in opt-out.
- Pass `?legacy=1` to receive a minimal legacy-compatible structure during migration.

Leak semantics
- A tag is considered leaked if it fires during the optOut crawl (regardless of optIn). Output contains `leakDetected` and unique `leakedTags` derived from optOut events.

Cloud Run tips
- Concurrency: 1
- Memory: 1024–2048 MiB
- Flags: --no-sandbox --disable-dev-shm-usage --disable-gpu --no-zygote


