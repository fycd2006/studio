/// <reference types="cypress" />

/**
 * 每個測試呼叫過的 API input/output，落成 cypress/reports/*.json
 *
 * 為什麼需要：測試紅掉時，截圖只告訴你「畫面長這樣」，影片只告訴你「點了哪裡」，
 * 都沒有回答最關鍵的那個問題 —— **送出去的請求長什麼樣、回來的是什麼**。
 * 本專案的寫入是 fire-and-forget（見 skill 反模式 5），更需要這份紀錄：
 * 「畫面沒變」到底是請求沒送出、送錯了、還是後端回了錯，光看畫面分不出來。
 *
 * 預設**關閉**（全站 intercept 有成本）。要用時：
 *     CYPRESS_ENABLE_API_LOG=true npm run e2e -- --spec <那一支>
 * 然後讀 cypress/reports/<spec>-<測試名>-api-log.json
 */

interface CapturedApiLogEntry {
  alias: string | null;
  method: string;
  url: string;
  timestamp: string;
  requestBody: unknown;
  requestHeaders: Record<string, unknown>;
  responseStatusCode?: number;
  responseBody: unknown;
  durationMs?: number;
}

interface ApiLogContext {
  specName: string;
  titlePath: string[];
  testTitle: string;
}

let buffer: CapturedApiLogEntry[] = [];
let enabled = false;
let context: ApiLogContext | null = null;

/** 不要把憑證寫進報告檔 —— 它會被 commit、會被貼到 issue 裡。 */
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-goog-api-key'];

const sanitizeHeaders = (headers?: Record<string, unknown>): Record<string, unknown> => {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) =>
      SENSITIVE_HEADERS.includes(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v],
    ),
  );
};

/**
 * 只記「API 類」的流量。
 *
 * 不加這層的實測後果：全站 `url: '**'` 會連 Next.js dev server 的 JS chunk、
 * HMR、字型、圖片連同完整 response body 一起吞下去 ——
 * **一個測試就吐出 22MB 的 json**，完全沒辦法讀，也等於沒有除錯價值。
 */
const ASSET_PATTERNS = [
  '/_next/',
  '/__nextjs',
  '/favicon',
  '.js',
  '.css',
  '.map',
  '.woff',
  '.woff2',
  '.ttf',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.ico',
];

const shouldLogUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  if (ASSET_PATTERNS.some((p) => lower.includes(p))) return false;
  // 本專案值得記的只有這三種：app 自己的 API route、Firestore、Auth emulator
  return (
    lower.includes('/api/') ||
    lower.includes('firestore.googleapis.com') ||
    lower.includes('/google.firestore') ||
    lower.includes('identitytoolkit') ||
    lower.includes(`:${8080}`) ||
    lower.includes(`:${9099}`)
  );
};

/** 單筆 response body 的上限，避免一份報告大到打不開。 */
const MAX_BODY_CHARS = 20_000;

const capBody = (body: unknown): unknown => {
  if (body == null) return null;
  let text: string;
  try {
    text = typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    return '[UNSERIALIZABLE]';
  }
  if (text.length <= MAX_BODY_CHARS) return body;
  return `[TRUNCATED ${text.length} chars] ${text.slice(0, MAX_BODY_CHARS)}`;
};

const cleanSegment = (value: string): string =>
  value.replace(/[^\p{L}\p{N}\-_]+/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) ||
  'unnamed';

/**
 * ⚠️ 刻意**沒有**「只註冊一次」的旗標。
 *
 * Cypress 在每個測試開始前會清掉所有 cy.intercept 路由。用模組層旗標擋住
 * 第二次註冊的話，只有該 spec 的**第一個測試**真的收得到紀錄，第二個之後
 * 全部是空的 —— 而且不會有任何錯誤，只是報告檔默默少了幾份。
 * 實測就是這樣：3 個測試只產出 1 份 json。
 */
const installInterceptor = (): Cypress.Chainable<null> => {
  // middleware: true → 這支 intercept 只旁觀、不吃掉請求，
  // 後面 spec 自己設的 alias intercept 照樣會跑到。
  return cy
    .intercept({ url: '**', middleware: true }, (req) => {
      // ⚠️ 這裡**不可以**呼叫 req.continue()。
      // middleware 路由呼叫 continue 等於結束整個路由鏈，後面 spec 自己設的
      // cy.intercept(...).as('xxx') 就再也對不到 —— 症狀是
      // 「cy.wait('@xxx') timed out ... No request ever occurred」，
      // 看起來像被測的請求根本沒送出，實際上請求送了、只是沒被記成 alias。
      // 處理器直接 return 就會讓請求繼續往下一個相符的路由走。
      if (!enabled || !shouldLogUrl(req.url)) return;
      const startedAt = Date.now();
      const base: CapturedApiLogEntry = {
        alias: req.alias ?? null,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        requestBody: capBody(req.body),
        requestHeaders: sanitizeHeaders(req.headers as Record<string, unknown>),
        responseBody: null,
      };
      req.on('after:response', (res) => {
        if (!enabled) return;
        buffer.push({
          ...base,
          alias: req.alias ?? base.alias,
          responseStatusCode: res.statusCode,
          responseBody: capBody(res.body),
          durationMs: Date.now() - startedAt,
        });
      });
      // 同上：不呼叫 req.continue()，讓 alias 路由還有機會接到它。
    })
    .then(() => cy.wrap(null, { log: false }));
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** 開始收集這個測試的 API 紀錄（由 support/e2e.ts 的 beforeEach 呼叫） */
      startApiLogCollection(options?: Partial<ApiLogContext>): Chainable<null>;
      /** 把收集到的紀錄寫成 cypress/reports/*.json */
      flushApiLogCollection(options?: Partial<ApiLogContext>): Chainable<null>;
    }
  }
}

Cypress.Commands.add('startApiLogCollection', (options: Partial<ApiLogContext> = {}) => {
  const specName = options.specName ?? Cypress.spec?.name ?? 'unknown-spec';
  const titlePath = options.titlePath ? [...options.titlePath] : [];
  buffer = [];
  enabled = true;
  context = {
    specName,
    titlePath,
    testTitle: options.testTitle ?? titlePath[titlePath.length - 1] ?? 'unnamed-test',
  };
  return installInterceptor();
});

Cypress.Commands.add('flushApiLogCollection', (options: Partial<ApiLogContext> = {}) => {
  const specName = options.specName ?? context?.specName ?? Cypress.spec?.name ?? 'unknown-spec';
  const titlePath = options.titlePath ?? context?.titlePath ?? [];
  const testTitle = options.testTitle ?? titlePath[titlePath.length - 1] ?? context?.testTitle ?? 'unnamed-test';

  // 讓最後一個 after:response 有機會進 buffer 再寫檔
  return cy
    .then(() => new Cypress.Promise<void>((resolve) => setTimeout(resolve, 0)))
    .then(() => {
      enabled = false;
      const logs = [...buffer];
      buffer = [];
      if (logs.length === 0) return cy.wrap(null, { log: false });

      const fileName = `${cleanSegment(specName.replace(/\.cy\.ts$/, ''))}-${cleanSegment(testTitle)}-api-log.json`;
      return cy
        .writeFile(
          `cypress/reports/${fileName}`,
          JSON.stringify({ specName, titlePath, testTitle, capturedAt: new Date().toISOString(), logs }, null, 2),
          { log: false },
        )
        .then(() => cy.wrap(null, { log: false }));
    });
});

export {};
