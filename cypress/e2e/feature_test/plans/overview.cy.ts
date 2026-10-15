/**
 * 教案總覽：列表 / 搜尋 / 組別篩選 / 空狀態
 *
 * 守的業務行為：使用者選定營隊後，該營隊的教案要出現在列表裡，
 * 而搜尋與組別分頁要真的「篩掉別的、留下該留的」。
 *
 * 對應實作：src/app/plans/page.tsx（filteredPlans）
 *          src/lib/plans-context.tsx（lessonPlans where campId == activeCampId）
 */

import type { CampScenario } from '../../../plugins/firestore';

describe('教案總覽 (Plans Overview)', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();

    cy.setupCampScenario({
      campName: 'E2E 總覽營隊',
      plans: [
        { scheduledName: '大地遊戲', activityName: '尋寶大作戰', groupId: 'activity', leadMember: '小明', order: 0 },
        { scheduledName: '團體動力', activityName: '破冰時間', groupId: 'activity', leadMember: '小華', order: 1 },
        { scheduledName: '靜態課程', activityName: '生命教育', groupId: 'teaching', leadMember: '阿美', order: 2 },
      ],
    }).then((s) => {
      scenario = s;
    });

    cy.loginAs('admin');
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('應顯示所選營隊的全部教案，數量與 seed 一致', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    // 三筆都要在畫面上（逐筆驗，不是只驗「有東西」）
    scenario.plans.forEach((plan) => {
      cy.getByTestId(`plan-row-${plan.id}`)
        .should('be.visible')
        .and('contain', plan.activityName);
    });

    // 「全部」分頁的計數要等於 seed 筆數
    cy.getByTestId('plans-group-tab-all').should('contain', `(${scenario.planIds.length})`);
    cy.getByTestId('plans-empty-state').should('not.exist');
  });

  it('搜尋應留下命中的那筆、並讓沒命中的消失', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    const target = scenario.plans[0]; // 尋寶大作戰
    const other = scenario.plans[2]; // 生命教育
    cy.getByTestId(`plan-row-${other.id}`).should('exist');

    cy.getByTestId('plans-search-input').type(target.activityName);

    // 同一組資料、兩種條件、相反結果 —— 這才證明篩選真的在做事
    cy.getByTestId(`plan-row-${target.id}`).should('be.visible');
    cy.getByTestId(`plan-row-${other.id}`).should('not.exist');

    // 清空搜尋 → 全部回來
    cy.getByTestId('plans-search-input').clear();
    cy.getByTestId(`plan-row-${other.id}`).should('be.visible');
  });

  it('搜尋也吃負責人員（leadMember）', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId('plans-search-input').type('阿美');
    cy.getByTestId(`plan-row-${scenario.plans[2].id}`).should('be.visible');
    cy.getByTestId(`plan-row-${scenario.plans[0].id}`).should('not.exist');
  });

  it('切到「教學組」分頁應只留該組的教案；切回「全部」要全部回來', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    const teaching = scenario.plans.filter((p) => p.groupId === 'teaching');
    const activity = scenario.plans.filter((p) => p.groupId === 'activity');
    expect(teaching, 'seed 應至少有一筆教學組').to.have.length.gte(1);
    expect(activity, 'seed 應至少有一筆活動組').to.have.length.gte(1);

    cy.getByTestId('plans-group-tab-teaching').click();
    teaching.forEach((p) => cy.getByTestId(`plan-row-${p.id}`).should('be.visible'));
    activity.forEach((p) => cy.getByTestId(`plan-row-${p.id}`).should('not.exist'));

    cy.getByTestId('plans-group-tab-all').click();
    activity.forEach((p) => cy.getByTestId(`plan-row-${p.id}`).should('be.visible'));
  });

  it('搜尋找不到東西時應顯示空狀態', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId('plans-search-input').type('這串字不可能存在於任何教案裡');

    cy.getByTestId('plans-empty-state').should('be.visible').and('contain', '目前沒有任何教案');
    scenario.plans.forEach((p) => cy.getByTestId(`plan-row-${p.id}`).should('not.exist'));
  });

  it('選到沒有教案的營隊時應顯示空狀態（不是壞掉的畫面）', () => {
    cy.setupCampScenario({ campName: 'E2E 空營隊', planCount: 0 }).then((empty) => {
      cy.visitApp('/plans', { campId: empty.campId });

      cy.getByTestId('plans-empty-state').should('be.visible');
      cy.getByTestId('plans-group-tab-all').should('contain', '(0)');
      // 另一個營隊的教案不該漏進來（campId 過濾要真的生效）
      scenario.plans.forEach((p) => cy.getByTestId(`plan-row-${p.id}`).should('not.exist'));

      cy.cleanupCampScenario(empty.scenarioId);
    });
  });
});
