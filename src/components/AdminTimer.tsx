
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
  WifiOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useServerTime } from "@/hooks/use-server-time";

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
}

export function AdminTimer({ timer, isLocked }: AdminTimerProps) {
  const [now, setNow] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Initialize NTP-like server time sync
  useServerTime();
  
  const wakeLockRef = useRef<any>(null);
  const playedMilestonesRef = useRef<Set<number>>(new Set());
  const silentLoopRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());
  
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('camp-audio-unlocked') === 'true';
    }
    return false;
  });

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
      if (audioMode === 'long' && alarmAudioHtmlRef.current) {
        const audio = alarmAudioHtmlRef.current;
        audio.currentTime = 0;
        audio.volume = 1.0;
        audio.play().catch(e => console.warn("Background audio blocked:", e));
      } else if (audioMode === 'short' && shortBeepHtmlRef.current) {
        // 短音連播 2 次（雙音）× 3 輪
        const audio = shortBeepHtmlRef.current;
        const schedule = [
          0,     // 第 1 輪第 1 聲
          300,   // 第 1 輪第 2 聲
          1000,  // 第 2 輪第 1 聲
          1300,  // 第 2 輪第 2 聲
          2000,  // 第 3 輪第 1 聲
          2300,  // 第 3 輪第 2 聲
        ];
        schedule.forEach(delay => {
          setTimeout(() => {
            audio.currentTime = 0;
            audio.volume = 1.0;
            audio.play().catch(e => console.warn("Beep blocked:", e));
          }, delay);
        });
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
          registration.showNotification("⏱ 即將提醒 / Alert Incoming", {
            body: "3 分鐘提醒即將響起 / 3-min warning coming up",
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
      triggerAlarm("剩餘 3 分鐘！ / 3 Minutes Left!", "請各關卡準備換關 / Prepare for rotation.", 'short');
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
          registration.showNotification("⏱ 換關倒數 / Rotation Now!", {
            body: "時間即將到！ / Time is up!",
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
      triggerAlarm("換關時間到！ / Time for Rotation!", "請各小隊進行換關 / Please rotate stations.", 'long', true);
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
          toast({
            title: "音效與通知解鎖 / Audio & Notifications Unlocked",
            description: "倒數結束與最後 3 分鐘系統將發出提醒（包含背景通知）/ Alerts enabled.",
          });
        } catch (e) {
          toast({
            title: "無法播放 / Playback Failed",
            description: "請確保點擊時未處於靜音模式 / Ensure ringer is on.",
            variant: "destructive"
          });
        }
    } else {
      setAudioUnlocked(false);
      localStorage.setItem('camp-audio-unlocked', 'false');
      toast({
        title: "音效已關閉 / Audio Disabled",
        description: "提醒功能已停用 / Alert disabled.",
      });
    }
  };

  const toggleTimer = () => {
    timer.setIsRunning(!timer.isRunning);
  };

  const resetTimer = () => {
    timer.reset();
    playedMilestonesRef.current.clear();
    toast({ description: "計時器已重設 / Timer Reset" });
  };

  const updateDuration = () => {
    const totalSeconds = (h * 3600) + (m * 60) + s;
    timer.setDuration(totalSeconds);
    playedMilestonesRef.current.clear();
    toast({ description: "時長已套用 / Duration Applied" });
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
    <div className="w-full flex flex-col items-center p-6 md:p-12 space-y-10 bg-background overflow-y-auto min-h-full scrollbar-hide transition-colors duration-300">
      <div className="w-full max-w-5xl flex flex-col space-y-10">
        
        <div className={cn(
          "w-full p-8 glass-card rounded-[2.5rem] border-none flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/5 transition-all duration-500",
          audioUnlocked ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-primary/5"
        )}>
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl",
              audioUnlocked ? "bg-emerald-600" : "bg-primary"
            )}>
              {audioUnlocked ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
            </div>
            <div>
              <h4 className="font-headline font-bold text-foreground text-base uppercase tracking-tight">
                {audioUnlocked ? "音效解鎖：開啟 / Audio: Enabled" : "音效解鎖：鎖定 / Audio: Locked"}
              </h4>
              <p className="text-muted-foreground text-[10px] font-bold mt-1 uppercase tracking-widest">
                {audioUnlocked ? "系統將在時間到及剩餘 3 分鐘時發出提醒 / Alerts are active." : "請測試並授權音效以發出提醒 / Test to authorize audio."}
              </p>
            </div>
          </div>
          <Button 
            onClick={testAudio}
            variant={audioUnlocked ? "outline" : "default"}
            className={cn(
              "rounded-2xl px-10 h-12 font-black text-[11px] uppercase tracking-widest transition-all",
              audioUnlocked 
                ? "border-emerald-400 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-card" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 dark:shadow-primary/10 btn-shimmer"
            )}
          >
            {audioUnlocked ? "關閉音效 / Disable Audio" : "測試並解鎖 / Test & Unlock"}
          </Button>
        </div>

        {!isLocked && (
          <Card className="w-full p-6 md:p-10 rounded-[3rem] border-none shadow-2xl glass-card flex flex-col space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-foreground tracking-tight text-base uppercase">控制台 / Control</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    狀態 / Status: <span className={cn(timer.isRunning ? "text-primary" : "text-amber-500")}>{timer.isRunning ? "運行中 / Running" : "暫停 / Paused"}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">現在時間 / Current Time</span>
                <span className="text-2xl font-headline font-bold text-foreground mt-1">
                  {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                  設定時長 / Set Duration (H:M:S)
                </label>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-full md:flex-1 grid grid-cols-3 gap-3 md:gap-4">
                    {[ 
                      {val: h, set: setH, label: '時 / H'}, 
                      {val: m, set: setM, label: '分 / M'}, 
                      {val: s, set: setS, label: '秒 / S'} 
                    ].map((item, i) => (
                      <div key={i} className="relative group">
                        <Input 
                          type="number" 
                          value={item.val || ''} 
                          onChange={(e) => item.set(Math.min(99, parseInt(e.target.value) || 0))} 
                          className="h-14 rounded-2xl border-none bg-secondary font-bold text-center text-lg focus:ring-2 focus:ring-primary/20 text-foreground w-full shadow-inner" 
                        />
                        <span className="absolute -top-3 right-3 px-2 bg-card text-[9px] font-bold text-primary border border-primary/10 rounded-md uppercase shadow-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={updateDuration} className="w-full md:w-auto h-14 px-10 rounded-2xl font-bold text-[11px] bg-foreground text-background uppercase tracking-widest shrink-0 hover:opacity-90 transition-all active:scale-95 shadow-lg btn-press cursor-pointer">套用 / Apply</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Button 
                  onClick={toggleTimer} 
                  className={cn(
                    "h-16 rounded-[1.5rem] font-black text-xs gap-3 shadow-xl shadow-primary/20 transition-all uppercase tracking-[0.2em]",
                    timer.isRunning ? "bg-rose-500 hover:bg-rose-600" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {timer.isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  {timer.isRunning ? "停止同步 / Stop Sync" : "啟動同步 / Start Sync"}
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 rounded-[1.5rem] font-bold text-xs gap-3 border-2 border-border uppercase tracking-[0.2em] text-foreground hover:bg-primary/5 hover:border-primary/10 transition-all shadow-sm cursor-pointer btn-press" 
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-6 w-6" /> 重設 / Reset
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="w-full rounded-[2.5rem] md:rounded-[4rem] border-none shadow-2xl bg-slate-950 text-white flex flex-col items-center justify-between p-6 md:p-12 lg:p-16 min-h-[450px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full dot-grid opacity-5 pointer-events-none" />
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
                <BellRing className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-headline font-black text-white tracking-[0.2em] md:tracking-[0.3em] text-[10px] uppercase truncate">同步顯示/Broadcast</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-widest">Status: {timer.isRunning ? "RUNNING" : "STANDBY"}</span>
                  {!isOnline && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-amber-400 uppercase tracking-widest animate-pulse">
                      <WifiOff className="h-3 w-3" /> 離線中 / Offline
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => toggleSaverMode(true)}
              variant="outline"
              className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest transition-all shrink-0"
            >
              <Moon className="h-4 w-4 mr-2" />
              黑屏省電模式 / Saver
            </Button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
            <div className={cn(
              "text-[12px] font-black uppercase tracking-[0.4em] mb-6 transition-all duration-1000",
              isCritical ? "text-rose-400 animate-pulse" : "text-slate-500"
            )}>
              {isCritical ? "注意剩餘時間 / Warning" : isFinished ? "時間到 / Time's Up" : "剩餘時間 / Remaining"}
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
            <div className="w-full max-w-2xl h-6 bg-white/5 rounded-full overflow-hidden mt-8 border border-white/10 p-1 relative shadow-inner">
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
        >
          <div className={cn(
            "text-[10px] sm:text-[14px] font-black uppercase tracking-[0.4em] mb-4 sm:mb-8 transition-all duration-1000",
            isCritical ? "text-rose-900 animate-pulse" : "text-[#222]"
          )}>
            {isCritical ? "注意剩餘時間 / Warning" : isFinished ? "時間到 / Time's Up" : "黑屏省電模式 / Saver Mode"}
          </div>
          
          <div className={cn(
            "font-headline font-black transition-all duration-1000 text-center text-[clamp(5rem,25vw,20rem)] leading-none tracking-tighter",
            isCritical ? "text-rose-700 animate-pulse" : isFinished ? "text-rose-600" : "text-[#333]"
          )}>
            {formatTime(timer.timeLeft)}
          </div>
          <div className="text-[14px] sm:text-[24px] font-black text-[#666] mt-4 sm:mt-8 tracking-[0.2em]">
            {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
          </div>
          
          <div className="absolute bottom-12 text-[#222] text-[10px] font-black tracking-widest uppercase">
            點擊兩下離開 / Double Tap to Wake
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
