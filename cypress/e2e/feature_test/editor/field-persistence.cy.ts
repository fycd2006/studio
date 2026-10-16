/**
 * 教案編輯器：欄位打字 → 真的存進 Firestore → 重載還在
 *
 * 守的業務行為：使用者在編輯器裡打的每一個字，都要真的進到資料庫。
 * 這是整個產品的主要用途，而編輯器的寫入鏈是全站最長、最容易無聲失敗的一段：
 *
 *   打字 → O2RichEditor debounce 350ms（O2RichEditor.tsx:216）
 *        → PlanEditor debounce 400ms（PlanEditor.tsx:412）
 *        → updateDocumentNonBlocking → Firestore（fire-and-forget，反模式 5）
 *
 * ⚠️ 這支**一定要驗資料庫**，不能只驗畫面。畫面上的字來自元件的 local state
 *    （PlanEditor 的 localPlan），寫入失敗時它**不會退回去** —— 畫面會一直顯示
 *    使用者打的字，右上角還寫著「已儲存至雲端」，而資料庫裡是舊值。
 *
 * 對應實作：src/components/PlanEditor.tsx、src/components/O2RichEditor.tsx、
 *           src/app/plans/[id]/page.tsx
 */

import type { CampScenario } from '../../../plugins/firestore';

interface PlanDoc {
  id: string;
  activityName: string;
  scheduledName: string;
  purpose: string;
  process: string;
  content: string;
  remarks: string;
  openingClosingRemarks: string;
  time: string;
  location: string;
  leadMember: string;
  assistantMember: string;
  members: string;
  updatedAt: number;
}

describe('教案編輯器：欄位持久化 (admin)', () => {
  let scenario: CampScenario;
  const target = () => scenario.planIds[0];
  const other = () => scenario.planIds[1];

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 編輯器營隊',
      plans: [
        { scheduledName: '大地遊戲', activityName: '待編輯的教案', groupId: 'activity', order: 0 },
        { scheduledName: '科學闖關', activityName: '不該被動到的教案', groupId: 'activity', order: 1 },
      ],
    }).then((s) => {
      scenario = s;
    });
    cy.loginAs('admin');
  });

  afterEach(() => {
    // ⚠️ 先離開編輯器頁再清資料，順序不能反。
    // 人還留在編輯器上時刪掉 lessonPlans → /plans/[id] 切到「找不到教案」分支
    // → PlanEditor 卸載 → 它的卸載處理器用卸載前的閉包狀態補寫一筆 planVersions
    // → cleanup 第一輪刪完之後才長出來，看起來像「比對鍵寫錯」。
    // （plugins/firestore.ts 的 cleanupCampScenario 有重試當保險，但治本是這一行。）
    //
    // ⚠️ 這裡**只確認換頁發生了**，不要等 /plans 上的任何元素。
    //    cy.visit 本身就會等 load 事件，而文件被換掉的那一刻編輯器就卸載了 ——
    //    清資料需要的只有這件事。等元素會把 cleanup 綁上「app 要載入成功」這個
    //    條件：實測遇過 /plans 停在載入轉圈超過 20 秒（campsData 一直是 null，
    //    沒有任何 permission error），於是 afterEach 紅掉、後面三條測試全被跳過，
    //    而訊息只說「找不到 plans-search-input」—— 跟這支 spec 在測的事毫無關係。
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  const openEditor = (planId: string) => {
    cy.visitApp(`/plans/${planId}`, { campId: scenario.campId });
    // 編輯器的頂欄是整頁都掛好了的訊號；沒等到它就打字會打在還沒 hydrate 的畫面上
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
  };

  const planInDb = (docs: PlanDoc[], id: string) => docs.find((d) => d.id === id);

  it('六個富文字欄位打字 → Firestore 真的有、updatedAt 會更新、重載後還在', () => {
    const typed = {
      purpose: '目標：讓學員理解槓桿原理',
      process: '流程：分組 → 實作 → 競賽 → 結語',
      content: '內容：器材介紹與安全須知',
      remarks: '備註：雨天改室內',
      time: '45min',
      location: '活動中心 2F',
    };

    cy.dbDocs<PlanDoc>('lessonPlans').then((before) => {
      const seededUpdatedAt = planInDb(before, target())!.updatedAt;

      openEditor(target());

      (Object.keys(typed) as Array<keyof typeof typed>).forEach((field) => {
        cy.typeInEditorField(field, typed[field]);
      });

      // ① 資料庫：六個欄位一次驗完（寫入是 fire-and-forget，所以用會重試的讀取）
      cy.dbDocsUntil<PlanDoc>(
        'lessonPlans',
        (docs) => {
          const d = planInDb(docs, target());
          if (!d) return false;
          // contenteditable 會自己包 <div> / <br>，所以比對「包含」而不是相等
          return (Object.keys(typed) as Array<keyof typeof typed>).every((f) =>
            (d[f] ?? '').includes(typed[f]),
          );
        },
        {
          reason:
            '六個欄位都該落地。只有部分落地 → 看 debounce 鏈哪一段沒走完（見本檔檔頭）',
        },
      ).then((docs) => {
        const d = planInDb(docs, target())!;
        expect(d.updatedAt, 'updatedAt 應該比 seed 的時間新').to.be.greaterThan(seededUpdatedAt);
        // 同一個營隊的另一筆教案不該被連帶改到
        const untouched = planInDb(docs, other())!;
        expect(untouched.purpose, '另一筆教案的目標欄位不該被動到').to.eq('');
        expect(untouched.activityName, '另一筆教案的名稱不該被動到').to.eq('不該被動到的教案');
      });

      // ② 持久化：重載後畫面上還看得到（使用者視角）
      cy.reload();
      cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
      cy.editorField('purpose').should('contain.text', typed.purpose);
      cy.editorField('process').should('contain.text', typed.process);
      cy.editorField('location').should('contain.text', typed.location);
    });
  });

  it('主/副關主打字 → 兩個欄位各自存好，且 members 會被組成「主、副」', () => {
    openEditor(target());

    cy.typeInEditorField('leadMember', '王小明');
    cy.typeInEditorField('assistantMember', '陳小美');

    // members 是**衍生欄位**（PlanEditor.tsx 的 handleLeadMemberChange 組出來的），
    // 總覽頁的搜尋吃的就是它（見 plans/overview.cy.ts「搜尋也吃負責人員」）。
    // 只驗 leadMember / assistantMember 會漏掉「組合邏輯壞了 → 搜尋從此搜不到人」。
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => planInDb(docs, target())?.members === '王小明、陳小美',
      { reason: 'members 應被組成「王小明、陳小美」' },
    ).then((docs) => {
      const d = planInDb(docs, target())!;
      expect(d.leadMember, '主關主').to.eq('王小明');
      expect(d.assistantMember, '副關主').to.eq('陳小美');
    });

    cy.reload();
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
    cy.editorField('leadMember').should('have.value', '王小明');
    cy.editorField('assistantMember').should('have.value', '陳小美');
  });

  it('活動類型選「劇本」→ 版面切成劇本模式；換回「大地遊戲」要全部回來', () => {
    openEditor(target());

    // 劇本模式（PlanEditor.tsx:482 的 isScriptMode）只留四個欄位，
    // 其餘整個 <section> 連同欄位一起不渲染。
    const scriptModeFields = ['purpose', 'content', 'props', 'remarks'];
    const hiddenInScriptMode = [
      'activityName',
      'leadMember',
      'assistantMember',
      'time',
      'location',
      'process',
      'openingClosingRemarks',
    ];

    hiddenInScriptMode.forEach((f) => {
      cy.getByTestId(`editor-field-${f}`).should('exist');
    });

    cy.getByTestId('activity-type-trigger').click();
    // 選項是從 userSettings.activityTypes 來的（預設含「劇本」），
    // 用 role=option 鎖定清單再比文字 —— 選項本身沒有 testid，但清單角色是固定的
    cy.contains('[role="option"]', '劇本').click();

    // 使用者視角：該消失的消失、該留的留
    hiddenInScriptMode.forEach((f) => {
      cy.getByTestId(`editor-field-${f}`).should('not.exist');
    });
    scriptModeFields.forEach((f) => {
      cy.getByTestId(`editor-field-${f}`).should('exist');
    });

    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => planInDb(docs, target())?.scheduledName === '劇本',
      { reason: '活動類型應寫進 scheduledName' },
    );

    // 換回去 —— 沒有這一段的話，「所有欄位都消失」也會讓上面全過
    cy.getByTestId('activity-type-trigger').click();
    cy.contains('[role="option"]', '大地遊戲').click();
    hiddenInScriptMode.forEach((f) => {
      cy.getByTestId(`editor-field-${f}`).should('exist');
    });
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => planInDb(docs, target())?.scheduledName === '大地遊戲',
      { reason: '換回大地遊戲也要寫進資料庫' },
    );
  });

  it('打完字立刻按「返回」離開，內容不該掉（這條抓到真 bug）', () => {
    // 🔒 真 bug，已修（O2RichEditor.tsx 的卸載清理函式）：
    //    原本卸載時只 clearTimeout，等於把還在 350ms debounce 裡的字**丟掉**。
    //    實測：打完字立刻離開，2.5 秒後 DB 的 purpose 仍是 ""，
    //    而畫面上字還在、右上角寫著「已儲存至雲端」—— 使用者以為存好了。
    //
    // ⚠️ 不要在這裡補等待讓它變綠。中間那段「等 debounce」正是這條要守的東西：
    //    使用者不會為了存檔而在頁面上多站 1 秒。
    const text = '打完立刻離開也要存下來';

    // 走完整條使用者路徑：總覽 → 點那一列進編輯器 → 打字 → 按返回。
    // 不能用 cy.visitApp 直接深連到編輯器再按返回 —— 那顆鈕是
    // `history.length > 1 ? router.back() : router.push('/plans')`
    // （PlanEditor.tsx:660），深連進來時 back() 會回到 Cypress 自己的前一頁，
    // 於是測試會紅在「找不到 plans-search-input」，看起來像返回鈕壞了。
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${target()}`).click();
    cy.location('pathname', { timeout: 20000 }).should('eq', `/plans/${target()}`);
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');

    cy.typeInEditorField('purpose', text);

    cy.getByTestId('editor-back').click();
    cy.location('pathname', { timeout: 20000 }).should('eq', '/plans');
    cy.getByTestId('plans-search-input', { timeout: 20000 }).should('be.visible');

    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => (planInDb(docs, target())?.purpose ?? '').includes(text),
      {
        reason:
          '離開編輯器時，還在 debounce 裡的內容必須被補送出去（O2RichEditor 的卸載清理函式）',
      },
    );

    // 回到編輯器：使用者看得到自己的字還在
    openEditor(target());
    cy.editorField('purpose').should('contain.text', text);
  });

  it('頂欄改教案名稱 → 總覽列表的那一列跟著變（跨頁一致）', () => {
    const renamed = '改過名字的教案';

    openEditor(target());
    cy.getByTestId('editor-title-input')
      .click()
      .clear()
      .type(renamed)
      .should('have.value', renamed);

    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => planInDb(docs, target())?.activityName === renamed,
      { reason: '頂欄改名應寫進 activityName' },
    );

    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${target()}`).should('contain', renamed);
    // 另一列不該被改到（改錯 id 的話只驗一列會看不出來）
    cy.getByTestId(`plan-row-${other()}`).should('contain', '不該被動到的教案');
  });
});
