# Architecture Overview

The Website Auditor consists of:

- Server (Fastify): `src/server/index.ts`, routes under `src/server/routes/`
- Core Orchestration: `src/core/scan.ts` which runs two crawls (opt-out and opt-in) and produces a normalized aggregate (`ApiResponse`)
- Crawler: `src/crawl/` (Puppeteer-based) with:
  - `engine/browser.ts`: Chromium flags and launcher (Cloud Run friendly)
  - `crawlOne.ts`: executes a single crawl with request capture, CMP collection, and budgets
  - `collectors/`: `CookiePopupsCollector` for CMP detection/scraping/actions
  - `cdp/`: helper utilities (isolated worlds, runtime bindings)
  - `content-scripts/`: loader for `@duckduckgo/autoconsent`
- Parsing: `src/parse/` (provider library and registry) that normalizes network requests to provider events

## High-level Flow

1. Server receives POST /scan { url, autoconsentAction }
2. `scanUrl` runs two crawls in parallel (optOut & optIn):
   - Launch Chromium (Puppeteer)
   - Start `CookiePopupsCollector` (bind CDP, create isolated worlds per frame, inject content script)
   - Navigate to the target URL
   - Start request capture (filtering first/third-party happens later during parse)
   - Collector scrapes frames and waits for CMP messages; if action requested and popup found, triggers opt-out/opt-in
   - Merge outputs: requests + `cookiePopups.cmps`
3. Parse requests via provider registry into `TrackerEvent`s
4. Deduplicate and build `AuditEvent`s with `seenInOptIn/seenInOptOut`
5. Produce `ApiResponse` { cmps, trackers, events, leaks }

## CMP Collection

- Per-frame isolated world created with `Page.createIsolatedWorld`
- `Runtime.addBinding` bridges content script messages back to the collector
- `@duckduckgo/autoconsent` content script injected with a wrapper to forward messages via the binding
- Messages handled: init, cmpDetected, popupFound, report, optInResult/optOutResult, autoconsentDone, selfTestResult, eval, autoconsentError
- Config enables filter-list and heuristic detection; timeboxes for scraping, detection, and action

## Data Model

- `ProviderInfo` describes a provider (name, key, type) with declared columns and groups (from the provider library)
- `EventDataItem[]` stores provider parameters with optional field/group/hidden metadata
- `AuditEvent` ties a network event to provider info and adds seen flags
- `NormalizedTracker` is a compact provider identity

See `../api/scan.md` for schemas.
