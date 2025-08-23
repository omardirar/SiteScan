import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

// Adapted heuristics for TrustArc CMP
export async function handleTrustArc(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // Common selectors: #truste-consent-track, .truste_box_overlay, .truste_box, .trustarc-ui
  // Buttons: #truste-consent-button, #truste-reject-button or [data-truste-action="accept"] / [data-truste-action="reject"]
  const rootSel = '#truste-consent-track, .truste_box, .truste_box_overlay, .trustarc-ui';
  const acceptSel = '#truste-consent-button, [data-truste-action="accept"], button[aria-label="Accept All"]';
  const rejectSel = '#truste-reject-button, [data-truste-action="reject"], button[aria-label="Reject All"]';
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
    return { detected: true, provider: 'TrustArc', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'TrustArc', action: null, error: e?.message || String(e) };
  }
}


