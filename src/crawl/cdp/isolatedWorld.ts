import type { CDPSession } from 'puppeteer';

export async function createIsolatedWorld(session: CDPSession, frameId: string, worldName: string): Promise<void> {
  try {
    await session.send('Page.createIsolatedWorld', {
      frameId,
      worldName,
      grantUniveralAccess: true as any,
    } as any);
  } catch (e) {
    // best-effort; some frames may fail
  }
}


