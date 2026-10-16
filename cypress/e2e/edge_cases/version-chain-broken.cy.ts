/**
 * 邊界：版本鏈斷掉的時候，「還原」必須說實話
 *
 * 守的業務行為：**還原重建不出來時，要讓使用者知道還原失敗、而且不可以動到目前的內容。**
 *
 * 為什麼需要這一支：`patch` 型的版本只存「跟前一版的差異」，重建時要往回找到最近的
 * `snapshot` 當基準（plans-context.tsx 的 getFullVersionState）。基準不在了就重建不出來。
 *
 * 原本的程式在這個情況下 `return allPlans.find(p => p.id === activePlanId)!` ——
 * 回傳**目前這份教案**。那個值會被 restorePlanVersion 原封不動寫回去，於是「還原」
 * 變成什麼都沒做，而呼叫端不 await 也不看結果就跳「已還原版本」。
 * 使用者看到成功提示、內容卻停在原地，只會以為「這個版本本來就長這樣」。
 *
 * ── 為什麼要繞過 UI 造資料 ─────────────────────────────────────
 *
 * 產品端刪 snapshot 時會先把下一筆 patch 實體化成 snapshot，讓鏈接得回去
 * （deletePlanVersion，對應 feature_test/versions/save-restore.cy.ts 第三條）。
 * 所以**從畫面上永遠造不出「只剩 patch、沒有基準」的狀態** —— 那正是這道擋板要守的
 * 情況：資料已經壞了（舊版本殘留、外部工具清過資料、未來的某個 bug）時畫面怎麼反應。
 * 因此這裡用 `db:deleteDoc` 直接把基準刪掉，這也是 `edge_cases/` 這個資料夾的用途。
 *
 * ⚠️ 這支**不是** mock：沒有攔截任何 API 回應，前端照樣打真的 Firestore（emulator）。
 *    只是資料的起始狀態是直接做出來的，跟 fixture 的 setupCampScenario 同一類。
 */

import type { CampScenario } from '../../plugins/firestore';

interface PlanDoc {
  id: string;
  purpose: string;
}

interface VersionDoc {
  id: string;
  name: string;
  createdAt: number;
  type: 'snapshot' | 'patch';
}

const V1 = '目標一：讓學員理解槓桿原理';
const V2 = '目標二：改成讓學員理解浮力';
const V3 = '目標三：這是還原失敗後，必須原封不動留著的內容';

describe('版本鏈斷掉時的還原 (edge_cases)', () => {
  let scenario: CampScenario;
  const target = () => scenario.planIds[0];

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 壞鏈營隊',
      plans: [{ scheduledName: '大地遊戲', activityName: '版本鏈要被弄斷的教案', groupId: 'activity', order: 0 }],
    }).then((s) => {
      scenario = s;
    });
    cy.loginAs('admin');
  });

  afterEach(() => {
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  const openEditor = () => {
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${target()}`).click();
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
  };

  const leaveEditor = () => {
    cy.getByTestId('editor-back').click();
    cy.location('pathname').should('eq', '/plans');
  };

  // 與 feature_test/versions/save-restore.cy.ts 同一套（剛載入時第一次點會被吞掉，
  // 原因與數據見該檔的 openSidebar 註解）
  const openSidebar = (attempt = 1) => {
    cy.get('body', { log: false }).then(($body) => {
      if ($body.find('[data-testid="version-sidebar"]').length > 0) return;
      if (attempt > 5) {
        throw new Error('點了 5 次「版本紀錄」，版本面板都沒開 —— 這個功能真的壞了');
      }
      cy.getByTestId('editor-history-trigger').click();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(600, { log: false });
      cy.then(() => openSidebar(attempt + 1));
    });
    cy.getByTestId('version-sidebar').should('be.visible');
  };

  const closeSidebar = () => {
    cy.getByTestId('version-sidebar-overlay').click();
    cy.getByTestId('version-sidebar').should('not.exist');
  };

  const saveNamedVersion = (name: string) => {
    openSidebar();
    cy.getByTestId('version-current-row').realHover();
    cy.getByTestId('version-save-trigger').click();
    cy.getByTestId('version-save-input').click().type(name).should('have.value', name);
    cy.getByTestId('version-save-confirm').click();
    cy.toastText().should('include', '版本已儲存');
  };

  const purposeInDb = (docs: PlanDoc[]) => docs.find((d) => d.id === target())?.purpose ?? '';

  const waitPurposeInDb = (text: string, reason: string) =>
    cy.dbDocsUntil<PlanDoc>('lessonPlans', (docs) => purposeInDb(docs).includes(text), { reason });

  const typePurpose = (text: string) => {
    cy.typeInEditorField('purpose', text);
    waitPurposeInDb(text, `目標欄位應該先落地成「${text}」`);
  };

  it('基準快照被繞過 UI 刪掉之後，按還原要說「還原失敗」，而且目前的內容一個字都不能動', () => {
    // ① 先用畫面操作建出一條真的版本鏈：手動存檔（snapshot）→ 改內容 → 離開（patch）
    openEditor();
    typePurpose(V1);
    saveNamedVersion('基準版');
    closeSidebar();
    typePurpose(V2);
    leaveEditor();

    let orphanId = '';
    cy.dbDocsUntil<VersionDoc>(
      'planVersions',
      (docs) => docs.some((v) => v.type === 'patch'),
      { reason: '按返回離開應該產生一筆 patch 型的自動存檔' },
    ).then((docs) => {
      const patch = docs
        .filter((v) => v.type === 'patch')
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      orphanId = patch.id;

      // ② 把這筆 patch 可以當基準的 snapshot 全部直接刪掉，製造「鏈斷了」的狀態。
      //    （dev 會多一筆掛載時的 Auto Save snapshot，所以用查出來的清單、不寫死筆數）
      const bases = docs.filter((v) => v.type === 'snapshot' && v.createdAt <= patch.createdAt);
      expect(bases.length, '至少要有一筆 snapshot 可以刪，否則這支的前提不成立').to.be.greaterThan(0);
      bases.forEach((b) => {
        cy.task('db:deleteDoc', { collection: 'planVersions', id: b.id });
      });
    });

    cy.then(() => {
      cy.dbDocs<VersionDoc>('planVersions').then((docs) => {
        const remainingBases = docs.filter((v) => v.type === 'snapshot');
        expect(remainingBases, '這支要的起始狀態是「一筆基準都不剩」').to.have.length(0);
        expect(docs.some((v) => v.id === orphanId), '要還原的那筆 patch 還在').to.be.true;
      });
    });

    // ③ 重新進編輯器（讓前端重新訂閱到壞掉的版本鏈），把內容改成 V3
    //
    // ⚠️ 打字前要先等欄位把 V2 顯示出來。富文字編輯器會在 value 變動時把 innerHTML
    //    整個覆寫回去（O2RichEditor.tsx:199），內容還沒到就先 {selectall}{del} 的話，
    //    清完之後 V2 又會被塞回來，結果變成「V2V3」黏在一起。
    let purposeBeforeRestore = '';
    cy.then(() => {
      openEditor();
      cy.editorField('purpose').should('contain.text', V2);
      typePurpose(V3);
      cy.dbDocs<PlanDoc>('lessonPlans').then((docs) => {
        purposeBeforeRestore = purposeInDb(docs);
        expect(purposeBeforeRestore, '按還原之前，內容應該是剛打的 V3').to.include(V3);
      });
    });

    // ④ 按還原
    cy.then(() => {
      openSidebar();
      cy.getByTestId(`version-row-${orphanId}`).click();
      cy.getByTestId('editor-history-banner').should('be.visible');
      closeSidebar();
      cy.getByTestId('editor-version-restore').click();
    });

    // ⑤ 使用者視角：要看到失敗，而且不可以看到「已還原版本」
    cy.toastText().should((text) => {
      expect(text, '要明講還原失敗').to.include('還原失敗');
      expect(text, '不可以同時／改成說成功').to.not.include('已還原版本');
    });

    // ⑥ 失敗時要留在歷史模式，讓使用者可以取消或換一個版本 ——
    //    不能一邊說失敗一邊把畫面切回去，那會讓人以為還是還原了
    cy.getByTestId('editor-history-banner').should('be.visible');

    // ⑦ 目前的內容一個字都不能被動到 —— 還原失敗最糟的結果就是「順手把現況覆蓋掉」。
    //    刻意用「跟按下去之前完全相等」而不是「包含 V3」：後者在內容被接上一段舊版
    //    文字的時候也會過。
    cy.dbDocsUntil<PlanDoc>(
      'lessonPlans',
      (docs) => purposeInDb(docs) === purposeBeforeRestore,
      { attempts: 6, reason: '還原失敗之後，資料庫裡的目標欄位必須跟按下去之前一模一樣' },
    ).then((docs) => {
      expect(purposeInDb(docs), '還原失敗不該改動目前的內容').to.eq(purposeBeforeRestore);
      expect(purposeInDb(docs), '尤其不該被換成更早的版本內容').to.not.include(V1);
    });

    // ⑧ 畫面上也還是使用者自己打的那份
    cy.getByTestId('editor-version-cancel').click();
    cy.getByTestId('editor-history-banner').should('not.exist');
    cy.editorField('purpose').should('contain.text', V3);
  });
});
