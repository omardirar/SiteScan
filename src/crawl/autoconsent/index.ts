import type { Page } from 'puppeteer';
import { handleOneTrust } from './onetrust.js';
import { handleCookiebot } from './cookiebot.js';
import { handleDidomi } from './didomi.js';
import { handleQuantcast } from './quantcast.js';
import { handleSourcepoint } from './sourcepoint.js';
import { handleTrustArc } from './trustarc.js';
import { handleUsercentrics } from './usercentrics.js';
import { handleGeneric } from './generic.js';
import type { CookieBanner } from '../../core/model/types.js';

export async function autoConsent(page: Page, mode: 'optIn' | 'optOut'): Promise<CookieBanner> {
  const sequence = [
    handleOneTrust,
    handleCookiebot,
    handleDidomi,
    handleQuantcast,
    handleSourcepoint,
    handleTrustArc,
    handleUsercentrics,
    handleGeneric,
  ];
  const started = Date.now();
  let attempts = 0;
  const maxAttempts = 6;
  const baseDelay = 800; // ms
  for (let i = 0; i < maxAttempts; i++) {
    attempts++;
    for (const handler of sequence) {
      try {
        const result = await handler(page, mode);
        if (result && result.detected) {
          return { ...result, error: result.error ?? null, action: result.action ?? null, detected: true, provider: result.provider, attempts, durationMs: Date.now() - started } as any;
        }
      } catch {
        // ignore and continue
      }
    }
    // small backoff and allow DOM mutations between attempts
    await new Promise(r => setTimeout(r, baseDelay * (i + 1)));
  }
  return { detected: false, provider: null, action: null, error: null, attempts, durationMs: Date.now() - started } as any;
}


