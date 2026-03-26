"use client"

import { usePlans } from "@/hooks/use-plans";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Plus,
  FileText,
  LayoutGrid,
  List,
  Clock,
  ChevronRight,
  Users,
  Lock,
  Search,
  Kanban,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActionBar } from "@/components/ActionBar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n-context";

export default function PlansOverview() {
  const { role } = useAuth();
  const { plans, addPlan, groups, setActivePlanId, activeCampId, camps, deletePlan } = usePlans();
  const { language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const activeCamp = camps.find(c => c.id === activeCampId);
  const isAdmin = role === 'admin';

  const [viewType, setViewType] = useState<"grid" | "list" | "board">("grid");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name">("updatedAt");
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const groupOrder = useMemo(() => ["all", ...groups.map((g) => g.slug)], [groups]);

  const getPlanGroup = (plan: typeof plans[number]) => {
    const fallbackSlug = plan.category === 'teaching' ? 'teaching' : 'activity';
    return groups.find(g => g.id === plan.groupId)
      || groups.find(g => g.slug === fallbackSlug)
      || groups[0]
      || null;
  };

  useEffect(() => {
    const selected = searchParams.get('group');
    if (selected && groups.some(g => g.slug === selected)) {
      setFilterGroup(selected);
      return;
    }
    setFilterGroup('all');
  }, [searchParams, groups]);

  const switchGroupByDirection = (direction: 1 | -1) => {
    if (groupOrder.length <= 1) return;
    const currentIndex = groupOrder.indexOf(filterGroup);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + groupOrder.length) % groupOrder.length;
    setSwipeDirection(direction);
    setFilterGroup(groupOrder[nextIndex]);
  };

  const handleSwipeStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleSwipeEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (viewType === "board") return;
    const start = swipeStartRef.current;
    if (!start) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - start.x;
    const deltaY = t.clientY - start.y;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      switchGroupByDirection(deltaX < 0 ? 1 : -1);
    }

    swipeStartRef.current = null;
  };

  const filteredPlans = useMemo(() => {
    let result = plans;
    if (filterGroup !== "all") {
      result = result.filter(p => getPlanGroup(p)?.slug === filterGroup);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.activityName || "").toLowerCase().includes(q) ||
        (p.scheduledName || "").toLowerCase().includes(q) ||
        (p.members || "").toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "updatedAt") {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      } else {
        return (a.activityName || "").localeCompare(b.activityName || "");
      }
    });
    return result;
  }, [plans, filterGroup, searchQuery, sortBy, groups]);

  const crewToast = () => toast({
    title: "🔒 唯讀模式",
    description: "您目前的權限為組員，如需修改請聯繫管理員。",
  });

  const handleCreatePlan = (groupSlug: string) => {
    if (!isAdmin) { crewToast(); return; }
    const newId = addPlan(groupSlug);
    if (newId) router.push(`/plans/${newId}`);
    toast({ title: "已建立", description: "全新教案建立成功" });
  };

  const handleOpenPlan = (id: string) => {
    setActivePlanId(id);
    router.push(`/plans/${id}`);
  };

  const handleDeletePlan = (id: string, name: string) => {
    if (!isAdmin) { crewToast(); return; }
    setDeleteTarget({ id, name });
    setDeleteInput("");
  };

  const confirmDelete = () => {
    if (deleteTarget && deleteInput === "delete") {
      deletePlan(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteInput("");
    }
  };

  return (
    <div 
      className="overflow-x-clip bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors selection:bg-orange-200 dark:selection:bg-amber-500/30 font-sans touch-pan-y overscroll-x-none"
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="max-w-6xl mx-auto pt-28 sm:pt-24 pb-6 sm:pb-12 md:pb-16 px-4 sm:px-6 md:px-8 touch-pan-y">
        {/* ── HEADER ─────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-16 border-b border-stone-200 dark:border-slate-800 pb-6 sm:pb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-stone-900 dark:text-white mb-1.5 sm:mb-2">
              教案總覽
            </h1>
            <p className="text-stone-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs">文件與專案管理中心 / Document Repository</p>
          </div>

          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400 bg-stone-200/50 dark:bg-slate-800 px-2 py-1 rounded-sm w-fit">
            {activeCamp?.name || "All Projects"}
          </div>

        </div>

        <ActionBar title="Plans Actions" className="!flex-nowrap !justify-start md:!justify-center overflow-x-auto scrollbar-hide gap-1 md:gap-2">
          <div className="relative shrink-0">
            <Button
              onClick={() => isAdmin ? setIsAdding(!isAdding) : crewToast()}
              className={cn("shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 h-8 md:h-9 px-2 md:px-3.5 font-semibold text-[11px] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm", !isAdmin && "opacity-60")}
            >
              {!isAdmin && <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />}
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-1.5" />
              <span className="hidden md:inline">新增檔案</span>
            </Button>

            <AnimatePresence>
              {isAdding && isAdmin && (
                <motion.div initial={{ opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={{ duration: 0.15 }}
                  className="absolute left-0 md:right-0 md:left-auto top-10 md:top-12 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl p-1.5 w-56 z-50"
                >
                  {groups.map((group) => (
                    <button key={group.id} onClick={() => { handleCreatePlan(group.slug); setIsAdding(false); }} className="w-full px-3 py-2 text-left rounded-md hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
                      <p className="font-semibold text-sm text-stone-900 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400">{language === 'zh' ? group.nameZh : group.nameEn}</p>
                      <p className="text-[10px] text-stone-400 dark:text-slate-500">Create New Plan</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-md border border-stone-200 dark:border-slate-700 shrink-0">
            <button onClick={() => setViewType("grid")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "grid" ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="畫廊視圖 (Grid)">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewType("board")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "board" ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="看板視圖 (Board)">
              <Kanban className="w-4 h-4" />
            </button>
            <button onClick={() => setViewType("list")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "list" ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="清單視圖 (List)">
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg border border-stone-200 dark:border-slate-700 shadow-sm shrink-0">
            <button onClick={() => { setSwipeDirection(-1); setFilterGroup('all'); }} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap", filterGroup === 'all' ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
              <span className="md:hidden">全</span>
              <span className="hidden md:inline">{language === 'zh' ? '全部' : 'All'}</span>
            </button>
            {groups.map((group) => (
              <button key={group.id} onClick={() => { setSwipeDirection(1); setFilterGroup(group.slug); }} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap", filterGroup === group.slug ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
                <span className="md:hidden">{(language === 'zh' ? group.nameZh : group.nameEn).slice(0, 2)}</span>
                <span className="hidden md:inline">{language === 'zh' ? group.nameZh : group.nameEn}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg border border-stone-200 dark:border-slate-700 shrink-0 shadow-sm">
            <button onClick={() => setSortBy('updatedAt')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap inline-flex items-center gap-1", sortBy === 'updatedAt' ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
              <Clock className="w-3.5 h-3.5 md:hidden" />
              <span className="hidden md:inline">時間排序</span>
            </button>
            <button onClick={() => setSortBy('name')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap inline-flex items-center gap-1", sortBy === 'name' ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
              <FileText className="w-3.5 h-3.5 md:hidden" />
              <span className="hidden md:inline">名稱排序</span>
            </button>
          </div>
        </ActionBar>

        {/* ── TOOLBAR (Filter & Search) ─────────── */}
        <div className="flex flex-col gap-4 mb-8">
           <div className="relative w-full">
             <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
             <Input 
               value={searchQuery} 
               onChange={(e) => setSearchQuery(e.target.value)} 
               placeholder="搜尋教案、負責人..." 
               className="pl-9 h-9 sm:h-10 w-full bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-700 focus:ring-orange-500 transition-shadow rounded-lg font-medium shadow-sm text-sm" 
             />
           </div>
        </div>

        {/* ── CONTENT ─────────────────────── */}
        <div className="relative overflow-hidden w-full touch-pan-y min-h-[50vh]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${filterGroup}-${viewType}`}
              initial={{ x: swipeDirection > 0 ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: swipeDirection > 0 ? "-100%" : "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
        {filteredPlans.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-12 sm:p-20 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-stone-50 dark:bg-slate-900 flex items-center justify-center mb-3 sm:mb-4 border border-stone-100 dark:border-slate-800">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-stone-300 dark:text-slate-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-slate-200 mb-1">查無文件</h3>
            <p className="text-stone-500 dark:text-slate-400 max-w-xs mx-auto text-xs sm:text-sm">找不到符合條件的教案，或尚無文件可供顯示。</p>
          </div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPlans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.2 }} className="h-full">
                <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6 text-left w-full group transition-all duration-300 hover:border-orange-500/50 dark:hover:border-amber-400/50 hover:shadow-md flex flex-col h-full cursor-pointer" onClick={() => handleOpenPlan(plan.id)}>
                   <div className="flex justify-between items-start mb-3 sm:mb-4">
                     <Badge className={cn("px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border", plan.category === "activity" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800")}>
                       {(() => {
                         const group = getPlanGroup(plan);
                         return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
                       })()}
                     </Badge>
                     <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors" />
                   </div>
                   
                   <h3 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-slate-100 mb-1 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{plan.activityName || "未命名文件"}</h3>
                   <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mb-3 sm:mb-4 flex-1">{plan.scheduledName || "無分類"}</p>
                   
                   <div className="flex items-center gap-4 pt-3 sm:pt-4 border-t border-stone-100 dark:border-slate-700/50 mt-auto">
                     <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                       <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                       {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
                     </div>
                     {plan.members && (
                       <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                         <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                         <span className="line-clamp-1 max-w-[80px]">{plan.members}</span>
                       </div>
                     )}
                   </div>
                 </div>
              </motion.div>
            ))}
          </div>
        ) : viewType === "board" ? (
          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar h-full min-h-[500px] snap-x">
             {groups.map((group, index) => {
               const items = filteredPlans.filter(p => getPlanGroup(p)?.slug === group.slug);
               const colorPool = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'];
               const color = colorPool[index % colorPool.length];
               return (
                 <div key={group.id} className="flex-1 min-w-[320px] max-w-sm flex flex-col bg-stone-100/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-stone-200/50 dark:border-slate-700/50 shadow-sm snap-center">
                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                       <h3 className="font-bold text-sm text-stone-900 dark:text-slate-100 flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", color)}></div>
                         {language === 'zh' ? group.nameZh : group.nameEn}
                       </h3>
                       <span className="text-xs font-bold text-stone-400 dark:text-slate-500">{items.length}</span>
                    </div>
                    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar">
                       {items.map(plan => (
                         <div key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-orange-500/50 dark:hover:border-amber-400/50 hover:shadow-md transition-all">
                           <h4 className="font-semibold text-[13px] text-stone-900 dark:text-slate-100 mb-1 line-clamp-2">{plan.activityName || "未命名文件"}</h4>
                           <p className="text-[10px] text-stone-500 dark:text-slate-400 font-medium mb-3">{plan.scheduledName || "無分類"}</p>
                           <div className="flex items-center justify-between text-[9px] text-stone-400 dark:text-slate-500 font-black tracking-widest uppercase">
                             <span>{plan.members || "—"}</span>
                             <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span>
                           </div>
                         </div>
                       ))}
                       {items.length === 0 && <p className="text-xs text-center text-stone-400 dark:text-slate-500 mt-4">此模組尚無教案。</p>}
                    </div>
                 </div>
               )
             })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-slate-900/50 border-b border-stone-200 dark:border-slate-700">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">檔案名稱</th>
                  <th className="px-6 py-4 font-medium">類型</th>
                  <th className="px-6 py-4 font-medium">分類</th>
                  <th className="px-6 py-4 font-medium">協作者</th>
                  <th className="px-6 py-4 font-medium">最後修改</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-700/50">
                {filteredPlans.map((plan) => (
                  <tr key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-semibold text-stone-900 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{plan.activityName || "未命名文件"}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn("px-2 py-0 text-[9px] font-bold uppercase border", plan.category === "activity" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800")}>
                        {(() => {
                          const group = getPlanGroup(plan);
                          return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
                        })()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{plan.scheduledName || "—"}</td>
                    <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{plan.members || "—"}</td>
                    <td className="px-6 py-4 text-stone-400 dark:text-slate-500 text-xs font-medium">{plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 p-8 rounded-xl shadow-xl max-w-sm w-full relative space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-stone-900 dark:text-white">刪除文件</h4>
                <p className="text-sm text-stone-500 dark:text-slate-400">請輸入 <span className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded">delete</span> 刪除「{deleteTarget.name}」。此操作不可復原。</p>
              </div>
              <Input
                type="text" value={deleteInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)} placeholder="delete"
                className="w-full bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700 rounded-md font-mono text-sm focus:ring-rose-500 focus:border-rose-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 font-medium text-stone-600 dark:text-slate-300">取消</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleteInput !== "delete"} className="h-9 font-medium px-6 bg-rose-600 hover:bg-rose-700">
                  刪除
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
