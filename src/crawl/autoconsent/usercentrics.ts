import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

// Adapted heuristics for Usercentrics CMP
export async function handleUsercentrics(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // Common selectors: #usercentrics-root, .uc-banner, .uc-overlay
  // Buttons: button[data-testid="uc-accept-all-button"], button[data-testid="uc-deny-all-button"]
  const rootSel = '#usercentrics-root, .uc-banner, .uc-overlay, [id^="usercentrics-"]';
  const acceptSel = 'button[data-testid="uc-accept-all-button"], button[aria-label="Accept All"]';
  const rejectSel = 'button[data-testid="uc-deny-all-button"], button[aria-label="Reject All"]';
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
    return { detected: true, provider: 'Usercentrics', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'Usercentrics', action: null, error: e?.message || String(e) };
  }
}


