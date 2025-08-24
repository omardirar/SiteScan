import { describe, it, expect } from 'vitest';
import { canonicalizeUrl } from '/Users/omar/Documents/GitHub/website-auditor/src/utils/url.js';
import { sha1 } from '/Users/omar/Documents/GitHub/website-auditor/src/utils/hash.js';
// The new analysis logic is in scan.ts, but it's not easily unit-testable as it's a large function.
// The core logic is in buildNormalizedEventsAndTrackers, which is not exported.
// For this test, I will focus on the exported utilities.

describe('Analysis Utilities', () => {
  describe('canonicalizeUrl', () => {
    it('sorts query parameters', () => {
      const url = 'https://example.com?c=2&a=1&b=3';
      const canonical = canonicalizeUrl(url);
      expect(canonical.sortedQuery).toBe('a=1&b=3&c=2');
    });

    it('handles URLs without query strings', () => {
      const url = 'https://example.com/path';
      const canonical = canonicalizeUrl(url);
      expect(canonical.sortedQuery).toBe('');
      expect(canonical.path).toBe('/path');
    });

    it('extracts query keys correctly', () => {
        const url = 'https://example.com?c=2&a=1&b=3';
        const canonical = canonicalizeUrl(url);
        expect(canonical.queryKeys).toEqual(['a', 'b', 'c']);
    });
  });

  describe('sha1', () => {
    it('produces a consistent hash', () => {
      const input = 'test-string';
      const hash1 = sha1(input);
      const hash2 = sha1(input);
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('4f49d69613b186e71104c7ca1b26c1e5b78c9193');
    });
  });
});
