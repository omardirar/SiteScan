import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

export async function handleDidomi(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  const rootSel = '.didomi-consent-popup, #didomi-popup';
  const acceptSel = 'button[aria-label="Agree to all"], .didomi-continue-without-agreeing';
  const rejectSel = 'button[aria-label="Decline"], .didomi-notice-disagree';
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
    return { detected: true, provider: 'Didomi', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'Didomi', action: null, error: e?.message || String(e) };
  }
}


