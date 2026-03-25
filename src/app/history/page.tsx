"use client"

import { usePlans } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  LayoutGrid,
  List,
  Clock,
  ChevronRight,
  Users,
  History,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function HistoryOverview() {
  const { role } = useAuth();
  const { plans, setActivePlanId, activeCampId, camps } = usePlans();
  const router = useRouter();
  const activeCamp = camps.find(c => c.id === activeCampId);

  const [viewType, setViewType] = useState<"grid" | "list">("list");

  // Filter plans to keep only those modified within the last 30 days
  const recentPlans = useMemo(() => {
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    return plans
      .filter(p => p.updatedAt && (now - p.updatedAt) <= oneMonthMs)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [plans]);

  const handleOpenPlan = (id: string) => {
    setActivePlanId(id);
    router.push(`/plans/${id}`);
  };

  return (
    <div className="bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-50 transition-colors selection:bg-[#f48c25]/30 selection:text-[#f48c25] font-sans">
      <div className="max-w-6xl mx-auto pt-24 pb-12 md:pb-16 px-6 md:px-8">
        {/* ── HEADER ─────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-stone-200 dark:border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button 
                onClick={() => router.push("/")}
                className="text-stone-500 hover:text-[#f48c25] dark:text-slate-400 dark:hover:text-[#f48c25] transition-colors p-1 -ml-1 flex items-center gap-1 text-sm font-semibold uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" /> 返回首頁
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f48c25] bg-[#f48c25]/10 dark:text-orange-400 dark:bg-orange-400/10 px-2 py-1 rounded-sm border border-[#f48c25]/20">
                {activeCamp?.name || "All Projects"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-slate-500 bg-stone-200/50 dark:bg-slate-800 px-2 py-1 rounded-sm">
                最近 1 個月紀錄
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-3">
              <History className="w-8 h-8 md:w-10 md:h-10 text-[#f48c25]" />
              近期修改紀錄
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-sm mt-3 font-medium border-l-2 border-[#f48c25] pl-3">
              Activity History / 僅顯示最近 30 天內有異動的教案與活動
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-stone-200 dark:border-slate-800 shadow-sm">
              <button onClick={() => setViewType("grid")} className={cn("p-2 rounded-lg transition-all cursor-pointer", viewType === "grid" ? "bg-stone-100 dark:bg-slate-800 text-[#f48c25] shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewType("list")} className={cn("p-2 rounded-lg transition-all cursor-pointer", viewType === "list" ? "bg-stone-100 dark:bg-slate-800 text-[#f48c25] shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────── */}
        {recentPlans.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-stone-200/80 dark:border-slate-800/80 rounded-[2rem] p-20 flex flex-col items-center justify-center text-center shadow-xl shadow-stone-200/20 dark:shadow-none">
            <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center mb-6 border border-stone-200/50 dark:border-slate-700/50">
              <History className="w-8 h-8 text-stone-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-slate-200 mb-2">最近無修改紀錄</h3>
            <p className="text-stone-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">過去 30 天內沒有任何教案被新增或修改。團隊的最新進度將會即時顯示於此，協助您掌握最新動態。</p>
          </motion.div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPlans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}>
                <div className="bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 rounded-2xl p-6 text-left w-full group transition-all duration-300 hover:border-[#f48c25]/50 dark:hover:border-[#f48c25]/50 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full cursor-pointer relative overflow-hidden" onClick={() => handleOpenPlan(plan.id)}>
                  {/* Subtle hover glow */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#f48c25] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="flex justify-between items-start mb-5">
                    <Badge className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border", plan.category === "activity" ? "bg-blue-50/80 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50" : "bg-emerald-50/80 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50")}>
                      {plan.category === "activity" ? "活動" : "教學"}
                    </Badge>
                    <div className="bg-stone-100 dark:bg-slate-800 p-1.5 rounded-full text-stone-400 dark:text-slate-500 group-hover:bg-[#f48c25] group-hover:text-white transition-colors duration-300">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg md:text-xl text-stone-900 dark:text-slate-100 mb-2 line-clamp-2 leading-snug group-hover:text-[#f48c25] dark:group-hover:text-[#f48c25] transition-colors">{plan.activityName || "未命名文件"}</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400 font-semibold mb-6 flex-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{plan.scheduledName || "未分類"}</p>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-stone-100 dark:border-slate-800 mt-auto">
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400 font-semibold bg-stone-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-[#f48c25]" />
                      {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
                    </div>
                    {plan.members && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400 font-medium ml-auto">
                        <Users className="w-3.5 h-3.5" />
                        <span className="line-clamp-1 max-w-[80px]">{plan.members}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-xl shadow-stone-200/20 dark:shadow-none">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-slate-950/50 border-b border-stone-200 dark:border-slate-800">
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 dark:text-slate-500">
                  <th className="px-8 py-5">檔案名稱</th>
                  <th className="px-6 py-5">類型</th>
                  <th className="px-6 py-5">分類</th>
                  <th className="px-6 py-5">協作者</th>
                  <th className="px-8 py-5 text-right flex items-center justify-end gap-1"><Clock className="w-3.5 h-3.5" />最後修改</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {recentPlans.map((plan) => (
                  <tr key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <td className="px-8 py-5 font-bold text-stone-900 dark:text-slate-200 group-hover:text-[#f48c25] dark:group-hover:text-[#f48c25] transition-colors">{plan.activityName || "未命名文件"}</td>
                    <td className="px-6 py-5">
                      <Badge className={cn("px-2.5 py-1 text-[10px] font-bold uppercase border", plan.category === "activity" ? "bg-blue-50/80 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50" : "bg-emerald-50/80 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50")}>
                        {plan.category === "activity" ? "活動" : "教學"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-stone-500 dark:text-slate-400 font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-stone-300 dark:text-slate-600" />{plan.scheduledName || "—"}</td>
                    <td className="px-6 py-5 text-stone-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-300 dark:text-slate-600" />
                        {plan.members || "—"}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-stone-600 dark:text-slate-300 text-sm font-semibold text-right">{plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
