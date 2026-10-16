/// <reference types="cypress" />

/**
 * 本專案的 Cypress Custom Commands
 *
 * 寫新測試前先看過這一份：重複寫 intercept / 登入 / 清資料的邏輯會造成
 * 行為不一致，而且會錯過命令裡內建的防護（例如 cleanup 的自證斷言）。
 * 規範全文見 .claude/skills/camp-cypress-test-fe/SKILL.md
 */

import type { CampScenario, CampScenarioOptions } from '../plugins/firestore';

type Role = 'admin' | 'crew';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** `cy.get('[data-testid="..."]')` 的簡寫 */
      getByTestId(
        testId: string,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>,
      ): Chainable<JQuery<HTMLElement>>;

      /** 在**目前這個元素底下**找 testid（只找後代，不含自己） */
      findByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * 把整個 Firestore emulator 清空，並斷言真的清乾淨。
       * 每支 spec 的 beforeEach 第一件事。
       */
      resetDb(): Chainable<Record<string, number>>;

      /** 一次建齊這支 spec 需要的資料，回傳所有 id */
      setupCampScenario(options?: CampScenarioOptions): Chainable<CampScenario>;

      /** 依 scenarioId 反向刪整組，並斷言 remaining 全為 0 */
      cleanupCampScenario(scenarioId: string): Chainable<void>;

      /**
       * 以指定身分登入（走真的 /api/auth/login，不是直接塞 localStorage）。
       * 必須在 cy.visit 之前呼叫。
       */
      loginAs(role: Role): Chainable<void>;

      /** 選定某個營隊（app 把它記在 localStorage.activeCampId） */
      selectCamp(campId: string): Chainable<void>;

      /**
       * 以「已登入 + 已選定營隊」的狀態開某個頁面。
       *
       * 為什麼不是 cy.visit：身分與營隊都存在 localStorage，而 app 在**第一個
       * effect** 就讀它們（auth-context 讀 studio_role、plans-context 讀
       * activeCampId）。先 visit 再寫就已經被導去 /login、或 Firestore 查詢
       * 已經以 activeCampId=null 建好了 —— 兩種都會長得像功能壞掉。
       */
      visitApp(
        path: string,
        options?: { campId?: string; role?: Role; onBeforeLoad?: (win: Cypress.AUTWindow) => void },
      ): Chainable<Cypress.AUTWindow>;

      /** 提示訊息（Radix toast）的文字 —— 接 `.should(...)` 用 */
      toastText(): Chainable<string>;

      /**
       * 教案編輯器裡某個欄位**可輸入**的那個元素。
       *
       * 為什麼不是直接 getByTestId：編輯器的 12 個欄位都包在
       * `FieldContainer`（src/components/PlanEditor.tsx:79）裡，testid 下在
       * 容器上（`editor-field-<欄位>`），真正能打字的是它底下的
       * contenteditable（富文字欄位）或 input（人員欄位）。
       *
       * ⚠️ 刻意**不加 `.first()`**：某個欄位裡冒出第二個可輸入元素時，
       *    要在當場紅（「can only be called on a single element」），
       *    而不是默默只測到其中一個。
       */
      editorField(field: string): Chainable<JQuery<HTMLElement>>;

      /**
       * 清空某個編輯器欄位再輸入文字，並**當場驗字真的進去了**。
       *
       * 最後那句斷言不是裝飾：Radix 關閉選單時會搶焦點（見 skill 反模式 4），
       * 富文字編輯器也會在 350ms debounce 後把 innerHTML 寫回去 ——
       * 兩者都可能吃掉輸入。沒有這句，字被吃掉會在三行之後以
       * 「資料庫裡找不到」的樣子紅，而那完全指不到原因。
       */
      typeInEditorField(field: string, text: string): Chainable<void>;

      /** 直接讀 Firestore 的某個集合（驗「畫面操作真的寫進資料庫」） */
      dbDocs<T = Record<string, unknown>>(collection: string): Chainable<T[]>;

      /**
       * 反覆讀某個集合直到條件成立（給「寫入是非同步」的情況用）。
       *
       * 為什麼需要它：plans-context 的寫入走 setDocumentNonBlocking ——
       * fire-and-forget。Firestore client SDK 的延遲補償會讓**畫面先長出**
       * 那一列（本地視圖），但伺服器端可能還沒收到。所以「畫面看到了」
       * 不等於「資料庫有了」，直接接 cy.dbDocs 會間歇性撈到舊資料。
       *
       * ⚠️ 這不是放寬斷言：條件在時限內沒成立，最後仍然會拿到不滿足條件的
       *    結果讓 expect 紅掉。
       */
      dbDocsUntil<T = Record<string, unknown>>(
        collection: string,
        predicate: (docs: T[]) => boolean,
        options?: { attempts?: number; intervalMs?: number; reason?: string },
      ): Chainable<T[]>;
    }
  }
}

Cypress.Commands.add('getByTestId', (testId: string, options?) =>
  cy.get(`[data-testid="${testId}"]`, options),
);

Cypress.Commands.add(
  'findByTestId',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, testId: string) =>
    cy.wrap(subject).find(`[data-testid="${testId}"]`),
);

// ─────────────────────────────────────────────────────────────
// 資料：清空 / 建 scenario / 清 scenario
//
// 這三支都**自證**：清不乾淨、建不出來就在當場紅，而不是讓後面的斷言
// 以一個不確定的世界為前提跑下去（那種紅的訊息會指向完全無關的地方）。
// ─────────────────────────────────────────────────────────────

Cypress.Commands.add('resetDb', () =>
  cy.task<Record<string, number>>('db:reset').then((remaining) => {
    const dirty = Object.entries(remaining).filter(([, n]) => Number(n) > 0);
    expect(
      dirty,
      '❌ 清空 emulator 之後仍有殘留！\n' +
        `   殘留內容: ${JSON.stringify(dirty)}\n` +
        '   可能原因: emulator 沒在跑、連錯 port、或有別的程序正在寫入\n' +
        '   解決方案:\n' +
        '     1. 確認用的是 ./scripts/e2e.sh 啟動（它會等 emulator 就緒才開跑）\n' +
        '     2. 看 cypress/logs/emulator.log 有沒有 port 被占用\n' +
        '     3. 檢查 cypress/plugins/firestore.ts 的 COLLECTIONS 是否漏了新集合\n' +
        '   ⚠️ 不要放它過去：殘留會累積，後續測試會撈到上一支留下的資料',
    ).to.deep.equal([]);
    return cy.wrap(remaining, { log: false });
  }),
);

Cypress.Commands.add('setupCampScenario', (options: CampScenarioOptions = {}) =>
  cy.task<CampScenario>('db:setupCampScenario', options).then((scenario) => {
    // Fail Fast：fixture 不完整就當場停。
    // 不這樣做的話，下游會以一個不完整的世界為前提跑下去，
    // 然後紅在某個找不到元素的斷言上 —— 而那個訊息跟真正的原因毫無關係。
    expect(
      scenario?.campId,
      '❌ scenario 沒有回傳 campId！\n' +
        '   解決方案: 檢查 cypress/plugins/firestore.ts 的 setupCampScenario 是否真的寫入了 camps',
    ).to.be.a('string');

    const wanted = options.plans?.length ?? options.planCount ?? 0;
    expect(
      scenario.planIds,
      `❌ scenario 建出來的教案筆數不對！\n` +
        `   期望: ${wanted} 筆\n` +
        `   實際: ${scenario.planIds?.length ?? 0} 筆\n` +
        '   解決方案: 確認 options.plans / options.planCount 傳對了；\n' +
        '             並檢查 setupCampScenario 的 batch.commit() 有沒有被例外中斷',
    ).to.have.length(wanted);

    return cy.wrap(scenario, { log: false });
  }),
);

Cypress.Commands.add('cleanupCampScenario', (scenarioId: string) => {
  if (!scenarioId) return;
  cy.task<{
    deleted: Record<string, number>;
    remaining: Record<string, number>;
    passes: number;
  }>('db:cleanupCampScenario', scenarioId).then(({ remaining, passes }) => {
    expect(remaining, 'cleanup 必須回傳 remaining（自證清乾淨）').to.be.an('object');
    // 多跑了一輪就說出來 —— 那代表 app 在我們刪完之後還寫了東西進來
    // （最常見的是編輯器卸載時的 autosave，見 plugins/firestore.ts 的註解）。
    // 靜靜吸收掉會讓「哪支 spec 在 cleanup 之後還在寫」永遠查不出來。
    if (passes > 1) {
      cy.task(
        'log',
        `⚠️ cleanup 跑了 ${passes} 輪才清乾淨：有東西在第一輪刪完之後才寫進來。` +
          `若是編輯器類的 spec，請在 cleanup 前先離開編輯器頁。`,
        { log: false },
      );
    }
    const dirty = Object.entries(remaining).filter(([, n]) => Number(n) > 0);
    expect(
      dirty,
      '❌ cleanup 沒清乾淨！\n' +
        `   殘留內容: ${JSON.stringify(dirty)}\n` +
        '   最常見原因: cleanup 的比對鍵在測試過程中被改掉了，所以比對不到\n' +
        '               （例如用名稱當鍵，而測試把名稱改了）\n' +
        '   解決方案: 改用測試動不到的鍵（id / campId），見\n' +
        '             cypress/plugins/firestore.ts 的 cleanupCampScenario\n' +
        '   ⚠️ 不要放它過去：每跑一次多一筆，累積後會咬死其他 spec',
    ).to.deep.equal([]);
  });
});

Cypress.Commands.add('dbDocs', <T,>(collection: string) =>
  cy.task<T[]>('db:getDocs', collection),
);

Cypress.Commands.add(
  'dbDocsUntil',
  <T,>(
    collection: string,
    predicate: (docs: T[]) => boolean,
    options: { attempts?: number; intervalMs?: number; reason?: string } = {},
  ) => {
    const attempts = options.attempts ?? 20;
    const intervalMs = options.intervalMs ?? 250;

    const poll = (left: number): Cypress.Chainable<T[]> =>
      cy.task<T[]>('db:getDocs', collection, { log: false }).then((docs) => {
        if (predicate(docs) || left <= 1) {
          return cy.wrap(docs, { log: false });
        }
        // 這裡的固定等待是**輪詢間隔**，不是用等待取代斷言：
        // 條件沒成立就繼續問，問到時限為止，最後仍由呼叫端的 expect 判生死。
        return cy.wait(intervalMs, { log: false }).then(() => poll(left - 1));
      });

    return poll(attempts).then((docs) => {
      expect(
        predicate(docs),
        options.reason ??
          `${collection} 在 ${attempts * intervalMs}ms 內沒達到預期狀態；目前有 ${docs.length} 筆`,
      ).to.eq(true);
      return cy.wrap(docs, { log: false });
    });
  },
);

// ─────────────────────────────────────────────────────────────
// 登入
//
// 本專案的身分只有兩個地方：localStorage 的 `studio_role` 與同名 cookie
// （src/lib/auth-context.tsx / src/app/api/auth/login/route.ts）。
//
// 這支**走真的 /api/auth/login**，不是直接塞 localStorage ——
// 帳密驗證壞掉時要讓測試紅，而不是被 fixture 繞過去。
// 拿到 role 之後才寫 localStorage，因為 AuthProvider 是在第一個 effect
// 讀它的：先 visit 再寫就已經被導去 /login 了。
// ─────────────────────────────────────────────────────────────

/** cy.loginAs 記下來的身分，供後續 cy.visitApp 在 onBeforeLoad 寫進 localStorage。 */
let currentRole: Role | null = null;

Cypress.Commands.add('loginAs', (role: Role) => {
  const username =
    role === 'admin' ? Cypress.env('adminUsername') : Cypress.env('crewUsername');
  const password =
    role === 'admin' ? Cypress.env('adminPassword') : Cypress.env('crewPassword');

  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password },
  }).then((res) => {
    expect(res.status, '登入 API 應回 200').to.eq(200);
    expect(res.body.role, `帳號 ${username} 應該是 ${role}`).to.eq(role);
    currentRole = role;
    // 已經有載入過的頁面時一併寫進去（讓同一支測試裡後續的 cy.reload 也有身分）
    cy.window({ log: false }).then((win) => {
      win.localStorage.setItem('studio_role', role);
    });
  });
});

Cypress.Commands.add('selectCamp', (campId: string) => {
  cy.window({ log: false }).then((win) => {
    win.localStorage.setItem('activeCampId', campId);
  });
});

Cypress.Commands.add(
  'visitApp',
  (
    path: string,
    options: { campId?: string; role?: Role; onBeforeLoad?: (win: Cypress.AUTWindow) => void } = {},
  ) => {
    const role = options.role ?? currentRole;
    return cy.visit(path, {
      onBeforeLoad: (win) => {
        if (role) win.localStorage.setItem('studio_role', role);
        if (options.campId) win.localStorage.setItem('activeCampId', options.campId);
        options.onBeforeLoad?.(win);
      },
    });
  },
);

Cypress.Commands.add('toastText', () =>
  // 抓**外層容器**再看它的文字。抓單一則 toast 或用 cy.contains 找某段字
  // 都會漏（toast 是 portal、而且幾秒後自己消失），那會把功能正常的東西
  // 誤報成「畫面什麼都沒說」—— 正好是這類斷言要防的相反方向。
  cy.get('[data-testid="toast-viewport"]', { timeout: 15000 }).invoke('text'),
);

// ─────────────────────────────────────────────────────────────
// 教案編輯器的欄位
//
// 編輯器的寫入鏈有**兩段** debounce，比列表頁長得多：
//   打字 → O2RichEditor 350ms（O2RichEditor.tsx:216）→ onChange
//        → PlanEditor 400ms（PlanEditor.tsx:412）→ onUpdate → Firestore
// 所以「畫面上看到字」之後還要將近 0.75 秒才會落地，而且落地本身是
// fire-and-forget（反模式 5）。驗資料庫一律用 cy.dbDocsUntil，不要直接
// 接 cy.dbDocs —— 後者會間歇性撈到舊值，而紅的訊息長得像功能壞掉。
// ─────────────────────────────────────────────────────────────

Cypress.Commands.add('editorField', (field: string) =>
  cy
    .getByTestId(`editor-field-${field}`)
    // ⚠️ 一定要寫 input[type="text"]，不能只寫 input：
    //    每個 O2RichEditor 的工具列裡都藏著兩個 sr-only 的 <input type="color">
    //    （O2RichEditor.tsx:1522-1523）→ 寫成 input 會撈到 3 個，而錯誤訊息
    //    只會說「不能對 3 個元素點擊」，看不出真正的問題是選擇器太寬。
    .find('[contenteditable="true"], input[type="text"], textarea'),
);

Cypress.Commands.add('typeInEditorField', (field: string, text: string) => {
  cy.editorField(field).then(($el) => {
    const isRichText = $el.attr('contenteditable') === 'true';
    if (isRichText) {
      // contenteditable 不吃 cy.clear()（它只支援 input / textarea），
      // 用 {selectall}{del} 清。先 click 把焦點拿回來 —— 游標不在裡面時
      // {selectall} 會選到整個 document。
      //
      // ⚠️ 每一步都**重新查一次元素**，不要串成
      //    `.click().type('{selectall}{del}').type(text)`。
      //    清空會讓 O2RichEditor 切到 placeholder 分支（isEditorEmpty）重新渲染，
      //    串起來的話第二個 type 會拿到已經從 DOM 卸下的舊元素，報
      //    「The subject is no longer attached to the DOM」——
      //    而那個訊息看起來像元件壞了，其實只是鏈太長。（實測 2026-10-15）
      cy.editorField(field).click();
      cy.editorField(field).type('{selectall}{del}');
      cy.editorField(field).type(text);
      cy.editorField(field).should('contain.text', text);
    } else {
      cy.editorField(field).click();
      cy.editorField(field).clear();
      cy.editorField(field).type(text);
      cy.editorField(field).should('have.value', text);
    }
  });
});

beforeEach(() => {
  // 身分不跨測試殘留：忘了重設會讓「未登入應被導走」那類測試在單獨跑時綠、
  // 接在別支後面跑時紅（而紅的訊息完全看不出是上一支留下來的）。
  currentRole = null;
});

export {};
