import { createHash } from 'crypto';

export function sha1(input: string): string {
  // TODO: Consider migrating to a faster non-cryptographic hash (e.g., xxhash) for dedupe keys
  return createHash('sha1').update(input).digest('hex');
}
