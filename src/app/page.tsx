"use client"

import { usePlans } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ShieldCheck, Tent, Clock, MapPin, ChevronRight, Settings, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { HeroCarousel } from "@/components/HeroCarousel";
import { RotatingText } from "@/components/RotatingText";

/* ── helpers ────────────────────────────────────── */
function isPast(dateStr?: string) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getTime() <= Date.now();
  } catch {
    return false;
  }
}

export default function Home() {
  const router = useRouter();
  const { camps, activeCampId, plans } = usePlans();
  const activeCamp = camps?.find((c) => c.id === activeCampId);

  const heroQuotes = useMemo(() => [
    "崇德人，崇德魂!",
    "用生命影響生命，點燃每個孩子心中的無限可能。",
    "歡迎回來！你今天的每一份用心，都在為孩子們的夢想打底。",
    "熱情不是名詞，是我們現在進行式的行動……",
    "正在載入孩子們的笑容與期待……",
    "一點一滴的付出，正是在凝聚改變的力量。",
    "探索未知，從心出發。",
    "保持善良，保持好奇。",
    "我們不只傳遞知識，更要在孩子心中種下一顆善良與探索的種子。",
    "一個人可以走得快，但一群志同道合的夥伴，能帶著孩子們走得更深、更遠。",
    "每一次的籌備與修正，都是為了讓世界更接近我們理想的模樣。",
    "用無私的奉獻帶領團隊，用不斷的自我超越成就每一次營隊。",
    "科技看見未來，品格決定高度；在這裡，我們陪伴孩子遇見更好的自己。",
    "不要問世界需要什麼，問問自己做什麼能讓你充滿生機地活著。因為世界需要的，正是充滿生機的人。",
    "人生的意義在於發掘你的天賦；人生的目的在於將它分享出去。",
    "一個人可以走得很快，但一群人可以走得很遠。"
  ], []);

  const planQuotes = useMemo(() => [
    "你的用心，孩子會懂",
    "台上的閃亮，來自這裡每一個教案的用心。",
    "我們寫下的不只是活動流程，更是孩子們未來回憶裡的啟發與感動。",
    "每一次的推演與優化，都是為了接住每一雙充滿好奇的眼睛。",
    "教育沒有捷徑，但你們在這裡投入的每一分鐘，都在縮短孩子與夢想的距離。",
    "從科學實作到品格養成，我們正在為孩子裝備迎向未來的超能力。"
  ], []);

  const timeline = useMemo(() => [
    { label: "一籌", date: activeCamp?.meeting1StartDate, icon: Clock },
    { label: "二籌", date: activeCamp?.meeting2StartDate, icon: Clock },
    { label: "三籌", date: activeCamp?.meeting3StartDate, icon: Clock },
    { label: "集訓", date: activeCamp?.trainingStartDate, icon: Clock },
    { label: "駐站", date: activeCamp?.siteStartDate, icon: MapPin },
    { label: "營期", date: activeCamp?.campStartDate, icon: Tent },
  ], [activeCamp]);

  const currentIdx = useMemo(() => {
    let lastValidIdx = -1;
    for (let i = 0; i < timeline.length; i++) {
        if (isPast(timeline[i].date)) {
            lastValidIdx = i;
        } else {
            break;
        }
    }
    return lastValidIdx;
  }, [timeline]);

  const recentPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 4);
  }, [plans]);

  return (
    <div className="relative w-screen max-w-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-[#f48c25]/30 selection:text-[#f48c25] min-h-screen font-sans flex flex-col transition-colors duration-500 overflow-x-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html,
            body {
              -ms-overflow-style: none;
              scrollbar-width: none;
              overflow-y: auto;
            }
            html::-webkit-scrollbar,
            body::-webkit-scrollbar {
              display: none;
            }
          `,
        }}
      />
      {/* Liquid Glass Ambient Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#f48c25]/5 dark:bg-[#f48c25]/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/5 dark:bg-blue-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '15s' }}></div>
      </div>
      <main className="flex-1 w-full relative z-10">
        
        {/* Full-width Hero Banner with Carousel Background */}
        <section className="relative w-full h-[100svh] sm:h-[90svh] md:h-[800px] flex items-center overflow-hidden bg-white dark:bg-slate-950">
          
          {/* Background Layer: HeroCarousel */}
          <div className="absolute inset-0 z-0">
            <HeroCarousel />
            {/* Soft gradient mask for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent w-full sm:w-[90%] md:w-[80%] z-10 transition-colors duration-500"></div>
            {/* Subtle dimming layer for optimal contrast without crushing the photo */}
            <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/20 z-10 transition-colors duration-500"></div>
            {/* Bottom mask to blend smoothly into the Bento grid background */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/50 dark:from-slate-950 dark:via-slate-950/40 to-transparent z-10 transition-colors duration-500 h-[30%] top-auto"></div>
          </div>
          
          {/* EST. 2006 Badge - Elegant semi-transparent typography */}
          <div className="absolute bottom-8 right-3 sm:bottom-12 sm:right-6 md:bottom-16 md:right-16 z-20 pointer-events-none text-right hidden sm:block">
             <span className="text-2xl sm:text-4xl md:text-6xl font-black text-slate-900/10 dark:text-white/20 tracking-tighter drop-shadow-sm leading-[0.8]">EST.<br/>2006</span>
          </div>

          {/* Content Layer */}
          <div className="relative z-20 w-full px-4 sm:px-6 md:px-12 xl:px-24 max-w-[1920px] mx-auto mt-12 sm:mt-16 md:mt-0">
            <div className="max-w-4xl">
              <div className="mb-4 sm:mb-6 md:mb-8">
                <span className="text-[#f48c25] text-[11px] sm:text-xs md:text-sm font-black tracking-[0.2em] uppercase drop-shadow-md">
                  {activeCamp ? `正在為 ${activeCamp.name} 創造內容` : '熱情、活力的核心'}
                </span>
              </div>
              <h1 className="text-[clamp(2.5rem,8vw,12rem)] sm:text-[clamp(3.5rem,9vw,12rem)] font-black leading-[0.85] tracking-tight mb-4 sm:mb-6 md:mb-8 text-slate-900 dark:text-white drop-shadow-xl">
                NTUT<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f48c25] to-orange-400 block -mt-1 sm:-mt-2 md:-mt-4 relative z-10 pb-2">CHONG DE</span>
              </h1>
              <div className="max-w-2xl text-sm sm:text-base md:text-lg lg:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed md:leading-loose mb-6 sm:mb-8 md:mb-10 lg:mb-12 font-semibold italic tracking-wide py-2 drop-shadow-md min-h-[4em] sm:min-h-[5em] flex items-center overflow-hidden">
                <RotatingText items={heroQuotes} intervalMs={6000} className="w-full" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  onClick={() => router.push("/admin")}
                  className="relative overflow-hidden bg-[#f48c25]/70 dark:bg-[#f48c25]/60 backdrop-blur-xl text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl md:rounded-[2rem] text-base sm:text-lg md:text-xl font-bold uppercase tracking-widest shadow-[0_8px_32px_rgba(244,140,37,0.3)] hover:shadow-[0_8px_40px_rgba(244,140,37,0.6)] hover:-translate-y-1.5 hover:bg-[#f48c25]/90 dark:hover:bg-[#f48c25]/80 transition-all duration-300 w-full sm:w-auto text-center"
                >
                  行政中心
                </button>
                <button 
                  onClick={() => router.push("/plans")}
                  className="relative overflow-hidden bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl text-slate-800 dark:text-slate-200 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl md:rounded-[2rem] text-base sm:text-lg md:text-xl font-bold uppercase tracking-widest shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:bg-white/40 dark:hover:bg-slate-800/60 hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 w-full sm:w-auto text-center"
                >
                  教案總覽
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Bento & Timelines - Soft Glassmorphism Grid */}
        <section className="px-3 sm:px-4 md:px-6 lg:px-12 xl:px-24 py-8 sm:py-12 md:py-24 relative z-20 -mt-6 sm:-mt-10 md:-mt-20">
          <div className="max-w-[1920px] mx-auto grid grid-cols-1 gap-6 md:gap-10">
            
            {/* Horizontal Timeline (Milestones) */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/80 dark:border-slate-700/40 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 md:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-black/40 transition-all duration-500 relative overflow-hidden group hover:border-white dark:hover:border-slate-600/60">
               {/* Shine effect */}
               <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
               <h3 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-black tracking-tight mb-6 sm:mb-8 md:mb-16 text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  營隊里程碑 <span className="text-slate-400 dark:text-slate-500 text-sm sm:text-lg md:text-xl font-medium tracking-wide">MILESTONES</span>
               </h3>
               
               {/* Mobile Scrollable Container */}
               <div className="w-full overflow-x-auto overflow-y-hidden pb-4 sm:pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
                 <div className="relative min-w-[500px] sm:min-w-[700px] h-[100px] sm:h-[120px] mt-2 sm:mt-4">
                    {/* Base Track */}
                    <div className="absolute top-5 sm:top-6 left-6 sm:left-10 right-6 sm:right-10 h-1 sm:h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />
                    {/* Progress Track */}
                    <div className="absolute top-5 sm:top-6 left-6 sm:left-10 h-1 sm:h-1.5 bg-[#f48c25] rounded-full transition-all duration-1000 z-0 origin-left" style={{ width: currentIdx >= 0 ? `min(100%, ${(currentIdx / (timeline.length - 1)) * 100}%)` : '0%' }} />
                    
                    <div className="relative flex justify-between z-10 px-3 sm:px-4">
                      {timeline.map((node, i) => {
                        const isActive = i === currentIdx;
                        const isDone = i <= currentIdx;
                        const Icon = node.icon;
                        return (
                          <div key={node.label} className="flex flex-col items-center group w-16 sm:w-20">
                            <div className={cn(
                              "w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-3 sm:border-4 transition-all duration-500 bg-white dark:bg-slate-900 shadow-md",
                              isActive ? "border-[#f48c25] text-[#f48c25] scale-110 shadow-[0_0_20px_rgba(244,140,37,0.3)]"
                                : isDone ? "border-[#f48c25] text-[#f48c25]"
                                : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                            )}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="mt-2 sm:mt-4 md:mt-6 text-center w-20 sm:w-24">
                              <span className={cn(
                                "block text-xs sm:text-sm md:text-base font-bold tracking-wide",
                                isActive ? "text-[#f48c25]" : isDone ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-600"
                              )}>
                                {node.label}
                              </span>
                              <span className="block text-[9px] sm:text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 uppercase">
                                {node.date ? format(new Date(node.date), 'MM/dd') : 'TBD'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                 </div>
               </div>
            </div>

            {/* Recent Plans & Activity (Replacing The Core) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
               <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/80 dark:border-slate-700/40 rounded-[2.5rem] p-6 md:p-12 flex flex-col justify-between min-h-[400px] shadow-2xl shadow-slate-200/50 dark:shadow-black/40 transition-all duration-500 hover:border-white dark:hover:border-slate-600/60 relative overflow-hidden group">
                 
                 {/* Premium glowing orb inside the card */}
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-gradient-to-br from-[#f48c25]/20 to-orange-600/5 dark:from-[#f48c25]/10 dark:to-orange-600/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 group-hover:bg-[#f48c25]/30 transition-all duration-1000"></div>
                 {/* Shine effect */}
                 <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                 <div className="relative z-10">
                   <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-8 text-slate-900 dark:text-white flex items-center gap-3">
                     即時動態 <span className="text-slate-400 dark:text-slate-500 text-lg md:text-xl font-semibold tracking-widest">DYNAMIC UPDATES</span>
                   </h3>
                   <ul className="space-y-4">
                     {recentPlans.map((plan, idx) => (
                       <li key={plan.id} className="group cursor-pointer bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 rounded-2xl p-4 md:p-5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300" onClick={() => router.push(`/plans/${plan.id}`)}>
                         <div className="text-[10px] md:text-xs text-[#f48c25] font-semibold tracking-wider mb-2 flex items-center justify-between uppercase">
                           <span>{idx === 0 ? "JUST UPDATED" : "RECENT"}</span>
                           <span className="text-slate-400 dark:text-slate-500">{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : ""}</span>
                         </div>
                         <div className="text-slate-800 dark:text-slate-200 font-bold text-lg md:text-xl group-hover:text-[#f48c25] dark:group-hover:text-[#f48c25] transition-colors line-clamp-1 flex items-center gap-2">
                           {plan.category ? (
                              <span className="bg-slate-200/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs px-2 py-1 rounded-md shrink-0 border border-slate-300/50 dark:border-slate-700/50">
                                {plan.category}
                              </span>
                           ) : null}
                           <span className="truncate">{plan.activityName || "未命名教案"}</span>
                         </div>
                       </li>
                     ))}
                     {recentPlans.length === 0 && (
                       <li className="text-slate-500 dark:text-slate-400 p-4 font-medium text-center bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl">尚無教案，點擊下方按鈕以建立您的第一份教案。</li>
                     )}
                   </ul>
                 </div>
                 
                 <div className="pt-8 mt-auto relative z-10">
                    <button onClick={() => router.push("/history")} className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-2 group hover:text-[#f48c25] dark:hover:text-[#f48c25] transition-colors text-sm md:text-base">
                      VIEW ALL HISTORY
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                 </div>
               </div>

               <div className="relative min-h-[400px] rounded-[2.5rem] overflow-hidden group border border-white/80 dark:border-slate-700/40 cursor-pointer bg-white dark:bg-[#020617] p-8 md:p-12 flex flex-col justify-center shadow-2xl shadow-slate-200/50 dark:shadow-black/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]" onClick={() => router.push('/plans')}>
                 <div className="absolute inset-0 z-0 blur-[2px] group-hover:blur-none group-hover:scale-105 transition-all duration-1000 ease-in-out">
                   <HeroCarousel />
                 </div>
                 {/* Optimized gradient mask for maximum photo clarity while keeping text readable */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/95 via-white/70 dark:from-slate-900/60 dark:via-slate-900/20 to-transparent z-0 transition-colors duration-700 group-hover:from-white/80 dark:group-hover:from-slate-950/70"></div>

                 <div className="relative z-10">
                   <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-slate-900 dark:text-white flex flex-col gap-2">
                     教案總覽
                     <span className="text-slate-400 dark:text-slate-400 text-lg md:text-xl font-semibold tracking-widest">LATEST PLANS</span>
                   </h3>
                   <div className="max-w-md text-slate-700 dark:text-slate-200 font-semibold italic tracking-wide leading-relaxed md:leading-loose md:text-xl group-hover:text-slate-900 dark:group-hover:text-white transition-colors py-2 drop-shadow-md min-h-[6em] flex items-center">
                     <RotatingText items={planQuotes} intervalMs={6000} className="w-full" />
                   </div>
                 </div>
               </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer - Minimalist style matching the PlanEditor UI */}
      <footer className="bg-slate-50 dark:bg-slate-950 w-full mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-12 py-8 md:py-12 gap-8 max-w-[1920px] mx-auto">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-slate-900 dark:text-white font-bold uppercase tracking-widest text-lg md:text-xl">NTUT CHONG DE</span>
            <span className="text-[10px] md:text-xs tracking-[0.1em] uppercase font-medium text-slate-500 dark:text-slate-500">
                  ©2026 ARCHITECTURAL CAMP SYSTEMS. PRECISION OPERATIONS.
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            <a href="#" className="text-[10px] md:text-xs tracking-wider uppercase font-semibold text-slate-500 hover:text-[#f48c25] dark:hover:text-[#f48c25] transition-colors">PRIVACY POLICY</a>
            <a href="#" className="text-[10px] md:text-xs tracking-wider uppercase font-semibold text-slate-500 hover:text-[#f48c25] dark:hover:text-[#f48c25] transition-colors">TERMS OF SERVICE</a>
            <a href="#" className="text-[10px] md:text-xs tracking-wider uppercase font-semibold text-slate-500 hover:text-[#f48c25] dark:hover:text-[#f48c25] transition-colors">SUPPORT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
