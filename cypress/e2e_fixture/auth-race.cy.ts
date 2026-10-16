/**
 * 匿名登入還沒完成的那段時間，全站不該炸掉
 *
 * 守的業務行為：使用者在網路慢的時候打開任何一頁，畫面要照常出來 ——
 * 不該因為「匿名登入還沒回來」就整個 client tree 爆掉。
 *
 * 為什麼放在 e2e_fixture：這支**刻意延遲** Firebase Auth 的 signUp 回應，
 * 把平常只有 1/10 機率的競態變成每次都會發生。只有這個資料夾可以動網路層。
 *
 * 🔒 這條抓到的真 bug（已修，src/lib/timer-context.tsx）：
 *    TimerProvider 掛在全站（連 /login 都有），而它原本只看 `db` 就訂閱
 *    `userSettings/global` —— 不等 `user`。登入還沒完成時那個讀取會被
 *    Firestore 規則（request.auth != null）拒絕：
 *
 *      FirebaseError: Missing or insufficient permissions
 *      { "auth": null, "method": "get", "path": ".../userSettings/global" }
 *
 *    `use-doc.tsx` 收到錯誤 emit `permission-error`，`FirebaseErrorListener`
 *    再 throw 在 render 裡 → 整棵樹爆掉。使用者看到空白頁，而錯誤訊息
 *    指向「計時器的設定檔」，跟他正在做的事毫無關係。
 *
 * ⚠️ 不要用 `Cypress.on('uncaught:exception', () => false)` 讓這支變綠 ——
 *    那正好是把這個 bug 藏起來的做法（support/e2e.ts 只忽略 ResizeObserver）。
 */

describe('匿名登入延遲時的全站韌性 (e2e_fixture)', () => {
  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
  });

  /**
   * 把「第一次匿名登入」延遲 N 毫秒。
   *
   * ⚠️ 兩件事缺一不可，少一件這支就會**在 bug 還在的時候照樣綠**（實測 2026-10-15）：
   *
   * 1. 要**清掉 Firebase Auth 存在 IndexedDB 的身分**（`firebaseLocalStorageDb`）。
   *    Cypress 的 testIsolation 清 cookie / localStorage，但**不清 IndexedDB** ——
   *    身分還在的話 SDK 是「還原既有 session」（走 accounts:lookup），
   *    `currentUser` 在那之前就有值了，根本不會發生「沒有身分就去讀」的競態。
   * 2. 延遲的是 `accounts:signUp`（第一次註冊匿名身分），不是 lookup。
   */
  const openWithSlowFirstSignIn = (
    visit: (options: Partial<Cypress.VisitOptions>) => void,
    ms: number,
  ) => {
    cy.intercept(
      { method: 'POST', url: /identitytoolkit\.googleapis\.com\/v1\/accounts:signUp/ },
      (req) => {
        req.continue((res) => {
          res.setDelay(ms);
        });
      },
    ).as('anonymousAuth');

    visit({
      onBeforeLoad(win) {
        // 把上一個測試留下來的匿名身分清掉，逼 SDK 重新註冊一個
        win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      },
    });
  };

  it('登入頁：匿名登入慢 4 秒，表單照樣能用、不該出現 permission denied', () => {
    openWithSlowFirstSignIn((options) => cy.visit('/login', options), 4000);

    // 使用者視角：登入卡片照常出現、而且是**能用的**（不是炸掉後殘留的靜態 DOM）
    cy.getByTestId('login-card', { timeout: 20000 }).should('be.visible');
    cy.getByTestId('login-username-input').type('e2e-admin').should('have.value', 'e2e-admin');

    // 匿名登入確實被延遲了（排除「其實沒攔到，所以根本沒重現競態」的假通過）
    cy.wait('@anonymousAuth', { timeout: 20000 });

    // 登入完成之後也要是好的
    cy.getByTestId('login-password-input').type('e2e-admin-pw').should('have.value', 'e2e-admin-pw');
    cy.getByTestId('login-submit').should('not.be.disabled');
  });

  it('教案總覽：匿名登入慢 4 秒，資料回來後列表仍然長得出來', () => {
    cy.setupCampScenario({
      campName: 'E2E 競態營隊',
      plans: [{ scheduledName: '大地遊戲', activityName: '競態教案', groupId: 'activity', order: 0 }],
    }).then((scenario) => {
      cy.loginAs('admin');
      openWithSlowFirstSignIn(
        (options) =>
          cy.visitApp('/plans', {
            campId: scenario.campId,
            onBeforeLoad: options.onBeforeLoad as (win: Cypress.AUTWindow) => void,
          }),
        4000,
      );

      // 慢的只有匿名登入，不是壞掉 —— 等它回來之後列表必須真的出現
      cy.wait('@anonymousAuth', { timeout: 20000 });
      cy.getByTestId(`plan-row-${scenario.planIds[0]}`, { timeout: 20000 })
        .should('be.visible')
        .and('contain', '競態教案');

      cy.visit('/plans');
      cy.location('pathname').should('eq', '/plans');
      cy.cleanupCampScenario(scenario.scenarioId);
    });
  });
});
