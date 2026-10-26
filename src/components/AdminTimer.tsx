
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  RotateCcw, 
  ShieldCheck,
  Volume2,
  VolumeX,
  Pause,
  BellRing,
  Moon,
  Wifi,
  WifiOff,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Tv,
  LayoutGrid,
  MapPin,
  User,
  Users,
  Compass,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useServerTime, getCorrectedNow } from "@/hooks/use-server-time";
import { useTranslation } from "@/lib/i18n-context";
import { useTimer } from "@/lib/timer-context";
import { useAlarmAudio } from "@/lib/alarm-audio";
import { RotationTableData, LessonPlan, Camp } from "@/types/plan";

interface AdminTimerProps {
  isLocked: boolean;
  autoEnterSaverMode?: boolean;
  tables?: RotationTableData[];
  plans?: LessonPlan[];
  selectedDay?: string;
  camps?: Camp[];
  activeCampId?: string | null;
  onUpdateCamp?: (id: string, updates: Partial<Camp>) => void;
}

function playSyntheticAlarm(duration = 2.0, frequency = 440) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Web Audio API synthesis failed:", e);
  }
}

export function AdminTimer({
  isLocked,
  autoEnterSaverMode = false,
  tables = [],
  plans = [],
  selectedDay = "Day 1",
  camps = [],
  activeCampId = null,
  onUpdateCamp
}: AdminTimerProps) {
  const { t } = useTranslation();
  // 直接取 context。原本是 admin/page.tsx → AdminSection（型別 `any`）→ 這裡，
  // 穿三層卻沒有加任何東西，而且途中的型別裡還有一個不存在的 `setTimeLeft`。
  const timer = useTimer();
  const [now, setNow] = useState<Date | null>(null);

  // V2 Admin States & Variables
  const [broadcastInput, setBroadcastInput] = useState("");
  const [saverLayoutMode, setSaverLayoutMode] = useState<"clock" | "projector">("projector");

  const activeCamp = camps.find(c => c.id === activeCampId);
  const currentBroadcastText = activeCamp?.broadcastText || "";
  const currentRoundIndex = activeCamp?.activeRoundIndex !== undefined ? activeCamp.activeRoundIndex : 0;
  const activeTable = tables.find(tb => tb.day === selectedDay);

  const handlePublishBroadcast = (text: string) => {
    if (!activeCampId || !onUpdateCamp) return;
    onUpdateCamp(activeCampId, {
      broadcastText: text.trim(),
      broadcastTime: Date.now()
    });
    toast({ title: text.trim() ? "已成功發布值星公告" : "已清除當前值星公告" });
  };

  const handleUpdateRound = (index: number) => {
    if (!activeCampId || !onUpdateCamp || !activeTable) return;
    const maxRounds = activeTable.rounds.length;
    const nextIndex = Math.max(0, Math.min(index, maxRounds - 1));
    onUpdateCamp(activeCampId, {
      activeRoundIndex: nextIndex
    });
  };
 const { toast } = useToast();
 
 // Initialize NTP-like server time sync
 useServerTime();
 
 const wakeLockRef = useRef<any>(null);
 const lastCheckTimeRef = useRef<number>(Date.now());
 const autoEnterHandledRef = useRef(false);
 const lastSaverTapRef = useRef(0);
 
 // 音效能力由 alarm-audio 統一擁有。這個元件只讀，不寫 —— 原本它自己留了一份
 // state、一份 localStorage 寫入和一份跨實例同步，而 TransparentNavbar 也有
 // 一份，兩邊靠一個自訂事件勉強對齊。
 const { readiness, enable, disable } = useAlarmAudio();
 const audioUnlocked = readiness === 'ready';

 const [isSaverMode, setIsSaverMode] = useState(false);
 const [isOnline, setIsOnline] = useState(true);

 // Track online/offline status
 useEffect(() => {
 setIsOnline(navigator.onLine);
 const handleOnline = () => setIsOnline(true);
 const handleOffline = () => setIsOnline(false);
 window.addEventListener('online', handleOnline);
 window.addEventListener('offline', handleOffline);
 return () => {
 window.removeEventListener('online', handleOnline);
 window.removeEventListener('offline', handleOffline);
 };
 }, []);

 const [h, setH] = useState(Math.floor(timer.duration / 3600));
 const [m, setM] = useState(Math.floor((timer.duration % 3600) / 60));
 const [s, setS] = useState(timer.duration % 60);


  // 原本這裡掛著一個 document 層的 click/touchstart 監聽，把兩個 play() 的
  // rejection 都吞掉、resume() 不等結果，然後無條件寫入 camp-audio-unlocked。
  // 那就是「畫面說已解鎖、實際上拒播」的成因（issue #10 現象 3）。
  // 現在由 alarm-audio 的 <AlarmAudioElements/> 負責：它會**等** play()/resume()
  // 的結果，而且只動「能力」不動「意願」。


 const requestWakeLock = async () => {
 if ('wakeLock' in navigator && !wakeLockRef.current) {
 try {
 wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
 } catch (err) {
 console.warn("Wake Lock failed:", err);
 }
 }
 };

 const releaseWakeLock = () => {
 if (wakeLockRef.current) {
 wakeLockRef.current.release();
 wakeLockRef.current = null;
 }
 };

 // Always keep screen awake when this component is mounted
 useEffect(() => {
 requestWakeLock();
 const handleVisibility = () => {
 if (document.visibilityState === 'visible') requestWakeLock();
 };
 document.addEventListener('visibilitychange', handleVisibility);
 return () => {
 document.removeEventListener('visibilitychange', handleVisibility);
 releaseWakeLock();
 };
 }, []);


 useEffect(() => {
 if (!timer.isRunning) {
 setH(Math.floor(timer.duration / 3600));
 setM(Math.floor((timer.duration % 3600) / 60));
 setS(timer.duration % 60);
 }
 }, [timer.duration, timer.isRunning]);

 // 響鈴（四個里程碑、去重、通知）已經搬到 src/hooks/use-timer-alarms.ts，
 // 由全站的 TimerAlarmHost 驅動。留在這裡的話，只有 admin 剛好停在計時分頁時
 // 才會響 —— 那就是 issue #10 現象 3。

 useEffect(() => {
 setNow(new Date());
 // 只負責畫面上那個時鐘。響鈴不在這裡 —— 主執行緒的 interval 在背景分頁會
 // 被節流，而響鈴要靠 timer worker 推進的 remaining。
 const interval = setInterval(() => {
 setNow(new Date());
 }, 1000);
 
 const handleVisibilityChange = () => {
 if (document.visibilityState === 'visible') {
 setNow(new Date());
 }
 };

 document.addEventListener('visibilitychange', handleVisibilityChange);
 return () => {
 clearInterval(interval);
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 };
 }, []);

 const testAudio = async () => {
 if (audioUnlocked) {
 disable();
 toast({ title: t('AUDIO_DISABLED_TITLE'), description: t('ALERT_DISABLED_DESC') });
 return;
 }

 // enable() 必須在使用者手勢裡呼叫，而這個函式就是按鈕的 onClick。
 const ok = await enable();
 if (ok) {
 toast({ title: t('AUDIO_LOCKED_TITLE'), description: t('AUDIO_UNLOCKED_DESC') });
 } else {
 toast({
 title: t('PLAYBACK_FAILED'),
 description: t('ENSURE_RINGER_ON'),
 variant: "destructive",
 });
 }
 };

 const toggleTimer = () => {
 if (timer.isRunning) timer.stop();
  else timer.start();
 };

 const resetTimer = () => {
 timer.reset();
 toast({ description: t('SUCCESS') });
 };

 const updateDuration = () => {
 const totalSeconds = (h * 3600) + (m * 60) + s;
 timer.setDuration(totalSeconds);
 toast({ description: t('SUCCESS') });
 };

 const toggleSaverMode = async (enter: boolean) => {
 setIsSaverMode(enter);
 
 // Dynamically change theme-color for PWA status bar
 const themeColorMeta = document.querySelector('meta[name="theme-color"]');
 if (themeColorMeta) {
 themeColorMeta.setAttribute('content', enter ? '#000000' : '#7C3AED');
 }
 
 try {
 if (enter) {
 if (document.documentElement.requestFullscreen) {
 await document.documentElement.requestFullscreen();
 } else if ((document.documentElement as any).webkitRequestFullscreen) { // Safari workaround
 await ((document.documentElement as any).webkitRequestFullscreen)();
 }
 } else {
 if (document.fullscreenElement) {
 if (document.exitFullscreen) {
 await document.exitFullscreen();
 } else if ((document as any).webkitExitFullscreen) { // Safari workaround
 await ((document as any).webkitExitFullscreen)();
 }
 }
 }
 } catch (e) {
 console.warn("Fullscreen request failed:", e);
 }
 };

 useEffect(() => {
 if (!autoEnterSaverMode || autoEnterHandledRef.current) return;
 autoEnterHandledRef.current = true;
 if (isSaverMode) return;
 toggleSaverMode(true);
 }, [autoEnterSaverMode, isSaverMode]);

 const handleSaverTouchEnd = () => {
 const nowTs = Date.now();
 if (nowTs - lastSaverTapRef.current < 320) {
 toggleSaverMode(false);
 lastSaverTapRef.current = 0;
 return;
 }
 lastSaverTapRef.current = nowTs;
 };

 const formatTime = (seconds: number) => {
 const hours = Math.floor(seconds / 3600);
 const mins = Math.floor((seconds % 3600) / 60);
 const secs = seconds % 60;
 if (hours > 0) return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 };

 const progress = (timer.remaining / (timer.duration || 1)) * 100;
 const isCritical = timer.remaining <= 180 && timer.remaining > 0;
 const isFinished = timer.phase === 'finished';

 return (
 <div className="w-full flex flex-col items-center py-6 space-y-10 transition-colors duration-300">
 <div className="w-full max-w-5xl flex flex-col space-y-10">
 
 <div
  data-testid="timer-audio-status"
  className={cn(
  "w-full p-6 sm:p-8 rounded-3xl backdrop-blur-md border transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs",
  audioUnlocked 
   ? "bg-emerald-500/[0.06] border-emerald-500/30" 
   : "bg-white/80 dark:bg-white/[0.03] border-stone-200/80 dark:border-white/10"
 )}>
  <div className="flex items-center gap-5 text-center md:text-left">
   <div className={cn(
    "w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs",
    audioUnlocked ? "bg-emerald-500" : "bg-stone-800 dark:bg-white/10 text-stone-400"
   )}>
    {audioUnlocked ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
   </div>
   <div>
    <h4 className="font-normal text-base text-foreground tracking-tight">
     {readiness === 'ready'
      ? t('AUDIO_UNLOCKED')
      : readiness === 'needs-gesture'
       ? t('AUDIO_NEEDS_GESTURE')
       : t('AUDIO_LOCKED')}
    </h4>
    <p className="text-fg-muted font-mono text-xs mt-0.5">
     {readiness === 'ready'
      ? "● 語音廣播與警報音效已就緒"
      : readiness === 'needs-gesture'
       ? t('AUDIO_NEEDS_GESTURE_DESC')
       : "○ 點擊右側按鈕以解除瀏覽器音訊限制"}
    </p>
   </div>
  </div>
  <Button 
   data-testid="timer-audio-toggle"
   onClick={testAudio}
   variant={audioUnlocked ? "outline" : "default"}
   className={cn(
    "rounded-full px-8 h-10 font-mono text-xs uppercase tracking-wider transition-all",
    audioUnlocked 
     ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" 
     : "bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
   )}
  >
   {audioUnlocked ? "Disable Audio" : "Test & Unlock"}
  </Button>
 </div>

 {!isLocked && (
  <Card data-testid="timer-console" className="w-full p-6 sm:p-10 rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 flex flex-col space-y-8 shadow-xs">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200/60 dark:border-white/5">
    <div className="flex items-center gap-4">
     <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl">
      <ShieldCheck className="h-6 w-6" />
     </div>
     <div>
      <h3 className="font-normal text-lg text-foreground tracking-tight">{t('COMMAND_CENTER')}</h3>
      <p className="font-mono text-xs text-fg-muted uppercase tracking-wider mt-0.5">
       {t('PROP_STATUS')}: <span className={cn("font-medium", timer.isRunning ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>{timer.isRunning ? t('RUNNING') : t('STANDBY')}</span>
      </p>
     </div>
    </div>
    <div className="flex flex-col md:items-end">
     <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest">SERVER NOW</span>
     <span className="text-xl sm:text-2xl font-mono text-foreground mt-0.5">
      {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
     </span>
    </div>
   </div>

   <div className="space-y-6">
    <div className="space-y-3">
     <label className="font-mono text-xs text-fg-muted uppercase tracking-wider">
      DURATION (H:M:S)
     </label>
     <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="w-full md:flex-1 grid grid-cols-3 gap-3 md:gap-4">
       {[ 
        {val: h, set: setH, label: 'H'}, 
        {val: m, set: setM, label: 'M'}, 
        {val: s, set: setS, label: 'S'} 
       ].map((item, i) => (
        <div key={i} className="relative group">
         <Input 
          type="number" 
          value={item.val || ''} 
          onChange={(e) => item.set(Math.min(99, parseInt(e.target.value) || 0))} 
          className="h-12 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-mono text-center text-lg focus:border-orange-500 text-foreground w-full" 
         />
         <span className="absolute -top-2.5 right-3 px-1.5 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 text-[9px] font-mono text-fg-muted rounded-md uppercase">{item.label}</span>
        </div>
       ))}
      </div>
      <Button onClick={updateDuration} className="w-full md:w-auto h-12 px-8 rounded-xl font-mono text-xs uppercase tracking-wider bg-stone-900 dark:bg-white text-white dark:text-[#0B1012] hover:opacity-90 shrink-0 shadow-xs">
       {t('APPLY')}
      </Button>
     </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <Button 
      data-testid="timer-start"
      onClick={toggleTimer} 
      className={cn(
       "h-14 rounded-2xl font-mono text-xs uppercase tracking-wider gap-2.5 shadow-lg transition-all",
       timer.isRunning 
        ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25" 
        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/25"
      )}
     >
      {timer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      {timer.isRunning ? t('STOP_SYNC') : t('START_SYNC')}
     </Button>
     <Button 
      variant="outline" 
      className="h-14 rounded-2xl font-mono text-xs uppercase tracking-wider gap-2 border border-stone-200/80 dark:border-white/10 hover:border-orange-500/40 text-foreground transition-all shadow-xs" 
      data-testid="timer-reset"
      onClick={resetTimer}
     >
      <RotateCcw className="h-5 w-5 text-stone-400" /> RESET
     </Button>
    </div>
   </div>
  </Card>
 )}

      {!isLocked && (
        <div data-testid="timer-broadcast-console" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-6">
          {/* Broadcast Console Card */}
          <Card className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 flex flex-col space-y-6 shadow-xs text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl shrink-0">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-normal text-base text-foreground tracking-tight">值星公告廣播中樞</h3>
                <p className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mt-0.5">Live Broadcast Console</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-fg-muted uppercase tracking-wider px-1">自訂公告內容</label>
              <div className="flex gap-2">
                <Input
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  placeholder="輸入即時公告文字...（例如：全體到操場集合！）"
                  className="rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 h-11 text-xs font-normal text-foreground flex-1"
                />
                {currentBroadcastText && (
                  <Button 
                    variant="outline"
                    onClick={() => { handlePublishBroadcast(""); setBroadcastInput(""); }}
                    className="h-11 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-stone-200/80 dark:border-white/10 font-mono text-xs px-4"
                  >
                    清除
                  </Button>
                )}
                <Button 
                  onClick={() => handlePublishBroadcast(broadcastInput)}
                  className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs px-6 shadow-xs"
                >
                  發布
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-fg-muted uppercase tracking-wider px-1">常用快捷廣播</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "📢 進行二收", text: "請全體工作人員與小隊，現在至大禮堂集合進行二次驗收！" },
                  { label: "⏰ 準備進關", text: "本輪關卡時間即將結束，請各位值星、關主與小隊準備進下一關！" },
                  { label: "🍽️ 用餐廣播", text: "用餐時間已到，請大廚組與各組小隊依序至餐廳洗手用餐！" },
                  { label: "🌧️ 雨備啟動", text: "因目前雨勢較大，本活動即刻啟動雨天備案，請移至室內教室！" }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setBroadcastInput(tpl.text);
                      handlePublishBroadcast(tpl.text);
                    }}
                    className="px-3 py-2 text-left rounded-xl text-[10px] font-mono border border-stone-200/60 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] hover:bg-stone-100/60 dark:hover:bg-white/5 transition-colors text-fg-secondary leading-relaxed truncate cursor-pointer"
                    title={tpl.text}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {currentBroadcastText && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                <span className="flex-1 text-xs font-mono text-amber-700 dark:text-amber-400 leading-relaxed">
                  當前發布：{currentBroadcastText}
                </span>
              </div>
            )}
          </Card>

          {/* Active Round Stepper Card */}
          <Card className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 flex flex-col space-y-6 shadow-xs text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-normal text-base text-foreground tracking-tight">關卡輪次控制器</h3>
                <p className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mt-0.5">Round Sync Controller</p>
              </div>
            </div>

            {activeTable ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider px-1">行政輪替表名稱</div>
                  <div className="text-sm font-normal text-foreground px-1">
                    {activeTable.title || `${selectedDay} 輪替表`} ({activeTable.rounds.length} 個輪次)
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 rounded-2xl p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentRoundIndex <= 0}
                    onClick={() => handleUpdateRound(currentRoundIndex - 1)}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-white/10 border border-stone-200/60 dark:border-white/10 text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-fg-muted uppercase tracking-widest block">當前進度</span>
                    <span className="text-xl font-mono text-orange-600 dark:text-orange-400 block mt-0.5">
                      第 {currentRoundIndex + 1} 輪 / Round {currentRoundIndex + 1}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentRoundIndex >= activeTable.rounds.length - 1}
                    onClick={() => handleUpdateRound(currentRoundIndex + 1)}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-white/10 border border-stone-200/60 dark:border-white/10 text-foreground"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {activeTable.rounds[currentRoundIndex] && (
                  <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl">
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-medium">當前小隊分佈</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {activeTable.teamOrders.map((team) => {
                        const stationId = team.stations[currentRoundIndex];
                        const station = activeTable.stations.find(st => st.id === stationId);
                        return (
                          <div key={team.id} className="text-xs font-mono text-foreground flex items-center justify-between py-1 border-b border-stone-200/40 dark:border-white/5 last:border-b-0">
                            <span className="truncate">{team.name}</span>
                            <span className="text-orange-600 dark:text-orange-400 font-medium truncate ml-2">→ {station?.name || "休息"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-fg-muted">
                <Compass className="h-8 w-8 opacity-40 mb-2" />
                <p className="text-xs font-mono">請先於「行政輪替表」分頁新增當日輪替表格以啟用輪次控制。</p>
              </div>
            )}
          </Card>
        </div>
      )}

 <Card className="w-full rounded-3xl md:rounded-[2.5rem] shadow-2xl bg-[#0B1012] border border-stone-200/80 dark:border-white/10 text-white flex flex-col items-center justify-between p-6 md:p-12 lg:p-16 min-h-[450px] relative overflow-hidden transition-all duration-700">
  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900/60 to-transparent opacity-80 pointer-events-none" />
  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
   <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
     <BellRing className="h-6 w-6 text-amber-500" />
    </div>
    <div className="flex flex-col min-w-0">
     <h3 className="font-mono text-xs text-white tracking-widest uppercase truncate">{t('TIMER_SYNC_STATUS')}</h3>
     <div className="flex items-center gap-2 mt-1">
      <span className={cn("text-[9px] font-mono uppercase tracking-wider", timer.isRunning ? "text-emerald-400" : "text-amber-400/90")}>Status: {timer.isRunning ? t('RUNNING') : t('STANDBY')}</span>
      {!isOnline && (
       <span className="flex items-center gap-1 text-[9px] font-mono text-rose-400 uppercase tracking-wider animate-pulse">
        <WifiOff className="h-3 w-3" /> OFFLINE
       </span>
      )}
     </div>
    </div>
   </div>
   
   <Button 
    onClick={() => toggleSaverMode(true)}
    variant="outline"
    className="w-full sm:w-auto bg-white/5 border border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full h-11 px-6 font-mono text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer"
   >
    <Moon className="h-4 w-4 mr-2" />
    {t('SAVER_MODE')}
   </Button>
  </div>
  <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
    <div className={cn(
      "text-xs font-mono uppercase tracking-[0.3em] mb-4 transition-all duration-700",
      isCritical ? "text-rose-400 animate-pulse" : "text-stone-400"
    )}>
      {isCritical ? t('REMAINING_TIME') : isFinished ? t('TIME_UP') : t('REMAINING_TIME')}
    </div>
    <div
      data-testid="timer-remaining"
      className={cn(
      "font-mono font-light transition-all duration-700 text-center text-[clamp(4.5rem,20vw,14rem)] leading-none tracking-tight",
      isCritical ? "text-rose-400 animate-pulse" : isFinished ? "text-rose-500" : "text-white"
    )}>
      {formatTime(timer.remaining)}
    </div>
    <div className="text-xs sm:text-sm font-mono text-stone-400 mt-4 tracking-widest">
      {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
    </div>
    <div className="w-full max-w-2xl h-2 bg-white/10 rounded-full overflow-hidden mt-8 p-0 relative">
      <div className={cn(
        "h-full transition-all duration-1000 rounded-full",
        isCritical ? "bg-rose-500" : isFinished ? "bg-rose-600" : "bg-gradient-to-r from-orange-500 to-amber-400"
      )} style={{ width: `${progress}%` }} />
    </div>
  </div>
  </Card>
  </div>

  {isSaverMode && createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-[#0B1012] flex flex-col items-center justify-between py-12 px-6 cursor-pointer select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      onDoubleClick={() => toggleSaverMode(false)}
      onTouchEnd={handleSaverTouchEnd}
    >
      <div className="flex flex-col items-center space-y-2 mt-4">
        <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono tracking-widest text-stone-400 uppercase">
          // SCREEN SAVER MODE //
        </span>
        <div className={cn(
          "text-xs font-mono uppercase tracking-[0.3em] transition-all duration-700",
          isCritical ? "text-rose-400 animate-pulse" : "text-stone-500"
        )}>
          {isCritical ? t('REMAINING_TIME') : isFinished ? t('TIME_UP') : t('SAVER_MODE')}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-auto">
        <div
          data-testid="timer-saver-remaining"
          className={cn(
          "font-mono font-light transition-all duration-700 text-center text-[clamp(5rem,24vw,20rem)] leading-none tracking-tight",
          isCritical ? "text-rose-500 animate-pulse" : isFinished ? "text-rose-600" : "text-stone-300"
        )}>
          {formatTime(timer.remaining)}
        </div>
        <div className="flex items-center gap-3 mt-6">
          <span className={cn(
            "text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border",
            audioUnlocked 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          )}>
            音效: {readiness === 'ready'
              ? t('AUDIO_UNLOCKED')
              : readiness === 'needs-gesture'
               ? t('AUDIO_STATUS_PENDING')
               : t('AUDIO_LOCKED')}
          </span>
          <span className="text-xs font-mono text-stone-500 tracking-widest">
            {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
          </span>
        </div>
      </div>

      <div className="text-stone-600 text-[10px] font-mono tracking-widest uppercase mb-4">
        {t('DOUBLE_TAP_WAKE')}
      </div>
    </div>,
    document.body
  )}

 </div>
 );
}
