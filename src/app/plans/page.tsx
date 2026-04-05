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
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n-context";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LessonPlan } from "@/types/plan";
import { exportPlansAsZip, exportToDocx, exportToPdf } from "@/lib/export-utils";

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
 const [isBatchDownloading, setIsBatchDownloading] = useState(false);
 const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterGroup, setFilterGroup] = useState<string>("all");
 const [sortBy, setSortBy] = useState<"updatedAt" | "name">("updatedAt");
 const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
 const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
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
 className="overflow-x-clip bg-[#FBF9F6] dark:bg-slate-900 text-[#2C2A28] dark:text-slate-50 transition-colors selection:bg-orange-200 dark:selection:bg-amber-500/30 font-sans touch-pan-y overscroll-x-none"
 onTouchStart={handleSwipeStart}
 onTouchEnd={handleSwipeEnd}
 >
 <div className="max-w-6xl mx-auto pt-28 sm:pt-24 pb-6 sm:pb-12 md:pb-16 px-4 sm:px-6 md:px-8 touch-pan-y">
 {/* ── HEADER ─────────────── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-16 dark: pb-6 sm:pb-8">
 <div className="flex-1 min-w-0">
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A28] dark:text-white mb-1.5 sm:mb-2">
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
 <DropdownMenu open={isAdding} onOpenChange={handleAddMenuOpenChange}>
 <DropdownMenuTrigger asChild>
 <Button
 className={cn("shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28] h-8 md:h-9 px-2 md:px-3.5 font-semibold text-[11px] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm", !isAdmin && "opacity-60")}
 >
 {!isAdmin && <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />}
 <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-1.5" />
 <span className="hidden md:inline">新增檔案</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="start"
 sideOffset={8}
 className="w-56 bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(140,120,100,0.05)] dark:shadow-none border-none"
 >
 {groups.map((group) => (
 <DropdownMenuItem
 key={group.id}
 onSelect={() => handleCreatePlan(group.slug)}
 className="cursor-pointer"
 >
 {language === 'zh' ? group.nameZh : group.nameEn}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 <DropdownMenu open={isDownloadMenuOpen} onOpenChange={setIsDownloadMenuOpen}>
 <DropdownMenuTrigger asChild>
 <Button
 disabled={isBatchDownloading || plans.length === 0}
 className={cn(
 "shrink-0 h-8 md:h-9 px-2 md:px-3.5 font-semibold text-[11px] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm",
 "bg-orange-600 hover:bg-orange-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28]",
 (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed"
 )}
 title="批次下載教案"
 >
 <Download className={cn("w-3.5 h-3.5 md:w-4 md:h-4", !isBatchDownloading && "md:mr-1.5")} />
 <span className="hidden md:inline">{isBatchDownloading ? "下載中..." : "下載全部"}</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" sideOffset={8} className="w-56 bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("word", "all");
 }}
 className="cursor-pointer"
 >
 Word 全部
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("pdf", "all");
 }}
 className="cursor-pointer"
 >
 PDF 全部
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("word", "filtered");
 }}
 className="cursor-pointer"
 >
 目前篩選 Word
 </DropdownMenuItem>
 <DropdownMenuItem
 onSelect={(e) => {
 e.preventDefault();
 void handleBatchDownload("pdf", "filtered");
 }}
 className="cursor-pointer"
 >
 目前篩選 PDF
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>

 <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-md dark: shrink-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <button onClick={() => setViewType("grid")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "grid" ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="畫廊視圖 (Grid)">
 <LayoutGrid className="w-4 h-4" />
 </button>
 <button onClick={() => setViewType("board")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "board" ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="看板視圖 (Board)">
 <Kanban className="w-4 h-4" />
 </button>
 <button onClick={() => setViewType("list")} className={cn("p-1 md:p-1.5 rounded-sm transition-all cursor-pointer", viewType === "list" ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")} title="清單視圖 (List)">
 <List className="w-4 h-4" />
 </button>
 </div>

 <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg dark: shadow-sm shrink-0 border-none">
 <button onClick={() => { setSwipeDirection(-1); setFilterGroup('all'); }} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap", filterGroup === 'all' ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
 <span className="md:hidden">全</span>
 <span className="hidden md:inline">{language === 'zh' ? '全部' : 'All'}</span>
 </button>
 {groups.map((group) => (
 <button key={group.id} onClick={() => { setSwipeDirection(1); setFilterGroup(group.slug); }} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap", filterGroup === group.slug ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
 <span className="md:hidden">{(language === 'zh' ? group.nameZh : group.nameEn).slice(0, 2)}</span>
 <span className="hidden md:inline">{language === 'zh' ? group.nameZh : group.nameEn}</span>
 </button>
 ))}
 </div>

 <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg dark: shrink-0 shadow-sm border-none">
 <button onClick={() => handleSortClick('updatedAt')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap inline-flex items-center gap-1", sortBy === 'updatedAt' ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
 <Clock className="w-3.5 h-3.5 md:hidden" />
 <span className="hidden md:inline">時間排序</span>
 {sortBy === 'updatedAt' && (
 <span className="inline-flex items-center">
 {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
 </span>
 )}
 </button>
 <button onClick={() => handleSortClick('name')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap inline-flex items-center gap-1", sortBy === 'name' ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm" : "text-stone-400 hover:text-stone-600 dark:hover:text-slate-300")}>
 <FileText className="w-3.5 h-3.5 md:hidden" />
 <span className="hidden md:inline">名稱排序</span>
 {sortBy === 'name' && (
 <span className="inline-flex items-center">
 {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
 </span>
 )}
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
 className="pl-9 h-9 sm:h-10 w-full bg-white dark:bg-slate-800 focus:ring-orange-500 transition-shadow rounded-lg font-medium text-sm shadow-[0_8px_30px_rgba(140,120,100,0.05)]" 
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
 <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-12 sm:p-20 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FBF9F6] dark:bg-slate-900 flex items-center justify-center mb-3 sm:mb-4 dark: border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-stone-300 dark:text-slate-600" />
 </div>
 <h3 className="text-base sm:text-lg font-semibold text-[#2C2A28] dark:text-slate-200 mb-1">查無文件</h3>
 <p className="text-stone-500 dark:text-slate-400 max-w-xs mx-auto text-xs sm:text-sm">找不到符合條件的教案，或尚無文件可供顯示。</p>
 </div>
 ) : viewType === "grid" ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
 {filteredPlans.map((plan, i) => (
 <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.2 }} className="h-full">
 <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 text-left w-full group transition-all duration-300 hover: dark:hover: flex flex-col h-full cursor-pointer shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" onClick={() => handleOpenPlan(plan.id)}>
 <div className="flex justify-between items-start mb-3 sm:mb-4">
 <Badge className={cn("px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border-none", plan.category === "activity" ? "bg-blue-50 text-blue-600  dark:bg-blue-900/30 dark:text-blue-400 dark:" : "bg-emerald-50 text-emerald-600  dark:bg-emerald-900/30 dark:text-emerald-400 dark:")}>
 {(() => {
 const group = getPlanGroup(plan);
 return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
 })()}
 </Badge>
 <div className="flex items-center gap-1">
 {renderPlanActions(plan)}
 <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors" />
 </div>
 </div>
 
 <h3 className="font-semibold text-sm sm:text-base text-[#2C2A28] dark:text-slate-100 mb-1 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{getPlanDisplayName(plan)}</h3>
 <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mb-3 sm:mb-4 flex-1">{getPlanDisplayCategory(plan)}</p>
 
 <div className="flex items-center gap-4 pt-3 sm:pt-4 dark: mt-auto">
 <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-stone-400 dark:text-slate-500 font-medium">
 <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
 {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
 </div>
 {getPlanDisplayMembers(plan) && (
 <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-stone-400 dark:text-slate-500 font-medium">
 <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
 <span className="line-clamp-1 max-w-[80px]">{getPlanDisplayMembers(plan)}</span>
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
 <div key={group.id} className="flex-1 min-w-[320px] max-w-sm flex flex-col bg-stone-100/50 dark:bg-slate-800/30 rounded-2xl p-4 dark: shadow-sm snap-center border-none">
 <div className="flex items-center justify-between mb-4 px-1 shrink-0">
 <h3 className="font-bold text-sm text-[#2C2A28] dark:text-slate-100 flex items-center gap-2">
 <div className={cn("w-2 h-2 rounded-full", color)}></div>
 {language === 'zh' ? group.nameZh : group.nameEn}
 </h3>
 <span className="text-xs font-bold text-stone-400 dark:text-slate-500">{items.length}</span>
 </div>
 <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar">
 {items.map(plan => (
 <div key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="bg-white dark:bg-slate-800 border-none rounded-xl p-4 cursor-pointer hover: dark:hover: transition-all shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <div className="flex items-start justify-between gap-2 mb-1">
 <h4 className="font-semibold text-[13px] text-[#2C2A28] dark:text-slate-100 mb-1 line-clamp-2">{getPlanDisplayName(plan)}</h4>
 {renderPlanActions(plan)}
 </div>
 <p className="text-[10px] text-stone-500 dark:text-slate-400 font-medium mb-3">{getPlanDisplayCategory(plan)}</p>
 <div className="flex items-center justify-between text-[9px] text-stone-400 dark:text-slate-500 font-black tracking-widest uppercase">
 <span>{getPlanDisplayMembers(plan) || "—"}</span>
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
 <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <table className="w-full text-sm text-left">
 <thead className="bg-[#FBF9F6] dark:bg-slate-900/50  dark:">
 <tr className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">
 <th className="px-6 py-4 font-medium">檔案名稱</th>
 <th className="px-6 py-4 font-medium">類型</th>
 <th className="px-6 py-4 font-medium">分類</th>
 <th className="px-6 py-4 font-medium">協作者</th>
 <th className="px-6 py-4 font-medium">最後修改</th>
 <th className="px-6 py-4 font-medium text-right">操作</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100 dark:divide-slate-700/50">
 {filteredPlans.map((plan) => (
 <tr key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="hover:bg-[#FBF9F6] dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
 <td className="px-6 py-4 font-semibold text-[#2C2A28] dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{getPlanDisplayName(plan)}</td>
 <td className="px-6 py-4">
 <Badge className={cn("px-2 py-0 text-[9px] font-bold uppercase border-none", plan.category === "activity" ? "bg-blue-50 text-blue-600  dark:bg-blue-900/30 dark:text-blue-400 dark:" : "bg-emerald-50 text-emerald-600  dark:bg-emerald-900/30 dark:text-emerald-400 dark:")}>
 {(() => {
 const group = getPlanGroup(plan);
 return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
 })()}
 </Badge>
 </td>
 <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{getPlanDisplayCategory(plan) || "—"}</td>
 <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{getPlanDisplayMembers(plan) || "—"}</td>
 <td className="px-6 py-4 text-stone-400 dark:text-slate-500 text-xs font-medium">{plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}</td>
 <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end">{renderPlanActions(plan)}</div>
 </td>
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
