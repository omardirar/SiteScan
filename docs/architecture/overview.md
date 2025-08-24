# Architecture Overview

The Website Auditor service orchestrates two page crawls (opt-out, opt-in), partitions network activity into stages using consent action timestamps, converts matching requests into tracker events via a provider library, deduplicates them, and produces a versioned API response.

Modules
- Server (`src/app`): Fastify server, routing, input validation.
- Analysis (`src/analysis`): Orchestrates crawling, staging, parsing, normalization, summary.
- Crawl (`src/analysis/crawl`): Puppeteer launch and per-run logic; consent collector integrating DuckDuckGo autoconsent in an isolated world via CDP.
- Parsing (`src/analysis/parse`): Detector registry that maps URLs to provider-specific events.
- Schema (`src/schema`): Types and Zod validators for the `ApiResponseV1` contract.
- Utils (`src/utils`): URL canonicalization and hashing.

Flow
1. Client POSTs `/scan` with `{ url }`.
2. `runScan(url)` executes two crawls in parallel: one with autoconsent opt-out, another opt-in.
3. Each crawl collects network requests (timestamped) and CMP results from the collector.
4. Requests are partitioned into stages based on the recorded action timestamp.
5. URLs are parsed through the provider library to generate `TrackerEvent`s.
6. Tracker events are normalized and deduplicated into `AuditEvent`s, which indicate presence across stages and whether the event leaked after opt-out.
7. Response includes run meta, summary, CMPs, trackers, events, leaks, and a checklist.

Key Concepts
- Staging: preConsent, afterOptOut, afterOptIn.
- Deduplication: Provider key + canonicalized URL host/path/sorted query.
- Leaks: Events observed after an opt-out action.
- CMPs: From the autoconsent collector (no heuristic fallback).
