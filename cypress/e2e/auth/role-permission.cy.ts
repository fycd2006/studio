/**
 * 組員（crew）唯讀權限
 *
 * 守的業務行為：crew 看得到全部教案，但**不能**建立、刪除、改組別；
 * 而且按下去要明確告訴他為什麼（唯讀模式提示），不是靜靜地沒反應。
 *
 * ⚠️ 這支的重點是**黑名單**：只驗「admin 該看到的 crew 也看到」會讓
 *    權限洩漏完全抓不到 —— 多出來的那顆刪除鈕，白名單斷言永遠不會碰到。
 *    所以每一條都成對寫：crew 不該有的 `should('not.exist')`，
 *    同一個東西 admin 必須有（否則 testid 打錯也會「通過」）。
 *
 * 對應實作：src/app/plans/page.tsx（isAdmin / crewToast / renderPlanActions）
 */

import type { CampScenario } from '../../plugins/firestore';

describe('組員唯讀權限 (crew)', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 權限營隊',
      plans: [{ scheduledName: '既有行程', activityName: '既有活動', groupId: 'activity', order: 0 }],
    }).then((s) => {
      scenario = s;
    });
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('crew 看得到教案列表（讀取不該被擋）', () => {
    cy.loginAs('crew');
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId(`plan-row-${scenario.planIds[0]}`)
      .should('be.visible')
      .and('contain', '既有活動');
  });

  it('crew 的列操作選單裡不該有「刪除教案」；admin 必須有', () => {
    const planId = scenario.planIds[0];

    cy.loginAs('crew');
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${planId}`).findByTestId(`plan-actions-${planId}`).click();

    // 白名單：下載對 crew 開放，所以選單確實打開了（排除「選單沒開」造成的假通過）
    cy.contains('[role="menu"]', '下載 Word').should('be.visible');
    // 黑名單：刪除與更換組別都不該在
    cy.getByTestId(`plan-action-delete-${planId}`).should('not.exist');
    cy.contains('[role="menu"]', '更換組別').should('not.exist');

    // 同一個 testid，admin 必須看得到 —— 否則上面的 not.exist 只是打錯字
    cy.loginAs('admin');
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${planId}`).findByTestId(`plan-actions-${planId}`).click();
    cy.getByTestId(`plan-action-delete-${planId}`).should('be.visible');
    cy.contains('[role="menu"]', '更換組別').should('be.visible');
  });

  it('crew 按「新增檔案」應出現唯讀提示，且不打開組別選單、不建任何資料', () => {
    cy.loginAs('crew');
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId('plans-add-trigger').click();

    // 使用者看得到的結果：明確的唯讀提示
    cy.toastText().should('include', '唯讀模式');
    // 黑名單：組別選單不該打開（打開就等於權限只做在視覺上）
    cy.getByTestId('plans-add-group-activity').should('not.exist');

    // 真的什麼都沒建（只驗畫面會漏掉「畫面沒變但其實寫進去了」）
    cy.dbDocs('lessonPlans').then((docs) => {
      expect(docs, 'crew 按新增之後，資料庫筆數不該變').to.have.length(scenario.planIds.length);
    });
  });

  it('admin 按同一顆「新增檔案」應打開組別選單（證明上一條不是按鈕壞了）', () => {
    cy.loginAs('admin');
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId('plans-add-trigger').click();
    cy.getByTestId('plans-add-group-activity').should('be.visible');
  });

  it('crew 在空營隊時不該看到「立即新增教案」入口；admin 要看到', () => {
    cy.setupCampScenario({ campName: 'E2E 權限空營隊', planCount: 0 }).then((empty) => {
      cy.loginAs('crew');
      cy.visitApp('/plans', { campId: empty.campId });
      cy.getByTestId('plans-empty-state').should('be.visible');
      cy.getByTestId('plans-empty-add-trigger').should('not.exist');

      cy.loginAs('admin');
      cy.visitApp('/plans', { campId: empty.campId });
      cy.getByTestId('plans-empty-add-trigger').should('be.visible');

      cy.cleanupCampScenario(empty.scenarioId);
    });
  });
});
