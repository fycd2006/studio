
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
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
  BellRing
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  
  const wakeLockRef = useRef<any>(null);
  const playedMilestonesRef = useRef<Set<number>>(new Set());
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentLoopRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());
  
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('camp-audio-unlocked') === 'true';
    }
    return false;
  });

  const [h, setH] = useState(Math.floor(timer.duration / 3600));
  const [m, setM] = useState(Math.floor((timer.duration % 3600) / 60));
  const [s, setS] = useState(timer.duration % 60);

  const ALARM_URL = "https://raw.githubusercontent.com/freeCodeCamp/cdn/master/build/testable-projects-fcc/audio/BeepSound.wav"; 
  // 1-second silent audio base64 to keep JS alive in background (iOS/Android workaround)
  const SILENT_AUDIO_BASE64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  useEffect(() => {
    alarmAudioRef.current = new Audio(ALARM_URL);
    alarmAudioRef.current.load();
    
    silentLoopRef.current = new Audio(SILENT_AUDIO_BASE64);
    silentLoopRef.current.loop = true;
    silentLoopRef.current.volume = 0.01; // nearly silent just in case
    
    return () => {
      alarmAudioRef.current = null;
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

  useEffect(() => {
    if (timer.isRunning) {
      requestWakeLock();
      
      // Start silent audio loop to keep background JS execution alive
      if (audioUnlocked && silentLoopRef.current) {
        silentLoopRef.current.play().catch(e => console.warn("Silent loop blocked:", e));
      }
    } else {
      releaseWakeLock();
      playedMilestonesRef.current.clear();
      
      // Pause silent audio loop
      if (silentLoopRef.current) {
        silentLoopRef.current.pause();
      }
    }
    return () => {
      releaseWakeLock();
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

  const triggerAlarm = useCallback((title: string, description: string, isDestructive = false) => {
    toast({ 
      title, 
      description, 
      variant: isDestructive ? "destructive" : "default" 
    });
    
    if (audioUnlocked) {
      if (alarmAudioRef.current) {
        const audio = alarmAudioRef.current;
        audio.currentTime = 0;
        audio.volume = 1.0;
        audio.play().catch(e => console.warn("Background audio blocked:", e));
      }
      
      // Attempt to trigger system notification (works in background/lock screen if authorized)
      if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: description,
            vibrate: isDestructive ? [500, 200, 500, 200, 500] : [200, 100, 200],
            requireInteraction: true // Keeps notification on screen until user interacts
          } as any);
        });
      }
    }
  }, [audioUnlocked, toast]);

  const checkAlarms = useCallback(() => {
    if (!timer.isRunning || !timer.targetEndTime) return;

    const currentTime = Date.now();
    const remaining = Math.max(0, Math.floor((timer.targetEndTime - currentTime) / 1000));
    
    // 3 分鐘提醒 (180秒)
    if (remaining <= 180 && remaining > 0 && !playedMilestonesRef.current.has(180)) {
      triggerAlarm("剩餘 3 分鐘！ / 3 Minutes Left!", "請各關卡準備換關 / Prepare for rotation.");
      playedMilestonesRef.current.add(180);
    }

    // 時間到提醒 (0秒)
    if (remaining === 0 && !playedMilestonesRef.current.has(0)) {
      triggerAlarm("換關時間到！ / Time for Rotation!", "請各小隊進行換關 / Please rotate stations.", true);
      playedMilestonesRef.current.add(0);
    }
  }, [timer.isRunning, timer.targetEndTime, triggerAlarm]);

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
      if (alarmAudioRef.current) {
        try {
          alarmAudioRef.current.currentTime = 0;
          await alarmAudioRef.current.play();
          
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
    <div className="w-full flex flex-col items-center p-6 md:p-12 space-y-10 bg-[#FFFBF7] overflow-y-auto min-h-full scrollbar-hide">
      <div className="w-full max-w-5xl flex flex-col space-y-10">
        
        <div className={cn(
          "w-full p-8 border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl transition-all duration-500",
          audioUnlocked ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
        )}>
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg",
              audioUnlocked ? "bg-emerald-600" : "bg-orange-600"
            )}>
              {audioUnlocked ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
            </div>
            <div>
              <h4 className="font-headline font-black text-slate-950 text-base uppercase tracking-tight">
                {audioUnlocked ? "音效解鎖：開啟 / Audio: Enabled" : "音效解鎖：鎖定 / Audio: Locked"}
              </h4>
              <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">
                {audioUnlocked ? "系統將在時間到及剩餘 3 分鐘時發出提醒 / Alerts are active." : "請測試並授權音效以發出提醒 / Test to authorize audio."}
              </p>
            </div>
          </div>
          <Button 
            onClick={testAudio}
            variant={audioUnlocked ? "outline" : "default"}
            className={cn(
              "rounded-xl px-10 h-12 font-black text-[10px] uppercase tracking-widest transition-all",
              audioUnlocked 
                ? "border-emerald-400 text-emerald-700" 
                : "bg-orange-600 text-white"
            )}
          >
            {audioUnlocked ? "關閉音效 / Disable Audio" : "測試並解鎖 / Test & Unlock"}
          </Button>
        </div>

        {!isLocked && (
          <Card className="w-full p-10 rounded-[2.5rem] border border-slate-200 shadow-xl bg-white flex flex-col space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <ShieldCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-headline font-black text-slate-950 tracking-tight text-sm uppercase">控制台 / Control</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    狀態 / Status: {timer.isRunning ? "運行中 / Running" : "暫停 / Paused"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在時間 / Current Time</span>
                <span className="text-xl font-headline font-black text-slate-950 mt-1">
                  {now ? now.toLocaleTimeString('zh-TW', { hour12: false }) : "--:--:--"}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] px-1">
                  設定時長 / Set Duration (H:M:S)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-3 gap-4">
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
                          className="h-12 rounded-xl border border-slate-200 bg-slate-50 font-black text-center text-base focus:ring-0 text-slate-950" 
                        />
                        <span className="absolute -top-2.5 right-3 px-2 bg-white text-[8px] font-black text-orange-600 border border-slate-200 rounded-md uppercase">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={updateDuration} className="h-12 px-8 rounded-xl font-black text-[10px] bg-slate-950 text-white uppercase tracking-widest">套用 / Apply</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Button 
                  onClick={toggleTimer} 
                  className={cn(
                    "h-14 rounded-2xl font-black text-[11px] gap-3 shadow-xl transition-all uppercase tracking-widest",
                    timer.isRunning ? "bg-rose-500 hover:bg-rose-600" : "bg-orange-600 hover:bg-orange-700"
                  )}
                >
                  {timer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {timer.isRunning ? "停止同步 / Stop Sync" : "啟動同步 / Start Sync"}
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 rounded-2xl font-black text-[11px] gap-3 border border-slate-200 uppercase tracking-widest text-slate-950 hover:bg-orange-50 shadow-sm" 
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-5 w-5" /> 重設 / Reset
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="w-full rounded-[4rem] border-none shadow-2xl bg-slate-950 text-white flex flex-col items-center justify-between p-12 md:p-16 min-h-[450px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full dot-grid opacity-5 pointer-events-none" />
          <div className="w-full flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <BellRing className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline font-black text-white tracking-[0.3em] text-[10px] uppercase">同步顯示 / Broadcast Mode</h3>
                <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-widest mt-1">Status: {timer.isRunning ? "RUNNING" : "STANDBY"}</span>
              </div>
            </div>
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
            <div className="w-full max-w-2xl h-4 bg-white/5 rounded-full overflow-hidden mt-12 border border-white/10 p-0.5">
              <div className={cn(
                "h-full transition-all duration-1000 rounded-full",
                isCritical ? "bg-gradient-to-r from-rose-600 to-rose-400" : isFinished ? "bg-rose-800" : "bg-gradient-to-r from-orange-600 to-orange-400"
              )} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
