# Troubleshooting CMP Detection

If `cmps` is empty:
- The site may not load a CMP in your region/variant.
- Increase budgets in `docs/config/timeouts.md` (DETECT/FOUND/SCRAPE/ACTION/OVERALL).
- Ensure the collector starts before navigation (the crawler does this by default).

If actions don’t trigger:
- Actions are attempted after a popup is found and scraping completes.
- The collector chooses opt-out for the optOut run and opt-in for the optIn run.
- Some CMPs require multiple seconds to process; consider raising `AUTOCONSENT_ACTION_TIMEOUT_MS`.

Notes
- The system does not use heuristic fallbacks for CMPs; results come from the DuckDuckGo autoconsent collector.
- Collector operates in an isolated world via CDP; see logs for "Injection error" if contexts fail.
