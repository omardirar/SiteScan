import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

// Adapted heuristics from DuckDuckGo TRC cookie popup handling and common Quantcast CMP selectors
export async function handleQuantcast(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // Common Quantcast selectors (variants):
  // container: .qc-cmp2-container, #qcCmpButtons, .qc-cmp-ui
  // accept: .qc-cmp2-summary-buttons .qc-cmp2-summary-buttons-accept, button[mode="primary"], .qc-cmp2-buttons .qc-cmp2-accept-all
  // reject: .qc-cmp2-buttons .qc-cmp2-reject-all, .qc-cmp2-summary-buttons .qc-cmp2-summary-buttons-reject
  const rootSel = '.qc-cmp2-container, .qc-cmp-ui, #qcCmpButtons';
  const acceptSel = '.qc-cmp2-accept-all, .qc-cmp2-summary-buttons-accept, button[mode="primary"][data-accept]';
  const rejectSel = '.qc-cmp2-reject-all, .qc-cmp2-summary-buttons-reject, button[mode="secondary"][data-reject]';
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
    return { detected: true, provider: 'Quantcast', action: mode, error: null };
  } catch (e: any) {
    return { detected: true, provider: 'Quantcast', action: null, error: e?.message || String(e) };
  }
}


