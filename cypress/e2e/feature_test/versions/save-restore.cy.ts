/**
 * 教案編輯器：版本存檔與還原
 *
 * 守的業務行為：**使用者存過的版本，之後一定救得回來。**
 * 這是全站最後一道資料安全網 —— 其他地方弄壞了還能靠還原救，還原壞了就沒有下一層。
 *
 * 寫這支的時候抓到三個真 bug（都已修，見各自的註解）：
 *   1. 還原之後 350ms，剛還原的內容又被還原前的草稿蓋回去（O2RichEditor 的補送旗標）
 *   2. 還原重建失敗時，畫面照樣跳「已還原版本」而資料一個字都沒變
 *   3. 刪掉一筆 snapshot 版本，它後面所有 patch 就再也還原不回來
 *
 * ── 版本鏈的機制（決定這支的 fixture 怎麼建）───────────────────────
 *
 * plans-context.tsx:532
 *   shouldBeSnapshot = 沒有任何版本 || 版本數 % 10 === 0 || **不是自動存檔**
 *
 * 所以 **手動存檔一律是整份 snapshot**；只存差異的 `patch` 只會從「離開編輯器時
 * 的自動存檔」產生。要測到還原鏈（plans-context.tsx:503-510 逐個套用 delta 的
 * 迴圈），就一定得真的離開編輯器一次 —— 而且要走應用內的換頁，見 leaveEditor。
 *
 * 實測出來的版本筆數變化（2026-10-16，dev server）：
 *   進編輯器        → +1 snapshot（名字是 "Auto Save - HH:MM"，見下方 ⚠️）
 *   手動存檔        → +1 snapshot
 *   按返回離開      → +1 patch
 *
 * ⚠️ 「進編輯器就多一筆」是 **dev 專屬**的假象：React Strict Mode 在 dev 會把
 *    effect 跑成 mount → cleanup → mount，而卸載時的自動存檔就掛在那個 cleanup 上
 *    （PlanEditor.tsx:585）。正式環境不會有這一筆。所以這支**不斷言版本總筆數**，
 *    只按 type／name 找出要用的那一筆 —— 斷言總數會讓測試綁在 dev 的行為上。
 *
 * 對應實作：src/components/PlanEditor.tsx、src/components/VersionHistorySidebar.tsx、
 *           src/lib/plans-context.tsx（saveNewVersion / getFullVersionState /
 *           restorePlanVersion / deletePlanVersion）
 *
 * ⚠️ emulator 測不到的一件事（不是這支的漏洞，是結構限制）：
 *    planVersions 有兩個複合查詢（plans-context.tsx:242、:495），正式環境需要
 *    複合索引，而 repo 裡**沒有 firestore.indexes.json**。emulator 會自動建索引、
 *    正式環境不會 —— 所以這支全綠**不代表線上的版本功能是好的**。
 */

import type { CampScenario } from '../../../plugins/firestore';

interface PlanDoc {
  id: string;
  purpose: string;
  activityName: string;
  updatedAt: number;
}

interface VersionDoc {
  id: string;
  planId: string;
  name: string;
  versionName?: string;
  createdAt: number;
  type: 'snapshot' | 'patch';
  snapshot?: Record<string, unknown>;
  delta?: unknown;
}

const V1 = '目標一：讓學員理解槓桿原理';
const V2 = '目標二：改成讓學員理解浮力';
const V3 = '目標三：又改成讓學員理解摩擦力';

describe('教案編輯器：版本存檔與還原 (admin)', () => {
  let scenario: CampScenario;
  const target = () => scenario.planIds[0];

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({
      campName: 'E2E 版本營隊',
      plans: [{ scheduledName: '大地遊戲', activityName: '要存版本的教案', groupId: 'activity', order: 0 }],
    }).then((s) => {
      scenario = s;
    });
    cy.loginAs('admin');
  });

  afterEach(() => {
    // 先離開編輯器頁再清資料（原因見 editor/field-persistence.cy.ts 的 afterEach）。
    // 這支更需要：編輯器卸載時會自動補一筆 planVersions，留在頁上清會清不乾淨。
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  // ── helpers ────────────────────────────────────────────────

  /**
   * 從總覽點進編輯器。
   *
   * ⚠️ 刻意不用 cy.visitApp 直接深連到 /plans/<id>：返回鈕是
   *    `history.length > 1 ? router.back() : router.push('/plans')`
   *    （PlanEditor.tsx:660），深連進來再按返回會回到 Cypress 的上一頁。
   */
  const openEditor = () => {
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId(`plan-row-${target()}`).click();
    cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
  };

  /**
   * 用返回鈕離開編輯器 → 觸發卸載時的自動存檔（這是 patch 型版本唯一的來源）。
   *
   * ⚠️ 一定要走**應用內**的換頁（router.back）。用 cy.visit 做整頁導航的話，
   *    自動存檔**一筆都不會產生**：saveNewVersion 要先 await 一次 Firestore 讀取
   *    （plans-context.tsx:526 的 getFullVersionState）才寫得出版本，而整頁導航會
   *    在那個 await 回來之前就把 JS context 拆掉。
   *    實測 2026-10-16：同樣的操作，返回鈕 → 多一筆自動存檔；cy.visit → 零筆。
   *    這也代表**使用者直接關掉分頁或重新整理時，離開前的自動存檔是無效的**
   *    （已記在 skill，未修 —— 修它要有不需要 await 的寫法）。
   */
  const leaveEditor = () => {
    cy.getByTestId('editor-back').click();
    cy.location('pathname').should('eq', '/plans');
  };

  const SIDEBAR_OPEN_ATTEMPTS = 5;

  /**
   * 開啟版本面板。
   *
   * ⚠️ 為什麼要「點了沒開就再點一次」：實測（2026-10-16）教案編輯器剛載入的前幾秒內，
   *    點頂欄的「版本紀錄」會**整個被吞掉** —— 按鈕看得到、點得下去（Cypress 沒有
   *    任何錯誤，不是被遮罩蓋住、也不是 opacity 0），但面板不會出現，點完再等兩秒
   *    去看還是沒出現；過幾秒再點一次就會開。
   *
   *    探針數據（同一支測試、同一個畫面）：
   *      剛載入就點                        → 沒開
   *      同一次測試 2 秒後再點一次          → 有開
   *      先在欄位打字再點                  → 有開
   *      固定等 4 秒再點                   → 有開
   *      只等「已儲存至雲端」出現再點        → 沒開
   *        （那是 `isSaving ? ... : ...` 的靜態分支，從第一次渲染就在，不代表就緒）
   *
   *    注意 **連 Firestore 的內容都已經長出來了還是會被吞** —— 欄位文字只可能來自
   *    client 端訂閱，所以那時 effect 已經跑過。所以這不是「還沒 hydrate」一句話
   *    可以解釋的，比較像頂欄在資料到齊後又被重建了一次，點擊打在被換掉的節點上。
   *    這是產品本身的狀態（見檔末附帶發現三），不是選擇器的問題，所以這裡模擬
   *    使用者「再點一次」，而不是用 cy.wait 猜一個夠久的秒數。
   */
  const openSidebar = (attempt = 1) => {
    cy.get('body', { log: false }).then(($body) => {
      if ($body.find('[data-testid="version-sidebar"]').length > 0) return;
      if (attempt > SIDEBAR_OPEN_ATTEMPTS) {
        throw new Error(
          `點了 ${SIDEBAR_OPEN_ATTEMPTS} 次「版本紀錄」，版本面板都沒開 —— ` +
            '這已經不是渲染時序，是這個功能真的壞了',
        );
      }
      cy.getByTestId('editor-history-trigger').click();
      // 這個 cy.wait 是**重試的輪詢間隔**（反模式 8 允許的那一類），
      // 不是拿固定等待代替斷言 —— 成立與否由下面那句 should 決定。
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(600, { log: false });
      cy.then(() => openSidebar(attempt + 1));
    });
    cy.getByTestId('version-sidebar').should('be.visible');
  };

  /**
   * 關掉版本面板。
   *
   * ⚠️ 不是可省略的步驟：面板打開時 PlanEditor.tsx:1492 會鋪一層
   *    `fixed inset-0 z-[95]` 的遮罩，而「還原」鈕在主內容區（z 更低）——
   *    面板沒關就點還原，會紅在「被另一個元素蓋住」。**那不是測試問題，
   *    使用者也是得先把面板收起來才按得到還原**（見本檔末附帶發現一）。
   */
  const closeSidebar = () => {
    cy.getByTestId('version-sidebar-overlay').click();
    cy.getByTestId('version-sidebar').should('not.exist');
  };

  /**
   * 用「目前狀態」那一列的鉛筆手動存一個具名版本。
   *
   * ⚠️ 鉛筆鈕是 `opacity-0 group-hover:opacity-100`（VersionHistorySidebar.tsx:193）。
   *    CSS 的 :hover 不吃合成事件，`.trigger('mouseover')` 沒有用 ——
   *    Cypress 會紅在「not visible because it has CSS property: opacity: 0」。
   *    所以用 cypress-real-events 的 realHover 讓真實指標移上去。
   */
  const saveNamedVersion = (name: string) => {
    openSidebar();
    cy.getByTestId('version-current-row').realHover();
    cy.getByTestId('version-save-trigger').click();
    // .should('have.value') 不是裝飾：這個 Input 是 autoFocus 的受控元件，
    // 字被吃掉時要當場紅，而不是三行後以「版本沒建出來」的樣子紅（反模式 4）。
    cy.getByTestId('version-save-input').click().type(name).should('have.value', name);
    cy.getByTestId('version-save-confirm').click();
    cy.toastText().should('include', '版本已儲存');
  };

  /** 在面板裡選一個版本進入預覽，再收起面板按還原（不含還原後的斷言） */
  const restoreVersion = (versionId: string) => {
    openSidebar();
    cy.getByTestId(`version-row-${versionId}`).click();
    // 預覽模式的訊號：歷史橫幅出現。此時欄位會被 DiffHighlighter 取代
    // （PlanEditor.tsx:1141），所以**預覽中拿不到 editor-field-***，
    // 要等還原完回到一般模式才驗欄位。
    cy.getByTestId('editor-history-banner').should('be.visible');
    closeSidebar();
    cy.getByTestId('editor-version-restore').click();
  };

  /** 從面板刪掉一筆版本（面板操作完會回到即時編輯狀態） */
  const deleteVersionViaUi = (versionId: string) => {
    openSidebar();
    // 刪除鈕只在該版本**被選取時**才出現（VersionHistorySidebar.tsx:287），
    // 而且同樣是 opacity-0 group-hover
    cy.getByTestId(`version-row-${versionId}`).click();
    cy.getByTestId(`version-row-${versionId}`).realHover();
    // window.confirm 由 Cypress 自動按確定
    cy.getByTestId(`version-delete-${versionId}`).click();
    cy.toastText().should('include', '已刪除版本');
    cy.getByTestId(`version-row-${versionId}`).should('not.exist');
    // ⚠️ 刪掉的是「正在預覽的那一筆」，而 handleDeleteVersion 只清掉 selectedVersion、
    //    沒有關掉 isHistoryMode → 畫面還卡在歷史模式，而橫幅上的「取消」鈕掛在
    //    `selectedVersion &&` 底下、此時不存在。要從「目前狀態」那一列回到即時編輯
    //    （見本檔末附帶發現二）。
    cy.getByTestId('version-current-row').click();
    closeSidebar();
    cy.getByTestId('editor-history-banner').should('not.exist');
  };

  const purposeInDb = (docs: PlanDoc[]) => docs.find((d) => d.id === target())?.purpose ?? '';

  const waitPurposeInDb = (text: string, reason: string) =>
    cy.dbDocsUntil<PlanDoc>('lessonPlans', (docs) => purposeInDb(docs).includes(text), { reason });

  const typePurpose = (text: string) => {
    cy.typeInEditorField('purpose', text);
    waitPurposeInDb(text, `目標欄位應該先落地成「${text}」，否則後面存的版本內容會不確定`);
  };

  const newestFirst = (docs: VersionDoc[]) => [...docs].sort((a, b) => b.createdAt - a.createdAt);

  /** 等到 patch 型版本累積到 n 筆（每按一次返回 +1），回傳**由舊到新**的 patch 清單 */
  const patchesUntil = (n: number, reason: string) =>
    cy
      .dbDocsUntil<VersionDoc>('planVersions', (docs) => docs.filter((v) => v.type === 'patch').length >= n, {
        reason,
      })
      .then((docs) =>
        docs.filter((v) => v.type === 'patch').sort((a, b) => a.createdAt - b.createdAt),
      );

  // ── 1. 最基本的保證 ─────────────────────────────────────────

  it('存版本 → 改內容 → 還原 → 畫面、資料庫、重載三層都回到存檔當時的值', () => {
    openEditor();
    typePurpose(V1);
    saveNamedVersion('基準版');

    cy.dbDocsUntil<VersionDoc>(
      'planVersions',
      (docs) => docs.some((v) => v.name === '基準版'),
      { reason: '手動存檔應該產生一筆名為「基準版」的版本' },
    ).then((docs) => {
      const base = docs.find((v) => v.name === '基準版')!;
      expect(base.type, '手動存檔一律是整份快照（plans-context.tsx:532 的 !isAuto）').to.eq('snapshot');
      expect(base.planId, '版本要掛在這一筆教案上').to.eq(target());
      expect(String(base.snapshot?.purpose ?? ''), '快照裡應該是存檔當時的目標').to.include(V1);

      closeSidebar();

      // 存完之後把內容改掉 —— 還原要能把這一步撤回去
      typePurpose(V2);

      restoreVersion(base.id);

      // ① 使用者視角：還原後回到一般模式，欄位顯示舊值
      cy.toastText().should('include', '已還原版本');
      cy.getByTestId('editor-history-banner').should('not.exist');
      cy.editorField('purpose').should('contain.text', V1);
      cy.editorField('purpose').should('not.contain.text', V2);

      // ② 資料庫：真的寫回去了。
      //
      // ⚠️ 這裡要的不只是「有一刻等於 V1」，而是**穩定**停在 V1。原本
      //    O2RichEditor 的補送旗標在第一次打字後就永遠是真值，於是進入歷史模式
      //    卸載那個欄位編輯器時會把還原前的草稿再送一次 —— 資料庫先變成 V1、
      //    350ms 後又被改回 V2。所以先等 V1 落地，再多確認一次沒有被改回去。
      waitPurposeInDb(V1, '還原後資料庫的目標欄位應該回到 V1').then(() => {
        cy.dbDocsUntil<PlanDoc>(
          'lessonPlans',
          (docs) => !purposeInDb(docs).includes(V2),
          { attempts: 6, reason: '還原之後不可以又被還原前的草稿蓋回 V2' },
        ).then((docs) => {
          expect(purposeInDb(docs), '還原後資料庫裡不該還留著 V2').to.not.include(V2);
          expect(purposeInDb(docs), '還原後資料庫應該是 V1').to.include(V1);
        });
      });

      // ③ 持久化：重載後還是舊值（不是只在 local state 裡回退）
      cy.reload();
      cy.getByTestId('editor-title-input', { timeout: 20000 }).should('be.visible');
      cy.editorField('purpose').should('contain.text', V1);
      cy.editorField('purpose').should('not.contain.text', V2);
    });
  });

  // ── 2. 還原鏈（這條才會走到 jsondiffpatch）────────────────────

  it('還原「離開編輯器時自動存的」版本 —— 要沿著快照＋delta 鏈重建回那個時間點', () => {
    openEditor();
    typePurpose(V1);
    saveNamedVersion('基準版');
    closeSidebar();

    // V2 → 離開 → 自動存檔。這一筆是 patch 型（只存跟基準版的差異）
    typePurpose(V2);
    leaveEditor();

    let autoVersionId = '';
    patchesUntil(1, '按返回離開應該自動補一筆 patch 型版本（PlanEditor.tsx:585 的卸載處理器）').then(
      (patches) => {
        expect(patches[0].delta, 'patch 型版本必須有 delta，否則還原時無從重建').to.exist;
        expect(patches[0].snapshot, 'patch 型版本不該帶整份快照').to.not.exist;
        autoVersionId = patches[0].id;
      },
    );

    // 再改一次並離開，讓要還原的那一筆**不是最新的**
    // —— 否則「還原」跟「什麼都不做」的結果一樣，這條測試會失去鑑別力
    openEditor();
    typePurpose(V3);
    leaveEditor();
    patchesUntil(2, '第二次離開應該再補一筆 patch');

    openEditor();
    cy.editorField('purpose').should('contain.text', V3);

    cy.then(() => {
      restoreVersion(autoVersionId);
    });

    cy.toastText().should('include', '已還原版本');
    cy.editorField('purpose').should('contain.text', V2);
    cy.editorField('purpose').should('not.contain.text', V3);

    waitPurposeInDb(V2, '還原 patch 型版本後，資料庫應該回到 V2（基準快照 ＋ 一個 delta）').then(
      (docs) => {
        expect(purposeInDb(docs), '不該還留著 V3').to.not.include(V3);
        expect(purposeInDb(docs), '也不該退回到更早的 V1').to.not.include(V1);
      },
    );
  });

  // ── 3. 刪掉基準快照之後，歷史不可以跟著失效 ──────────────────

  it('把 patch 依賴的基準快照刪掉之後，那些自動存檔仍然還原得回來', () => {
    openEditor();
    typePurpose(V1);
    saveNamedVersion('基準版');
    closeSidebar();

    typePurpose(V2);
    leaveEditor();

    let autoId = '';
    let basesToDelete: string[] = [];
    patchesUntil(1, '應該有一筆離開時的自動存檔').then((patches) => {
      autoId = patches[0].id;
      return cy.dbDocs<VersionDoc>('planVersions').then((docs) => {
        // 這一筆 patch 重建時會往回找「createdAt 不晚於它、最近的 snapshot」。
        // 把**所有**可能當基準的 snapshot 都刪掉，才真的驗到「鏈被截斷之後還救不救得回來」。
        // （dev 會多一筆掛載時的 Auto Save snapshot，正式環境只有「基準版」那一筆 ——
        //   所以這裡用查出來的清單，不寫死筆數。）
        basesToDelete = newestFirst(docs)
          .filter((v) => v.type === 'snapshot' && v.createdAt <= patches[0].createdAt)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((v) => v.id);
        expect(basesToDelete.length, '至少要有一筆 snapshot 當基準，否則這條測試的前提不成立')
          .to.be.greaterThan(0);
      });
    });

    // 使用者在面板裡把這些版本刪掉 —— 他的意圖只是清掉幾筆紀錄，
    // 不是「讓後面每一筆都變成還原不回來的廢資料」
    cy.then(() => {
      openEditor();
      basesToDelete.forEach((id) => deleteVersionViaUi(id));
    });

    cy.then(() => {
      cy.dbDocsUntil<VersionDoc>(
        'planVersions',
        (docs) => basesToDelete.every((id) => !docs.some((v) => v.id === id)),
        { reason: '被刪掉的版本應該真的從資料庫消失' },
      );
    });

    // 再把目前內容改成 V3，這樣「還原成功」與「什麼都沒做」的結果不同
    cy.then(() => {
      typePurpose(V3);
      restoreVersion(autoId);
    });

    // 還原必須真的回到 V2。
    //
    // 修好之前這裡會紅，而且紅得很誤導 —— 畫面跳「已還原版本」、欄位停在 V3：
    // getFullVersionState 找不到基準快照就回傳**目前這份教案**
    // （plans-context.tsx:501 原本的寫法），等於把 V3 原封不動寫回去，
    // 而呼叫端不 await 也不看結果就報成功。
    // 修法是刪 snapshot 時先把下一筆 patch 實體化成 snapshot，讓鏈接得回去。
    cy.toastText().should('include', '已還原版本');
    cy.editorField('purpose').should('contain.text', V2);
    cy.editorField('purpose').should('not.contain.text', V3);
    waitPurposeInDb(V2, '刪掉基準快照之後，自動存檔仍然要還原得回 V2').then((docs) => {
      expect(purposeInDb(docs), '還原後不該還是 V3（那代表還原其實什麼都沒做）').to.not.include(V3);
    });
  });

  // ── 4. 只是看一下歷史，不該改到教案 ──────────────────────────

  it('只預覽歷史版本、沒按還原 → 教案一個字都不該被改到（updatedAt 也不能動）', () => {
    openEditor();
    typePurpose(V1);
    saveNamedVersion('基準版');

    cy.dbDocsUntil<VersionDoc>(
      'planVersions',
      (docs) => docs.some((v) => v.name === '基準版'),
      { reason: '要先有一筆具名版本才能預覽' },
    ).then((versions) => {
      const base = versions.find((v) => v.name === '基準版')!;
      closeSidebar();

      cy.dbDocs<PlanDoc>('lessonPlans').then((before) => {
        const snapshotBefore = before.find((d) => d.id === target())!;

        // 進預覽 → 取消，全程沒有按還原
        openSidebar();
        cy.getByTestId(`version-row-${base.id}`).click();
        cy.getByTestId('editor-history-banner').should('be.visible');
        closeSidebar();
        cy.getByTestId('editor-version-cancel').click();
        cy.getByTestId('editor-history-banner').should('not.exist');

        // 這條是 O2RichEditor「補送」機制的防線。
        //
        // 進入歷史模式會把富文字欄位的編輯器整個卸載（欄位換成 DiffHighlighter），
        // 而卸載時會跑「把還在 debounce 等著送的內容補送出去」的邏輯。那個補送的
        // 判斷條件如果是「debounceTimer 這個 ref 有值」，它在第一次打字之後就
        // **永遠**成立 —— 於是每一次卸載都會多送一筆寫入。
        // 平常看不出來（寫回同樣的值），但那會讓「只是看一下歷史」變成一次真實的
        // 寫入，而且只要這期間有別人改過這個欄位，補送就會把舊草稿蓋回去。
        //
        // 所以這裡比對的是 updatedAt：它是唯一能區分「沒寫入」與「寫了同樣的值」的
        // 欄位（updatePlan 每次都會塞 Date.now()）。
        cy.dbDocsUntil<PlanDoc>(
          'lessonPlans',
          (docs) => docs.find((d) => d.id === target())?.updatedAt === snapshotBefore.updatedAt,
          { attempts: 6, reason: '只預覽版本不該產生任何寫入，updatedAt 應該原封不動' },
        ).then((docs) => {
          const after = docs.find((d) => d.id === target())!;
          expect(after.updatedAt, '只預覽版本不該讓 updatedAt 前進').to.eq(snapshotBefore.updatedAt);
          expect(after.purpose, '內容也不該被動到').to.eq(snapshotBefore.purpose);
        });
      });
    });
  });

  // ── 5. 防呆：沒給名稱不該產生版本，也不該謊稱存好了 ──────────

  it('存檔沒打名稱就按確定 → 不產生具名版本，也不該出現「版本已儲存」', () => {
    openEditor();
    typePurpose(V1);

    cy.dbDocs<VersionDoc>('planVersions').then((before) => {
      openSidebar();
      cy.getByTestId('version-current-row').realHover();
      cy.getByTestId('version-save-trigger').click();
      cy.getByTestId('version-save-input').should('have.value', '');
      cy.getByTestId('version-save-confirm').click();

      // 輸入框收起來（回到「當前版本」那一行）= 這次操作真的被處理掉了，
      // 不是卡在那裡什麼都沒發生
      cy.getByTestId('version-save-input').should('not.exist');
      cy.getByTestId('version-sidebar').should('contain.text', '當前版本');

      // 沒有任何提示說存好了
      cy.get('body').should('not.contain.text', '版本已儲存');

      // 資料庫也不該多出東西。這裡刻意**不是** dbDocsUntil ——
      // 要驗的是「不該發生的事沒發生」，重試只會把等待時間拉長。
      cy.dbDocs<VersionDoc>('planVersions').should('have.length', before.length);
    });
  });
});

/*
 * 附帶發現一（未修，另記）：桌機上選了版本之後，「還原 / Restore」鈕被版本面板的
 * 全螢幕遮罩（PlanEditor.tsx:1492，z-[95]）蓋住，使用者必須先把面板收起來才按得到，
 * 而面板上沒有任何提示說「關掉我才看得到還原鈕」。手機（< 640px）反而沒這問題 ——
 * onSelectVersion 會順手把面板關掉（PlanEditor.tsx:1504）。
 *
 * 附帶發現二（未修，另記）：刪掉「正在預覽的那一筆版本」之後，畫面卡在歷史模式 ——
 * 欄位全是唯讀的 diff 檢視，而橫幅上的「取消 / Cancel」鈕因為掛在 `selectedVersion &&`
 * 底下而消失。要回到即時編輯只剩兩條路：面板裡的「目前狀態」那一列，或用頂欄的
 * 版本紀錄鈕把面板收起來（那條分支有順手 setIsHistoryMode(false)）。
 * 點遮罩關面板**不會**解除歷史模式。修法是 handleDeleteVersion 裡
 * setSelectedVersion(null) 的同時也 setIsHistoryMode(false)。
 *
 * 附帶發現三（未修，另記）：教案編輯器剛載入的前幾秒內，點頂欄的「版本紀錄」會被
 * 整個吞掉 —— 按鈕可見、可點、沒有任何遮擋，但面板不出現，過幾秒再點才會開。
 * 量到的時間窗在 dev server 上是「數秒」；正式環境的 chunk 是預先建好的，窗口應該
 * 小得多，但 /plans/[id] 是 server-rendered on demand，SSR 出來的按鈕在接上事件
 * 之前本來就是死的，所以線上也可能發生，只是很短。
 * 要修的話方向是「資料到齊前把頂欄的動作鈕設成 disabled」，讓使用者看得出還不能按，
 * 而不是點了沒反應。這支測試用的是「點了沒開就再點一次」（見 openSidebar）。
 */
