"use client"

import { usePlans } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  FileText,
  ChevronRight,
  Calendar,
  Clock,
  Tent,
  MapPin,
  Sparkles,
  ArrowRight,
  PlusCircle,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { Variants } from "framer-motion";

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

const HERO_PHRASES = [
  { main: "讓教案", accent: "像藝術品一樣" },
  { main: "點燃每個", accent: "崇德人的熱情" },
  { main: "創造回憶", accent: "點燃靈感" },
];

const containerFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

export default function Home() {
  const router = useRouter();
  const { camps, activeCampId, plans, setActivePlanId } = usePlans();
  const activeCamp = camps?.find((c) => c.id === activeCampId);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % HERO_PHRASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const timeline = useMemo(() => [
    { label: "一籌", date: activeCamp?.meeting1StartDate, icon: Clock },
    { label: "二籌", date: activeCamp?.meeting2StartDate, icon: Clock },
    { label: "三籌", date: activeCamp?.meeting3StartDate, icon: Clock },
    { label: "集訓", date: activeCamp?.trainingStartDate, icon: Clock },
    { label: "駐站", date: activeCamp?.siteStartDate, icon: MapPin },
    { label: "營期", date: activeCamp?.campStartDate, icon: Tent },
  ], [activeCamp]);

  const currentIdx = useMemo(() => {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (isPast(timeline[i].date)) return i;
    }
    return -1;
  }, [timeline]);

  const recentPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 4);
  }, [plans]);

  return (
    <div className="min-h-full bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors selection:bg-orange-200 dark:selection:bg-amber-500/30 antialiased overflow-x-hidden">
      <motion.div
        variants={containerFade}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 space-y-24"
      >
        {/* ── HERO SECTION (Brutalist Typography) ──────────────── */}
        <section className="relative">
          <motion.div variants={itemUp} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-orange-100 dark:bg-amber-400/10 text-orange-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-orange-200 dark:border-amber-400/20">
                Studio Workspace
              </div>
              <Sparkles className="w-6 h-6 text-yellow-500 dark:text-amber-400 fill-yellow-500 dark:fill-amber-400" />
            </div>
            
            <div className="h-40 md:h-52 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phraseIdx}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="space-y-2"
                >
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] uppercase">
                    {HERO_PHRASES[phraseIdx].main}
                  </h1>
                  <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-orange-500 dark:text-amber-400 leading-[1.05] uppercase">
                    {HERO_PHRASES[phraseIdx].accent}
                  </h2>
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="text-stone-500 dark:text-slate-400 text-lg md:text-xl font-bold max-w-2xl leading-relaxed uppercase tracking-wider">
              {activeCamp ? (
                <>正在為 <span className="text-stone-900 dark:text-white underline decoration-orange-500 dark:decoration-amber-400 decoration-4 underline-offset-4">{activeCamp.name}</span> 創造內容</>
              ) : (
                "準備好開始了嗎？選擇一個營隊專案，釋放你的創意。"
              )}
            </p>
          </motion.div>
        </section>

        {/* ── MENU PREVIEW (CARDS) ───────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            variants={itemUp}
            whileHover={{ y: -6, x: -6, boxShadow: "12px 12px 0px 0px rgba(249, 115, 22, 0.4)" }}
            className="group relative bg-orange-500 dark:bg-amber-500 border-4 border-stone-900 dark:border-slate-800 p-10 text-white dark:text-slate-900 overflow-hidden cursor-pointer transition-all duration-300" 
            onClick={() => router.push("/plans")}
          >
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div>
                <div className="w-16 h-16 bg-white/20 dark:bg-slate-900/10 backdrop-blur-md flex items-center justify-center mb-8 border-4 border-white/30 dark:border-slate-900/20">
                  <PlusCircle className="w-8 h-8 text-white dark:text-slate-900" />
                </div>
                <h3 className="text-4xl font-black tracking-tight mb-4 uppercase">教案總覽</h3>
                <p className="text-orange-50 dark:text-amber-900 font-bold text-lg leading-relaxed max-w-xs">開始撰寫新的教學內容，讓每一份文件都充滿溫度。</p>
              </div>
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-sm group-hover:gap-4 transition-all">
                立即開始 <ArrowRight className="w-5 h-5 border-2 border-current rounded-full p-0.5" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={itemUp}
            whileHover={{ y: -6, x: -6, boxShadow: "12px 12px 0px 0px rgba(28, 25, 23, 0.2)" }}
            className="group relative bg-white dark:bg-slate-800 border-4 border-stone-900 dark:border-slate-700 p-10 overflow-hidden cursor-pointer transition-all duration-300" 
            onClick={() => router.push("/admin")}
          >
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div>
                <div className="w-16 h-16 bg-stone-100 dark:bg-slate-700 flex items-center justify-center mb-8 border-4 border-stone-900 dark:border-slate-600">
                  <ShieldCheck className="w-8 h-8 text-stone-900 dark:text-amber-400" />
                </div>
                <h3 className="text-4xl font-black tracking-tight mb-4 uppercase text-stone-900 dark:text-white">行政中心</h3>
                <p className="text-stone-500 dark:text-slate-400 font-bold text-lg leading-relaxed max-w-xs">統籌闖關表、道具清單與計時器，精準掌握每一秒。</p>
              </div>
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-sm text-stone-900 dark:text-amber-400 group-hover:gap-4 transition-all">
                管理中心 <ArrowRight className="w-5 h-5 border-2 border-current rounded-full p-0.5" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── TIMELINE (Brutal Milestones) ──────────────────── */}
        <section className="space-y-12">
          <motion.div variants={itemUp} className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-500 dark:text-amber-400" />
              營隊動態里程碑
            </h2>
          </motion.div>

          <motion.div variants={itemUp} className="relative bg-white dark:bg-slate-800 border-4 border-stone-900 dark:border-slate-700 p-8 md:p-12">
            <div className="relative grid grid-cols-2 md:grid-cols-5 gap-8">
              <div className="hidden md:block absolute top-[26px] left-10 right-10 h-2 bg-stone-100 dark:bg-slate-700" />
              <div 
                className="hidden md:block absolute top-[26px] left-10 h-2 bg-orange-500 dark:bg-amber-400 transition-all duration-1000 ease-out"
                style={{ width: currentIdx >= 0 ? `${(currentIdx / (timeline.length - 1)) * 85}%` : '0%' }}
              />

              {timeline.map((node, i) => {
                const isActive = i === currentIdx;
                const isDone = i <= currentIdx;
                const Icon = node.icon;
                return (
                  <div key={node.label} className="relative flex flex-col items-center text-center z-10 group">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: isDone ? 5 : 0 }}
                      className={cn(
                        "w-16 h-16 flex items-center justify-center border-4 transition-all duration-500 bg-white dark:bg-slate-800",
                        isActive ? "border-orange-500 dark:border-amber-400 text-orange-500 dark:text-amber-400 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)] dark:shadow-[4px_4px_0px_0px_rgba(251,191,36,1)] scale-110"
                          : isDone ? "border-stone-900 dark:border-slate-500 text-stone-900 dark:text-slate-200"
                          : "border-stone-200 dark:border-slate-700 text-stone-300 dark:text-slate-600"
                      )}
                    >
                      <Icon className="w-7 h-7" />
                    </motion.div>
                    <div className="mt-6">
                      <span className={cn(
                        "block text-lg font-black uppercase tracking-wider",
                        isActive ? "text-orange-600 dark:text-amber-400" : isDone ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-slate-500"
                      )}>
                        {node.label}
                      </span>
                      {node.date && <span className="block text-xs text-stone-500 dark:text-slate-400 mt-1 font-bold">{node.date}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* ── LATEST ACTIVITY ────────────── */}
        <section className="space-y-8">
          <motion.div variants={itemUp} className="flex items-center justify-between border-b-4 border-stone-900 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-stone-900 dark:text-white" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-stone-900 dark:text-white">最近活動</h2>
            </div>
            <Link href="/plans" className="text-sm font-black text-orange-500 dark:text-amber-400 hover:opacity-70 transition-colors uppercase tracking-widest flex items-center gap-2 group">
              VIEW ALL <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentPlans.length > 0 ? (
              recentPlans.map((plan) => (
                <motion.div key={plan.id} variants={itemUp} whileHover={{ x: 6, y: -4, boxShadow: "6px 6px 0px 0px rgba(28,25,23,1)" }} className="transition-all">
                  <Link
                    href={`/plans/${plan.id}`}
                    onClick={() => setActivePlanId && setActivePlanId(plan.id)}
                    className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 border-4 border-stone-900 dark:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 flex items-center justify-center border-2 border-stone-900 dark:border-slate-600",
                        plan.category === "activity" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300" : "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300"
                      )}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-stone-900 dark:text-white uppercase truncate max-w-[200px] md:max-w-xs">{plan.activityName || "未命名教案"}</h4>
                        <p className="text-[10px] text-stone-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                          EDITED {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "UNKNOWN"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-stone-300 dark:text-slate-500 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors" />
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 p-8 border-4 border-dashed border-stone-300 dark:border-slate-700 text-center">
                <p className="text-stone-400 dark:text-slate-500 font-black uppercase tracking-widest text-lg">目前尚無最近教案動態。</p>
              </div>
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
