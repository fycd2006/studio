/**
 * 路由權限閘門：每一頁在「沒有身分」時都要被導回 /login
 *
 * 守的業務行為：這個 app 的身分只存在前端（localStorage + 非 httpOnly cookie），
 * 沒有 middleware。擋人的唯一一道是 auth-context 的 effect
 * （src/lib/auth-context.tsx:32-38）。**所以每新增一個頁面都必須回來加一條**，
 * 否則新頁面會是沒人看守的。
 *
 * 為什麼放 access_page/ 而不是 feature_test/：
 *   這支不操作任何功能，只掃「這個身分進不進得去這一頁」。
 *   feature_test/ 是「透過畫面操作驗證功能」，兩件事分開放，規則才掛得住。
 *
 * ⚠️ 這支**只驗前端導向**。它不證明後端擋得住 —— 直接打 Firestore 或
 *    /api/export 完全繞過這一層。那是 security/role-escalation.cy.ts 的事。
 */

// 需要身分才能看的頁面。/plans/[id] 用 seed 出來的真實 id 組出來，
// 不硬編（硬編的 id 在資料變動後會變成「測試壞了」而不是「功能壞了」）。
const GUARDED_STATIC_ROUTES = ['/', '/plans', '/admin', '/settings', '/history'] as const;

describe('路由權限閘門 (access_page)', () => {
  beforeEach(() => {
    cy.resetDb();
    // 身分同時存在 cookie 與 localStorage，兩邊都要清；
    // 只清一邊會讓上一支測試的身分漏過來，而這支就會假性通過。
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  GUARDED_STATIC_ROUTES.forEach((route) => {
    it(`未登入進 ${route} 應被導回 /login`, () => {
      cy.visit(route);

      cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
      // 白名單：真的到了登入頁（不是停在一個空白畫面）
      cy.getByTestId('login-submit').should('be.visible');
    });
  });

  it('未登入進教案詳情頁（動態路由）也應被導回 /login', () => {
    cy.setupCampScenario({
      campName: 'E2E 閘門營隊',
      plans: [{ activityName: '閘門測試用教案', groupId: 'activity' }],
    }).then((scenario) => {
      cy.visit(`/plans/${scenario.planIds[0]}`);

      cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
      cy.getByTestId('login-submit').should('be.visible');

      cy.cleanupCampScenario(scenario.scenarioId);
    });
  });

  it('/lesson-plans/<組別> 會轉到 /plans?group=<組別>（未登入時仍被閘門擋下）', () => {
    cy.visit('/lesson-plans/activity');

    // 這條抓到過真 bug，別把它改寬鬆。
    //
    // 原本 src/app/lesson-plans/[slug]/page.tsx 用 next/navigation 的 redirect()，
    // 而那在初次文件請求時回的是 HTTP 200 + RSC payload（夾一段
    // NEXT_REDIRECT;replace;...;307;），**沒有 Location header** —— 跳轉是客戶端
    // router 做的。實測 12 次有 6 次客戶端沒執行，使用者就被留在
    // /lesson-plans/<組別> 看**完全空白**的頁面（innerText 長度 0、沒有任何錯誤）。
    // 已改成 next.config.ts 的 redirects()，現在是請求進到 React 之前就發出的
    // 真 307（curl 實測有 Location）。
    //
    // 先 307 到 /plans?group=<組別>，再被前端閘門導去 /login —— 最終落點才是
    // 使用者看到的
    cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
  });

  it('登入後每一頁都進得去（證明上面那幾條不是「全站都壞了」）', () => {
    // 黑名單測試最常見的假通過：頁面根本都打不開，於是「被導回 /login」永遠成立。
    // 這條是對照組 —— 同樣的路由，有身分就必須留在原地。
    cy.setupCampScenario({ campName: 'E2E 閘門營隊', planCount: 1 }).then((scenario) => {
      cy.loginAs('admin');

      GUARDED_STATIC_ROUTES.forEach((route) => {
        cy.visitApp(route, { campId: scenario.campId });
        cy.location('pathname', { timeout: 15000 }).should('eq', route);
        cy.getByTestId('login-submit').should('not.exist');
      });

      cy.cleanupCampScenario(scenario.scenarioId);
    });
  });

  it('已登入再進 /login 應被導回首頁', () => {
    cy.loginAs('admin');

    cy.visitApp('/login');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/');
  });
});
