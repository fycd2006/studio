import type { CampItem } from '@/types/plan';

/**
 * `camps/{id}.campItems` 這個陣列的**唯一**擁有者。
 *
 * 為什麼需要一支純模組：那是**一份 Firestore 文件裡的一個陣列**，而 `updateDoc`
 * 只做欄位層的合併 —— 整個陣列是被換掉的，沒有元素層的合併。於是「對群組裡的
 * 每一筆各寫一次」這種寫法必然互相覆蓋（三筆物品 = 同一個 tick 裡三次
 * read-modify-write，全部從同一份還沒更新的快照出發，最後一次贏）。
 * 那正是 GitHub issue #11 ③「改分類名稱只有最後一筆被改到」的根因。
 *
 * 所以這裡把「怎麼分群」與「怎麼改」都收斂成純函式，而且刻意讓壞的寫法
 * **在型別上無法表達**：
 *   - `CampItemPatch` 沒有 `usage` —— 單筆改分類寫不出來。
 *   - `assign-usage` 吃的是整個 `CampItemBlock` —— 「只改群組的一部分」寫不出來。
 *
 * 無 React、無 Firestore（照 `src/lib/timer-state.ts` 的前例）。
 */

/**
 * 還沒分類的那一堆在畫面與匯出上的標籤。
 *
 * ⚠️ 它同時是**舊資料實際存的字串** —— `DEFAULT_CAMP_ITEMS` 裡有 10 筆
 *    `usage: '未分類'`。所以字面的「未分類」與空字串被當成同一件事
 *    （見 `isUnassignedUsage`），不需要資料遷移。
 */
export const UNASSIGNED_USAGE_LABEL = '未分類';

/**
 * 「還沒分類」的判斷。空字串與字面「未分類」都算。
 *
 * 為什麼要把字面的「未分類」併進來：issue #11 ① 的字面就是「新增道具被併進
 * **未分類**」。只要「未分類」還是一個會合併儲存格的真群組，使用者打一次
 * 「未分類」進去就能把那個缺陷重新造出來 —— 新的一列會被吸進那個群組、
 * 失去自己的分類格，於是沒有任何方法單獨給它一個分類。
 */
export const isUnassignedUsage = (usage: string): boolean => {
  const trimmed = usage.trim();
  return trimmed === '' || trimmed === UNASSIGNED_USAGE_LABEL;
};

/** 寫進資料庫的形式：trim 過，而「還沒分類」一律是空字串 —— 永遠不是 `undefined`。 */
export const normalizeUsage = (usage: string): string =>
  isUnassignedUsage(usage) ? '' : usage.trim();

/**
 * 畫面上的一塊：共用一個分類格的連續幾列。
 *
 * 具名群組與「單獨一列的未分類物品」是**同一個型別**，所以渲染只有一條路徑，
 * 合併儲存格的高度就是 `items.length`（未分類的永遠是 1）。
 */
export interface CampItemBlock {
  /** 已分類的群組名稱；還沒分類是 `null`。 */
  usage: string | null;
  /** 至少一筆。 */
  items: readonly [CampItem, ...CampItem[]];
}

/**
 * 把陣列分成畫面上的那幾塊。
 *
 * 規則（這三條就是 issue #11 ① 的修法）：
 *   1. 具名群組照「該分類第一次出現在陣列裡的位置」排序。
 *   2. 還沒分類的物品**每一筆自己一塊** —— 各有自己可編輯的分類格，
 *      使用者才能一筆一筆分，不必整群一起動。
 *   3. 還沒分類的一律排在**最後**，所以新增的物品必定落在表格最下面。
 */
export function campItemBlocks(items: readonly CampItem[]): readonly CampItemBlock[] {
  const named = new Map<string, [CampItem, ...CampItem[]]>();
  const unassigned: CampItem[] = [];

  for (const item of items) {
    const raw = item.usage ?? '';
    if (isUnassignedUsage(raw)) {
      unassigned.push(item);
      continue;
    }
    // Map 保留插入順序 —— 群組的順序就是它第一筆出現的順序。
    const bucket = named.get(raw.trim());
    if (bucket) bucket.push(item);
    else named.set(raw.trim(), [item]);
  }

  return [
    ...[...named.entries()].map(([usage, group]): CampItemBlock => ({ usage, items: group })),
    ...unassigned.map((item): CampItemBlock => ({ usage: null, items: [item] })),
  ];
}

/**
 * 單筆能改的欄位。
 *
 * ⚠️ 刻意**沒有** `usage`。改分類一律走 `assign-usage`，而它吃整個 block ——
 *    issue #11 ③ 的那個 `items.forEach(i => update(i.id, { usage: v }))` 於是
 *    在型別上就不存在。
 */
export type CampItemPatch = {
  name?: string;
  isPacked?: boolean;
  isChecked?: boolean;
};

export type CampItemEdit =
  /** 新增一筆還沒分類的物品，掛在陣列最後。`id` 由呼叫端給（讓這支保持是純函式）。 */
  | { kind: 'add'; id: string }
  | { kind: 'remove'; itemId: string }
  | { kind: 'patch'; itemId: string; patch: CampItemPatch }
  /** 改分類只能**整塊**一起改。 */
  | { kind: 'assign-usage'; block: CampItemBlock; usage: string };

/** 新增時的初始形狀。`usage: ''` = 還沒分類 → 落在表格最下面、自己一列。 */
export function createCampItem(id: string): CampItem {
  return { id, usage: '', name: '新物品', isPacked: false, isChecked: false };
}

/**
 * 套用一次編輯，回傳新的陣列。
 *
 * **沒有任何改變時回傳同一個陣列參照** —— 呼叫端據此跳過寫入。
 * 這很重要：`PropInput` 是 onBlur 才送出的，而使用者點進點出不改字是常態。
 */
export function applyCampItemEdit(
  items: readonly CampItem[],
  edit: CampItemEdit,
): readonly CampItem[] {
  switch (edit.kind) {
    case 'add':
      return [...items, createCampItem(edit.id)];

    case 'remove': {
      const next = items.filter((item) => item.id !== edit.itemId);
      return next.length === items.length ? items : next;
    }

    case 'patch': {
      const target = items.find((item) => item.id === edit.itemId);
      if (!target) return items;
      const unchanged = (Object.keys(edit.patch) as Array<keyof CampItemPatch>).every(
        (key) => edit.patch[key] === target[key],
      );
      if (unchanged) return items;
      return items.map((item) =>
        item.id === edit.itemId ? { ...item, ...edit.patch } : item,
      );
    }

    case 'assign-usage': {
      const usage = normalizeUsage(edit.usage);
      const targetIds = new Set(edit.block.items.map((item) => item.id));
      // 只比對這一塊裡**還存在**的 id：block 是渲染當下的快照，期間可能有別人刪了一筆。
      const affected = items.filter((item) => targetIds.has(item.id));
      if (affected.length === 0) return items;
      if (affected.every((item) => normalizeUsage(item.usage ?? '') === usage)) return items;
      return items.map((item) => (targetIds.has(item.id) ? { ...item, usage } : item));
    }
  }
}
