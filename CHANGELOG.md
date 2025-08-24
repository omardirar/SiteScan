# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-08-24

### BREAKING CHANGES

- **API Response Schema**: The `/scan` endpoint now returns a new, versioned (`v1.0`) JSON object. The previous response structure is no longer supported.
  - The new schema includes detailed run metadata, a summary verdict, a staged checklist, and normalized, deduplicated event and tracker arrays.
  - See `docs/api/scan.md` and `src/schema/types.ts` for the full `ApiResponseV1` structure.

### Features

- **Staged Analysis**: The crawl process now partitions network requests into `preConsent`, `afterOptOut`, and `afterOptIn` stages, enabling more precise consent and leakage analysis.
- **Event Deduplication**: Tracker events are now deduplicated across stages using a stable hash, providing a cleaner and more accurate event list.
- **Checklist and Summary**: The API response includes a new `checklist` object for report generation and a `summary` object with a `verdict` (`pass`/`warn`/`fail`) and reasons.

### Refactor

- **Project Structure**: The source code has been reorganized into a more modular structure:
  - `src/app`: Server and routing logic.
  - `src/analysis`: Core crawling, parsing, and analysis logic.
  - `src/schema`: TypeScript types and Zod validators.
  - `src/utils`: Shared utilities.
- **Third-Party Filtering Removed**: The service now captures all network requests, not just those from third-party domains.
