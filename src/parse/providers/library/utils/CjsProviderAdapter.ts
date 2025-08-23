import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

export type CjsProviderInstance = {
  _key: string;
  _name: string;
  _type: string;
  _pattern: RegExp;
  keywords?: string[];
  columnMapping?: Record<string, string>;
  groups?: Array<{ key: string; name: string }>;
  keys?: Record<string, { name?: string; group?: string; hidden?: boolean }>;
  parseUrl: (rawUrl: string, postData?: unknown) => unknown;
};

export type ProviderWrapper = {
  key: string;
  name: string;
  type: string;
  pattern: RegExp;
  keywords: string[];
  columnMapping: Record<string, string>;
  groups: Array<{ key: string; name: string }>;
  keys: Record<string, { name?: string; group?: string; hidden?: boolean }>;
  parseUrl: (rawUrl: string, postData?: unknown) => unknown;
};

const require = createRequire(import.meta.url);

export function resolveProvidersDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = path.dirname(thisFile);
  // ../../../../../providers from library/utils/* to repo-root/providers
  return path.resolve(thisDir, '../../../../../providers');
}

export function loadCjsProvider(absolutePathToCjsFile: string): ProviderWrapper {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const CjsClass = require(absolutePathToCjsFile);
  const instance: CjsProviderInstance = new CjsClass();
  return {
    key: instance._key,
    name: instance._name,
    type: toReadableType(instance._type),
    pattern: instance._pattern,
    keywords: instance.keywords || [],
    columnMapping: instance.columnMapping || {},
    groups: instance.groups || [],
    keys: instance.keys || {},
    parseUrl: (rawUrl: string, postData?: unknown) => instance.parseUrl(rawUrl, postData),
  };
}

function toReadableType(t: string): string {
  const types: Record<string, string> = {
    analytics: 'Analytics',
    customer: 'Customer Engagement',
    testing: 'UX Testing',
    tagmanager: 'Tag Manager',
    visitorid: 'Visitor Identification',
    marketing: 'Marketing',
    replay: 'Session Replay/Heat Maps',
  };
  return types[t] || 'Unknown';
}


