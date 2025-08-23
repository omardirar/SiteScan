import { describe, it, expect } from 'vitest';
import { detectAll } from '../../src/parse/providers/index.js';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const providersRoot = path.resolve(process.cwd(), '..', 'providers');

function legacyParse(url: string, postData = '') {
  const legacy = require(path.join(providersRoot, 'index.js'));
  return legacy.parseUrl(url, postData);
}

describe('Ported providers parity', () => {
  it('Google Ads match parity', () => {
    const url = 'https://www.google.com/pagead/viewthroughconversion/AW-123456?label=abc&url=https%3A%2F%2Fsite.com';
    const legacy = legacyParse(url);
    const modern = detectAll(url);
    expect(legacy.length > 0).toBe(true);
    expect(modern.length > 0).toBe(true);
  });

  it('Facebook Pixel match parity', () => {
    const url = 'https://www.facebook.com/tr/?id=12345&ev=Purchase&dl=https%3A%2F%2Fsite.com';
    const legacy = legacyParse(url);
    const modern = detectAll(url);
    expect(legacy.length > 0).toBe(true);
    expect(modern.length > 0).toBe(true);
  });

  it('GA4 negative near-miss', () => {
    const url = 'https://bad.example.com/notga4';
    const legacy = legacyParse(url);
    const modern = detectAll(url);
    expect(Array.isArray(legacy)).toBe(true);
    expect(modern.length).toBe(0);
  });
});
