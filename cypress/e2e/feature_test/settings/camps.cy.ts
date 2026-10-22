/**
 * 專案（camp）鎖定與切換
 *
 * 守的業務行為：被 admin 鎖定的專案，crew **看不到也進不去**；而且萬一他正停在
 * 一個被鎖定的專案上（admin 在他使用中鎖定、或瀏覽器還記著上次選的那一個），
 * 系統要**自動把他換到可用的專案**並說明原因 —— 不能只是把他踢回首頁，
 * 那樣 activeCampId 還是鎖定的那一個，每進一頁就再被踢一次，人就卡死在裡面
 * （GitHub issue #9）。
 *
 * ⚠️ 這支的重點是**黑名單**：只驗「未鎖定的專案看得到」不會抓到權限洩漏 ——
 *    多出來的那一列鎖定專案，白名單斷言永遠不會碰到。所以每一條都成對寫：
 *    crew 不該看到的 `should('not.exist')`，同一個 testid admin 必須看得到
 *    （否則 testid 打錯也會「通過」）。
 *
 * 另外要注意：「換到別的專案」這件事光看畫面會被騙 —— 畫面可能只是被導回首頁，
 * 而 activeCampId 仍然是鎖定的那一個。所以每一條都同時驗
 * `localStorage.activeCampId`，那才是卡不卡住的真正依據。
 *
 * 對應實作：src/lib/plans-context.tsx（可用專案的判定與退回）、
 *          src/components/AppShell.tsx（停在鎖定專案時的處理）、
 *          src/app/settings/page.tsx（工作區的專案清單）
 *
 * 尚未涵蓋（另開 it 或另開檔）：建立 / 改名 / 刪除專案。
 */

import type { CampScenario } from '../../../plugins/firestore';

describe('系統設定 — 專案鎖定與切換', () => {
  let scenario: CampScenario;
  /** 未鎖定、而且是登入首選專案 */
  let campA: string;
  /** 被 admin 鎖定的專案 */
  let campB: string;
  /** 另一個未鎖定的專案（A 也被鎖時的退路） */
  let campC: string;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 可用營隊 A',
      extraCamps: [
        { name: 'E2E 鎖定營隊 B', isLocked: true },
        { name: 'E2E 備用營隊 C' },
      ],
      defaultCampIndex: 0,
      plans: [
        { scheduledName: 'A 專案行程', activityName: 'A 專案活動', groupId: 'activity', order: 0 },
      ],
    }).then((s) => {
      scenario = s;
      [campA, campB, campC] = s.camps.map((c) => c.id);
    });
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('crew 在工作區看不到被鎖定的專案；admin 看得到', () => {
    cy.loginAs('crew');
    cy.visitApp('/settings', { campId: campA });
    cy.getByTestId('settings-tab-workspace').click();

    // 白名單：清單確實渲染了（排除「整個清單沒出來」造成的假通過）
    cy.getByTestId(`settings-camp-row-${campA}`).should('be.visible');
    cy.getByTestId(`settings-camp-row-${campC}`).should('be.visible');
    // 黑名單：鎖定的那一個不該出現 —— 看得到就點得到，點了就卡住
    cy.getByTestId(`settings-camp-row-${campB}`).should('not.exist');

    // 同一個 testid，admin 必須看得到，否則上面那句 not.exist 只是打錯字
    cy.loginAs('admin');
    cy.visitApp('/settings', { campId: campA });
    cy.getByTestId('settings-tab-workspace').click();
    cy.getByTestId(`settings-camp-row-${campB}`).should('be.visible');
  });

  it('crew 使用中被 admin 即時鎖定 → 自動換到未鎖定的專案，而不是卡在鎖定專案', () => {
    const planId = scenario.planIds[0];

    cy.loginAs('crew');
    cy.visitApp('/plans', { campId: campA });
    cy.getByTestId(`plan-row-${planId}`).should('be.visible').and('contain', 'A 專案活動');

    // admin 在另一台裝置把 crew 正在用的專案鎖起來
    cy.task('db:patchDoc', { collection: 'camps', id: campA, data: { isLocked: true } });

    cy.toastText().should('include', '鎖定');

    // 真正的判準：活躍專案換成唯一還開著的 C。
    // 只驗畫面會被騙 —— 被導回首頁時畫面也「不在鎖定專案上」，但 activeCampId 還是它。
    cy.window().should((win) => {
      expect(win.localStorage.getItem('activeCampId'), '活躍專案應換成未鎖定的 C').to.eq(campC);
    });

    // 使用者視角：鎖定專案的內容不該再看得到
    cy.visitApp('/plans');
    cy.getByTestId(`plan-row-${planId}`).should('not.exist');
    cy.getByTestId('plans-empty-state').should('be.visible');

    // 不卡住：工作區進得去（之前的作法是每進一頁就被踢回首頁）
    cy.visitApp('/settings');
    cy.location('pathname').should('eq', '/settings');
    cy.getByTestId('settings-tab-workspace').click();
    cy.getByTestId(`settings-camp-row-${campC}`).should('be.visible');
    cy.getByTestId(`settings-camp-row-${campA}`).should('not.exist');
  });

  it('瀏覽器記著的是已被鎖定的專案 → 進站自動回到首選專案，重新整理也不會彈回去', () => {
    const planId = scenario.planIds[0];

    cy.loginAs('crew');
    // 上一次選的是 B，而 B 在這期間被鎖了
    cy.visitApp('/plans', { campId: campB });

    cy.window().should((win) => {
      expect(win.localStorage.getItem('activeCampId'), '應退回首選專案 A').to.eq(campA);
    });
    cy.toastText().should('include', '鎖定');
    cy.getByTestId(`plan-row-${planId}`).should('be.visible').and('contain', 'A 專案活動');

    // 持久化：重新整理之後仍然在 A，不會被 localStorage 裡的舊值拉回鎖定專案
    cy.reload();
    cy.window().should((win) => {
      expect(win.localStorage.getItem('activeCampId'), '重整後仍應在 A').to.eq(campA);
    });
    cy.getByTestId(`plan-row-${planId}`).should('be.visible');
  });

  it('所有專案都被鎖定 → crew 看到空狀態，而且不會停在任何一個鎖定專案裡', () => {
    cy.task('db:patchDoc', { collection: 'camps', id: campA, data: { isLocked: true } });
    cy.task('db:patchDoc', { collection: 'camps', id: campC, data: { isLocked: true } });

    cy.loginAs('crew');
    cy.visitApp('/settings', { campId: campA });
    cy.getByTestId('settings-tab-workspace').click();

    cy.getByTestId('settings-camps-empty').should('be.visible');
    [campA, campB, campC].forEach((id) => {
      cy.getByTestId(`settings-camp-row-${id}`).should('not.exist');
    });
    cy.window().should((win) => {
      expect(
        win.localStorage.getItem('activeCampId'),
        '一個可用專案都沒有時，不該還停在某個鎖定專案上',
      ).to.eq(null);
    });

    // 對照：admin 不受鎖定影響，三個都看得到，也不該看到空狀態
    cy.loginAs('admin');
    cy.visitApp('/settings', { campId: campA });
    cy.getByTestId('settings-tab-workspace').click();
    cy.getByTestId('settings-camps-empty').should('not.exist');
    [campA, campB, campC].forEach((id) => {
      cy.getByTestId(`settings-camp-row-${id}`).should('be.visible');
    });
  });
});
