"use client";

import React, { useSyncExternalStore } from 'react';

/**
 * 警報音效的**能力**，以及全庫唯一碰 `camp-audio-unlocked` 的地方。
 *
 * 為什麼要獨立一支：原本那個旗標把兩件完全不同的事混成一個 boolean ——
 * 「使用者想不想要有聲音」（意願，該持久化）和「瀏覽器現在准不准播」
 * （能力，每個 document 都要重新確認）。混在一起的後果是
 * `AdminTimer` 在 document 上掛了一個點擊監聽，把 `play()` 的 rejection 吞掉、
 * `AudioContext.resume()` 不等結果，然後無條件寫入 `true` —— 於是重新整理之後
 * 畫面說「音效已解鎖」，而時間到其實一片安靜（GitHub issue #10 現象 3、預期 3）。
 *
 * 分開之後：
 *   意願 = localStorage（只有 `enable()` / `disable()` 會寫）
 *   能力 = 這個 module 的變數，**永遠不從 storage 讀**，只在真的通過驗證才成立
 *
 * ⚠️ iOS 的疤痕組織（commit 30dd24b → 3599271 → 0d9718f → c4e8932 → 3594961 → 9e983a8）
 *    必須保留，只搬位置不簡化：
 *      · 音檔要是**掛在 DOM 裡的 `<audio>` 元素**，不是用到才 `new Audio()`
 *      · 每一聲 beep 重設 `currentTime` 重播同一個元素
 *      · 驗證成功後用 `volume = 0.01` 暖機一次
 *      · 提示音用站內的 `/beep.wav`（`public/sw.js` 已預快取 → 離線也會響）
 */

const INTENT_KEY = 'camp-audio-unlocked';
/** 同一個 document 裡的多個消費者（以及其他分頁的 `storage`）靠這個事件同步。 */
const SYNC_EVENT = 'camp-audio-sync';

/**
 * 站內音檔。原本時間到的長警報來源是 raw.githubusercontent.com 的跨網域檔案，
 * 而 `public/sw.js` 明確跳過非同源請求 → 離線時連 `readyState` 都過不了，
 * 只能退化成合成音。`/beep.wav` 在 `public/sw.js` 的 STATIC_ASSETS 裡。
 */
const BEEP_SRC = '/beep.wav';

/** 1 秒的靜音迴圈，用來在背景分頁／鎖屏時讓 JS 保持活著（iOS/Android 的解法）。 */
const SILENT_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export type AlarmReadiness = 'off' | 'needs-gesture' | 'ready';
export type AlarmPattern = 'reminder' | 'timeup';

/**
 * 重播節奏（毫秒）。`reminder` 與原本 3 分鐘提醒的排程逐字相同。
 * 要換成另一個音色的話，這裡是唯一要改的地方（放一支 public/alarm.wav
 * ＋ 在 public/sw.js 的 STATIC_ASSETS 加一行即可）。
 */
const PATTERNS: Record<AlarmPattern, number[]> = {
  reminder: [0, 300, 1000, 1300, 2000, 2300],
  timeup: [0, 250, 500, 1500, 1750, 2000, 3000, 3250, 3500],
};

// ── module 狀態 ─────────────────────────────────────────────────────────────

/** 由 `<AlarmAudioElements/>` 註冊進來的 DOM 元素。 */
let longEl: HTMLAudioElement | null = null;
let shortEl: HTMLAudioElement | null = null;
let silentEl: HTMLAudioElement | null = null;

let sharedContext: AudioContext | null = null;
/**
 * 這個 document 的播放能力。**不持久化**，重整一定重新驗證。
 * 這一個變數就是「畫面不再說謊」的全部。
 */
let verified = false;
let initialised = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readIntent(): boolean {
  try {
    return localStorage.getItem(INTENT_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeIntent(on: boolean): void {
  try {
    localStorage.setItem(INTENT_KEY, on ? 'true' : 'false');
  } catch {
    /* 無痕模式／封鎖 site data：意願記不住，但能力判斷不受影響 */
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

function getReadiness(): AlarmReadiness {
  if (!readIntent()) return 'off';
  return verified ? 'ready' : 'needs-gesture';
}

function ensureContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext = new Ctor();
    return sharedContext;
  } catch {
    return null;
  }
}

/**
 * 靜音的能力探測：「現在播得出聲音嗎？」
 *
 * 唯一的權威是 `AudioContext` 自己的 state：它跟 `<audio>` 元素受同一道
 * user-activation 閘門管，而且探測過程完全不會發出聲音。
 *
 * ⚠️ 兩個看起來很合理、但都會說謊的探針，都不要用：
 *
 *  1. **muted 的 `play()`** —— Chrome 對靜音自動播放有豁免，所以它**永遠**成功。
 *     那正是原本那個 bug 的另一種寫法。
 *
 *  2. **`navigator.userActivation.hasBeenActive`** —— 它回答的是「這個 document
 *     被使用者啟動過了嗎」，而那**不等於**「播得出聲音嗎」。允許自動播放的站台
 *     （以及帶 `--autoplay-policy=no-user-gesture-required` 的測試用 Chrome）
 *     即使 `hasBeenActive === false` 也播得出來，於是畫面會反過來謊報
 *     「請點一下」，而使用者其實什麼都不用做。Safari 更是整個沒有這個 API。
 *     這一條是 `audio-unlock-honesty.cy.ts` 的 D2 當場抓到的：它一度讓一個
 *     能播放的瀏覽器顯示 needs-gesture。
 */
async function probe(): Promise<boolean> {
  const ctx = ensureContext();
  if (!ctx) {
    verified = false;
    emit();
    return false;
  }

  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      /* 還沒被使用者啟動 —— 下面的 state 檢查會如實回答 */
    }
  }

  verified = ctx.state === 'running';
  if (verified) warmUp();
  emit();
  return verified;
}

/**
 * 幾乎無聲地碰一下音檔元素，讓它們在真的要響的時候不卡在 `readyState`。
 * 時間到前幾秒也會呼叫一次（原本在 `checkAlarms` 的 ≤3s 里程碑裡做同一件事）。
 */
export function warmUpAlarmAudio(): void {
  if (getReadiness() !== 'ready') return;
  warmUp();
}

function warmUp(): void {
  [longEl, shortEl].forEach((el) => {
    if (!el) return;
    const previous = el.volume;
    el.volume = 0.01;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = previous;
      })
      .catch(() => {
        el.volume = previous;
      });
  });
}

/** 合成音備援：音檔播不出來時至少要有聲音。 */
function playSynthetic(duration: number, frequency: number): void {
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('[AlarmAudio] 合成音失敗:', err);
  }
}

/**
 * 立刻播一組警報。回傳「有沒有真的開始播」。
 *
 * 播放被拒時會把能力降回未驗證並通知畫面 —— 事後也要誠實，不能讓畫面繼續
 * 顯示「已解鎖」。同時退到合成音，至少有聲音。
 */
export function ringAlarm(pattern: AlarmPattern): boolean {
  if (getReadiness() !== 'ready') return false;

  const el = pattern === 'timeup' ? longEl : shortEl;
  const schedule = PATTERNS[pattern];
  const syntheticDuration = pattern === 'timeup' ? 0.4 : 0.15;
  const syntheticFreq = pattern === 'timeup' ? 520 : 880;

  schedule.forEach((delay) => {
    window.setTimeout(() => {
      if (!el || el.readyState < 2) {
        playSynthetic(syntheticDuration, syntheticFreq);
        return;
      }
      el.currentTime = 0;
      el.volume = 1.0;
      el.play().catch((err) => {
        console.warn('[AlarmAudio] 播放被拒，改用合成音:', err);
        if (verified) {
          verified = false;
          emit();
        }
        playSynthetic(syntheticDuration, syntheticFreq);
      });
    }, delay);
  });

  return true;
}

/**
 * 系統通知。
 *
 * ⚠️ 刻意**不**綁在音效意願上。原本 `showNotification` 整段包在
 *    `if (audioUnlocked)` 裡，所以「關閉音效」會連背景通知一起關掉；
 *    而 issue #10 要的是「都會響、都會跳通知」。
 */
export function notifyAlarm(opts: {
  title: string;
  body: string;
  silent?: boolean;
  urgent?: boolean;
  tag?: string;
}): void {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.showNotification(opts.title, {
        body: opts.body,
        silent: opts.silent,
        vibrate: opts.urgent ? [500, 200, 500, 200, 500] : [200, 100, 200],
        requireInteraction: !opts.silent,
        tag: opts.tag ?? (opts.urgent ? 'timer-end' : 'timer-warning'),
        renotify: true,
        actions: opts.urgent ? [{ action: 'dismiss', title: '知道了 / Dismiss' }] : [],
      } as NotificationOptions);
    })
    .catch((err) => console.warn('[AlarmAudio] 通知失敗:', err));
}

/** 背景保活的靜音迴圈。回合進行中才需要。 */
export function setKeepAlive(on: boolean): void {
  if (!silentEl) return;
  if (on) {
    silentEl.play().catch(() => {
      /* 還沒被啟動就播不了，等解鎖後的下一次呼叫 */
    });
  } else {
    silentEl.pause();
  }
}

// ── React 介面 ──────────────────────────────────────────────────────────────

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  window.addEventListener(SYNC_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    window.removeEventListener(SYNC_EVENT, listener);
  };
}

export interface AlarmAudio {
  readiness: AlarmReadiness;
  /**
   * 必須在**使用者手勢**裡呼叫。回傳真的播出來了沒有。
   * 失敗時什麼都不寫 —— 意願與能力都保持原狀。
   */
  enable: () => Promise<boolean>;
  disable: () => void;
}

export function useAlarmAudio(): AlarmAudio {
  const readiness = useSyncExternalStore(subscribe, getReadiness, () => 'off' as AlarmReadiness);

  const enable = React.useCallback(async () => {
    // 這裡刻意播一聲真的聽得到的 beep：使用者按下「Test & Unlock」就是要聽到
    // 它會響。能聽到才算驗證通過（原本 testAudio 也是這個行為）。
    try {
      if (shortEl) {
        shortEl.currentTime = 0;
        shortEl.volume = 1.0;
        await shortEl.play();
      }
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
      verified = true;
      writeIntent(true);
      emit();
      return true;
    } catch (err) {
      console.warn('[AlarmAudio] 解鎖失敗:', err);
      return false;
    }
  }, []);

  const disable = React.useCallback(() => {
    verified = false;
    setKeepAlive(false);
    writeIntent(false);
    emit();
  }, []);

  return { readiness, enable, disable };
}

/**
 * 三個隱藏的音檔元素，整個 app 只渲染一次。
 *
 * 掛在 DOM 裡而不是用到才 `new Audio()`：2026-03-12 那串 commit 的結論是
 * 「隱藏的 `<audio>` 標籤是 iOS/Safari 唯一最穩定的播放方式」。
 *
 * 同時負責這個 document 的初始化：先探一次（SPA 內部導覽可能帶著 sticky
 * activation），沒過的話在使用者第一次互動時再探一次 —— 這就是原本那個
 * document 監聽想做的事，只是現在會**等** `play()` 的結果，而且**不寫意願**，
 * 所以一次誤觸最多讓 needs-gesture 變成 ready，絕不會讓 off 變成 ready。
 */
export function AlarmAudioElements(): React.JSX.Element {
  React.useEffect(() => {
    if (initialised) return;
    initialised = true;
    if (readIntent()) void probe();
  }, []);

  const readiness = useSyncExternalStore(subscribe, getReadiness, () => 'off' as AlarmReadiness);

  React.useEffect(() => {
    if (readiness !== 'needs-gesture') return;
    const onGesture = () => void probe();
    document.addEventListener('pointerdown', onGesture);
    document.addEventListener('keydown', onGesture);
    return () => {
      document.removeEventListener('pointerdown', onGesture);
      document.removeEventListener('keydown', onGesture);
    };
  }, [readiness]);

  return (
    <>
      <audio
        data-testid="alarm-audio-long"
        ref={(el) => {
          longEl = el;
        }}
        src={BEEP_SRC}
        preload="auto"
      />
      <audio
        data-testid="alarm-audio-short"
        ref={(el) => {
          shortEl = el;
        }}
        src={BEEP_SRC}
        preload="auto"
      />
      <audio
        data-testid="alarm-audio-silent"
        ref={(el) => {
          silentEl = el;
          if (el) el.volume = 0.01;
        }}
        src={SILENT_SRC}
        preload="auto"
        loop
      />
    </>
  );
}
