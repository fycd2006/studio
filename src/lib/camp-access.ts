import type { Camp } from "@/types/plan";

/**
 * 「這個身分能不能進這個專案」的單一真相。
 *
 * 為什麼要獨立一支：這個判斷原本散在四個地方（教案總覽、側欄、系統設定的
 * 工作區清單、plans-context 的退回邏輯），其中**系統設定那一份漏寫了**，
 * 於是 crew 在那張清單上看得到也點得進被鎖定的專案（GitHub issue #9）。
 * 同一個規則抄四次，只要有一處沒抄到就是一個權限破口。
 */

export type CampRole = "admin" | "crew" | null;

/** admin 不受鎖定限制；其餘身分只能進未鎖定的專案。 */
export function isCampAccessible(camp: Camp | undefined | null, role: CampRole): boolean {
  if (!camp) return false;
  return role === "admin" || !camp.isLocked;
}

/** 這個身分在清單上**應該看得到**的專案。看不到才點不到。 */
export function accessibleCamps(camps: Camp[], role: CampRole): Camp[] {
  return role === "admin" ? camps : camps.filter((camp) => !camp.isLocked);
}

/**
 * 目前的專案不能用時該退到哪一個：優先回登入首選專案，其次第一個可用的，
 * 全部都不可用就回 null。
 *
 * ⚠️ 回 null 很重要，不能退而求其次回 `camps[0]`：那一筆同樣可能是鎖定的，
 *    於是「退回去」會把人送回一個他進不去的專案 —— 正是 issue #9 卡住的成因。
 *    一個可用專案都沒有時，正確的狀態是「沒有選定任何專案」＋空狀態畫面。
 */
export function pickFallbackCamp(
  camps: Camp[],
  role: CampRole,
  defaultCampId?: string | null,
): Camp | null {
  const preferred = defaultCampId ? camps.find((camp) => camp.id === defaultCampId) : null;
  if (isCampAccessible(preferred, role)) return preferred!;
  return camps.find((camp) => isCampAccessible(camp, role)) ?? null;
}
