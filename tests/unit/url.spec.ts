import { describe, it, expect } from 'vitest';
import { canonicalizeUrl } from '../../src/utils/url.js';

describe('canonicalizeUrl', () => {
  it('sorts query params and extracts keys deterministically', () => {
    const u = 'https://example.com/path/to?p=2&a=1&a=1&b=3';
    const c = canonicalizeUrl(u);
    expect(c.host).toBe('example.com');
    expect(c.path).toBe('/path/to');
    // Sorted by key; duplicate keys preserved order among equals is fine
    expect(c.sortedQuery.startsWith('a=1')).toBe(true);
    expect(c.sortedQuery.includes('b=3')).toBe(true);
    expect(c.sortedQuery.endsWith('p=2')).toBe(true);
    expect(c.queryKeys[0]).toBe('a');
  });

  it('falls back gracefully on invalid URL strings', () => {
    const u = '/relative/path?z=1&y=2';
    const c = canonicalizeUrl(u as any);
    expect(c.host).toBe('');
    expect(c.path).toBe('/relative/path');
    // Keeps original order in fallback
    expect(c.sortedQuery).toBe('z=1&y=2');
    expect(c.queryKeys).toEqual(['z', 'y']);
  });
});


