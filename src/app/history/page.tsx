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
import { cn, stripHtml, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
    <div className="bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground min-h-screen font-sans transition-colors duration-500">
      <div className="max-w-6xl mx-auto pt-20 sm:pt-24 pb-16 px-4 sm:px-6 md:px-8">
        {/* ── HEADER ─────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-stone-200/80 dark:border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="h-8 px-2.5 rounded-full text-xs font-mono text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 uppercase tracking-wider -ml-1 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 返回首頁
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="architectural-tag">
                // EDIT ACTIVITY HISTORY //
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-foreground flex items-center gap-3">
              <History className="w-8 h-8 text-orange-500 shrink-0" />
              近期修改紀錄
            </h1>
            <p className="text-xs font-mono text-fg-muted uppercase tracking-widest mt-1.5">
              Activity History // 僅顯示最近 30 天內有異動的教案與活動
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white/80 dark:bg-white/[0.03] backdrop-blur-md p-1 rounded-2xl border border-stone-200/80 dark:border-white/10 shadow-xs">
              <button
                onClick={() => setViewType("grid")}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewType === "grid"
                    ? "bg-stone-200/80 dark:bg-white/15 text-orange-600 dark:text-orange-400 shadow-xs"
                    : "text-fg-muted hover:text-foreground"
                )}
                title="網格視圖"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewType("list")}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewType === "list"
                    ? "bg-stone-200/80 dark:bg-white/15 text-orange-600 dark:text-orange-400 shadow-xs"
                    : "text-fg-muted hover:text-foreground"
                )}
                title="清單視圖"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────── */}
        {recentPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white/80 dark:bg-white/[0.02] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-16 sm:p-20 flex flex-col items-center justify-center text-center shadow-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 flex items-center justify-center mb-4 text-fg-muted shadow-xs">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-normal text-foreground mb-1">最近無修改紀錄</h3>
            <p className="text-xs font-mono text-fg-muted max-w-sm mx-auto leading-relaxed">
              過去 30 天內沒有任何教案被新增或修改。團隊的最新進度將會即時顯示於此。
            </p>
          </motion.div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPlans.map((plan, i) => {
              const categoryName = plan.category === "activity" ? "活動組" : plan.category === "teaching" ? "教學組" : plan.category;
              const badge = getUnifiedGroupBadgeParams(plan.category, categoryName);
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <div
                    className="rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-6 text-left w-full group transition-all duration-300 hover:border-orange-500/40 hover:-translate-y-0.5 flex flex-col h-full cursor-pointer relative shadow-xs"
                    onClick={() => handleOpenPlan(plan.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border", badge.softBg, badge.softText, badge.softBorder)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", badge.colorDot)} />
                        <span>{categoryName}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-center text-fg-muted group-hover:bg-orange-500 group-hover:text-white group-hover:border-transparent transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="font-normal text-base md:text-lg text-foreground mb-1.5 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {stripHtml(plan.activityName) || "未命名文件"}
                    </h3>
                    <p className="text-xs text-fg-muted font-mono mb-6 flex-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{plan.scheduledName || "未分類"}</span>
                    </p>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-stone-200/60 dark:border-white/5 mt-auto text-xs font-mono text-fg-muted">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}</span>
                      </div>
                      {plan.members && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[100px]">{stripHtml(plan.members)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl bg-white/80 dark:bg-white/[0.02] backdrop-blur-md border border-stone-200/80 dark:border-white/10 overflow-hidden shadow-xs"
          >
            <table className="w-full text-sm text-left">
              <thead className="bg-[#FAF8F5]/90 dark:bg-[#12171A]/90 backdrop-blur-xl border-b border-stone-200/80 dark:border-white/10">
                <tr className="text-[11px] font-mono uppercase tracking-[0.2em] text-fg-muted">
                  <th className="px-6 py-4">檔案名稱</th>
                  <th className="px-6 py-4">組別</th>
                  <th className="px-6 py-4">分類</th>
                  <th className="px-6 py-4">協作者</th>
                  <th className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5" /> 最後修改
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60 dark:divide-white/10">
                {recentPlans.map((plan) => {
                  const categoryName = plan.category === "activity" ? "活動組" : plan.category === "teaching" ? "教學組" : plan.category;
                  const badge = getUnifiedGroupBadgeParams(plan.category, categoryName);
                  return (
                    <tr
                      key={plan.id}
                      onClick={() => handleOpenPlan(plan.id)}
                      className="hover:bg-stone-500/[0.03] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-normal text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {stripHtml(plan.activityName) || "未命名文件"}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border", badge.softBg, badge.softText, badge.softBorder)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", badge.colorDot)} />
                          <span>{categoryName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-fg-muted">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 shrink-0" />
                          <span>{plan.scheduledName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-fg-muted">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 shrink-0" />
                          <span className="truncate max-w-[120px]">{stripHtml(plan.members) || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-fg-muted text-right">
                        {plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
