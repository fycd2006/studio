/** 等待測試登入憑證時，受保護的資料訂閱必須等到成員資料載入。 */
describe('成員登入延遲時的資料載入', () => {
  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
  });

  const openWithSlowFirstSignIn = (
    visit: (options: Partial<Cypress.VisitOptions>) => void,
    ms: number,
  ) => {
    cy.intercept(
      { method: 'POST', url: /identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithCustomToken/ },
      (req) => {
        req.continue((res) => {
          res.setDelay(ms);
        });
      },
    ).as('memberAuth');

    visit({
      onBeforeLoad(win) {
        // 把上一個測試留下來的身分清掉，確保這次會交換測試登入憑證
        win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      },
    });
  };

  it('登入頁在尚未建立 Firebase 身分時仍可使用', () => {
    cy.visit('/login');
    cy.getByTestId('login-username-input').type('e2e-admin').should('have.value', 'e2e-admin');
    cy.getByTestId('login-password-input').type('e2e-admin-pw');
    cy.getByTestId('login-submit').should('not.be.disabled');
  });

  it('教案總覽：成員登入慢 4 秒，資料回來後列表仍然長得出來', () => {
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

      // 慢的只有成員登入，不是壞掉 —— 等它回來之後列表必須真的出現
      cy.wait('@memberAuth', { timeout: 20000 });
      cy.getByTestId(`plan-row-${scenario.planIds[0]}`, { timeout: 20000 })
        .should('be.visible')
        .and('contain', '競態教案');

      cy.visit('/plans');
      cy.location('pathname').should('eq', '/plans');
      cy.cleanupCampScenario(scenario.scenarioId);
    });
  });
});
