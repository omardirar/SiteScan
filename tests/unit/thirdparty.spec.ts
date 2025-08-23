import { describe, it, expect } from 'vitest';
import { isThirdParty } from '../../src/crawl/thirdparty.js';

describe('isThirdParty', () => {
  it('same domain returns false', () => {
    expect(isThirdParty('https://cdn.example.com/script.js', 'https://www.example.com')).toBe(false);
  });
  it('different domain returns true', () => {
    expect(isThirdParty('https://tracker.com/collect', 'https://www.example.com')).toBe(true);
  });
  it('public suffix only returns true', () => {
    expect(isThirdParty('https://com/whatever', 'https://example.com')).toBe(true);
  });
});


