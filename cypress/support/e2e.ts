import './commands';
import './api-log';
import 'cypress-real-events';

/**
 * Radix 的 ResizeObserver 在同一幀塞不完所有回呼時會丟一個無害的錯，
 * 本專案到處都是 Radix（Dialog / Select / Tabs / Popover）→ 全域忽略。
 * ⚠️ 只忽略這一種。其他 uncaught exception 一律讓測試紅 ——
 *    把它們一起吞掉等於把「頁面炸了」偽裝成「測試通過」。
 */
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) return false;
  return undefined;
});

// ─────────────────────────────────────────────────────────────
// 環境 Fail Fast（Bad Example 14 / Good Example 1）
//
// 這個專案的風險比一般的「平台設定不對」嚴重得多：
// 每支測試的 beforeEach 都會呼叫 cy.resetDb() 把整個資料庫清空。
// 要是 BASE_URL 被指到線上站、或 dev server 沒帶 emulator 設定就起來了，
// 測試會一邊清 emulator、一邊對著**真的 Firebase 專案**操作。
//
// 所以在跑任何測試之前先確認三件事，不符就當場停、並直接說要改哪裡：
//   1. 受測網址是本機（不是 vercel / 任何線上網域）
//   2. 前端真的接在 emulator 上（讀 app 自己印出來的旗標）
//   3. node 端的 Firestore 位址也是 emulator
// ─────────────────────────────────────────────────────────────
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

before(() => {
  const baseUrl = Cypress.config('baseUrl') ?? '';
  const host = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return '';
    }
  })();

  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `❌ 受測網址不是本機，E2E 拒絕執行！\n` +
        `   目前 baseUrl: ${baseUrl || '(空)'}\n` +
        `   原因：每支測試的 beforeEach 都會 cy.resetDb() 清空整個資料庫。\n` +
        `         對著線上站跑會直接動到正式資料。\n` +
        `   解決方案：用 ./scripts/e2e.sh（或 npm run e2e）啟動，不要自己設 CYPRESS_BASE_URL。`,
    );
  }

  const emulatorHost = Cypress.env('firestoreEmulatorHost');
  if (!emulatorHost) {
    throw new Error(
      `❌ 沒有設定 Firestore emulator 位址！\n` +
        `   解決方案：用 ./scripts/e2e.sh 啟動 —— 它會起 emulator 並把\n` +
        `             CYPRESS_firestoreEmulatorHost 帶進來。`,
    );
  }

  // 前端是不是真的接在 emulator 上 —— 問 app 自己，不要猜。
  // src/firebase/emulator.ts 的 isEmulatorEnabled() 決定；
  // 接上時 getSdks() 會在 console 印一行 [Firebase Emulator] Firestore → host:port。
  cy.visit('/login', {
    onBeforeLoad(win) {
      const original = win.console.log;
      (win as unknown as { __emulatorLogs: string[] }).__emulatorLogs = [];
      win.console.log = (...args: unknown[]) => {
        const line = args.map(String).join(' ');
        if (line.includes('[Firebase Emulator]')) {
          (win as unknown as { __emulatorLogs: string[] }).__emulatorLogs.push(line);
        }
        original.apply(win.console, args as []);
      };
    },
  });

  cy.window({ log: false })
    .its('__emulatorLogs', { timeout: 20000 })
    .should((logs: string[]) => {
      expect(
        logs.some((l) => l.includes('Firestore')),
        '❌ 前端沒有接到 Firebase emulator！\n' +
          '   症狀：測試會對著真實 Firebase 專案跑，而 resetDb 只清 emulator。\n' +
          '   解決方案：dev server 必須帶 NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 啟動 ——\n' +
          '             用 ./scripts/e2e.sh，不要用 npm run dev。\n' +
          '   判斷依據：src/firebase/emulator.ts 的 isEmulatorEnabled()',
      ).to.eq(true);
    });

  cy.log(`✅ 環境驗證通過：${baseUrl} ← emulator ${emulatorHost}`);
});

// ─────────────────────────────────────────────────────────────
// 全站「最新更新通知」對話框（WhatsNewDialog）的抑制
//
// 它在 localStorage.lastSeenReleaseId !== VERSION_HISTORY[0].id 時自己跳出來，
// 而每支測試都從乾淨的 localStorage 開始 → 它每次都跳、蓋住整個畫面。
// 症狀是第一個 cy.type() / cy.click() 報
//   「element is being covered by another element: <div class="py-2 pb-8 space-y-8">」
// 讀起來完全像「被測的那個輸入框壞了」，實際上跟它無關。
//
// ⚠️ 不要改成 { force: true } 繞過 —— 那會讓「真的被別的東西蓋住」
//    （例如對話框該關卻沒關）也一起變綠。
// ⚠️ 也不要寫一個假的 id：那會走「找不到這個 id」分支，對話框照樣跳。
//
// 要**故意**測這個對話框的話，在該支測試裡自己清掉這個 key：
//   cy.visit('/', { onBeforeLoad: (win) => win.localStorage.removeItem('lastSeenReleaseId') });
// ─────────────────────────────────────────────────────────────
let latestReleaseId: string | null = null;

before(() => {
  cy.task<string>('app:latestReleaseId').then((id) => {
    latestReleaseId = id;
  });
});

Cypress.on('window:before:load', (win) => {
  if (latestReleaseId) {
    try {
      win.localStorage.setItem('lastSeenReleaseId', latestReleaseId);
    } catch {
      // 無痕視窗 / 封鎖站台資料時會丟 —— 不該讓它把測試弄紅
    }
  }
});

// ─────────────────────────────────────────────────────────────
// API log collection（預設關閉；見 support/api-log.ts）
//   CYPRESS_ENABLE_API_LOG=true npm run e2e -- --spec <那一支>
// ─────────────────────────────────────────────────────────────
if (Cypress.env('ENABLE_API_LOG') === true || Cypress.env('ENABLE_API_LOG') === 'true') {
  beforeEach(function () {
    cy.startApiLogCollection({
      specName: Cypress.spec?.name,
      titlePath: this.currentTest?.titlePath?.() ?? [],
    });
  });

  afterEach(function () {
    cy.flushApiLogCollection({
      specName: Cypress.spec?.name,
      titlePath: this.currentTest?.titlePath?.() ?? [],
    });
  });
}
