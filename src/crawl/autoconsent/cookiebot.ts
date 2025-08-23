import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

export async function handleCookiebot(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  const rootSel = '#CybotCookiebotDialog, .CookiebotWidget';
  const acceptSel = '#CybotCookiebotDialogBodyLevelButtonAccept, button[data-cookieconsent="accept-all"]';
  const rejectSel = '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll, button[data-cookieconsent="reject-all"]';
  const exists = await page.$(rootSel);
  if (!exists) return null;
  try {
    if (mode === 'optIn') {
      const a = await page.$(acceptSel);
      if (a) await a.click();
    } else {
      const r = await page.$(rejectSel);
      if (r) await r.click();
    }
    return { detected: true, provider: 'Cookiebot', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'Cookiebot', action: null, error: e?.message || String(e) };
  }
}


