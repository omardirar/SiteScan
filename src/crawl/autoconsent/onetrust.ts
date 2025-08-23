import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

export async function handleOneTrust(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // OneTrust common selectors
  const rootSel = '#onetrust-banner-sdk, .ot-sdk-container';
  const acceptSel = '#onetrust-accept-btn-handler, button[aria-label="Accept All"]';
  const rejectSel = '#onetrust-reject-all-handler, button[aria-label="Reject All"]';
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
    return { detected: true, provider: 'OneTrust', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'OneTrust', action: null, error: e?.message || String(e) };
  }
}


