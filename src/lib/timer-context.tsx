"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useDoc, useMemoFirebase, useUser } from '@/firebase';
import { UserSettings } from '@/types/plan';
import { getCorrectedNow, getServerTimeOffset, useServerTime } from '@/hooks/use-server-time';
import { deriveSnapshot, DEFAULT_DURATION_SECONDS, type TimerPhase } from '@/lib/timer-state';

export interface TimerContextType {
  duration: number;
  /**
   * 要顯示的剩餘秒數。
   * ⚠️ 不要拿它當「下一輪從幾秒開始」—— 那是 `timeLeft` 身兼兩職造成
   *    issue #10 的地方，起算值現在由 `timer-state.ts` 的 `nextSeedSeconds`
   *    決定，而且刻意不對外公開。
   */
  remaining: number;
  phase: TimerPhase;
  /** 這一輪的截止時刻，同時是這一輪的身分（響鈴靠它去重）。 */
  targetEndTime: number | undefined;
  /** `phase === 'running'` 的方便寫法。 */
  isRunning: boolean;
  setDuration: (d: number) => void;
  /** 開始或續跑。剩餘 0（上一輪剛跑完）時自動從設定時長重新起算。 */
  start: () => void;
  /** 暫停：把剩餘量停在 `timeLeft`，並清掉截止時刻。 */
  stop: () => void;
  /** 回到「閒置且等於設定時長」。 */
  reset: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const db = useFirestore();
  const { role } = useAuth();
  const { user } = useUser();

  /**
   * 時鐘校正搬到這裡（原本只在 `AdminTimer` 裡呼叫一次）。
   *
   * 那個位置的後果是：除了 `/admin?tab=timer` 以外的每一頁，
   * `getCorrectedNow()` 其實就是裸的 `Date.now()` —— admin 寫入的是校正過的
   * 截止時刻，別頁的裝置卻用自己的時鐘去解讀它。響鈴現在在全站都會發生
   * （issue #10 現象 3），所以校正也必須在全站生效。
   */
  useServerTime();

  /**
   * ⚠️ 一定要等 `user` 有值才訂閱。
   *
   * 這個 provider 掛在全站（連 /login 都有），而 Firebase 的匿名登入是非同步的。
   * 只看 `db` 就訂閱的話，在登入完成之前就會對 `userSettings/global` 發出讀取，
   * Firestore 規則（request.auth != null）當場拒絕：
   *
   *   FirebaseError: Missing or insufficient permissions
   *   { "auth": null, "method": "get", "path": ".../userSettings/global" }
   *
   * 而 `use-doc.tsx` 收到錯誤會 emit `permission-error`，
   * `FirebaseErrorListener` 再把它 `throw` 在 render 裡 → **整個 client tree 爆掉**。
   * 使用者看到的是空白或停在載入中的頁面，跟計時器一點關係都沒有。
   *
   * 這是競態，所以只在「匿名登入比較慢」的時候才發生 —— 本機 E2E 的出現率約 1/10，
   * 在真實網路上只會更高。plans-context 的每個查詢都有 `!user` 這道閘，
   * 這裡原本漏了，是全專案唯一的一處。
   *
   * 對應測試：cypress/e2e_fixture/auth-race.cy.ts
   */
  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'userSettings', 'global');
  }, [db, user]);
  const { data: settings } = useDoc<UserSettings>(settingsRef);

  const [localTimeLeft, setLocalTimeLeft] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  /**
   * 時間到的自動停止。原本在 worker 分支與 interval 分支各有一份幾乎逐字相同的
   * 複製（兩份都可能跑到），現在只有這一個。
   *
   * ⚠️ 三件事不准動：
   *  1. **只有 admin 會寫**（commit 3f9b307）。非管理員裝置結束回合會「影響活動進度」。
   *     響鈴不經過這裡，所以 crew 不寫任何東西也會響。
   *  2. 寫入前先比對 `targetEndTime`，所以過期的 tick 殺不掉新的一輪（冪等）。
   *  3. **不清 `targetEndTime`** —— 它留著才分得出「跑完」與「閒置」，
   *     也才讓每台裝置都還認得出這是哪一輪。
   */
  const finishRound = (expectedTargetEndTime: number | undefined) => {
    if (!db || role !== 'admin' || !expectedTargetEndTime) return;
    const targetRef = doc(db, 'userSettings', 'global');
    getDoc(targetRef).then((snap) => {
      if (!snap.exists()) return;
      const latest = snap.data();
      if (latest.isRunning && latest.targetEndTime === expectedTargetEndTime) {
        updateDoc(targetRef, {
          isRunning: false,
          timeLeft: 0,
          updatedAt: getCorrectedNow(),
        }).catch(console.error);
      }
    });
  };

  useEffect(() => {
    if (!settings) return;

    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/timer-worker.js');
      } catch (err) {
        console.warn('[TimerWorker] Fallback to interval:', err);
      }
    }

    if (workerRef.current) {
      workerRef.current.onmessage = (e) => {
        const { type, remaining } = e.data;
        if (type === 'tick') {
          if (settings.isRunning) {
            setLocalTimeLeft(remaining);
            if (remaining === 0) finishRound(settings.targetEndTime);
          }
        }
      };
    }

    if (settings.isRunning && settings.targetEndTime && workerRef.current) {
      workerRef.current.postMessage({
        type: 'start',
        data: { targetEndTime: settings.targetEndTime, timeOffset: getServerTimeOffset() }
      });
    } else if (!settings.isRunning && workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setLocalTimeLeft(settings.timeLeft || 0);
    }

    const tick = () => {
      const currentTime = getCorrectedNow();
      if (settings.isRunning && settings.targetEndTime) {
        const remaining = Math.max(0, Math.floor((settings.targetEndTime - currentTime) / 1000));
        setLocalTimeLeft(remaining);

        if (remaining === 0) finishRound(settings.targetEndTime);
      } else {
        setLocalTimeLeft(settings.timeLeft || 0);
      }
    };

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!workerRef.current) {
      tick();
      interval = setInterval(tick, 1000);
    } else {
      tick();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
        if (workerRef.current && settings.isRunning && settings.targetEndTime) {
          workerRef.current.postMessage({
            type: 'start',
            data: { targetEndTime: settings.targetEndTime, timeOffset: getServerTimeOffset() }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings, db, role]);

  const snapshot = useMemo(() => deriveSnapshot(settings, localTimeLeft), [settings, localTimeLeft]);

  const value = useMemo(() => ({
    duration: snapshot.duration,
    remaining: snapshot.remaining,
    phase: snapshot.phase,
    targetEndTime: snapshot.targetEndTime,
    isRunning: snapshot.phase === 'running',
    start: () => {
      if (!db) return;
      // 起算值來自 snapshot，不是 localTimeLeft —— 上一輪跑完時後者是 0，
      // 於是算出來的截止時刻等於「現在」，按下去當場結束（issue #10 現象 2）。
      const seconds = snapshot.nextSeedSeconds;
      if (seconds <= 0) return;
      const nowTime = getCorrectedNow();
      updateDoc(doc(db, 'userSettings', 'global'), {
        isRunning: true,
        timeLeft: seconds,
        targetEndTime: nowTime + seconds * 1000,
        updatedAt: nowTime
      }).catch(console.error);
    },
    stop: () => {
      if (!db) return;
      const nowTime = getCorrectedNow();
      updateDoc(doc(db, 'userSettings', 'global'), {
        isRunning: false,
        timeLeft: snapshot.remaining,
        targetEndTime: 0,
        updatedAt: nowTime
      }).catch(console.error);
    },
    setDuration: (d: number) => {
      if (!db) return;
      setLocalTimeLeft(d);
      updateDoc(doc(db, 'userSettings', 'global'), {
        duration: d,
        timeLeft: d,
        targetEndTime: 0,
        isRunning: false,
        updatedAt: getCorrectedNow()
      }).catch(console.error);
    },
    reset: () => {
      if (!db) return;
      const d = settings?.duration || DEFAULT_DURATION_SECONDS;
      setLocalTimeLeft(d);
      updateDoc(doc(db, 'userSettings', 'global'), {
        isRunning: false,
        timeLeft: d,
        targetEndTime: 0,
        updatedAt: getCorrectedNow()
      }).catch(console.error);
    }
  }), [snapshot, settings, db]);

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
