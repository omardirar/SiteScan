import type { CDPSession } from 'puppeteer';
import { randomUUID } from 'crypto';

export interface BindingBridgeConfig {
  worldName: string;
}

export interface BridgeMessage<T = any> {
  type: string;
  [key: string]: any;
  payload?: T;
}

export type BridgeHandler = (msg: BridgeMessage, executionContextUniqueId: string) => Promise<void> | void;

export interface BindingBridge {
  bindingName: string;
  subscribe(session: CDPSession, handler: BridgeHandler): void;
}

export function createBindingBridge(config: BindingBridgeConfig) {
  const bindingName = `ddg_ac_bridge_${randomUUID().replace(/-/g, '')}`;

  return {
    bindingName,
    subscribe(session: CDPSession, handler: BridgeHandler) {
      session.on('Runtime.bindingCalled', async ({ name, payload }) => {
        if (name !== bindingName) return;
        try {
          const msg = JSON.parse(payload);
          await handler(msg, (msg && (msg.executionContextUniqueId || msg.ctx)) || '');
        } catch {
          // ignore malformed message
        }
      });
    },
  } as BindingBridge;
}

export async function addRuntimeBinding(session: CDPSession, bindingName: string, executionContextName?: string) {
  try {
    await session.send('Runtime.addBinding', { name: bindingName, executionContextName });
  } catch {
    // ignore
  }
}


