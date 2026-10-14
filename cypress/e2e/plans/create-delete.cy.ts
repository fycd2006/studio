/**
 * 教案的建立與刪除（admin）
 *
 * 守的業務行為：使用者在列表上按「新增」真的會多出一份可用的教案，
 * 而且那份教案**存進資料庫**、重載後還在；刪除則要真的消失。
 *
 * 為什麼不只驗「畫面多了一列」：這個 app 的寫入是 client SDK 直接打
 * Firestore（plans-context 的 setDocumentNonBlocking），寫入失敗不會
 * 讓畫面退回去 —— 樂觀更新 + 即時監聽會讓畫面先長出那一列。
 * 只驗畫面等於沒驗到「真的存下來了」。
 *
 * 對應實作：src/app/plans/page.tsx（handleCreatePlan / confirmDelete）
 *          src/lib/plans-context.tsx（addPlan / deletePlan）
 */

import type { CampScenario } from '../../plugins/firestore';

interface PlanDoc {
  id: string;
  campId: string;
  activityName: string;
  groupId?: string;
  category?: string;
}

describe('教案建立與刪除 (admin)', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 建刪營隊',
      plans: [{ scheduledName: '既有行程', activityName: '既有活動', groupId: 'activity', order: 0 }],
    }).then((s) => {
      scenario = s;
    });
    cy.loginAs('admin');
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('新增教案：畫面多一列 + 寫進 Firestore + 重載後還在', () => {
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${scenario.planIds[0]}`).should('be.visible');

    // 動作：真的走完下拉選單 → 選組別
    cy.getByTestId('plans-add-trigger').click();
    cy.getByTestId('plans-add-group-activity').should('be.visible').click();

    // 第 1 層：使用者看得到的回饋
    cy.toastText().should('include', '已建立');

    // 第 2 層：列表真的多了一列「新教案」
    cy.contains('[data-testid^="plan-row-"]', '新教案', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid^="plan-row-"]').should('have.length', scenario.planIds.length + 1);
    cy.getByTestId('plans-group-tab-all').should('contain', `(${scenario.planIds.length + 1})`);

    // 第 3 層：資料庫真的有這筆，而且 campId / 組別都對
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => docs.some((d) => d.activityName === '新教案'),
      { reason: '資料庫裡應找得到剛建立的「新教案」（寫入是 fire-and-forget，需等它真的落地）' },
    ).then((docs) => {
      expect(docs, 'Firestore 應有 seed + 新建共 2 筆').to.have.length(scenario.planIds.length + 1);
      const created = docs.find((d) => d.activityName === '新教案');
      expect(created, '資料庫裡應找得到剛建立的「新教案」').to.exist;
      expect(created!.campId, '新教案應掛在目前選定的營隊下').to.eq(scenario.campId);
      expect(created!.category, '選活動組建出來的應是 activity').to.eq('activity');
    });

    // 第 4 層：持久化 —— 重載後還在（排除「只是前端狀態」的假成功）
    cy.reload();
    cy.contains('[data-testid^="plan-row-"]', '新教案', { timeout: 15000 }).should('be.visible');
  });

  it('選教學組新增 → 該筆應只出現在教學組分頁', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    cy.getByTestId('plans-add-trigger').click();
    cy.getByTestId('plans-add-group-teaching').should('be.visible').click();
    cy.toastText().should('include', '已建立');

    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => docs.some((d) => d.activityName === '新教案'),
      { reason: '選教學組按下去之後，資料庫應出現新教案' },
    ).then((docs) => {
      const created = docs.find((d) => d.activityName === '新教案');
      expect(created, '應建出新教案').to.exist;
      expect(created!.category, '選教學組建出來的應是 teaching').to.eq('teaching');

      // 使用者視角：切到教學組看得到、切到活動組看不到（同一筆、兩種條件、相反結果）
      cy.getByTestId('plans-group-tab-teaching').click();
      cy.getByTestId(`plan-row-${created!.id}`).should('be.visible');

      cy.getByTestId('plans-group-tab-activity').click();
      cy.getByTestId(`plan-row-${created!.id}`).should('not.exist');
    });
  });

  it('刪除教案：要打字 delete 才解鎖，刪完列表與資料庫都不該有它', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    const targetId = scenario.planIds[0];
    cy.getByTestId(`plan-row-${targetId}`).should('be.visible');

    // ⚠️ 操作選單在「桌機列」與「手機列」各渲染一份、testid 相同
    //    （兩者都在 DOM 裡，只是各自被 md: 斷點藏起來）。
    //    直接 cy.getByTestId 會撈到 2 個元素，而錯誤訊息講的是
    //    「不能對 2 個元素點擊」—— 完全看不出真正的問題是「找的範圍不對」。
    //    先鎖定該列、再往下找。
    cy.getByTestId(`plan-row-${targetId}`).findByTestId(`plan-actions-${targetId}`).click();
    cy.getByTestId(`plan-action-delete-${targetId}`).should('be.visible').click();

    cy.getByTestId('plan-delete-dialog').should('be.visible');

    // ⚠️ 選單關閉時 Radix 會把焦點**搶回觸發按鈕**（onCloseAutoFocus），
    //    而那發生在非同步的下一輪。對話框剛開的瞬間直接打字，第一個字會進去、
    //    後面的字會被打到那顆按鈕上 —— 實測 type('delet') 之後輸入框只有 "d"，
    //    而「確認」當然還是鎖著，紅的訊息卻只說「按鈕應該不是 disabled」，
    //    完全看不出是焦點被搶走。
    //    正解：等選單真的消失、再點一下輸入框把焦點拿回來，才開始打字。
    cy.get('[role="menu"]').should('not.exist');

    // 防呆：還沒打字之前按鈕是鎖著的
    cy.getByTestId('plan-delete-confirm').should('be.disabled');
    cy.getByTestId('plan-delete-input').click().type('delet').should('have.value', 'delet');
    cy.getByTestId('plan-delete-confirm').should('be.disabled');
    cy.getByTestId('plan-delete-input').type('e').should('have.value', 'delete');
    cy.getByTestId('plan-delete-confirm').should('not.be.disabled').click();

    // 使用者看得到的結果
    cy.toastText().should('include', '已刪除');
    cy.getByTestId('plan-delete-dialog').should('not.exist');
    cy.getByTestId(`plan-row-${targetId}`).should('not.exist');

    // 資料庫真的沒了（只驗畫面會漏掉「畫面移除但刪除請求失敗」）
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => !docs.some((d) => d.id === targetId),
      { reason: '資料庫不該再有這筆教案' },
    );

    cy.reload();
    cy.getByTestId(`plan-row-${targetId}`).should('not.exist');
  });

  it('刪除對話框按取消 → 什麼都不該發生', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    const targetId = scenario.planIds[0];
    cy.getByTestId(`plan-row-${targetId}`).findByTestId(`plan-actions-${targetId}`).click();
    cy.getByTestId(`plan-action-delete-${targetId}`).click();
    cy.getByTestId('plan-delete-dialog').should('be.visible');

    cy.getByTestId('plan-delete-cancel').click();

    cy.getByTestId('plan-delete-dialog').should('not.exist');
    cy.getByTestId(`plan-row-${targetId}`).should('be.visible');
    cy.dbDocs<PlanDoc>('lessonPlans').then((docs) => {
      expect(docs.map((d) => d.id), '取消之後資料庫不該少東西').to.include(targetId);
    });
  });
});
