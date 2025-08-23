import { describe, it, expect } from 'vitest';
import { computeConsentLeak } from '../../src/core/util/consentDiff.js';

describe('computeConsentLeak', () => {
  it('detects leak when any optOut event exists', () => {
    const optOut = [{ providerKey: 'gtm', name: 'GTM', url: 'https://gtm.example' }];
    const optIn: any[] = [{ providerKey: 'gtm', name: 'GTM', url: 'https://gtm.example' }];
    const leak = computeConsentLeak(optOut as any, optIn as any);
    expect(leak.leakDetected).toBe(true);
    expect(leak.leakedTags).toContain('GTM');
  });
  it('no leak when optOut empty', () => {
    const leak = computeConsentLeak([], []);
    expect(leak.leakDetected).toBe(false);
  });
});


