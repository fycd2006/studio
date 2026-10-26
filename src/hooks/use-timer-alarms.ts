"use client";

import { useCallback, useEffect } from 'react';
import { useTimer } from '@/lib/timer-context';
import { useTranslation } from '@/lib/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { getCorrectedNow } from '@/hooks/use-server-time';
import {
  dueMilestones,
  readClaimed,
  writeClaimed,
  type AlarmMilestone,
} from '@/lib/timer-state';
import { ringAlarm, notifyAlarm, warmUpAlarmAudio, setKeepAlive } from '@/lib/alarm-audio';

/**
 * 全站唯一的響鈴消費者。
 *
 * 為什麼要搬出 `AdminTimer`：原本整套響鈴（1 秒的 interval、四個里程碑、去重的
 * ref）都寫在那個元件裡，而它被 Radix 的 `<TabsContent value="timer">` 包著，
 * repo 裡沒有任何 `forceMount` —— 所以只有「admin 剛好停在計時分頁」時才會響。
 * 而計時狀態本來就每一頁都有（`TimerProvider` 在 root layout）。缺的從來只是
 * 消費者（GitHub issue #10 現象 3）。
 *
 * 三個刻意的設計：
 *
 *  1. **不自己開計時器。** `remaining` 已經由 `public/timer-worker.js` 每 500ms
 *     推進一次，還有 visibilitychange 的補算（`timer-context.tsx`）。這裡只要對
 *     它的變化作反應就好。原本那個主執行緒的 1 秒 interval 在背景分頁會被節流，
 *     本來就不是可靠的那一條路。
 *
 *  2. **不讀 `isRunning`，只看截止時刻。** 原本 `checkAlarms` 第一行是
 *     `if (!timer.isRunning || !timer.targetEndTime) return;`，而時間到的時候
 *     admin 那台會把 `isRunning` 寫成 false —— 誰先看到 0 就決定了別人會不會漏響。
 *     改看截止時刻之後，每台裝置自己就認得出這一輪，也就**不必寫任何東西**
 *     （commit 3f9b307：非管理員裝置不准碰計時器狀態）。
 *
 *  3. **`phase === 'loading'` 一定先擋掉。** 第一份 snapshot 還沒到時
 *     `remaining` 是 0，照字面解讀的話每次開頁都會「時間到」。
 */
export function useTimerAlarms(): void {
  const { phase, remaining, duration, targetEndTime } = useTimer();
  const { t } = useTranslation();
  const { toast } = useToast();

  const run = useCallback(
    (milestone: AlarmMilestone) => {
      switch (milestone.effect) {
        case 'silent-notify':
          notifyAlarm({
            title: `⏱ ${t('ALERT_INCOMING')}`,
            body: t('THREE_MIN_WARNING_STBY'),
            silent: true,
            tag: 'pre-wake-3min',
          });
          break;
        case 'sound-reminder':
          toast({ title: t('THREE_MIN_LEFT'), description: t('PREPARE_ROTATION') });
          ringAlarm('reminder');
          notifyAlarm({ title: t('THREE_MIN_LEFT'), body: t('PREPARE_ROTATION') });
          break;
        case 'warmup-and-notify':
          // 時間到前幾秒先把音訊硬體叫醒，真的要響的時候才不會卡在 readyState
          warmUpAlarmAudio();
          notifyAlarm({
            title: `⏱ ${t('ROTATION_NOW')}`,
            body: t('TIME_IS_UP_DESC'),
            silent: true,
            tag: 'pre-wake-end',
          });
          break;
        case 'sound-timeup':
          toast({
            title: t('TIME_FOR_ROTATION'),
            description: t('PLEASE_ROTATE'),
            variant: 'destructive',
          });
          ringAlarm('timeup');
          notifyAlarm({ title: t('TIME_FOR_ROTATION'), body: t('PLEASE_ROTATE'), urgent: true });
          break;
      }
    },
    [t, toast],
  );

  const evaluate = useCallback(() => {
    if (phase === 'loading' || !targetEndTime) return;

    const claimed = readClaimed(targetEndTime);
    const due = dueMilestones({
      targetEndTime,
      durationSeconds: duration,
      remaining,
      now: getCorrectedNow(),
      claimed,
    });
    if (due.length === 0) return;

    // 先記再響：萬一 `run` 丟出錯誤，也不會變成每秒重響一次
    const next = new Set(claimed);
    due.forEach((m) => next.add(m.id));
    writeClaimed(targetEndTime, next);
    due.forEach(run);
  }, [phase, targetEndTime, duration, remaining, run]);

  // `remaining` 每 500ms 變一次，而 evaluate 的依賴裡有它，
  // 所以這個 effect 就是「每一拍評估一次」
  useEffect(() => {
    evaluate();
  }, [evaluate]);

  // 分頁被叫回前景時補算一次（手機鎖屏回來、切分頁回來）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') evaluate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [evaluate]);

  // 回合進行中用靜音迴圈保住背景的 JS（iOS/Android）。原本只在計時分頁上跑，
  // 所以其他頁面的裝置一進背景就什麼都不會發生了。
  useEffect(() => {
    setKeepAlive(phase === 'running');
    return () => setKeepAlive(false);
  }, [phase]);
}
