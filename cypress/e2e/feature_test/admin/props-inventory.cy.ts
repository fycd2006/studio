/**
 * 行政中心 — 全營期道具（`// 03. 營期其他物品`）
 *
 * 守的業務行為（GitHub issue #11 的 ① 與 ③）：
 *   ① 按「新增道具」，新的一列要出現在**最下面**，而且要有**自己的**分類格 ——
 *      使用者能只給它一個分類，不會連旁邊的物品一起被改名。
 *   ③ 改一個群組的分類名稱，那一群物品要**全部**跟著改，不能只改到最後一樣、
 *      把一個群組拆成兩個。
 *
 * 為什麼這張表特別容易壞：`campItems` 是**一份 Firestore 文件裡的一個陣列**
 * （`camps/{id}.campItems`）。`updateDoc` 只做欄位層的合併，整個陣列是被換掉的 ——
 * 所以「同一個 tick 裡對每一筆各寫一次」必然互相覆蓋，最後一次贏。
 * 對應實作：`src/lib/camp-items.ts`（唯一知道這個陣列長什麼樣的地方）、
 *          `src/lib/plans-context.tsx` 的 `updateCampItems`（唯一的寫入者）、
 *          `src/components/AdminSection.tsx` 的 `renderCombinedTable`（渲染）。
 *
 * ⚠️ 這支的斷言都走 `[data-testid^="camp-item-row-"]` / `^="camp-item-usage-"`，
 *    **一律帶尾巴的連字號**。寫成 `^="camp-item"` 會連 tfoot 的 `camp-items-add`
 *    一起撈到。那張表另外有 25 列手寫的佔位空列（它們刻意沒有 testid），所以
 *    任何 `tr` 的計數都是錯的。
 *
 * ⚠️ 分類格的值要用 `usageOf()` 讀，不要用 `contain.text`：解鎖之後值在
 *    `textarea.value` 裡，DOM 的文字是空的 —— 於是 `not.contain.text('文具組')`
 *    在壞掉的世界裡也會通過，是一句永遠不會紅的填充物。
 *
 * ⚠️ `activePropsTab` 是本地 state，不在 URL 裡（AdminSection.tsx:150），
 *    所以 `cy.reload()` 會彈回「活動道具」並重新鎖上 —— 驗持久化要重跑 openAllProps()。
 *
 * ⚠️ 改完分類之後**先 `cy.dbDocsUntil` 再驗畫面**，順序不可以對調。寫入是
 *    fire-and-forget，`blur()` 之後畫面有一小段仍然是**寫入前**的樣子 ——
 *    合併格還是三列高，而 PropInput 的 textarea 還留著使用者剛打的字。
 *    那個瞬間的畫面**與正確結果長得一模一樣**，所以畫面斷言放在前面會在壞掉的
 *    世界裡也通過（實測：把 assign-usage 改成只改最後一筆，P2 的 rowspan 與
 *    分類格斷言全部照樣綠，只有資料庫那一層紅）。先等寫入落地，畫面斷言才有意義。
 *
 * 尚未涵蓋（測不到）：Excel 匯出的內容（repo 沒有讀 xlsx 的測試基礎設施，
 * 改完手動匯出一次眼睛確認）。
 */

import type { CampScenario } from '../../../plugins/firestore';

type CampDoc = {
  id: string;
  campItems?: Array<{ id: string; usage: string; name: string; isPacked?: boolean; isChecked?: boolean }>;
};

/**
 * issue #11 的形狀。
 *
 * 「未分類」刻意排在具名群組**前面** —— 畫面的群組順序是由「每個分類第一次出現
 * 的位置」決定的，所以今天新增的物品會被塞進它、落在表格**中段**。如果種子把
 * 未分類排在最後，①「沒出現在最下方」會因為巧合而綠。
 */
const SEED_ITEMS = [
  { usage: '未分類', name: '地膠' },   // ← 舊資料用的是字面「未分類」，不是空字串
  { usage: '未分類', name: '膠帶' },
  { usage: '文具組', name: '剪刀' },
  { usage: '文具組', name: '白板筆' },
  { usage: '文具組', name: '便利貼' },
];

/** 一列的物品名稱。解鎖時值在 `textarea.value`、鎖定時在 div 的文字。 */
const nameOf = (row: HTMLElement): string => {
  const el = row.querySelector('[data-testid^="camp-item-name-"]');
  if (!el) return '(這一列沒有名稱欄)';
  return el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? '').trim();
};

/** 一個分類格的值。同上，兩種狀態讀法不同。 */
const usageOf = (cell: HTMLElement): string => {
  const ta = cell.querySelector('textarea');
  return ta ? (ta as HTMLTextAreaElement).value : (cell.textContent ?? '').trim();
};

const rows = () =>
  cy.getByTestId('camp-items-body').find('[data-testid^="camp-item-row-"]');

const usageCells = () =>
  cy.getByTestId('camp-items-body').find('[data-testid^="camp-item-usage-"]');

/** 每一列的名稱，照畫面順序。用 `.should` 包著，所以會重試。 */
const expectRowOrder = (expected: string[], msg: string) =>
  rows().should(($rows) => {
    expect($rows.toArray().map(nameOf), msg).to.deep.eq(expected);
  });

/**
 * 每一個分類格的值，照畫面順序。
 *
 * 這一句同時驗三件事：有幾格（= 分成幾群）、順序、以及每一格的字 ——
 * ③ 壞掉的時候「一群變兩群」就是多出一格，光驗文字驗不到。
 */
const expectUsageCells = (expected: string[], msg: string) =>
  usageCells().should(($cells) => {
    expect($cells.toArray().map(usageOf), msg).to.deep.eq(expected);
  });

/** 切到「全營期道具」並解鎖（鎖的預設是 true，AdminSection.tsx:147）。 */
const openAllProps = () => {
  cy.getByTestId('admin-props-tab-all-props').click();
  cy.getByTestId('admin-lock-toggle').click();
  // 自證：真的解鎖了。沒有這一句的話，後面所有 `find('textarea')` 都會紅在
  // 「找不到元素」上，而那個訊息看起來像 testid 打錯。
  cy.getByTestId('camp-items-add').should('exist');
};

/** 在某一格打字並離開欄位（PropInput 是 onBlur 才送出的）。 */
const typeUsage = (firstItemId: string, text: string) => {
  const field = () => cy.getByTestId(`camp-item-usage-${firstItemId}`).find('textarea');
  if (text === '') {
    field().clear().should('have.value', '').blur();
  } else {
    // `.should('have.value', ...)` 不能省：字被吃掉時要紅在「值不對」，
    // 而不是紅在三行之後某個莫名其妙的斷言上。
    field().clear().type(text).should('have.value', text).blur();
  }
};

describe('行政中心 — 全營期道具', () => {
  let scenario: CampScenario;

  /** 種子的 id 是決定性的，順序與 SEED_ITEMS 相同。 */
  const ids = () => ({
    mat: scenario.campItemIds[0],      // 地膠（未分類）
    tape: scenario.campItemIds[1],     // 膠帶（未分類）
    scissors: scenario.campItemIds[2], // 剪刀（文具組，群組第一列）
    marker: scenario.campItemIds[3],   // 白板筆（文具組）
    sticky: scenario.campItemIds[4],   // 便利貼（文具組，群組最後一列）
  });

  const campItems = () =>
    cy.dbDocs<CampDoc>('camps').then((docs) => {
      const camp = docs.find((d) => d.id === scenario.campId);
      expect(camp, '找不到這個 scenario 的 camp —— fixture 壞了，不是功能壞了').to.exist;
      return camp!.campItems ?? [];
    });

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    // 這張表很寬：視窗太窄時第一欄會被擠出可視範圍，點擊會紅在「被遮住」上。
    cy.viewport(1440, 900);
    cy.setupCampScenario({ campName: 'E2E 道具營隊', campItems: SEED_ITEMS }).then((s) => {
      scenario = s;
    });
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('P0 · 沒有分類的物品一筆一列、各有自己的分類格、排在最下面', () => {
    // 刻意**不解鎖**：這一條講的是「畫面怎麼分群」，不是編輯行為。
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    cy.getByTestId('admin-props-tab-all-props').click();

    expectRowOrder(
      ['剪刀', '白板筆', '便利貼', '地膠', '膠帶'],
      '已經分好類的要排在上面，還沒分類的（地膠、膠帶）要排在最下面',
    );

    expectUsageCells(
      ['文具組', '未分類', '未分類'],
      '文具組三筆共用一格；地膠與膠帶各自一格 —— 使用者才能一筆一筆分類（issue #11 ①）',
    );

    const { scissors, mat, tape } = ids();
    cy.getByTestId(`camp-item-usage-${scissors}`).should('have.attr', 'rowspan', '3');
    cy.getByTestId(`camp-item-usage-${mat}`).should('have.attr', 'rowspan', '1');
    cy.getByTestId(`camp-item-usage-${tape}`).should('have.attr', 'rowspan', '1');
  });

  it('P1 · 新增道具落在最下面，而且可以只給它一個分類（issue #11 ①）', () => {
    const { mat, tape, scissors } = ids();

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    openAllProps();

    cy.getByTestId('camp-items-add').click();

    // 使用者視角 1：新的一列在**最下面**（今天它被塞進「未分類」群組，卡在第 3 列）
    expectRowOrder(
      ['剪刀', '白板筆', '便利貼', '地膠', '膠帶', '新物品'],
      '新增的物品要出現在表格最下面',
    );

    rows()
      .last()
      .invoke('attr', 'data-testid')
      .then((testid) => {
        const newId = String(testid).replace('camp-item-row-', '');

        // 使用者視角 2：它有**自己的**分類格。這一句才是 ① 的核心 ——
        // 今天那一列根本沒有第一欄（被上面的合併格佔住），所以這個 testid 不存在。
        cy.getByTestId(`camp-item-usage-${newId}`).should('have.attr', 'rowspan', '1');

        typeUsage(newId, '器材組');

        // 資料庫先（見檔頭第 4 條警告：寫入是 fire-and-forget，blur 之後畫面
        // 有一小段仍是寫入前的樣子，而那個樣子跟正確結果長得一樣）。
        cy.dbDocsUntil<CampDoc>(
          'camps',
          (docs) => {
            const items = docs.find((d) => d.id === scenario.campId)?.campItems ?? [];
            return (
              items.length === 6 &&
              items[5]?.id === newId &&
              items[5]?.usage === '器材組' &&
              items.filter((i) => i.usage === '文具組').length === 3
            );
          },
          { reason: '新物品應該掛在陣列最後、usage 是器材組，而文具組仍然是 3 筆' },
        );

        // 使用者視角 3：只有那一列變了。器材組排在文具組之後（都是具名群組，
        // 照第一次出現的順序），地膠與膠帶仍然在最下面。
        expectRowOrder(
          ['剪刀', '白板筆', '便利貼', '新物品', '地膠', '膠帶'],
          '給新物品分類之後，它歸到自己的群組，而還沒分類的仍然在最下面',
        );
        expectUsageCells(
          ['文具組', '器材組', '', ''],
          '文具組三筆一個字都不該被改到 —— 新物品自己一格',
        );
      });

    // 這次的修法**不遷移舊資料** —— 地膠與膠帶在資料庫裡仍然是字面「未分類」，
    // 只是畫面把它推導成「還沒分類」。這一句擋掉「偷偷改了使用者資料」。
    campItems().then((items) => {
      expect(items.find((i) => i.id === mat)?.usage, '地膠的 usage 不該被動過').to.eq('未分類');
      expect(items.find((i) => i.id === tape)?.usage, '膠帶的 usage 不該被動過').to.eq('未分類');
      expect(items.find((i) => i.id === scissors)?.usage, '剪刀的 usage 不該被動過').to.eq('文具組');
    });

    // 持久化：重整後 activePropsTab 會彈回「活動道具」並重新鎖上，要再開一次。
    cy.reload();
    openAllProps();
    expectRowOrder(
      ['剪刀', '白板筆', '便利貼', '新物品', '地膠', '膠帶'],
      '重整後順序要一樣（順序是從資料推導的，不是本地 state）',
    );
  });

  it('P2 · 改一個群組的分類名稱，整群都要改到（issue #11 ③）', () => {
    const { scissors } = ids();

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    openAllProps();

    typeUsage(scissors, '器材組');

    // 先等寫入落地（見檔頭第 4 條警告：這一句同時是同步點）。
    // predicate 要寫出**完整的終局** —— 只寫「有 3 筆器材組」會在中途就成立。
    cy.dbDocsUntil<CampDoc>(
      'camps',
      (docs) => {
        const items = docs.find((d) => d.id === scenario.campId)?.campItems ?? [];
        return (
          items.filter((i) => i.usage === '器材組').length === 3 &&
          items.filter((i) => i.usage === '文具組').length === 0
        );
      },
      { reason: '資料庫裡應該剛好 3 筆器材組，而且一筆文具組都不剩' },
    );

    // 使用者視角：三列仍然共用**一格**。③ 壞掉的時候只有最後一筆（便利貼）會變，
    // 於是多出一格 —— 一個群組被拆成兩個。
    cy.getByTestId(`camp-item-usage-${scissors}`).should('have.attr', 'rowspan', '3');
    expectUsageCells(
      ['器材組', '', ''],
      '文具組三筆要一起變成器材組，不能只改到最後一樣',
    );
    expectRowOrder(
      ['剪刀', '白板筆', '便利貼', '地膠', '膠帶'],
      '只是改名字，順序不該動',
    );

    cy.reload();
    openAllProps();
    expectUsageCells(['器材組', '', ''], '重整後仍然是一群器材組');
  });

  it('P3 · 把分類清空，那一群變成各自獨立的列、掛到最下面', () => {
    // P2 的對照組：修 ③ 時很容易改成「一律套用整群的舊名稱」，那會讓「清空」
    // 變成無效操作。這一條同時擋掉另一條靜默失敗 —— 把 undefined 寫進
    // campItems 的陣列元素會讓 updateDoc 丟 `Unsupported field value: undefined`，
    // 而寫入是 fire-and-forget，畫面什麼都不會說。
    const { scissors, marker, sticky } = ids();

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    openAllProps();

    typeUsage(scissors, '');

    cy.dbDocsUntil<CampDoc>(
      'camps',
      (docs) => {
        const items = docs.find((d) => d.id === scenario.campId)?.campItems ?? [];
        return [scissors, marker, sticky].every(
          (id) => items.find((i) => i.id === id)?.usage === '',
        );
      },
      { reason: '三筆的 usage 應該是空字串' },
    );

    expectRowOrder(
      ['地膠', '膠帶', '剪刀', '白板筆', '便利貼'],
      '清空分類之後五筆全都沒分類，照資料本來的順序各自一列',
    );
    expectUsageCells(['', '', '', '', ''], '五筆各有自己的分類格');
    cy.getByTestId(`camp-item-usage-${marker}`).should('have.attr', 'rowspan', '1');

    // 空字串，不是 undefined ——「欄位不見了」跟「欄位是空的」在上面那個
    // predicate 裡長得一樣（`undefined === ''` 是 false，但欄位被刪掉時
    // `items.find(...)` 仍然回得到物件），所以型別要單獨驗。
    campItems().then((items) => {
      [scissors, marker, sticky].forEach((id) => {
        expect(typeof items.find((i) => i.id === id)?.usage, `${id} 的 usage 必須是字串`).to.eq(
          'string',
        );
      });
    });
  });

  it('P4 · 刪掉群組的第一列，其他列與分類格都不受影響', () => {
    // 回歸護欄，不是缺陷的證據 —— issue #11 的第 2 條（「刪除會弄壞整個分類群組」）
    // 在目前的程式碼上**沒有重現**（handleDeleteCampItem 本來就是 filter 一次、
    // 寫一次）。這一條在改之前就是綠的，它守的是「重寫渲染時不要把它弄壞」。
    const { scissors, marker } = ids();

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    openAllProps();

    // 刪除鈕是 `opacity-0 group-hover:opacity-100`：點得到但過不了 `be.visible`，
    // 而 `trigger('mouseover')` 不會產生 CSS `:hover`。`{ force: true }` 是本專案
    // 禁止的（會讓「真的被遮住」也一起變綠），所以用 cypress-real-events。
    cy.getByTestId(`camp-item-row-${scissors}`).realHover();
    cy.getByTestId(`camp-item-delete-${scissors}`).click();

    cy.getByTestId(`camp-item-row-${scissors}`).should('not.exist');
    // 白板筆遞補成群組第一列，分類格仍然是文具組、橫跨剩下的兩列
    cy.getByTestId(`camp-item-usage-${marker}`)
      .should('have.attr', 'rowspan', '2')
      .and(($cell) => {
        expect(usageOf($cell[0]), '分類格仍然是文具組').to.eq('文具組');
      });

    cy.dbDocsUntil<CampDoc>(
      'camps',
      (docs) => {
        const items = docs.find((d) => d.id === scenario.campId)?.campItems ?? [];
        return items.length === 4 && !items.some((i) => i.id === scissors);
      },
      { reason: '資料庫應該剩 4 筆，而且剪刀不在裡面' },
    );
  });

  it('P5 · 鎖定時沒有任何編輯控制項，解鎖後才出現', () => {
    // 黑白名單成對寫：只驗「解鎖後看得到」不會抓到「用藏起來的方式假修」，
    // 而只驗 `not.exist` 也可能是 testid 打錯 —— 兩邊都要有對照。
    const { scissors } = ids();

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=props', { campId: scenario.campId });
    cy.getByTestId('admin-props-tab-all-props').click();

    // 白名單：這張表真的渲染出來了（排除「整頁沒載入」造成的假通過）
    cy.getByTestId(`camp-item-row-${scissors}`).should('exist');
    // 黑名單：鎖著的時候三樣都不該有
    cy.getByTestId('camp-items-add').should('not.exist');
    cy.getByTestId(`camp-item-delete-${scissors}`).should('not.exist');
    cy.getByTestId(`camp-item-usage-${scissors}`).find('textarea').should('not.exist');

    cy.getByTestId('admin-lock-toggle').click();

    cy.getByTestId('camp-items-add').should('exist');
    cy.getByTestId(`camp-item-delete-${scissors}`).should('exist');
    cy.getByTestId(`camp-item-usage-${scissors}`).find('textarea').should('exist');
  });
});
