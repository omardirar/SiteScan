import type { Page, CDPSession } from 'puppeteer';
import { buildInjectedSource } from '../content-scripts/ddg-autoconsent-loader.js';
import { createIsolatedWorld } from '../cdp/isolatedWorld.js';
import { addRuntimeBinding, createBindingBridge } from '../cdp/bindingBridge.js';
import type { AutoconsentAction, Collector, CookiePopupsCollectorOptions, CookiePopupsResult, CMPInfo, ScrapedFrame } from './types.js';

const WORLD_NAME = 'ddg-autoconsent';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: any) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export class CookiePopupsCollector implements Collector<CookiePopupsResult> {
  private page!: Page;
  private options: CookiePopupsCollectorOptions;
  private bindingName!: string;
  private cdpSessionsByContext = new Map<string, CDPSession>();
  private pageWorldByContext = new Map<string, string>();
  private receivedMsgs: any[] = [];
  private scrapeJobDeferred: Deferred<ScrapedFrame[]> = createDeferred<ScrapedFrame[]>();
  private selfTestFrame: string | null = null;
  private startTs = 0;
  private errors: string[] = [];
  private execIdToUniqueId = new Map<number, string>();

  constructor(options: CookiePopupsCollectorOptions) {
    this.options = options;
  }

  async start(page: Page): Promise<void> {
    this.page = page;
    this.startTs = Date.now();
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const bridge = createBindingBridge({ worldName: WORLD_NAME });
    this.bindingName = bridge.bindingName;
    // add binding for our isolated world name so it appears only there
    await addRuntimeBinding(client as any, this.bindingName, WORLD_NAME);
    // route binding messages to handler with context mapping
    (client as any).on('Runtime.bindingCalled', async (evt: any) => {
      try {
        if (evt.name !== this.bindingName) return;
        const msg = JSON.parse(evt.payload);
        const uniqueId = this.execIdToUniqueId.get(evt.executionContextId);
        if (uniqueId) msg.executionContextUniqueId = uniqueId;
        await this.handleMessage(msg);
      } catch {
        // ignore
      }
    });

    // track isolated contexts
    client.on('Runtime.executionContextCreated', async (evt: any) => {
      const ctx = evt.context;
      if (!ctx || !ctx.uniqueId) return;
      if (typeof ctx.id === 'number') this.execIdToUniqueId.set(ctx.id, ctx.uniqueId);
      // track main-world uniqueId for eval messages
      if (ctx.auxData && ctx.auxData.type === 'default') {
        this.pageWorldByContext.set(ctx.uniqueId, ctx.uniqueId);
      }
      // when our isolated world is created, evaluate the content script inside it and register session mapping
      if (ctx.name === WORLD_NAME) {
        try {
          const injected = buildInjectedSource(this.bindingName);
          await client.send('Runtime.evaluate', { expression: injected, uniqueContextId: ctx.uniqueId, includeCommandLineAPI: false, returnByValue: false } as any);
          this.cdpSessionsByContext.set(ctx.uniqueId, client);
        } catch (e: any) {
          this.errors.push(`Injection error in ctx ${ctx.uniqueId}: ${e?.message || String(e)}`);
        }
      }
    });

    // Create isolated world and inject into all frames via CDP frame tree (stable frame IDs)
    try {
      const frameIds: string[] = [];
      const frameTree = await client.send('Page.getFrameTree');
      const walk = (node: any) => {
        if (node && node.frame && node.frame.id) frameIds.push(node.frame.id);
        if (node && node.childFrames) node.childFrames.forEach(walk);
      };
      walk(frameTree.frameTree);
      await Promise.all(frameIds.map(async (id) => {
        try {
          await createIsolatedWorld(client as any, id, WORLD_NAME);
        } catch (e: any) {
          this.errors.push(`Frame isolated world failed: ${e?.message || String(e)}`);
        }
      }));
    } catch (e: any) {
      this.errors.push(`Failed to build isolated worlds: ${e?.message || String(e)}`);
    }
  }

  async stop(): Promise<void> {
    // no-op
  }

  private async handleMessage(msg: any) {
    this.receivedMsgs.push(msg);
    switch (msg.type) {
      case 'init': {
        const config = {
          enabled: true,
          autoAction: null as AutoconsentAction,
          disabledCmps: [],
          enablePrehide: false,
          enableCosmeticRules: true,
          enableFilterList: true,
          enableHeuristicDetection: true,
          detectRetries: 20,
          isMainWorld: false,
        } as const;
        await this.evaluateInIsolated(msg.executionContextUniqueId, `autoconsentReceiveMessage({ type: "initResp", config: ${JSON.stringify(config)} })`);
        break;
      }
      case 'popupFound': {
        if (this.options.autoconsentAction) {
          await this.scrapeJobDeferred.promise;
          await this.evaluateInIsolated(msg.executionContextUniqueId, `autoconsentReceiveMessage({ type: ${JSON.stringify(this.options.autoconsentAction)} })`);
        }
        break;
      }
      case 'report': {
        // Patterns/snippets aggregated at summary time
        break;
      }
      case 'optInResult':
      case 'optOutResult': {
        if (msg.scheduleSelfTest) {
          this.selfTestFrame = msg.executionContextUniqueId || null;
        }
        break;
      }
      case 'autoconsentDone': {
        if (this.selfTestFrame) {
          await this.evaluateInIsolated(this.selfTestFrame, `autoconsentReceiveMessage({ type: "selfTest" })`);
        }
        break;
      }
      case 'eval': {
        const session = this.cdpSessionsByContext.get(msg.executionContextUniqueId);
        if (!session) break;
        let ok = false;
        try {
          const res = await session.send('Runtime.evaluate', {
            expression: msg.code,
            returnByValue: true,
            allowUnsafeEvalBlockedByCSP: true,
            uniqueContextId: this.pageWorldByContext.get(msg.executionContextUniqueId),
          } as any);
          if (!res.exceptionDetails) ok = Boolean(res.result?.value);
        } catch {
          ok = false;
        }
        await this.evaluateInIsolated(msg.executionContextUniqueId, `autoconsentReceiveMessage({ id: ${JSON.stringify(msg.id)}, type: "evalResp", result: ${JSON.stringify(ok)} })`);
        break;
      }
      case 'autoconsentError': {
        this.errors.push(`autoconsent error: ${JSON.stringify(msg.details)}`);
        break;
      }
      default:
        break;
    }
  }

  private async evaluateInIsolated(executionContextUniqueId: string, expression: string) {
    const session = this.cdpSessionsByContext.get(executionContextUniqueId);
    if (!session) return;
    try {
      await session.send('Runtime.evaluate', { expression, uniqueContextId: executionContextUniqueId, allowUnsafeEvalBlockedByCSP: true } as any);
    } catch {
      // ignore
    }
  }

  private findMessages(partial: any): any[] {
    return this.receivedMsgs.filter((m) => Object.keys(partial).every((k) => m[k] === partial[k]));
  }

  private async scrapeFramesTimeboxed(): Promise<ScrapedFrame[]> {
    const result = await Promise.race([
      this.scrapeFrames(),
      new Promise<ScrapedFrame[]>((_, rej) => setTimeout(() => rej(new Error('Scraping timed out')), this.options.scrapeTimeoutMs)),
    ]).catch((e) => {
      this.errors.push(e?.message || String(e));
      return [] as ScrapedFrame[];
    });
    this.scrapeJobDeferred.resolve(result as ScrapedFrame[]);
    return result as ScrapedFrame[];
  }

  private async scrapeFrames(): Promise<ScrapedFrame[]> {
    const tasks = Array.from(this.cdpSessionsByContext.entries()).map(async ([ctx, session]) => {
      try {
        const evalRes = await session.send('Runtime.evaluate', {
          expression: `(${SCRAPE_SCRIPT})();`,
          uniqueContextId: ctx,
          returnByValue: true,
          allowUnsafeEvalBlockedByCSP: true,
        } as any);
        if (evalRes && evalRes.exceptionDetails) return null;
        const value = evalRes.result?.value as ScrapedFrame;
        if (!value) return null;
        if (value.cleanedText || (value.potentialPopups && value.potentialPopups.length > 0)) return value;
      } catch (e: any) {
        this.errors.push(`Scrape error: ${e?.message || String(e)}`);
      }
      return null;
    });
    const out = (await Promise.all(tasks)).filter(Boolean) as ScrapedFrame[];
    return out;
  }

  private async waitForMessage(partial: any, timeoutMs: number, intervalMs: number): Promise<any | null> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const found = this.findMessages(partial)[0];
      if (found) return found;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  }

  private collectCMPResults(): CMPInfo[] {
    const cmps: CMPInfo[] = [];
    const doneMsg = this.findMessages({ type: 'autoconsentDone' })[0];
    const selfTestResult = this.findMessages({ type: 'selfTestResult' })[0];
    const errorMsgs = this.findMessages({ type: 'autoconsentError' });
    const errors = errorMsgs.map((e) => JSON.stringify(e.details));
    const detectedRules = this.findMessages({ type: 'cmpDetected' });
    const processed: string[] = [];
    for (const msg of detectedRules) {
      const cmp = msg.cmp;
      if (!cmp || processed.includes(cmp)) continue;
      processed.push(cmp);
      const resultType = this.options.autoconsentAction === 'optOut' ? 'optOutResult' : 'optInResult';
      const found = this.findMessages({ type: 'popupFound', cmp });
      const autoActionResult = this.findMessages({ type: resultType, cmp })[0];
      cmps.push({
        name: cmp,
        final: Boolean(doneMsg && doneMsg.cmp === cmp),
        open: Boolean(found && found.length > 0),
        started: Boolean(this.options.autoconsentAction && found && found.length > 0),
        succeeded: Boolean(autoActionResult && autoActionResult.result),
        selfTestFail: Boolean(selfTestResult && !selfTestResult.result),
        errors,
        patterns: Array.from(new Set(this.findMessages({ type: 'report' }).flatMap((r: any) => r.state?.heuristicPatterns || []))),
        snippets: Array.from(new Set(this.findMessages({ type: 'report' }).flatMap((r: any) => r.state?.heuristicSnippets || []))),
        filterListMatched: Boolean(this.findMessages({ type: 'popupFound', cmp: 'filterList' }).length > 0),
      });
    }
    if (cmps.length === 0) {
      const patterns = Array.from(new Set(this.findMessages({ type: 'report' }).flatMap((r: any) => r.state?.heuristicPatterns || [])));
      const snippets = Array.from(new Set(this.findMessages({ type: 'report' }).flatMap((r: any) => r.state?.heuristicSnippets || [])));
      const filterListMatched = Boolean(this.findMessages({ type: 'popupFound', cmp: 'filterList' }).length > 0);
      if (patterns.length > 0) {
        cmps.push({ name: '', final: false, open: false, started: false, succeeded: false, selfTestFail: false, errors: [], patterns, snippets, filterListMatched });
      }
    }
    return cmps;
  }

  async awaitResult(): Promise<CookiePopupsResult> {
    // kick off scrape job early
    const scrapeJob = this.scrapeFramesTimeboxed();

    const detected = await this.waitForMessage({ type: 'cmpDetected' }, this.options.detectTimeoutMs, 200);
    if (detected) {
      const found = await this.waitForMessage({ type: 'popupFound' }, this.options.foundTimeoutMs, 200);
      if (found && this.options.autoconsentAction) {
        // wait for scrape job done first
        await this.scrapeJobDeferred.promise;
        const resultType = this.options.autoconsentAction === 'optOut' ? 'optOutResult' : 'optInResult';
        await this.waitForMessage({ type: resultType, cmp: found.cmp }, this.options.actionTimeoutMs, 1000);
        await this.waitForMessage({ type: 'autoconsentDone' }, 1000, 100);
        if (this.selfTestFrame) {
          await this.waitForMessage({ type: 'selfTestResult' }, 1000, 100);
        }
      }
    }

    const cmps = this.collectCMPResults();
    const scrapedFrames = await scrapeJob;
    const timing = { totalMs: Date.now() - this.startTs };
    return { cmps, scrapedFrames, timing, errors: this.errors };
  }
}

// inlined scrapeScript from TRC with minimal adaptation
const SCRAPE_SCRIPT = function SCRAPE_SCRIPT_FACTORY() {
  const BUTTON_LIKE_ELEMENT_SELECTOR = 'button, input[type="button"], input[type="submit"], a, [role="button"], [class*="button"]';
  const LIMIT_TEXT_LENGTH = 150000;
  const ELEMENT_TAGS_TO_SKIP = [
      'SCRIPT','STYLE','NOSCRIPT','TEMPLATE','META','LINK','SVG','CANVAS','IFRAME','FRAME','FRAMESET','NOFRAMES','NOEMBED','AUDIO','VIDEO','SOURCE','TRACK','PICTURE','IMG','MAP',
  ];
  function isVisible(node: any) {
    if (!node.isConnected) return false;
    const style = (window as any).getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth && rect.bottom > 0 && rect.right > 0;
  }
  function isDisabled(el: any) {
    return ('disabled' in el && Boolean((el as any).disabled)) || el.hasAttribute('disabled');
  }
  function excludeContainers(elements: any[]) {
    const results: any[] = [];
    if (elements.length > 0) {
      for (let i = elements.length - 1; i >= 0; i--) {
        let container = false;
        for (let j = 0; j < elements.length; j++) {
          if (i !== j && elements[i].contains(elements[j])) { container = true; break; }
        }
        if (!container) results.push(elements[i]);
      }
    }
    return results;
  }
  function getPopupLikeElements() {
    const walker = document.createTreeWalker(document.documentElement, (window as any).NodeFilter.SHOW_ELEMENT, {
      acceptNode(node: any) {
        if ((node as any).tagName === 'BODY') return (window as any).NodeFilter.FILTER_SKIP;
        const cssPosition = (window as any).getComputedStyle(node).position;
        if ((cssPosition === 'fixed' || cssPosition === 'sticky') && isVisible(node)) return (window as any).NodeFilter.FILTER_ACCEPT;
        return (window as any).NodeFilter.FILTER_SKIP;
      },
    } as any);
    const found: any[] = [];
    for (let node = (walker as any).nextNode(); node; node = (walker as any).nextNode()) { found.push(node as any); }
    return excludeContainers(found);
  }
  function getDocumentText() {
    function collectShadowDOMText(root: any) {
      const walker = document.createTreeWalker(root, (window as any).NodeFilter.SHOW_ELEMENT, {
        acceptNode(node: any) {
          const element = node as any;
          if (element.shadowRoot) return (window as any).NodeFilter.FILTER_ACCEPT;
          return (window as any).NodeFilter.FILTER_SKIP;
        },
      } as any);
      let result = '';
      let node: any;
      while ((node = (walker as any).nextNode())) {
        const element = node as any;
        let shadowText = '';
        for (const child of (element.shadowRoot as any).children) {
          if (child instanceof HTMLElement && !ELEMENT_TAGS_TO_SKIP.includes(child.tagName)) {
            shadowText += ' ' + child.innerText;
          }
          if ((child as any).shadowRoot) {
            shadowText += ' ' + collectShadowDOMText(child);
          }
        }
        if (shadowText.trim()) result += ' ' + shadowText.trim();
      }
      return result;
    }
    const visibleText = ((document.body ?? document.documentElement) as any).innerText;
    const shadowText = collectShadowDOMText(document.documentElement);
    return `${visibleText} ${shadowText}`.trim();
  }
  function getButtonLikeElements(el: any) {
    return Array.from(el.querySelectorAll(BUTTON_LIKE_ELEMENT_SELECTOR));
  }
  function getSelector(el: any, specificity: any) {
    let element = el; let parent; let result = '';
    if (element.nodeType !== (window as any).Node.ELEMENT_NODE) { return result; }
    parent = element.parentNode;
    while (parent instanceof HTMLElement) {
      const siblings = Array.from(parent.children);
      const tagName = element.tagName.toLowerCase();
      let localSelector = tagName;
      if (specificity.order) {
        if (specificity.absoluteOrder || (siblings.length > 1 && parent !== document.body && parent !== document.documentElement)) {
          localSelector += `:nth-child(${siblings.indexOf(element) + 1})`;
        }
      }
      if (specificity.ids && tagName !== 'body') {
        if (element.getAttribute('id')) { localSelector += `#${(window as any).CSS.escape(element.getAttribute('id'))}`; } else if (!element.hasAttribute('id')) { localSelector += `:not([id])`; }
      }
      if (specificity.dataAttributes && element.attributes instanceof NamedNodeMap) {
        const dataAttributes = Array.from(element.attributes).filter((a: any) => a.name.startsWith('data-'));
        dataAttributes.forEach((a: any) => { const escapedValue = (window as any).CSS.escape(a.value); localSelector += `[${a.name}="${escapedValue}"]`; });
      } else if (specificity.testid) {
        const testid = element.getAttribute('data-testid'); if (testid) { localSelector += `[data-testid="${(window as any).CSS.escape(testid)}"]`; }
      }
      if (specificity.classes && element.classList instanceof DOMTokenList) {
        const classes = Array.from(element.classList); if (classes.length > 0) { localSelector += `.${classes.map((c) => (window as any).CSS.escape(c)).join('.')}`; }
      }
      result = localSelector + (result ? ' > ' + result : '');
      element = parent; parent = element.parentNode;
    }
    return result;
  }
  function getUniqueSelector(el: any) {
    const specificity: any = { testid: true, ids: true, order: true, dataAttributes: false, classes: false, absoluteOrder: false };
    let selector = getSelector(el, specificity);
    try {
      if (document.querySelectorAll(selector).length > 1) { specificity.order = true; selector = getSelector(el, specificity); }
      if (document.querySelectorAll(selector).length > 1) { specificity.ids = true; selector = getSelector(el, specificity); }
      if (document.querySelectorAll(selector).length > 1) { specificity.dataAttributes = true; selector = getSelector(el, specificity); }
      if (document.querySelectorAll(selector).length > 1) { specificity.classes = true; selector = getSelector(el, specificity); }
      if (document.querySelectorAll(selector).length > 1) { specificity.absoluteOrder = true; selector = getSelector(el, specificity); }
    } catch (e: any) {
      if (e && e.message && String(e.message).includes('is not a valid selector')) return 'cookiepopups-collector-selector-error';
    }
    return selector;
  }
  function getButtonData(el: any) {
    const actionableButtons = excludeContainers(getButtonLikeElements(el)).filter((b: any) => isVisible(b) && !isDisabled(b) && b.innerText.trim());
    return actionableButtons.map((b: any) => ({ text: b.innerText ?? b.textContent ?? '', selector: getUniqueSelector(b) }));
  }
  function collectPotentialPopups(isFramed: boolean) {
    let elements: any[] = [];
    if (!isFramed) {
      elements = getPopupLikeElements();
    } else {
      const doc: any = document.body || document.documentElement;
      if (doc && isVisible(doc) && doc.innerText) { elements.push(doc); }
    }
    const potentialPopups: any[] = [];
    for (const el of elements) {
      if (el.innerText) { potentialPopups.push({ text: el.innerText, selector: getUniqueSelector(el), buttons: getButtonData(el) }); }
    }
    return potentialPopups;
  }
  function scrapePage() {
    const isFramed = (window.top !== window) || ((location as any).ancestorOrigins?.length > 0);
    if (isFramed && (window as any).parent && (window as any).parent !== (window as any).top) {
      return { isTop: !isFramed, origin: window.location.origin, buttons: [], cleanedText: '', potentialPopups: [] };
    }
    return { isTop: !isFramed, origin: window.location.origin, buttons: getButtonData(document.documentElement), cleanedText: getDocumentText().slice(0, LIMIT_TEXT_LENGTH), potentialPopups: collectPotentialPopups(isFramed) };
  }
  return scrapePage;
}();


