# Troubleshooting CMP Detection

If `cmps` is empty:
- The page may not show a CMP in your region/variant. Try another URL known to use OneTrust/Cookiebot.
- Increase budgets: `AUTOCONSENT_DETECT_TIMEOUT_MS`, `AUTOCONSENT_FOUND_TIMEOUT_MS`, `AUTOCONSENT_SCRAPE_TIMEOUT_MS`, `AUTOCONSENT_ACTION_TIMEOUT_MS`.
- Ensure the collector starts before navigation (already configured).
- Filter-list matching is enabled; if you’re still not seeing `cmpDetected`, it may be heuristic-only or unsupported.

If actions don’t trigger:
- Action starts only after scraping completes and a `popupFound` occurred.
- Confirm `autoconsentAction` is set (`optOut`/`optIn`).
- Some CMPs need multiple seconds to process; consider raising `AUTOCONSENT_ACTION_TIMEOUT_MS`.
