"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useDoc, useMemoFirebase, useUser } from '@/firebase';
import { UserSettings } from '@/types/plan';
import { getCorrectedNow, getServerTimeOffset } from '@/hooks/use-server-time';

export interface TimerContextType {
  duration: number;
  timeLeft: number;
  targetEndTime: number | undefined;
  isRunning: boolean;
  audioEnabled: boolean;
  setDuration: (d: number) => void;
  setIsRunning: (r: boolean) => void;
  reset: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const db = useFirestore();
  const { role } = useAuth();
  const { user } = useUser();

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
            if (remaining === 0 && role === 'admin') {
              const targetRef = doc(db!, 'userSettings', 'global');
              const expectedTargetEndTime = settings.targetEndTime;
              getDoc(targetRef).then((snap) => {
                if (snap.exists()) {
                  const latest = snap.data();
                  if (latest.isRunning && latest.targetEndTime === expectedTargetEndTime) {
                    updateDoc(targetRef, {
                      isRunning: false,
                      timeLeft: 0,
                      updatedAt: Date.now()
                    }).catch(console.error);
                  }
                }
              });
            }
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

        if (remaining === 0 && settings.isRunning && role === 'admin') {
          const targetRef = doc(db!, 'userSettings', 'global');
          const expectedTargetEndTime = settings.targetEndTime;
          getDoc(targetRef).then((snap) => {
            if (snap.exists()) {
              const latest = snap.data();
              if (latest.isRunning && latest.targetEndTime === expectedTargetEndTime) {
                updateDoc(targetRef, {
                  isRunning: false,
                  timeLeft: 0,
                  updatedAt: currentTime
                }).catch(console.error);
              }
            }
          });
        }
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

  const value = useMemo(() => ({
    duration: settings?.duration || 40 * 60,
    timeLeft: localTimeLeft,
    targetEndTime: settings?.targetEndTime,
    isRunning: settings?.isRunning || false,
    audioEnabled: true,
    setIsRunning: (r: boolean) => {
      if (!db) return;
      const nowTime = getCorrectedNow();
      const target = r ? nowTime + (localTimeLeft * 1000) : 0;
      updateDoc(doc(db, 'userSettings', 'global'), {
        isRunning: r,
        timeLeft: localTimeLeft,
        targetEndTime: target,
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
      const d = settings?.duration || 40 * 60;
      setLocalTimeLeft(d);
      updateDoc(doc(db, 'userSettings', 'global'), {
        isRunning: false,
        timeLeft: d,
        targetEndTime: 0,
        updatedAt: getCorrectedNow()
      }).catch(console.error);
    }
  }), [settings, localTimeLeft, db]);

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
