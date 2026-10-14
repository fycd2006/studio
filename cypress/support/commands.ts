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
      `清空 emulator 後仍有殘留：${JSON.stringify(dirty)}。` +
        'emulator 可能沒在跑或連錯 port —— 修它，不要放它過去',
    ).to.deep.equal([]);
    return cy.wrap(remaining, { log: false });
  }),
);

Cypress.Commands.add('setupCampScenario', (options: CampScenarioOptions = {}) =>
  cy.task<CampScenario>('db:setupCampScenario', options).then((scenario) => {
    // Fail Fast：fixture 不完整就當場停，別讓它在下游偽裝成功能壞掉
    expect(scenario?.campId, 'scenario 應回傳 campId').to.be.a('string');
    const wanted = options.plans?.length ?? options.planCount ?? 0;
    expect(scenario.planIds, `scenario 應建 ${wanted} 筆教案`).to.have.length(wanted);
    return cy.wrap(scenario, { log: false });
  }),
);

Cypress.Commands.add('cleanupCampScenario', (scenarioId: string) => {
  if (!scenarioId) return;
  cy.task<{ deleted: Record<string, number>; remaining: Record<string, number> }>(
    'db:cleanupCampScenario',
    scenarioId,
  ).then(({ remaining }) => {
    expect(remaining, 'cleanup 必須回傳 remaining（自證清乾淨）').to.be.an('object');
    const dirty = Object.entries(remaining).filter(([, n]) => Number(n) > 0);
    expect(
      dirty,
      `cleanup 沒清乾淨，殘留：${JSON.stringify(dirty)}。` +
        '比對鍵可能在測試過程中被改掉了 —— 修 cleanup，不要放它過去',
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

beforeEach(() => {
  // 身分不跨測試殘留：忘了重設會讓「未登入應被導走」那類測試在單獨跑時綠、
  // 接在別支後面跑時紅（而紅的訊息完全看不出是上一支留下來的）。
  currentRole = null;
});

export {};
