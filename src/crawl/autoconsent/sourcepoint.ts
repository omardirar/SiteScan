import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

// Adapted heuristics for Sourcepoint CMP
export async function handleSourcepoint(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // Common Sourcepoint selectors: #sp_message_container, .sp_veil, .sp_choice_type_11 (accept all), .sp_choice_type_12 (reject all)
  const rootSel = '#sp_message_container, .sp_veil';
  const acceptSel = '.sp_choice_type_11, button[aria-label="Accept All"]';
  const rejectSel = '.sp_choice_type_12, button[aria-label="Reject All"]';
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
    return { detected: true, provider: 'Sourcepoint', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'Sourcepoint', action: null, error: e?.message || String(e) };
  }
}


