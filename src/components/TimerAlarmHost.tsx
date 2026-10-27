"use client";

import { AlarmAudioElements } from '@/lib/alarm-audio';
import { useTimerAlarms } from '@/hooks/use-timer-alarms';

/**
 * 全站的響鈴宿主。零 props，不渲染任何看得到的東西。
 *
 * 掛在 `AppShell` 非 auth 分支裡、`<AppShellInternal/>` 的**兄弟節點**，
 * 這個位置同時滿足三件事：
 *
 *  · `/login`、`/signup` 被 `AUTH_ROUTES` 結構性排除（登入畫面不該響鈴），
 *    所以不需要再寫一次身分判斷；
 *  · 它在 `AppShellInternal` 的 `isAuthLoading || planData.isLoading` early return
 *    **之上** —— 還停在載入轉圈的手機也必須會響；
 *  · 它是元件，所以 iOS 需要的那三個隱藏 `<audio>` 節點留在 React 樹裡，
 *    不必手動塞進 `document.body`。
 *
 * ⚠️ 整個 app 只能有這一個。音檔元素與去重紀錄都是 module 層的單一擁有者，
 *    渲染兩次就會有兩組元素。
 */
export function TimerAlarmHost() {
  useTimerAlarms();
  return <AlarmAudioElements />;
}
