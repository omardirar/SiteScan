import type { Page } from 'puppeteer';
import type { CookieBanner } from '../../core/model/types.js';

const ACCEPT_WORDS = [/accept/i, /agree/i, /allow/i, /consent/i, /ok/i];
const REJECT_WORDS = [/reject/i, /decline/i, /deny/i, /refuse/i, /necessary only/i];

async function clickByText(page: Page, patterns: RegExp[]): Promise<boolean> {
  const buttons = await page.$$('button, [role="button"], input[type="button"], input[type="submit"]');
  for (const b of buttons) {
    const txt = (await page.evaluate((el) => el.textContent || '', b)).trim();
    if (patterns.some((p) => p.test(txt))) {
      try { await b.click({ delay: 10 }); return true; } catch { /* continue */ }
    }
  }
  return false;
}

export async function handleGeneric(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner | null> {
  // Heuristic: search for any visible consent-like buttons
  try {
    const acted = mode === 'optIn' ? await clickByText(page, ACCEPT_WORDS) : await clickByText(page, REJECT_WORDS);
    if (acted) {
      return { detected: true, provider: 'Generic', action: mode, error: null };
    }
  } catch (e: any) {
    return { detected: true, provider: 'Generic', action: null, error: e?.message || String(e) };
  }
  return null;
}


