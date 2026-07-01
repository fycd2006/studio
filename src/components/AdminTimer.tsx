
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
import { useServerTime } from "@/hooks/use-server-time";
import { useTranslation } from "@/lib/i18n-context";
import { RotationTableData, LessonPlan, Camp } from "@/types/plan";

interface AdminTimerProps {
  timer: {
    duration: number;
    timeLeft: number;
    isRunning: boolean;
    targetEndTime?: number;
    setDuration: (d: number) => void;
    setTimeLeft: (t: number) => void;
    setIsRunning: (r: boolean) => void;
    reset: () => void;
  };
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
  timer,
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
 const playedMilestonesRef = useRef<Set<number>>(new Set());
 const silentLoopRef = useRef<HTMLAudioElement | null>(null);
 const lastCheckTimeRef = useRef<number>(Date.now());
 const autoEnterHandledRef = useRef(false);
 const lastSaverTapRef = useRef(0);
 
 const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
 if (typeof window !== 'undefined') {
 return localStorage.getItem('camp-audio-unlocked') === 'true';
 }
 return false;
 });

 useEffect(() => {
 const syncAudioState = () => {
 setAudioUnlocked(localStorage.getItem('camp-audio-unlocked') === 'true');
 };

 window.addEventListener('storage', syncAudioState);
 window.addEventListener('camp-audio-sync', syncAudioState as EventListener);
 return () => {
 window.removeEventListener('storage', syncAudioState);
 window.removeEventListener('camp-audio-sync', syncAudioState as EventListener);
 };
 }, []);

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

 // 音檔網址
 const ALARM_URL = "https://raw.githubusercontent.com/freeCodeCamp/cdn/master/build/testable-projects-fcc/audio/BeepSound.wav"; 
 const SHORT_BEEP_URL = "/beep.wav"; 
 
 // 1-second silent audio base64 to keep JS alive in background (iOS/Android workaround)
 const SILENT_AUDIO_BASE64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

 // 使用真正的 HTMLAudioElement 綁定來突破 iOS 限制
 const alarmAudioHtmlRef = useRef<HTMLAudioElement | null>(null);
 const shortBeepHtmlRef = useRef<HTMLAudioElement | null>(null);

 useEffect(() => {
 silentLoopRef.current = new Audio(SILENT_AUDIO_BASE64);
 silentLoopRef.current.loop = true;
 silentLoopRef.current.volume = 0.01; // nearly silent just in case
 
 return () => {
 if (silentLoopRef.current) {
 silentLoopRef.current.pause();
 silentLoopRef.current = null;
 }
 };
 }, []);

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
 if (timer.isRunning) {
 // Start silent audio loop to keep background JS execution alive
 if (audioUnlocked && silentLoopRef.current) {
 silentLoopRef.current.play().catch(e => console.warn("Silent loop blocked:", e));
 }
 } else {
 playedMilestonesRef.current.clear();
 
 // Pause silent audio loop
 if (silentLoopRef.current) {
 silentLoopRef.current.pause();
 }
 }
 return () => {
 if (silentLoopRef.current) silentLoopRef.current.pause();
 };
 }, [timer.isRunning, audioUnlocked]);

 useEffect(() => {
 if (!timer.isRunning) {
 setH(Math.floor(timer.duration / 3600));
 setM(Math.floor((timer.duration % 3600) / 60));
 setS(timer.duration % 60);
 }
 }, [timer.duration, timer.isRunning]);

 const triggerAlarm = useCallback((title: string, description: string, audioMode: 'short' | 'long' = 'long', isDestructive = false) => {
    toast({ 
      title, 
      description, 
      variant: isDestructive ? "destructive" : "default" 
    });
    
    if (audioUnlocked) {
      if (audioMode === 'long') {
        if (alarmAudioHtmlRef.current && alarmAudioHtmlRef.current.readyState >= 2) {
          const audio = alarmAudioHtmlRef.current;
          audio.currentTime = 0;
          audio.volume = 1.0;
          audio.play().catch(e => {
            console.warn("Background audio blocked, using synthetic fallback:", e);
            playSyntheticAlarm(3.0, 520);
          });
        } else {
          console.warn("Long audio not ready, using synthetic fallback");
          playSyntheticAlarm(3.0, 520);
        }
      } else if (audioMode === 'short') {
        if (shortBeepHtmlRef.current && shortBeepHtmlRef.current.readyState >= 2) {
          const audio = shortBeepHtmlRef.current;
          const schedule = [0, 300, 1000, 1300, 2000, 2300];
          schedule.forEach(delay => {
            setTimeout(() => {
              audio.currentTime = 0;
              audio.volume = 1.0;
              audio.play().catch(e => {
                console.warn("Short beep blocked, using synthetic fallback:", e);
                playSyntheticAlarm(0.15, 880);
              });
            }, delay);
          });
        } else {
          console.warn("Short audio not ready, using synthetic fallback");
          const schedule = [0, 300, 1000, 1300, 2000, 2300];
          schedule.forEach(delay => {
            setTimeout(() => {
              playSyntheticAlarm(0.15, 880);
            }, delay);
          });
        }
      }
      
      // Attempt to trigger system notification (works in background/lock screen if authorized)
      if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: description,
            vibrate: isDestructive ? [500, 200, 500, 200, 500] : [200, 100, 200],
            requireInteraction: true,
            tag: isDestructive ? 'timer-end' : 'timer-warning',
            renotify: true,
            actions: isDestructive ? [
              { action: 'dismiss', title: '知道了 / Dismiss' }
            ] : [],
          } as any);
        });
      }
    }
  }, [audioUnlocked, toast]);

 const checkAlarms = useCallback(() => {
 if (!timer.isRunning || !timer.targetEndTime) return;

 const currentTime = Date.now();
 const remaining = Math.max(0, Math.floor((timer.targetEndTime - currentTime) / 1000));

 // Pre-wake notification ~5 seconds before 3-minute warning (190~181秒)
 // Only trigger if total duration is greater than 3 minutes
 if (timer.duration > 180 && remaining <= 190 && remaining > 180 && !playedMilestonesRef.current.has(185)) {
 if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'granted') {
 navigator.serviceWorker.ready.then(registration => {
 registration.showNotification(`⏱ ${t('ALERT_INCOMING')}`, {
 body: t('THREE_MIN_WARNING_STBY'),
 vibrate: [100],
 tag: 'pre-wake-3min',
 silent: true,
 } as any);
 });
 }
 playedMilestonesRef.current.add(185);
 }
 
 // 3 分鐘提醒 (180秒) - only if total duration > 3 minutes
 if (timer.duration > 180 && remaining <= 180 && remaining > 0 && !playedMilestonesRef.current.has(180)) {
 triggerAlarm(t('THREE_MIN_LEFT'), t('PREPARE_ROTATION'), 'short');
 playedMilestonesRef.current.add(180);
 }

 // Pre-wake notification ~3 seconds before timer ends (3~1秒)
 // Also warm up audio context by playing at near-zero volume
 if (remaining <= 3 && remaining > 0 && !playedMilestonesRef.current.has(1)) {
 // Audio warm-up: silently play to activate hardware Audio Context
 if (audioUnlocked && alarmAudioHtmlRef.current) {
 const audio = alarmAudioHtmlRef.current;
 audio.currentTime = 0;
 audio.volume = 0.01;
 audio.play().then(() => { audio.pause(); audio.volume = 1.0; }).catch(() => {});
 }
 
 if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'granted') {
 navigator.serviceWorker.ready.then(registration => {
 registration.showNotification(`⏱ ${t('ROTATION_NOW')}`, {
 body: t('TIME_IS_UP_DESC'),
 vibrate: [200, 100, 200],
 tag: 'pre-wake-end',
 silent: true,
 requireInteraction: true,
 } as any);
 });
 }
 playedMilestonesRef.current.add(1);
 }

 // 時間到提醒 (0秒)
 if (remaining === 0 && !playedMilestonesRef.current.has(0)) {
 triggerAlarm(t('TIME_FOR_ROTATION'), t('PLEASE_ROTATE'), 'long', true);
 playedMilestonesRef.current.add(0);
 }
 }, [timer.isRunning, timer.targetEndTime, timer.duration, triggerAlarm]);

 useEffect(() => {
 setNow(new Date());
 const interval = setInterval(() => {
 setNow(new Date());
 checkAlarms();
 }, 1000);
 
 const handleVisibilityChange = () => {
 if (document.visibilityState === 'visible') {
 setNow(new Date());
 checkAlarms();
 }
 };

 document.addEventListener('visibilitychange', handleVisibilityChange);
 return () => {
 clearInterval(interval);
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 };
 }, [checkAlarms]);

 const testAudio = async () => {
 const newStatus = !audioUnlocked;
 if (newStatus) {
 try {
 if (shortBeepHtmlRef.current) {
 shortBeepHtmlRef.current.currentTime = 0;
 shortBeepHtmlRef.current.volume = 1.0;
 await shortBeepHtmlRef.current.play();
 }
 
 // Request Notification Permission
 if ('Notification' in window) {
 const permission = await Notification.requestPermission();
 if (permission === 'granted') {
 console.log("Notification permission granted!");
 }
 }
 
 if (silentLoopRef.current && timer.isRunning) {
 silentLoopRef.current.play().catch(e => console.warn("Silent loop blocked:", e));
 }

 setAudioUnlocked(true);
 localStorage.setItem('camp-audio-unlocked', 'true');
 window.dispatchEvent(new Event('camp-audio-sync'));
 toast({
 title: t('AUDIO_LOCKED_TITLE'),
 description: t('AUDIO_UNLOCKED_DESC'),
 });
 } catch (e) {
 toast({
 title: t('PLAYBACK_FAILED'),
 description: t('ENSURE_RINGER_ON'),
 variant: "destructive"
 });
 }
 } else {
 setAudioUnlocked(false);
 localStorage.setItem('camp-audio-unlocked', 'false');
 window.dispatchEvent(new Event('camp-audio-sync'));
 toast({
 title: t('AUDIO_DISABLED_TITLE'),
 description: t('ALERT_DISABLED_DESC'),
 });
 }
 };

 const toggleTimer = () => {
 timer.setIsRunning(!timer.isRunning);
 };

 const resetTimer = () => {
 timer.reset();
 playedMilestonesRef.current.clear();
 toast({ description: t('SUCCESS') });
 };

 const updateDuration = () => {
 const totalSeconds = (h * 3600) + (m * 60) + s;
 timer.setDuration(totalSeconds);
 playedMilestonesRef.current.clear();
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

 const progress = (timer.timeLeft / (timer.duration || 1)) * 100;
 const isCritical = timer.timeLeft <= 180 && timer.timeLeft > 0;
 const isFinished = timer.timeLeft === 0;

 return (
 <div className="w-full flex flex-col items-center py-6 space-y-10 transition-colors duration-300">
 <div className="w-full max-w-5xl flex flex-col space-y-10">
 
 <div className={cn(
 "w-full p-8 rounded-[2.5rem] border-none flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-stone-200/20 dark:shadow-none transition-all duration-500",
 audioUnlocked ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-white dark:bg-slate-800/50"
 )}>
 <div className="flex items-center gap-6 text-center md:text-left">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg",
 audioUnlocked ? "bg-emerald-500 dark:bg-emerald-600" : "bg-stone-800 dark:bg-slate-700"
 )}>
 {audioUnlocked ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
 </div>
 <div>
 <h4 className="font-headline font-bold text-[#2C2A28] dark:text-white text-base uppercase tracking-tight">
 {audioUnlocked ? t('AUDIO_UNLOCKED') : t('AUDIO_LOCKED')}
 </h4>
 <p className="text-stone-400 dark:text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">
 {audioUnlocked ? "Alerts Active" : "Audio Locked"}
 </p>
 </div>
 </div>
 <Button 
 onClick={testAudio}
 variant={audioUnlocked ? "outline" : "default"}
 className={cn(
 "rounded-2xl px-10 h-12 font-bold text-[11px] uppercase tracking-widest transition-all",
 audioUnlocked 
 ? " dark:text-stone-600 dark:text-slate-400 bg-white dark:bg-slate-800" 
 : "bg-stone-900 dark:bg-amber-400 text-white dark:text-[#2C2A28] hover:opacity-90 shadow-xl"
 )}
 >
 {audioUnlocked ? "Disable Audio" : "Test & Unlock"}
 </Button>
 </div>

 {!isLocked && (
 <Card className="w-full p-6 md:p-10 rounded-[3rem] dark:shadow-stone-200/20 dark:shadow-none bg-white dark:bg-slate-800/50 flex flex-col space-y-8 md:space-y-10 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
 <div className="flex items-center gap-5">
 <div className="p-4 bg-stone-100 dark:bg-white/5 rounded-2xl dark:shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <ShieldCheck className="h-7 w-7 text-stone-600 dark:text-slate-400" />
 </div>
 <div>
 <h3 className="font-headline font-bold text-[#2C2A28] dark:text-white tracking-tight text-base uppercase">{t('COMMAND_CENTER')}</h3>
 <p className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest mt-1">
 {t('PROP_STATUS')}: <span className={cn(timer.isRunning ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>{timer.isRunning ? t('RUNNING') : t('STANDBY')}</span>
 </p>
 </div>
 </div>
 <div className="flex flex-col md:items-end">
 <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest">NOW</span>
 <span className="text-2xl font-headline font-bold text-[#2C2A28] dark:text-white mt-1">
 {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
 </span>
 </div>
 </div>

 <div className="space-y-8">
 <div className="space-y-4">
 <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
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
 className="h-14 rounded-2xl dark:bg-[#FBF9F6] dark:bg-slate-900 font-bold text-center text-lg focus:ring-2 focus:ring-amber-500/20 text-[#2C2A28] dark:text-white w-full" 
 />
 <span className="absolute -top-3 right-3 px-2 bg-white dark:bg-slate-800 text-[9px] font-bold text-stone-400 dark:text-slate-500 dark:rounded-md uppercase shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">{item.label}</span>
 </div>
 ))}
 </div>
 <Button onClick={updateDuration} className="w-full md:w-auto h-14 px-10 rounded-2xl font-bold text-[11px] bg-stone-900 dark:bg-white text-white dark:text-[#2C2A28] uppercase tracking-widest shrink-0 hover:opacity-90 transition-all active:scale-95 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">{t('APPLY')}</Button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
 <Button 
 onClick={toggleTimer} 
 className={cn(
 "h-16 rounded-[1.5rem] font-bold text-xs gap-3 shadow-lg transition-all uppercase tracking-[0.2em]",
 timer.isRunning ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-stone-900 dark:bg-amber-400 text-white dark:text-[#2C2A28] hover:opacity-90"
 )}
 >
 {timer.isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
 {timer.isRunning ? t('STOP_SYNC') : t('START_SYNC')}
 </Button>
 <Button 
 variant="outline" 
 className="h-16 rounded-[1.5rem] font-bold text-xs gap-3 dark:uppercase tracking-[0.2em] text-stone-600 dark:text-slate-400 hover:bg-[#FBF9F6] dark:hover:bg-white/5 transition-all shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" 
 onClick={resetTimer}
 >
 <RotateCcw className="h-6 w-6" /> RESET
 </Button>
 </div>
 </div>
 </Card>
 )}

      {!isLocked && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-6">
          {/* Broadcast Console Card */}
          <Card className="p-6 md:p-8 rounded-[2.5rem] bg-white dark:bg-slate-800/50 flex flex-col space-y-6 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100/50 dark:bg-orange-500/10 text-orange-500 rounded-2xl shrink-0">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-[#2C2A28] dark:text-white text-base">值星公告廣播中樞</h3>
                <p className="text-[10px] text-stone-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Live Broadcast Console</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest px-1">自訂公告內容</label>
              <div className="flex gap-2">
                <Input
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  placeholder="輸入即時公告文字...（例如：全體到操場集合！）"
                  className="rounded-xl bg-stone-50 dark:bg-slate-900 border-none h-11 text-xs font-bold font-sans flex-1"
                />
                {currentBroadcastText && (
                  <Button 
                    variant="outline"
                    onClick={() => { handlePublishBroadcast(""); setBroadcastInput(""); }}
                    className="h-11 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-none font-bold text-xs px-4"
                  >
                    清除
                  </Button>
                )}
                <Button 
                  onClick={() => handlePublishBroadcast(broadcastInput)}
                  className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white dark:bg-amber-400 dark:text-slate-950 font-bold text-xs px-6"
                >
                  發布
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest px-1">常用快捷廣播</label>
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
                    className="px-3 py-2 text-left rounded-xl text-[10px] font-bold border border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/50 dark:hover:bg-slate-800 transition-colors text-stone-600 dark:text-slate-300 leading-relaxed truncate"
                    title={tpl.text}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {currentBroadcastText && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 rounded-xl flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                <span className="flex-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                  當前發布：{currentBroadcastText}
                </span>
              </div>
            )}
          </Card>

          {/* Active Round Stepper Card */}
          <Card className="p-6 md:p-8 rounded-[2.5rem] bg-white dark:bg-slate-800/50 flex flex-col space-y-6 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-[#2C2A28] dark:text-white text-base">關卡輪次控制器</h3>
                <p className="text-[10px] text-stone-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Round Sync Controller</p>
              </div>
            </div>

            {activeTable ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest px-1">行政輪替表名稱</div>
                  <div className="text-sm font-black text-[#2C2A28] dark:text-white px-1">
                    {activeTable.title || `${selectedDay} 輪替表`} ({activeTable.rounds.length} 個輪次)
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-50 dark:bg-slate-900 rounded-2xl p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentRoundIndex <= 0}
                    onClick={() => handleUpdateRound(currentRoundIndex - 1)}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:shadow-sm"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block">當前進度</span>
                    <span className="text-2xl font-black text-orange-500 dark:text-amber-400 block mt-0.5">
                      第 {currentRoundIndex + 1} 輪 / Round {currentRoundIndex + 1}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentRoundIndex >= activeTable.rounds.length - 1}
                    onClick={() => handleUpdateRound(currentRoundIndex + 1)}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:shadow-sm"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {activeTable.rounds[currentRoundIndex] && (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl">
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5">當前小隊分佈</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {activeTable.teamOrders.map((team) => {
                        const stationId = team.stations[currentRoundIndex];
                        const station = activeTable.stations.find(st => st.id === stationId);
                        return (
                          <div key={team.id} className="text-[11px] font-bold text-stone-600 dark:text-slate-300 flex items-center justify-between py-0.5 border-b border-stone-100/50 dark:border-slate-800/50">
                            <span className="truncate">{team.name}</span>
                            <span className="text-orange-500 dark:text-amber-400 font-extrabold truncate ml-2">→ {station?.name || "休息"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-stone-400 dark:text-slate-500">
                <Compass className="h-8 w-8 opacity-40 mb-2" />
                <p className="text-xs font-bold">請先於「行政輪替表」分頁新增當日輪替表格以啟用輪次控制。</p>
              </div>
            )}
          </Card>
        </div>
      )}

 <Card className="w-full rounded-[2.5rem] md:rounded-[4rem] shadow-2xl bg-stone-950 text-white flex flex-col items-center justify-between p-6 md:p-12 lg:p-16 min-h-[450px] relative overflow-hidden transition-all duration-700">
 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900 to-stone-950 opacity-100 pointer-events-none" />
 <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
 <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
 <div className="p-3 bg-white/5 rounded-xl backdrop-blur-md shrink-0 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <BellRing className="h-6 w-6 text-amber-500" />
 </div>
 <div className="flex flex-col min-w-0">
 <h3 className="font-headline font-bold text-white tracking-[0.2em] md:tracking-[0.3em] text-[10px] uppercase truncate">{t('TIMER_SYNC_STATUS')}</h3>
 <div className="flex items-center gap-2 mt-1">
 <span className={cn("text-[8px] font-bold uppercase tracking-widest", timer.isRunning ? "text-emerald-500" : "text-amber-500/80")}>Status: {timer.isRunning ? t('RUNNING') : t('STANDBY')}</span>
 {!isOnline && (
 <span className="flex items-center gap-1 text-[8px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">
 <WifiOff className="h-3 w-3" /> OFFLINE
 </span>
 )}
 </div>
 </div>
 </div>
 
 <Button 
 onClick={() => toggleSaverMode(true)}
 variant="outline"
 className="w-full sm:w-auto bg-white/5  text-white hover:bg-white/10 hover:text-white rounded-xl h-12 px-6 font-bold text-[10px] uppercase tracking-widest transition-all shrink-0 shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
 >
 <Moon className="h-4 w-4 mr-2" />
 {t('SAVER_MODE')}
 </Button>
 </div>
 <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
 <div className={cn(
 "text-[12px] font-bold uppercase tracking-[0.4em] mb-6 transition-all duration-1000",
 isCritical ? "text-rose-500 animate-pulse" : "text-stone-600"
 )}>
 {isCritical ? t('REMAINING_TIME') : isFinished ? t('TIME_UP') : t('REMAINING_TIME')}
 </div>
 <div className={cn(
 "font-headline font-black transition-all duration-1000 text-center text-[clamp(4rem,20vw,14rem)] leading-none tracking-tighter",
 isCritical ? "text-rose-500 animate-pulse" : isFinished ? "text-rose-600" : "text-white"
 )}>
 {formatTime(timer.timeLeft)}
 </div>
 <div className="text-[14px] md:text-[18px] font-black text-slate-400 mt-4 tracking-[0.2em]">
 {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
 </div>
 <div className="w-full max-w-2xl h-6 bg-white/5 rounded-full overflow-hidden mt-8 p-1 relative shadow-inner shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className={cn(
 "h-full transition-all duration-1000 rounded-full shadow-lg",
 isCritical ? "bg-gradient-to-r from-rose-600 to-rose-400" : isFinished ? "bg-rose-800" : "bg-gradient-to-r from-primary to-accent"
 )} style={{ width: `${progress}%` }} />
 </div>
 </div>
 </Card>
 </div>

 {isSaverMode && createPortal(
 <div 
 className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer select-none"
 style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
 onDoubleClick={() => toggleSaverMode(false)}
 onTouchEnd={handleSaverTouchEnd}
 >
 <div className={cn(
 "text-[10px] sm:text-[14px] font-bold uppercase tracking-[0.4em] mb-4 sm:mb-8 transition-all duration-1000",
 isCritical ? "text-rose-900 animate-pulse" : "text-stone-800"
 )}>
 {isCritical ? t('REMAINING_TIME') : isFinished ? t('TIME_UP') : t('SAVER_MODE')}
 </div>
 
 <div className={cn(
 "font-headline font-bold transition-all duration-1000 text-center text-[clamp(5rem,25vw,20rem)] leading-none tracking-tighter",
 isCritical ? "text-rose-700 animate-pulse" : isFinished ? "text-rose-600" : "text-stone-700"
 )}>
 {formatTime(timer.timeLeft)}
 </div>
 <div className={cn(
 "mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]",
 audioUnlocked ? "text-emerald-600" : "text-amber-600"
 )}>
 音效狀態: {audioUnlocked ? "已解鎖" : "未解鎖"}
 </div>
 <div className="text-[14px] sm:text-[24px] font-bold text-stone-600 mt-4 sm:mt-8 tracking-[0.2em]">
 {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
 </div>
 
 <div className="absolute bottom-12 text-stone-800 text-[10px] font-bold tracking-widest uppercase">
 {t('DOUBLE_TAP_WAKE')}
 </div>
 </div>,
 document.body
 )}

 {/* 隱藏的音檔 DOM 元素，這是 iOS/Safari 唯一最穩定的播放方式 */}
 <audio ref={alarmAudioHtmlRef} src={ALARM_URL} preload="auto" />
 <audio ref={shortBeepHtmlRef} src={SHORT_BEEP_URL} preload="auto" />
 </div>
 );
}
