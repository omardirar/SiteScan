export function canonicalizeUrl(urlStr: string): {
  host: string;
  path: string;
  sortedQuery: string;
  queryKeys: string[];
} {
  try {
    const u = new URL(urlStr);
    const params = Array.from(u.searchParams.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const normQuery = params.map(([k, v]) => `${k}=${v}`).join('&');
    const queryKeys = params.map(([k]) => k);
    return {
      host: u.host,
      path: u.pathname,
      sortedQuery: normQuery,
      queryKeys,
    };
  } catch {
    // Fallback for invalid URLs
    const [path, query] = urlStr.split('?');
    return {
      host: '',
      path,
      sortedQuery: query || '',
      queryKeys: query ? query.split('&').map((p) => p.split('=')[0]) : [],
    };
  }
}
