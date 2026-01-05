# Leak Lens - A Site Auditor

A lightweight Node.js + TypeScript service that scans a single URL in a headless browser, performs staged consent actions, analyzes network traffic, detects trackers via a provider library, and returns a versioned JSON report.

Key technologies: Fastify, Puppeteer, Zod, Vitest, ESLint/Prettier.

## Quick start

- Install: `npm i`
- Dev server: `npm run dev` (listens on :3000)
- Call API:

```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}' | jq '.'
```

## API

POST /scan body: { url: string }
- Response is ApiResponseV1 with schemaVersion "1.0". See `src/schema/types.ts`.

What the system does:
- Crawl twice with Puppeteer: optOut and optIn (autoconsent controlled internally).
- Capture all requests; annotate each with a timestamp.
- Partition requests into stages (preConsent, afterOptOut, afterOptIn) by action timestamp.
- Parse network URLs with a provider detector library into TrackerEvents.
- Normalize and dedupe into AuditEvents; compute leaks (events seen after opt-out).
- Include CMPs found by the autoconsent collector.

Conceptual architecture:
- Server: `src/app` (Fastify route `src/app/routes/scan.ts` validates input and calls runScan)
- Analysis: `src/analysis/scan.ts` orchestrates two crawls, staging, parsing, normalization, summary
- Crawl: `src/analysis/crawl` (Puppeteer launch and per-run logic). Consent collector integrates DuckDuckGo autoconsent via CDP isolated worlds
- Parsing: `src/analysis/parse` (detector registry; converts URLs to TrackerEvents)
- Schema: `src/schema` (types and Zod validators)
- Utils: `src/utils` (hashing, URL canonicalization)

Data flow in short:
1) /scan → runScan(url)
2) runScan → Promise.all(crawlOne(url, 'optOut'), crawlOne(url, 'optIn'))
3) Each crawl collects requests and CMP results; actionTimestamp records consent time
4) Partition requests by stage
5) Parse requests → TrackerEvents → merge to AuditEvents (stable hash)
6) Build trackers, leaks, checklist, summary

## Testing

- Run tests: `npm test`
- Tests include unit and integration with mocked crawl outputs

## Linting / Typechecking / Build

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

## CI

- GitHub Actions workflow `.github/workflows/ci.yml` runs install, lint, typecheck, build, and tests on PRs and pushes.

## Notes

- The service captures all requests (not just third-party)
- CMP detection leverages DuckDuckGo autoconsent; injection is done in an isolated world using CDP
- Event dedupe hash is based on provider key + canonicalized URL parts
- See inline TODOs (e.g., in `src/analysis/scan.ts`) for future improvements (logger, timings, structure)

## Todos

- [Schema 2.0](schemas\auditor\2.0.json) migration
- Performance tests


