/**
 * 教案編輯器：富文字格式與貼上
 *
 * 守兩件業務行為：
 *   1. 使用者按 Cmd/Ctrl+B / I / U 加上的格式，要真的存成 HTML 並在重載後還在。
 *      （教案會被匯出成 Word / PDF，格式掉了等於交付物壞了。）
 *   2. 從外部（Google Docs / 網頁）貼進來的內容，格式留著、**可執行的東西被拿掉**。
 *      這是 O2RichEditor.tsx:53 的 sanitizeHtml 唯一被呼叫到的地方（只在貼上時跑）。
 *
 * ⚠️ 本專案的編輯器**沒有顯示工具列**（O2RichEditor 的 hideToolbar 預設 true，
 *    PlanEditor 沒有覆寫）。所以粗體這類格式只能從鍵盤快捷鍵進去 ——
 *    不要為了「點工具列按鈕」去找不存在的 testid。
 *
 * ⚠️ 這支**不是** stored XSS 的測試。sanitizeHtml 只擋貼上那條路；
 *    資料庫裡既有的內容是直接 innerHTML 塞回畫面的（O2RichEditor.tsx:205），
 *    那條路由 edge_cases/xss.cy.ts 負責。
 *
 * 對應實作：src/components/O2RichEditor.tsx
 */

import type { CampScenario } from '../../../plugins/firestore';

interface PlanDoc {
  id: string;
  purpose: string;
  content: string;
}

describe('教案編輯器：富文字格式與貼上 (admin)', () => {
  let scenario: CampScenario;
  const target = () => scenario.planIds[0];

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 富文字營隊',
      plans: [{ scheduledName: '大地遊戲', activityName: '富文字教案', groupId: 'activity', order: 0 }],
    }).then((s) => {
      scenario = s;
    });
    cy.loginAs('admin');
  });

  afterEach(() => {
    // 先離開編輯器再清資料（理由見 field-persistence.cy.ts 的 afterEach）
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  const openEditor = () => {
    cy.visitApp(`/plans/${target()}`, { campId: scenario.campId });
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
  };

  const planInDb = (docs: PlanDoc[]) => docs.find((d) => d.id === target());

  it('選取文字後按 Cmd/Ctrl+B → 存成粗體 HTML，重載後還是粗體', () => {
    openEditor();
    cy.typeInEditorField('purpose', '這段要變粗體');

    // 全選這個欄位的內容再下指令（execCommand 吃的是目前的選取範圍）
    // 修飾鍵要看平台：O2RichEditor.tsx:467 吃的是 `e.ctrlKey || e.metaKey`，
    // 寫死 {cmd} 的話在 Linux / Windows 上永遠不會觸發，而紅的訊息會說
    // 「找不到 <b>」，看起來像粗體功能壞了。
    const mod = Cypress.platform === 'darwin' ? '{cmd}' : '{ctrl}';
    cy.editorField('purpose').type('{selectall}');
    cy.editorField('purpose').type(`${mod}b`);

    // 使用者視角：畫面上真的出現粗體元素
    cy.editorField('purpose').find('b, strong').should('contain.text', '這段要變粗體');

    // 資料庫：存進去的是帶標籤的 HTML，不是純文字
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => /<(b|strong)>/i.test(planInDb(docs)?.purpose ?? ''),
      {
        reason:
          '粗體要存成 <b>/<strong>。只存到純文字 → execCommand 沒作用在選取範圍上（檢查 {selectall} 的焦點）',
      },
    ).then((docs) => {
      expect(planInDb(docs)!.purpose, '粗體內容仍應包含原文').to.include('這段要變粗體');
    });

    // 持久化：重載後仍是粗體（不是只有當下那一次 render 看起來對）
    cy.reload();
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
    cy.editorField('purpose').find('b, strong').should('contain.text', '這段要變粗體');
  });

  it('貼上外部 HTML：格式留著，<script> / onerror / javascript: 被拿掉', () => {
    // 這段模擬從網頁複製過來的內容：一段合法格式 + 三種可執行的東西
    const pasted =
      '<p><b>合法粗體</b> 與一般文字</p>' +
      '<script>window.__xssFromPaste = true;<\/script>' +
      '<img src="x" onerror="window.__xssFromPaste = true" />' +
      '<a href="javascript:window.__xssFromPaste = true">看起來正常的連結</a>';

    openEditor();

    cy.editorField('content').click();
    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();
      dataTransfer.setData('text/html', pasted);
      cy.editorField('content').trigger('paste', { clipboardData: dataTransfer });
    });

    // ① 使用者視角：該留的留下來了（證明貼上這件事真的發生了，排除「什麼都沒貼進去」的假通過）
    cy.editorField('content').should('contain.text', '合法粗體');
    cy.editorField('content').find('b, strong').should('exist');

    // ② 該拿掉的拿掉了 —— 黑名單斷言，全部放在同一個 should 裡
    cy.editorField('content').should(($el) => {
      const html = $el.html();
      expect(html, '<script> 不該被貼進來').to.not.match(/<script/i);
      expect(html, 'on* 事件屬性不該被貼進來').to.not.match(/\son\w+\s*=/i);
      expect(html, 'javascript: 連結不該被貼進來').to.not.match(/javascript:/i);
    });

    // ③ 真的沒有被執行（屬性被清掉 ≠ 沒執行過，兩件事都要驗）
    cy.window().its('__xssFromPaste').should('be.undefined');

    // ④ 資料庫裡存的也是清乾淨的版本（畫面乾淨但存了髒的 → 下次載入就執行了）
    cy.dbDocsUntil<PlanDoc>('lessonPlans', (docs) => (planInDb(docs)?.content ?? '').includes('合法粗體'), {
      reason: '貼上的內容應落地',
    }).then((docs) => {
      const stored = planInDb(docs)!.content;
      expect(stored, '資料庫裡不該有 <script>').to.not.match(/<script/i);
      expect(stored, '資料庫裡不該有 on* 事件屬性').to.not.match(/\son\w+\s*=/i);
      expect(stored, '資料庫裡不該有 javascript: 連結').to.not.match(/javascript:/i);
    });

    // ⑤ 重載後也不該執行（存進去的東西會被直接 innerHTML 塞回畫面）
    cy.reload();
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
    cy.editorField('content').should('contain.text', '合法粗體');
    cy.window().its('__xssFromPaste').should('be.undefined');
  });
});
