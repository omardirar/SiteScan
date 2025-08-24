/**
 * Generic Base Provider (ported to TypeScript ESM)
 */

export type ProviderDataEntry = {
  key: string;
  field?: string;
  value?: string | number | boolean | null;
  group?: string;
  hidden?: boolean | string;
};

export type ProviderParseResult = {
  provider: {
    name: string;
    key: string;
    type: string;
    columns?: Record<string, string>;
    groups?: Array<{ key: string; name: string }>;
  };
  data: ProviderDataEntry[];
};

export default class BaseProvider {
  protected _key: string;
  protected _pattern: RegExp;
  protected _name: string;
  protected _type: string;
  protected _keywords: string[];

  constructor() {
    this._key = '';
    this._pattern = /.*/;
    this._name = '';
    this._type = '';
    this._keywords = [];
  }

  get key(): string {
    return this._key;
  }

  get type(): string {
    const types: Record<string, string> = {
      analytics: 'Analytics',
      customer: 'Customer Engagement',
      testing: 'UX Testing',
      tagmanager: 'Tag Manager',
      visitorid: 'Visitor Identification',
      marketing: 'Marketing',
      replay: 'Session Replay/Heat Maps',
    };
    return types[this._type] || 'Unknown';
  }

  get keywords(): string[] {
    return this._keywords;
  }

  get pattern(): RegExp {
    return this._pattern;
  }

  get name(): string {
    return this._name;
  }

  get columnMapping(): Record<string, string> {
    return {};
  }

  get groups(): Array<{ key: string; name: string }> {
    return [];
  }

  get keys(): Record<
    string,
    { name?: string; group?: string; hidden?: boolean }
  > {
    return {};
  }

  checkUrl(rawUrl: string): boolean {
    return this.pattern.test(rawUrl);
  }

  parseUrl(
    rawUrl: string,
    postData: string | Record<string, unknown> = '',
  ): ProviderParseResult {
    const url = new URL(rawUrl);
    let data: ProviderDataEntry[] = [];
    const params = new URLSearchParams(url.search);
    const postParams = this.parsePostData(postData);

    postParams.forEach((pair) => {
      params.append(pair[0], pair[1]);
    });

    for (const param of params) {
      const key = param[0];
      const value = param[1];
      const result = this.handleQueryParam(key, value);
      if (typeof result === 'object') {
        data.push(result);
      }
    }

    const customData = this.handleCustom(url, params);
    if (typeof customData === 'object' && customData !== null) {
      if (Array.isArray(customData) && customData.length) {
        data = data.concat(customData as ProviderDataEntry[]);
      } else if (!Array.isArray(customData)) {
        data.push(customData as ProviderDataEntry);
      }
    }

    return {
      provider: {
        name: this.name,
        key: this.key,
        type: this.type,
        columns: this.columnMapping,
        groups: this.groups,
      },
      data,
    };
  }

  // Parses JSON or form-encoded like structures into key/value pairs compatible with URLSearchParams append

  parsePostData(
    postData: string | Record<string, unknown> = '',
  ): Array<[string, string]> {
    const params: Array<[string, string]> = [];
    let parsed: unknown = {};
    if (typeof postData === 'string' && postData) {
      try {
        parsed = JSON.parse(postData);
        /* Based on https://stackoverflow.com/a/19101235 */
        const recurse = (cur: unknown, prop: string) => {
          if (Object(cur) !== cur) {
            params.push([prop, String(cur)]);
          } else if (Array.isArray(cur)) {
            for (let i = 0, l = cur.length; i < l; i++) {
              recurse((cur as unknown[])[i], prop + '[' + i + ']');
            }
            if ((cur as unknown[]).length === 0) {
              params.push([prop, '']);
            }
          } else {
            const obj = cur as Record<string, unknown>;
            let isEmpty = true;
            for (const p in obj) {
              if (!Object.prototype.hasOwnProperty.call(obj, p)) continue;
              isEmpty = false;
              recurse(obj[p], prop ? prop + '.' + p : p);
            }
            if (isEmpty && prop) {
              params.push([prop, '']);
            }
          }
        };
        recurse(parsed, '');
      } catch (e: any) {
        // ignore invalid JSON; fall through
      }
    } else if (typeof postData === 'object' && postData) {
      Object.entries(postData).forEach((entry) => {
        params.push([entry[0], String(entry[1])]);
      });
    }
    return params;
  }

  handleQueryParam(name: string, value: string): ProviderDataEntry | void {
    const param = this.keys[name] || {};
    if (!param.hidden) {
      return {
        key: name,
        field: param.name || name,
        value: value,
        group: param.group || 'other',
      };
    }
  }

  // Can be overridden by subclasses

  handleCustom(
    _url: URL,
    _params: URLSearchParams,
  ): ProviderDataEntry | ProviderDataEntry[] | void {
    // default: no-op
  }
}
