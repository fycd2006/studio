import type { UserSettings } from '@/types/plan';

/**
 * `userSettings/global` 上那五個計時器欄位的**唯一**解讀處。
 *
 * 為什麼要獨立一支純函式：那份文件用兩個欄位表達三種狀態，而 `timeLeft`
 * **身兼兩職** —— 它既是「停止時要顯示的秒數」，又是「下一輪的起算值」。
 * 一輪自然跑完之後 `timeLeft` 是 0，於是「按開始」算出 `targetEndTime = now`，
 * 計時當場結束（GitHub issue #10 現象 2）。這裡把兩份工作拆開：
 * `remaining` 給畫面，`nextSeedSeconds` 給 `start()`，而後者**不放在對外介面上**，
 * 所以呼叫端沒辦法再把這個 bug 寫回來。
 *
 * ⚠️ 另一個關鍵：`targetEndTime` 在時間到之後**沒有被清掉**，這不是遺漏，
 *    是區分「這一輪跑完了」與「還沒開始」的唯一依據 —— `reset()` 與
 *    `setDuration()` 會寫 `targetEndTime: 0`，而 at-zero 的自動停止只寫
 *    `isRunning:false, timeLeft:0`。響鈴也靠它當「這一輪」的身分，
 *    所以任何裝置都不必讀 `isRunning`、也就不必寫任何東西才能各自響一次。
 */

/** 沒有設定時長時的退路，與 `timer-context` 原本的 `40 * 60` 一致。 */
export const DEFAULT_DURATION_SECONDS = 40 * 60;

/**
 * 一輪走到哪裡了。
 *
 * - `loading`  第一份 snapshot 還沒到。`remaining` 是 0 但**不代表任何意義**，
 *              不准拿它響鈴、也不該拿它當「時間到」顯示。
 * - `idle`     停著，有剩餘量可以續跑（或還沒開始過）。
 * - `running`  截止時刻有效且還沒到。
 * - `finished` 這一輪的截止時刻已經過了。
 */
export type TimerPhase = 'loading' | 'idle' | 'running' | 'finished';

export interface TimerSnapshot {
  phase: TimerPhase;
  /** 要顯示的秒數。 */
  remaining: number;
  duration: number;
  /** 這一輪的截止時刻，同時是這一輪的身分。沒有回合時是 `undefined`。 */
  targetEndTime: number | undefined;
  /**
   * `start()` 唯一合法的起算值：續跑時是剩下的量，跑完或沒開始過時是設定時長。
   * 除了 `duration` 本身是 0，它不會是 0。
   */
  nextSeedSeconds: number;
}

/**
 * 純函式：沒有時鐘、沒有 ref。
 *
 * @param settings       Firestore 的那份文件（`null`／`undefined` = 還沒載到）
 * @param tickedRemaining 計時中由 worker／interval 推進的剩餘秒數；
 *                        只有 `isRunning && targetEndTime` 時才會被採用。
 */
export function deriveSnapshot(
  settings: UserSettings | null | undefined,
  tickedRemaining: number,
): TimerSnapshot {
  if (!settings) {
    return {
      phase: 'loading',
      remaining: 0,
      duration: DEFAULT_DURATION_SECONDS,
      targetEndTime: undefined,
      nextSeedSeconds: DEFAULT_DURATION_SECONDS,
    };
  }

  const duration =
    typeof settings.duration === 'number' && settings.duration > 0
      ? settings.duration
      : DEFAULT_DURATION_SECONDS;
  const targetEndTime = settings.targetEndTime ?? 0;
  const parked = Math.max(0, settings.timeLeft ?? 0);

  if (settings.isRunning && targetEndTime > 0) {
    const remaining = Math.max(0, tickedRemaining);
    return {
      phase: remaining > 0 ? 'running' : 'finished',
      remaining,
      duration,
      targetEndTime,
      // 跑到 0 之後要重新開始 —— 這一行就是 issue #10 現象 2 的修復點
      nextSeedSeconds: remaining > 0 ? remaining : duration,
    };
  }

  // 停止中。截止時刻還留著就代表「這一輪跑完了」，被清成 0 才是「閒置」。
  const finished = parked === 0 && targetEndTime > 0;
  return {
    phase: finished ? 'finished' : 'idle',
    remaining: parked,
    duration,
    targetEndTime: targetEndTime > 0 ? targetEndTime : undefined,
    nextSeedSeconds: parked > 0 ? parked : duration,
  };
}

// ── 響鈴排程 ────────────────────────────────────────────────────────────────

export type AlarmMilestoneId = 'prewake-reminder' | 'reminder' | 'prewake-end' | 'timeup';

export interface AlarmMilestone {
  id: AlarmMilestoneId;
  /** 剩餘秒數第一次到達（或低於）這個值時成立。 */
  atRemaining: number;
  /**
   * 可以「補響」多久。
   *
   * ⚠️ 這個上限是必要的，不是調校參數：響鈴改成看截止時刻之後，一個早就結束的
   *    回合在文件裡仍然是 `finished / remaining 0`，所以任何人半小時後打開
   *    網站都會「時間到」。有了 grace window，剛好在響鈴那一刻重整的人還是會
   *    聽到（在窗口內），而隔天才打開的人不會被嚇到。
   */
  graceMs: number;
  /** 設定時長不超過這個值就跳過（原本寫成 `duration > 180`）。 */
  minDurationSeconds: number;
  effect: 'silent-notify' | 'sound-reminder' | 'warmup-and-notify' | 'sound-timeup';
}

/**
 * 唯一的一張表。要加一個提醒就在這裡加一列，不需要動 host。
 * 四個里程碑與原本 `AdminTimer.checkAlarms` 裡的四段逐一對應。
 */
/**
 * 允許「比牆上時鐘早一點」觸發的容忍值。
 *
 * ⚠️ 這一條是**必要的**，而且是用瀏覽器實跑才抓到的：
 *    `remaining` 來自 worker 推進的狀態，而 `targetEndTime` 來自 Firestore 的
 *    快照。新的一輪剛開始（或頁面剛載入）時，這兩個值會有一瞬間不同步 ——
 *    `remaining` 還是上一輪留下的 0，`targetEndTime` 已經是新的截止時刻。
 *    React 的 effect 是由內而外跑，響鈴宿主比 provider 的 tick 先執行，
 *    所以那一瞬間它看到的是「剩 0 秒，但截止時刻在 30 秒後」。
 *    沒有這道防線的話：**任何人在回合進行中打開網站，都會立刻被「換關時間到」
 *    炸一次**（實測 2026-10-27，armed 30 秒的回合在同一秒就響了）。
 *
 *    值要大於 1 秒：推進算的是 `floor((target - now) / 1000)`，
 *    所以 `remaining` 讀到 0 的時候，離截止時刻還有最多 999ms。
 */
const CLOCK_TOLERANCE_MS = 1_200;

export const ALARM_MILESTONES: readonly AlarmMilestone[] = [
  { id: 'prewake-reminder', atRemaining: 190, graceMs: 5_000, minDurationSeconds: 180, effect: 'silent-notify' },
  { id: 'reminder', atRemaining: 180, graceMs: 10_000, minDurationSeconds: 180, effect: 'sound-reminder' },
  { id: 'prewake-end', atRemaining: 3, graceMs: 2_500, minDurationSeconds: 0, effect: 'warmup-and-notify' },
  { id: 'timeup', atRemaining: 0, graceMs: 30_000, minDurationSeconds: 0, effect: 'sound-timeup' },
];

/**
 * 純函式：現在該響哪些里程碑。
 *
 * 只看參數 —— 沒有 `Date.now()`、沒有 ref，所以同樣的輸入永遠得到同樣的結果。
 *
 * 兩個條件各有各的工作，不能合併：
 *
 *  · **`remaining <= atRemaining` 是觸發條件。** 一定要用 `remaining`，
 *    不能用 `now >= dueAt`。計時推進算的是 `floor((target - now) / 1000)`，
 *    所以 `remaining` 第一次讀到 0 的時候，離截止時刻其實還有最多 999ms ——
 *    用牆上時鐘判斷會在那一刻說「還沒到」，而 `remaining` 之後不再變動，
 *    就再也沒有人重新評估，於是**時間到永遠不會響**。
 *    （這是實跑 C1 時抓到的：去重紀錄裡只有 `prewake-end`，沒有 `timeup`。）
 *
 *  · **`now - dueAt <= graceMs` 是過期防線。** 響鈴改成看截止時刻之後，
 *    一個早就結束的回合在文件裡仍然是 `finished / remaining 0`，少了這一條
 *    的話任何人隔天打開網站都會被「時間到」嚇一跳。
 */
export function dueMilestones(args: {
  targetEndTime: number;
  durationSeconds: number;
  remaining: number;
  now: number;
  claimed: ReadonlySet<string>;
}): readonly AlarmMilestone[] {
  const { targetEndTime, durationSeconds, remaining, now, claimed } = args;
  return ALARM_MILESTONES.filter((m) => {
    if (durationSeconds <= m.minDurationSeconds) return false;
    if (claimed.has(m.id)) return false;
    if (remaining > m.atRemaining) return false;
    const dueAt = targetEndTime - m.atRemaining * 1000;
    const earlyBy = dueAt - now;
    if (earlyBy > CLOCK_TOLERANCE_MS) return false;
    return now - dueAt <= m.graceMs;
  });
}

/**
 * 「這一輪的這個提醒已經響過了」的紀錄。
 *
 * 放在 localStorage 而不是元件的 ref 裡：ref 會跟著元件卸載消失，重整也會沒了，
 * 於是同一輪可以重複響（原本 `playedMilestonesRef` 就是這樣）。
 * key 用這一輪的截止時刻，它每次啟動都不一樣，也不會重複使用。
 *
 * 每台裝置各記自己的 —— 絕不寫 Firestore（commit 3f9b307：crew 不碰計時器狀態）。
 */
const CLAIM_KEY = 'camp-alarm-fired';

export function readClaimed(roundKey: number): Set<string> {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { roundKey?: number; ids?: string[] };
    if (parsed.roundKey !== roundKey) return new Set();
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

/** 只保留一輪，所以它不會無限長大。 */
export function writeClaimed(roundKey: number, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify({ roundKey, ids: [...ids] }));
  } catch {
    /* 無痕模式：這一輪可能重複響一次，但不影響其他行為 */
  }
}
