import { parse } from 'tldts';

export function isThirdParty(requestUrl: string, firstPartyUrl: string): boolean {
  try {
    const req = parse(requestUrl);
    const first = parse(firstPartyUrl);
    if (!req.domain || !first.domain) return true; // if parsing fails, err on third-party side
    return req.domain !== first.domain;
  } catch {
    return true;
  }
}


