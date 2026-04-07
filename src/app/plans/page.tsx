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
 ArrowUp,
 ArrowDown,
 ChevronRight,
 Download,
 MoreHorizontal,
 Trash2,
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
import { actionBarTheme } from "@/lib/actionbar-theme";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n-context";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSub,
 DropdownMenuSubContent,
 DropdownMenuSubTrigger,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LessonPlan } from "@/types/plan";
import { exportPlansAsZip, exportToDocx, exportToPdf } from "@/lib/export-utils";

export default function PlansOverview() {
 const { role } = useAuth();
 const { plans, addPlan, groups, setActivePlanId, activeCampId, camps, deletePlan, updatePlan } = usePlans();
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
 const [isBatchDownloading, setIsBatchDownloading] = useState(false);
 const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterGroup, setFilterGroup] = useState<string>("all");
 const [sortBy, setSortBy] = useState<"updatedAt" | "name">("updatedAt");
 const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
 const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
 const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
 const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

 const handleSortClick = (nextSortBy: "updatedAt" | "name") => {
 if (sortBy === nextSortBy) {
 setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
 return;
 }

 setSortBy(nextSortBy);
 setSortDirection(nextSortBy === "updatedAt" ? "desc" : "asc");
 };

 const groupOrder = useMemo(() => ["all", ...groups.map((g) => g.slug)], [groups]);

 const normalizeKey = (value?: string | null) => (value || "").trim().toLowerCase();
 const toPlainText = (value?: string | null) =>
 (value || "")
 .replace(/<[^>]*>/g, " ")
 .replace(/[\`*_~#>[\]()!]/g, " ")
 .replace(/\s+/g, " ")
 .trim();

 const getPlanDisplayName = (plan: typeof plans[number]) =>
 toPlainText(plan.activityName) || "未命名文件";
 const getPlanDisplayCategory = (plan: typeof plans[number]) =>
 toPlainText(plan.scheduledName) || "無分類";
 const getPlanDisplayMembers = (plan: typeof plans[number]) =>
 toPlainText(plan.members);

 const mapCategoryToSlug = (value?: string | null) => {
 const key = normalizeKey(value);
 if (key === "teaching" || key === "教學" || key === "teachinggroup" || key === "teaching-group") return "teaching";
 if (key === "activity" || key === "活動" || key === "activitygroup" || key === "activity-group") return "activity";
 return key;
 };

 const getPlanGroup = (plan: typeof plans[number]) => {
 const byGroupIdOrSlug = groups.find(
 g => g.id === plan.groupId || normalizeKey(g.slug) === normalizeKey(plan.groupId)
 );
 if (byGroupIdOrSlug) return byGroupIdOrSlug;

 const hasExplicitGroupId = !!normalizeKey(plan.groupId);
 if (hasExplicitGroupId) return null;

 const fallbackSlug = mapCategoryToSlug(plan.category);
 return groups.find(g => normalizeKey(g.slug) === fallbackSlug) || null;
 };

 useEffect(() => {
 const selected = searchParams.get('group');
 if (selected && groups.some(g => normalizeKey(g.slug) === normalizeKey(selected))) {
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
 // Don't track swipe if touch started on ActionBar
 const target = e.target as HTMLElement;
 if (target.closest('.action-bar-container')) {
 swipeStartRef.current = null;
 return;
 }
 const t = e.touches[0];
 swipeStartRef.current = { x: t.clientX, y: t.clientY };
 };

 const handleSwipeEnd = (e: React.TouchEvent<HTMLDivElement>) => {
 if (viewType === "board") return;
 // Don't switch if swipe ended on ActionBar
 const target = e.target as HTMLElement;
 if (target.closest('.action-bar-container')) {
 swipeStartRef.current = null;
 return;
 }
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
 const target = normalizeKey(filterGroup);
 result = result.filter((p) => {
 const groupIdKey = normalizeKey(p.groupId);
 const group = getPlanGroup(p);
 if (group && normalizeKey(group.slug) === target) return true;
 if (groupIdKey) return groupIdKey === target;
 return mapCategoryToSlug(p.category) === target;
 });
 }
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 result = result.filter(p => 
 toPlainText(p.activityName).toLowerCase().includes(q) ||
 toPlainText(p.scheduledName).toLowerCase().includes(q) ||
 toPlainText(p.members).toLowerCase().includes(q)
 );
 }
 result = [...result].sort((a, b) => {
 if (sortBy === "updatedAt") {
 const timeCompare = (a.updatedAt || 0) - (b.updatedAt || 0);
 return sortDirection === "asc" ? timeCompare : -timeCompare;
 } else {
 const nameCompare = toPlainText(a.activityName).localeCompare(toPlainText(b.activityName));
 return sortDirection === "asc" ? nameCompare : -nameCompare;
 }
 });
 return result;
 }, [plans, filterGroup, searchQuery, sortBy, sortDirection, groups]);

 const crewToast = () => toast({
 title: "🔒 唯讀模式",
 description: "您目前的權限為組員，如需修改請聯繫管理員。",
 });

 const handleAddMenuOpenChange = (nextOpen: boolean) => {
 if (!nextOpen) {
 setIsAdding(false);
 return;
 }
 if (!isAdmin) {
 crewToast();
 return;
 }
 if (groups.length === 0) {
 toast({
 title: "無法新增",
 description: "目前沒有可用組別，請先到設定新增組別。",
 variant: "destructive",
 });
 return;
 }
 setIsAdding(true);
 };

 const handleCreatePlan = (groupSlug: string) => {
 if (!isAdmin) { crewToast(); return; }
 const newId = addPlan(groupSlug);
 if (!newId) {
 toast({ title: "建立失敗", description: "目前無法建立教案，請稍後再試。", variant: "destructive" });
 return;
 }
 toast({ title: "已建立", description: "全新教案已加入清單。" });
 };

 const handleOpenPlan = (id: string) => {
 setActivePlanId(id);
 router.push(`/plans/${encodeURIComponent(id)}`);
 };

 const handleDeletePlan = (id: string, name: string) => {
 if (!isAdmin) { crewToast(); return; }
 setDeleteTarget({ id, name });
 setDeleteInput("");
 };

 const handleChangePlanGroup = (plan: LessonPlan, targetGroupId: string) => {
 if (!isAdmin) { crewToast(); return; }

 const targetGroup = groups.find((g) => g.id === targetGroupId);
 if (!targetGroup) return;

 updatePlan(plan.id, {
 groupId: targetGroup.id,
 category: targetGroup.slug === "teaching" ? "teaching" : "activity",
 });

 toast({
 title: "已更新組別",
 description: `「${getPlanDisplayName(plan)}」已移動到「${language === 'zh' ? targetGroup.nameZh : targetGroup.nameEn}」。`,
 });
 };

 const confirmDelete = () => {
 if (deleteTarget && deleteInput === "delete") {
 deletePlan(deleteTarget.id);
 toast({ title: "已刪除", description: `教案「${deleteTarget.name}」已刪除。` });
 setDeleteTarget(null);
 setDeleteInput("");
 }
 };

 const handleDownloadPlan = async (plan: LessonPlan, format: "word" | "pdf") => {
 try {
 if (format === "word") {
 await exportToDocx(plan);
 toast({ title: "匯出成功", description: "已下載 Word 教案。" });
 return;
 }

 await exportToPdf(plan);
 toast({ title: "匯出成功", description: "已下載 PDF 教案。" });
 } catch {
 toast({
 title: "匯出失敗",
 description: "目前無法下載教案，請稍後再試。",
 variant: "destructive",
 });
 }
 };

 const handleBatchDownload = async (format: "word" | "pdf", scope: "all" | "filtered") => {
 if (isBatchDownloading) return;
 const targetPlans = scope === "filtered" ? filteredPlans : plans;

 if (targetPlans.length === 0) {
 toast({ title: "沒有可下載的教案", description: "目前沒有教案可供匯出。" });
 return;
 }

 setIsBatchDownloading(true);
 setIsDownloadMenuOpen(false);
 let successCount = 0;
 let failCount = 0;

 toast({
 title: "批次下載中",
 description: `正在打包 ${targetPlans.length} 份教案為 ZIP（${format === "word" ? "Word" : "PDF"}）。`,
 });

 try {
 const zipName =
 scope === "filtered"
 ? `plans_filtered_${format}_${Date.now()}.zip`
 : `plans_all_${format}_${Date.now()}.zip`;
 await exportPlansAsZip(targetPlans, format, { useSaveDialog: false, zipName });
 successCount = targetPlans.length;
 } catch {
 failCount = targetPlans.length;
 }

 setIsBatchDownloading(false);

 if (failCount === 0) {
 toast({
 title: "批次下載完成",
 description: `已下載 ZIP（內含 ${successCount} 份${format === "word" ? " Word " : " PDF "}教案）。`,
 });
 return;
 }

 toast({
 title: "批次下載完成（部分失敗）",
 description: `成功 ${successCount} 份，失敗 ${failCount} 份。請再試一次。`,
 variant: "destructive",
 });
 };

 const renderPlanActions = (plan: LessonPlan) => (
 <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 onPointerDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 className="h-8 w-8 inline-flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
 aria-label="教案操作"
 >
 <MoreHorizontal className="w-4 h-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="end"
 onClick={(e) => e.stopPropagation()}
 className="w-44 bg-white dark:bg-slate-800 border-none shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
 >
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 e.stopPropagation();
 void handleDownloadPlan(plan, "word");
 }}
 className="cursor-pointer"
 >
 <Download className="w-4 h-4 mr-2" />
 下載 Word
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 e.stopPropagation();
 void handleDownloadPlan(plan, "pdf");
 }}
 className="cursor-pointer"
 >
 <FileText className="w-4 h-4 mr-2" />
 下載 PDF
 </DropdownMenuItem>
 {isAdmin && groups.length > 0 && (
 <DropdownMenuSub>
 <DropdownMenuSubTrigger className="cursor-pointer">
 <Users className="w-4 h-4 mr-2" />
 更換組別
 </DropdownMenuSubTrigger>
 <DropdownMenuSubContent className="w-44 bg-white dark:bg-slate-800 border-none shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 {groups.map((group) => {
 const params = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
 return (
 <DropdownMenuItem
 key={group.id}
 onSelect={(e) => {
 e.preventDefault();
 e.stopPropagation();
 handleChangePlanGroup(plan, group.id);
 }}
 className="cursor-pointer"
 >
 <span className={cn("w-2 h-2 rounded-full", params.dot)} />
 {language === 'zh' ? group.nameZh : group.nameEn}
 </DropdownMenuItem>
 );
 })}
 </DropdownMenuSubContent>
 </DropdownMenuSub>
 )}
 {isAdmin && (
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 e.stopPropagation();
 handleDeletePlan(plan.id, getPlanDisplayName(plan));
 }}
 className="cursor-pointer text-rose-600 focus:text-rose-600"
 >
 <Trash2 className="w-4 h-4 mr-2" />
 刪除教案
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 );

 return (
 <div 
 className="overflow-x-clip bg-[#F9F8F6] dark:bg-slate-900 text-[#2C2A28] dark:text-slate-50 transition-colors selection:bg-orange-200 dark:selection:bg-amber-500/30 font-sans touch-auto overscroll-x-none relative min-h-screen flex flex-col sm:block"
 onTouchStart={handleSwipeStart}
 onTouchEnd={handleSwipeEnd}
 >

 <div className="max-w-[1400px] mx-auto pt-24 sm:pt-32 pb-12 sm:pb-24 px-4 sm:px-6 md:px-8 xl:px-12 touch-auto relative z-10 w-full flex flex-col sm:block overflow-y-auto sm:overflow-y-visible flex-1 sm:flex-none">
 {/* ── HEADER ─────────────── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 relative z-10 shrink-0">
 <div className="flex-1 min-w-0">
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A28] dark:text-white mb-1.5 sm:mb-2">
 {language === 'zh' ? '教案總覽' : 'Plans Overview'}
 </h1>
 <p className="text-stone-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs">
 {activeCamp?.name || "All Projects"} // Planning // Coordination
 </p>
 </div>
 </div>

 <ActionBar title="PLANS ACTIONS" className="action-bar-container !flex-nowrap !justify-start md:!justify-between overflow-x-auto scrollbar-hide gap-2 md:gap-3 mb-4 p-0 !w-full">
            <div className={cn("flex flex-nowrap items-center gap-1 shrink-0", actionBarTheme.clusterInset)}>
              <DropdownMenu open={isAdding} onOpenChange={handleAddMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={cn(actionBarTheme.controlPrimary, "px-3 font-bold text-xs cursor-pointer", !isAdmin && "opacity-60")}
                  >
                    {!isAdmin && <Lock className="w-3 h-3 md:mr-1" />}
                    <Plus className="w-3.5 h-3.5 md:mr-1" />
                    <span className="hidden md:inline">新增檔案</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-56 bg-background dark:bg-slate-800 shadow-[0_8px_30px_rgba(140,120,100,0.05)] dark:shadow-none border-none"
                >
                  {groups.map((group) => (
                    <DropdownMenuItem
                      key={group.id}
                      onSelect={() => handleCreatePlan(group.slug)}
                      className="cursor-pointer font-bold"
                    >
                      {language === 'zh' ? group.nameZh : group.nameEn}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className={cn(actionBarTheme.separator, "h-4 mx-0.5")} />

              <DropdownMenu open={isDownloadMenuOpen} onOpenChange={setIsDownloadMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={isBatchDownloading || plans.length === 0}
                    className={cn(
                      actionBarTheme.controlAccent,
                      "px-3 font-bold text-xs cursor-pointer",
                      (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed"
                    )}
                    title="批次下載教案"
                  >
                    <Download className={cn("w-3.5 h-3.5", !isBatchDownloading && "md:mr-1.5")} />
                    <span className="hidden md:inline">{isBatchDownloading ? "封裝下載中..." : "批次下載"}</span>
                  </Button>
                </DropdownMenuTrigger>
 <DropdownMenuContent align="start" sideOffset={8} className="w-56 bg-background dark:bg-slate-800/95 shadow-[0_16px_40px_rgba(140,120,100,0.06)] border-none rounded-2xl overflow-hidden p-2">
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("word", "all");
 }}
 className="cursor-pointer rounded-lg px-3 py-2.5 font-medium transition-colors focus:bg-stone-50 dark:focus:bg-slate-700/50"
 >
 <FileText className="w-4 h-4 mr-2.5 text-stone-400" />
 所有的 Word
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("pdf", "all");
 }}
 className="cursor-pointer rounded-lg px-3 py-2.5 font-medium transition-colors focus:bg-stone-50 dark:focus:bg-slate-700/50"
 >
 <FileText className="w-4 h-4 mr-2.5 text-rose-400" />
 所有的 PDF
 </DropdownMenuItem>
 <div className="h-px bg-stone-100 dark:bg-slate-700/50 my-1 mx-2"></div>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("word", "filtered");
 }}
 className="cursor-pointer rounded-lg px-3 py-2.5 font-medium transition-colors focus:bg-stone-50 dark:focus:bg-slate-700/50 text-stone-500"
 >
 僅限目前篩選 (Word)
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("pdf", "filtered");
 }}
 className="cursor-pointer rounded-lg px-3 py-2.5 font-medium transition-colors focus:bg-stone-50 dark:focus:bg-slate-700/50 text-stone-500"
 >
 僅限目前篩選 (PDF)
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 <div className="flex-1 hidden md:block"></div>

 <div className="flex items-center gap-2 shrink-0 min-w-max">
 <div className={cn("flex items-center shrink-0 gap-1.5", actionBarTheme.clusterInset)}>
 <button onClick={() => setViewType("grid")} className={cn("p-2 rounded-lg transition-all cursor-pointer group", viewType === "grid" ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)} title="畫廊視圖 (Grid)">
 <LayoutGrid className={cn("w-4 h-4 group-hover:scale-110 transition-transform", viewType === "grid" && "scale-110")} />
 </button>
 <button onClick={() => setViewType("board")} className={cn("p-2 rounded-lg transition-all cursor-pointer group", viewType === "board" ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)} title="看板視圖 (Board)">
 <Kanban className={cn("w-4 h-4 group-hover:scale-110 transition-transform", viewType === "board" && "scale-110")} />
 </button>
 <button onClick={() => setViewType("list")} className={cn("p-2 rounded-lg transition-all cursor-pointer group", viewType === "list" ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)} title="清單視圖 (List)">
 <List className={cn("w-4 h-4 group-hover:scale-110 transition-transform", viewType === "list" && "scale-110")} />
 </button>
 </div>

 <div className={cn(actionBarTheme.separator, "h-4 mx-0.5 shrink-0")} />

 <div className={cn("flex items-center shrink-0 gap-1.5", actionBarTheme.clusterInset)}>
 <button onClick={() => { setSwipeDirection(-1); setFilterGroup('all'); }} className={cn(actionBarTheme.segmented, filterGroup === 'all' ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)}> 
 <span className="md:hidden">全部</span>
 <span className="hidden md:inline">{language === 'zh' ? '全部' : 'All Plans'}</span>
 </button>
 {groups.map((group) => {
 const params = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
 const isActive = filterGroup === group.slug;
 const isHovered = hoveredGroupId === group.id;
 return (
 <button
 key={group.id}
 onClick={() => { setSwipeDirection(1); setFilterGroup(group.slug); }}
 onMouseEnter={() => setHoveredGroupId(group.id)}
 onMouseLeave={() => setHoveredGroupId(null)}
 onFocus={() => setHoveredGroupId(group.id)}
 onBlur={() => setHoveredGroupId(null)}
 style={(isActive || isHovered) ? { backgroundColor: params.uiBg, color: params.uiText } : undefined}
 className={cn(
 actionBarTheme.segmented,
 (isActive || isHovered)
 ? "shadow-sm scale-100"
 : actionBarTheme.segmentedIdle
 )}
 >
 {isActive && (
 <motion.div layoutId="activeGroupPill" className="absolute inset-0 bg-black/5 dark:bg-black/10 mix-blend-multiply rounded-lg pointer-events-none" />
 )}
 <span className="md:hidden">{(language === 'zh' ? group.nameZh : group.nameEn).slice(0, 2)}</span>
 <span className="hidden md:inline relative z-10">{language === 'zh' ? group.nameZh : group.nameEn}</span>
 </button>
 );
 })}
 </div>

 <div className={cn(actionBarTheme.separator, "h-4 mx-0.5 shrink-0")} />

 <div className={cn("flex items-center shrink-0 gap-1.5", actionBarTheme.clusterInset)}>
 <button onClick={() => handleSortClick('updatedAt')} className={cn(actionBarTheme.segmented, sortBy === 'updatedAt' ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)}> 
 <Clock className="w-3.5 h-3.5" />
 <span className="hidden md:inline">修改時間</span>
 {sortBy === 'updatedAt' && (
 <span className="inline-flex items-center text-orange-500 dark:text-amber-500">
 {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
 </span>
 )}
 </button>
 <button onClick={() => handleSortClick('name')} className={cn(actionBarTheme.segmented, sortBy === 'name' ? actionBarTheme.segmentedActive : actionBarTheme.segmentedIdle)}> 
 <FileText className="w-3.5 h-3.5" />
 <span className="hidden md:inline">名稱排序</span>
 {sortBy === 'name' && (
 <span className="inline-flex items-center text-orange-500 dark:text-amber-500">
 {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
 </span>
 )}
 </button>
 </div>
 </div>
 </ActionBar>

 {/* ── TOOLBAR (Filter & Search) ─────────── */}
 <div className="flex flex-col gap-4 mb-4 sm:mb-8 max-w-2xl shrink-0">
 <div className="relative group">
 <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500 group-focus-within:text-orange-500 dark:group-focus-within:text-amber-500 transition-colors" />
 <Input 
 value={searchQuery} 
 onChange={(e) => setSearchQuery(e.target.value)} 
 placeholder="請輸入名稱、分類或相關人員..." 
 className="pl-12 h-12 w-full bg-white dark:bg-slate-800 text-sm sm:text-[15px] focus:ring-2 focus:ring-orange-500/20 border-none transition-all rounded-2xl font-medium shadow-[0_8px_30px_rgba(140,120,100,0.06)] hover:shadow-[0_8px_30px_rgba(140,120,100,0.1)] dark:shadow-none dark:ring-1 dark:ring-white/10" 
 />
 </div>
 </div>

 {/* ── CONTENT ─────────────────────── */}
 <div className="relative overflow-hidden w-full touch-pan-y sm:min-h-[50vh] flex-1 sm:flex-none overflow-y-auto sm:overflow-y-visible pr-1 sm:pr-0">
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
 <div className="bg-white dark:bg-slate-800 rounded-[32px] sm:rounded-[40px] p-12 sm:p-24 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgba(140,120,100,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] min-h-[450px] relative overflow-hidden">

 <motion.div 
 initial={{ y: 10, opacity: 0 }} 
 animate={{ y: 0, opacity: 1 }} 
 transition={{ duration: 0.5, ease: "easeOut" }}
 className="relative z-10 flex flex-col items-center"
 >
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] bg-white dark:bg-slate-800 flex items-center justify-center mb-6 sm:mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] rotate-[-8deg] hover:rotate-[4deg] transition-all duration-500 hover:scale-105">
 <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-stone-300 dark:text-slate-500 drop-shadow-sm" />
 </div>
 <h3 className="text-xl sm:text-2xl font-black text-[#2C2A28] dark:text-slate-100 mb-3 tracking-tight">目前沒有任何教案</h3>
 <p className="text-stone-500/80 dark:text-slate-400 max-w-sm mx-auto text-sm sm:text-[15px] leading-relaxed mb-8">
 請嘗試更改篩選條件或切換分類，或是點擊上方「新增檔案」按鈕建立全新的教案內容。
 </p>
 {isAdmin && (
 <Button 
 onClick={() => handleAddMenuOpenChange(true)} 
 className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 border-none shadow-[0_8px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.4)] transition-all rounded-xl h-11 px-6 font-bold"
 >
 <Plus className="w-4 h-4 mr-2" />
 立即新增教案
 </Button>
 )}

 </motion.div>
 </div>
 ) : viewType === "grid" ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
 {filteredPlans.map((plan, i) => (
 <motion.div key={plan.id} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25, ease: "easeOut" }} className="h-full">
 <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[24px] p-5 sm:p-7 text-left w-full group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_32px_rgba(140,120,100,0.12)] dark:hover:shadow-[0_16px_32px_rgba(0,0,0,0.45)] flex flex-col h-full cursor-pointer shadow-[0_6px_18px_rgba(140,120,100,0.06)] relative overflow-hidden" onClick={() => handleOpenPlan(plan.id)}>

 <div className="flex justify-between items-start mb-4 sm:mb-5 relative z-10">
 <Badge className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-0 inline-flex items-center gap-1.5 shadow-none", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return `${params.lightBg} ${params.lightText}`; })())}>
 <div className={cn("w-1.5 h-1.5 rounded-full", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return params.dot; })())} />
 {(() => {
 const group = getPlanGroup(plan);
 return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
 })()}
 </Badge>
 <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
 {renderPlanActions(plan)}
 <div className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 dark:bg-slate-700/50 shadow-sm text-stone-400 dark:text-slate-400 group-hover:text-stone-600 dark:group-hover:text-slate-200 transition-colors ml-1">
 <ChevronRight className="w-4 h-4" />
 </div>
 </div>
 </div>
 
 <h3 className="font-bold text-base sm:text-[17px] text-[#2C2A28] dark:text-white mb-2 line-clamp-2 leading-[1.4] transition-colors group-hover:text-stone-900 dark:group-hover:text-white">{getPlanDisplayName(plan)}</h3>
 <p className="text-[13px] text-stone-500 dark:text-slate-400 font-medium mb-4 sm:mb-6 flex-1 line-clamp-2 leading-relaxed">{getPlanDisplayCategory(plan)}</p>
 
 <div className="flex items-center justify-between pt-4 sm:pt-5 border-t border-stone-100 dark:border-slate-700/50 mt-auto">
 <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-400 dark:text-slate-500 font-semibold tracking-wide">
 <Clock className="w-3.5 h-3.5 opacity-70" />
 {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
 </div>
 {getPlanDisplayMembers(plan) && (
 <div className="flex items-center justify-center px-2 py-1 bg-stone-50 dark:bg-slate-800 rounded-md gap-1.5 text-[10px] sm:text-[11px] text-stone-500 dark:text-slate-400 font-bold max-w-[120px] truncate">
 <Users className="w-3.5 h-3.5 opacity-70 shrink-0" />
 <span className="truncate">{getPlanDisplayMembers(plan)}</span>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 ) : viewType === "board" ? (
 <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 custom-scrollbar h-full min-h-[600px] snap-x pl-2">
 {groups.map((group, index) => {
 const items = filteredPlans.filter(p => getPlanGroup(p)?.slug === group.slug);
 const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
 return (
 <div key={group.id} className="flex-1 min-w-[320px] max-w-[380px] flex flex-col bg-white/70 dark:bg-slate-800/60 rounded-[24px] p-5 shadow-[0_8px_24px_rgba(140,120,100,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] snap-center transition-colors">
 <div className="flex items-center justify-between mb-5 px-1 shrink-0">
 <h3 className={cn("font-extrabold text-[13px] sm:text-sm px-3 py-1 rounded-full inline-flex items-center gap-2", badgeParams.lightBg, badgeParams.lightText)}>
 <div className={cn("w-2 h-2 rounded-full", badgeParams.dot)}></div>
 {language === 'zh' ? group.nameZh : group.nameEn}
 </h3>
 <div className="text-xs font-bold text-stone-500 bg-stone-200/50 dark:bg-slate-700/50 dark:text-slate-400 px-2 py-0.5 rounded-full">{items.length}</div>
 </div>
 <div className="flex flex-col gap-3 sm:gap-4 h-full overflow-y-auto pr-2 custom-scrollbar">
 {items.map((plan, i) => (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={plan.id}>
 <div onClick={() => handleOpenPlan(plan.id)} className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(140,120,100,0.1)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] shadow-[0_4px_15px_rgba(140,120,100,0.06)] relative overflow-hidden">
 <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
 <h4 className="font-bold text-[14px] leading-tight text-[#2C2A28] dark:text-slate-100 group-hover:text-stone-900 dark:group-hover:text-white transition-colors line-clamp-2">{getPlanDisplayName(plan)}</h4>
 <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-stone-50/80 dark:bg-slate-700/80 rounded-full p-0.5">
 {renderPlanActions(plan)}
 </div>
 </div>
 <p className="text-xs text-stone-500/80 dark:text-slate-400/80 font-medium mb-4 line-clamp-1">{getPlanDisplayCategory(plan)}</p>
 <div className="flex items-center justify-between border-t border-stone-100 dark:border-slate-700/50 pt-3">
 <div className="text-[10px] sm:text-[11px] text-stone-500 dark:text-slate-400 font-bold px-2 py-0.5 bg-[#FBF9F6] dark:bg-slate-900 rounded-md truncate max-w-[150px]">
 {getPlanDisplayMembers(plan) || "—"}
 </div>
 <div className="text-[10px] sm:text-[11px] text-stone-400/80 dark:text-slate-500 font-bold uppercase flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 {items.length === 0 && (
 <div className="flex flex-col items-center justify-center py-10 opacity-60">
 <div className="w-10 h-10 rounded-full bg-stone-200/50 dark:bg-slate-700/50 flex items-center justify-center mb-3">
 <FileText className="w-4 h-4 text-stone-400 dark:text-slate-500" />
 </div>
 <p className="text-[13px] text-stone-400 dark:text-slate-500 font-medium">尚未新增教案</p>
 </div>
 )}
 </div>
 </div>
 )
 })}
 </div>
 ) : (
 <div className="w-full overflow-x-auto pb-6">
 <table className="w-full text-left border-collapse min-w-[800px] bg-transparent transform-gpu" style={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
 <thead className="bg-[#FBF9F6]/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
 <tr className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-stone-500/80 dark:text-slate-400">
 <th className="px-6 py-5 font-semibold rounded-l-[16px]">檔案名稱</th>
 <th className="px-6 py-5 font-semibold">所屬模組 / 群組</th>
 <th className="px-6 py-5 font-semibold">自訂分類</th>
 <th className="px-6 py-5 font-semibold">協作者列表</th>
 <th className="px-6 py-5 font-semibold">最後修改時間</th>
 <th className="px-6 py-5 font-semibold text-right rounded-r-[16px]">快速操作</th>
 </tr>
 </thead>
 <tbody className="space-y-2">
 {filteredPlans.map((plan, i) => (
 <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer group shadow-[0_6px_18px_rgba(140,120,100,0.08)] hover:shadow-[0_10px_28px_rgba(140,120,100,0.1)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 outline-none relative overflow-hidden">
 <td className="px-6 py-5 font-bold text-[14px] sm:text-[15px] text-[#2C2A28] dark:text-slate-100 group-hover:text-stone-900 dark:group-hover:text-white transition-colors rounded-l-[20px] max-w-[280px] relative z-10">
 <div className="truncate pr-4">{getPlanDisplayName(plan)}</div>
 </td>
 <td className="px-6 py-5">
 <Badge className={cn("px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest border-0 inline-flex items-center gap-1.5 shadow-none", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return `${params.lightBg} ${params.lightText}`; })())}>
 <div className={cn("w-1.5 h-1.5 rounded-full", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return params.dot; })())} />
 {(() => {
 const group = getPlanGroup(plan);
 return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
 })()}
 </Badge>
 </td>
 <td className="px-6 py-5 text-stone-500/90 dark:text-slate-400 font-medium text-[13px] max-w-[150px] truncate">{getPlanDisplayCategory(plan) || "—"}</td>
 <td className="px-6 py-5 text-stone-500/90 dark:text-slate-400 font-medium text-[13px] max-w-[150px]">
 <div className="truncate px-2 py-1 bg-stone-50 dark:bg-slate-900 rounded-md w-fit">
 {getPlanDisplayMembers(plan) || "—"}
 </div>
 </td>
 <td className="px-6 py-5 text-stone-400 dark:text-slate-500/80 text-[12px] font-bold uppercase tracking-wide gap-1.5 flex items-center h-full min-h-[72px]">
 <Clock className="w-3.5 h-3.5" />
 {plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}
 </td>
 <td className="px-6 py-5 rounded-r-[20px]" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end opacity-60 group-hover:opacity-100 transition-opacity">
 {renderPlanActions(plan)}
 </div>
 </td>
 </motion.tr>
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
 <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-slate-800 p-8 rounded-xl max-w-sm w-full relative space-y-6 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="space-y-2">
 <h4 className="text-lg font-semibold text-[#2C2A28] dark:text-white">刪除文件</h4>
 <p className="text-sm text-stone-500 dark:text-slate-400">請輸入 <span className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded">delete</span> 刪除「{deleteTarget.name}」。此操作不可復原。</p>
 </div>
 <Input
 type="text" value={deleteInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)} placeholder="delete"
 className="w-full bg-[#FBF9F6] dark:bg-slate-900  dark: rounded-md font-mono text-sm focus:ring-rose-500 focus:"
 />
 <div className="flex justify-end gap-3 pt-2">
 <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 font-medium text-stone-600 dark:text-slate-300">取消</Button>
 <Button variant="destructive" onClick={confirmDelete} disabled={deleteInput !== "delete"} className="h-9 font-medium px-6 bg-rose-600 hover:bg-rose-700 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
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
