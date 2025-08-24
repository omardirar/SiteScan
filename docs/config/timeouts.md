# Timeouts & Budgets

CMP collection and crawl budgets are configured via environment variables.

Variables (defaults):
- `NAV_TIMEOUT_MS` (45000): navigation timeout
- `POST_CONSENT_WAIT_MS` (10000): wait after consent before collecting post-action network
- `AUTOCONSENT_SCRAPE_TIMEOUT_MS` (20000)
- `AUTOCONSENT_ACTION_TIMEOUT_MS` (30000)
- `AUTOCONSENT_DETECT_TIMEOUT_MS` (8000)
- `AUTOCONSENT_FOUND_TIMEOUT_MS` (8000)
- `AUTOCONSENT_TOTAL_BUDGET_MS` (35000)
- `COLLECTOR_EXTRA_TIME_MS` (5000)

Tuning tips
- Increase DETECT/FOUND for heavy client-side pages.
- Increase ACTION if CMP requires multi-step navigation.
- Increasing TOTAL_BUDGET slows scans; prefer targeted adjustments.
