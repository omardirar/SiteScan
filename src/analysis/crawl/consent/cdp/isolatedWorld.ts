import type { CDPSession } from 'puppeteer';

export async function createIsolatedWorld(
  session: CDPSession,
  frameId: string,
  worldName: string,
): Promise<void> {
  try {
    await session.send('Page.createIsolatedWorld', {
      frameId,
      worldName,
      grantUniveralAccess: true as any,
    } as any);
    // Also enable Runtime to ensure contexts are reported
    try {
      await session.send('Runtime.enable');
    } catch {
      // ignore
    }
  } catch (_e) {
    // best-effort; some frames may fail
  }
}
