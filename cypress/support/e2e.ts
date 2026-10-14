import './commands';

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
