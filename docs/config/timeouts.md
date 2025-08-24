# Timeouts & Budgets

The CMP collection and crawl budgets are governed by environment variables used when constructing `CookiePopupsCollectorOptions`.

Variables (defaults in parentheses):
- `NAV_TIMEOUT_MS` (45000): page navigation timeout
- `POST_CONSENT_WAIT_MS` (10000): wait after consent handling for network to settle
- `AUTOCONSENT_SCRAPE_TIMEOUT_MS` (20000): maximum time to scrape frames for popups/buttons/text
- `AUTOCONSENT_ACTION_TIMEOUT_MS` (30000): maximum time to wait for opt-out/opt-in result
- `AUTOCONSENT_DETECT_TIMEOUT_MS` (8000): maximum time to wait for CMP detection message
- `AUTOCONSENT_FOUND_TIMEOUT_MS` (8000): maximum time to wait for popupFound message
- `AUTOCONSENT_TOTAL_BUDGET_MS` (35000): collector overall budget (used in Promise.race to bound wait time)
- `COLLECTOR_EXTRA_TIME_MS` (5000): extra buffer added to the overall wait

Tuning tips:
- Increase `DETECT`/`FOUND` for pages with heavy client-side loading.
- Increase `ACTION` for CMPs that navigate through multiple layers.
- Increasing the `TOTAL_BUDGET` can slow scans. Prefer targeted increases.
