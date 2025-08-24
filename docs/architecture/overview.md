# Architecture Overview

The Website Auditor consists of:

- **Server (`src/app`)**: A Fastify server that handles HTTP requests, validation, and routing.
- **Analysis (`src/analysis`)**: The core orchestration layer. It runs crawls, partitions requests into stages (pre-consent, post-consent), parses them into tracker events, performs deduplication, and builds the final `ApiResponseV1`.
- **Crawling (`src/analysis/crawl`)**: A Puppeteer-based crawler responsible for navigating pages, capturing network requests, and interacting with CMPs via the `@duckduckgo/autoconsent` library.
- **Parsing (`src/analysis/parsing`)**: A library of provider definitions that normalizes raw network requests into structured `TrackerEvent` objects.
- **Schema (`src/schema`)**: Centralized TypeScript types and Zod validators for the API contracts, ensuring type safety and data integrity.
- **Utilities (`src/utils`)**: Shared helper functions for tasks like hashing and URL canonicalization.

## High-level Flow

1.  **POST `/scan`**: The server receives a request with a URL and an optional `autoconsentAction`.
2.  **`runScan` Orchestration**:
    - Two parallel crawls are initiated: one for `optOut` and one for `optIn`.
    - Each `crawlOne` process launches Puppeteer, navigates to the URL, and injects the CMP collector.
    - Network requests are captured with high-resolution timestamps.
    - If a CMP is detected and an action is specified, the collector performs the opt-out/opt-in. The timestamp of this action is recorded.
3.  **Staging**: Requests from both crawls are partitioned into three stages: `preConsent`, `afterOptOut`, and `afterOptIn`, based on their timestamps relative to the consent action.
4.  **Parsing**: All staged requests are processed by the provider library to identify tracker events.
5.  **Normalization & Deduplication**:
    - Tracker events are deduplicated using a stable hash (`provider.key | host | path | sortedQueryString`).
    - A single `AuditEvent` is created for each unique hash, aggregating its presence across all stages.
6.  **Response Generation**: The final `ApiResponseV1` object is assembled, including run metadata, a summary, CMP details, normalized trackers, staged audit events, leaks, and a checklist.

## Data Model

The data model is defined in `src/schema/types.ts`. Key interfaces include:
- `ApiResponseV1`: The top-level response object.
- `AuditEvent`: A normalized, deduplicated tracking event with staging information.
- `Tracker`: A unique, normalized provider.
- `Checklist`: A report-friendly summary of findings across stages.

See `../api/scan.md` for more detailed schemas.
