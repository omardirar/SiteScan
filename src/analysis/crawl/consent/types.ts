import type { Page } from 'puppeteer';

export type AutoconsentAction = 'optIn' | 'optOut' | null;

export interface Collector<T> {
  start(page: Page): Promise<void>;
  stop(): Promise<void>;
  awaitResult(): Promise<T>;
}

export interface ButtonData {
  text: string;
  selector: string;
}

export interface PopupData {
  text: string;
  selector: string;
  buttons: ButtonData[];
  llmMatch?: boolean;
  regexMatch?: boolean;
  rejectButtons?: ButtonData[];
  otherButtons?: ButtonData[];
}

export interface ScrapedFrame {
  isTop: boolean;
  origin: string;
  cleanedText: string;
  buttons: ButtonData[];
  potentialPopups: PopupData[];
  llmPopupDetected?: boolean;
  regexPopupDetected?: boolean;
  rejectButtons?: ButtonData[];
  otherButtons?: ButtonData[];
}

export interface CMPInfo {
  name: string;
  final: boolean;
  open: boolean;
  started: boolean;
  succeeded: boolean;
  selfTestFail: boolean;
  errors: string[];
  patterns: string[];
  snippets: string[];
  filterListMatched: boolean;
}

export interface CookiePopupsResultTiming {
  scrapeMs?: number;
  detectMs?: number;
  actionMs?: number;
  totalMs?: number;
  actionTimestamp?: number;
}

export interface CookiePopupsResult {
  cmps: CMPInfo[];
  scrapedFrames: ScrapedFrame[];
  timing?: CookiePopupsResultTiming;
  errors?: string[];
}

export interface CookiePopupsCollectorOptions {
  autoconsentAction: AutoconsentAction;
  scrapeTimeoutMs: number;
  actionTimeoutMs: number;
  detectTimeoutMs: number;
  foundTimeoutMs: number;
  totalBudgetMs: number;
  collectorExtraTimeMs: number;
  shortTimeouts?: boolean;
}
