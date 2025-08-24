import puppeteer, { Browser } from 'puppeteer';

export async function launchBrowser(): Promise<Browser> {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-features=site-per-process',
    '--no-zygote',
  ];
  const browser = await puppeteer.launch({ args, headless: 'new' as any });
  return browser;
}
