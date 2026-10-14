/**
 * 登入與權限閘門
 *
 * 守的業務行為：
 *  1. 沒有身分的人進任何頁面都會被導到 /login（src/lib/auth-context.tsx 的 effect）
 *  2. 帳密錯誤要留在原地並**說出來**，不是靜靜地什麼都沒發生
 *  3. admin / crew 兩種身分都登得進去，且身分真的被記下來（重載後還在）
 *
 * 對應實作：
 *  - src/app/api/auth/login/route.ts（帳密比對 + 設 studio_role cookie）
 *  - src/lib/auth-context.tsx（localStorage studio_role + 導向規則）
 *  - src/app/login/page.tsx（表單）
 */

describe('登入與權限閘門', () => {
  beforeEach(() => {
    cy.resetDb();
    // 身分存在 localStorage + cookie，兩邊都要清，否則上一支測試的身分會漏過來
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('未登入進 /plans 應被導回 /login', () => {
    cy.visit('/plans');

    cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
    cy.getByTestId('login-submit').should('be.visible');
    // 黑名單：教案頁的東西一個都不該出現
    cy.getByTestId('plans-search-input').should('not.exist');
  });

  it('帳密錯誤應顯示錯誤訊息且留在 /login', () => {
    cy.visit('/login');

    cy.getByTestId('login-username-input').type('e2e-admin');
    cy.getByTestId('login-password-input').type('definitely-wrong-password');
    cy.getByTestId('login-submit').click();

    // 實作裡有一段 800ms 的刻意延遲（page.tsx handleSubmit），所以等得比預設久
    cy.getByTestId('login-error', { timeout: 15000 })
      .should('be.visible')
      .and('contain', '帳號或密碼錯誤');
    cy.location('pathname').should('eq', '/login');
  });

  it('admin 從表單登入 → 進首頁，且重載後身分還在', () => {
    cy.visit('/login');

    cy.intercept('POST', '/api/auth/login').as('loginRequest');
    cy.getByTestId('login-username-input').type(Cypress.env('adminUsername'));
    cy.getByTestId('login-password-input').type(Cypress.env('adminPassword'), { log: false });
    cy.getByTestId('login-submit').click();

    cy.wait('@loginRequest', { timeout: 20000 }).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.role).to.eq('admin');
    });

    // 使用者視角：真的離開登入頁了
    cy.location('pathname', { timeout: 20000 }).should('eq', '/');
    cy.getByTestId('login-submit').should('not.exist');

    // 持久化：身分記在 localStorage + cookie，重載不會被踢回 /login
    cy.getAllLocalStorage().then((all) => {
      const origin = Object.keys(all)[0];
      expect(all[origin]['studio_role']).to.eq('admin');
    });
    cy.getCookie('studio_role').should('have.property', 'value', 'admin');

    cy.reload();
    cy.location('pathname', { timeout: 15000 }).should('eq', '/');
  });

  it('crew 從表單登入 → 同樣進得去，身分是 crew', () => {
    cy.visit('/login');

    cy.intercept('POST', '/api/auth/login').as('loginRequest');
    cy.getByTestId('login-username-input').type(Cypress.env('crewUsername'));
    cy.getByTestId('login-password-input').type(Cypress.env('crewPassword'), { log: false });
    cy.getByTestId('login-submit').click();

    cy.wait('@loginRequest', { timeout: 20000 })
      .its('response.body.role')
      .should('eq', 'crew');

    cy.location('pathname', { timeout: 20000 }).should('eq', '/');
    cy.getCookie('studio_role').should('have.property', 'value', 'crew');
  });

  it('已登入再進 /login 應被導回首頁', () => {
    cy.visit('/login');
    cy.loginAs('admin');

    cy.visit('/login');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/');
  });
});
