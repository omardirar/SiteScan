/* eslint-disable no-new-func */
import fs from 'fs';
import path from 'path';

export function loadAutoconsentScript(): string {
  // Prefer the Playwright build because it's closer to raw browser env
  const candidates = [
    'node_modules/@duckduckgo/autoconsent/dist/autoconsent.playwright.js',
    'node_modules/@duckduckgo/autoconsent/dist/autoconsent.js',
  ];
  for (const rel of candidates) {
    const p = path.resolve(process.cwd(), rel);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      return content;
    }
  }
  throw new Error('Could not find @duckduckgo/autoconsent dist script. Install the dependency or vendor the build.');
}

export function buildInjectedSource(bindingName: string): string {
  const baseScript = loadAutoconsentScript();
  return `
  (function(){
    try {
      // bridge for content script -> CDP runtime binding
      // the content script calls window.autoconsentSendMessage
      // and we relay to the CDP binding
      window.autoconsentSendMessage = function(msg){
        try { window[${JSON.stringify(bindingName)}](JSON.stringify(msg)); } catch(e) {}
      };
    } catch(e) {}
  })();
  ` + baseScript;
}


