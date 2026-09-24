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
 ArrowUpRight,
 ArrowRight,
 ArrowUpDown,
 X,
 SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActionBar } from "@/components/ActionBar";
import { actionBarTheme } from "@/lib/actionbar-theme";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { FabStagger } from "@/components/FabStagger";
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
import fallbackImagesData from "@/data/fallback-images.json";

function getDeterministicIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function PlansOverview() {
 const { role } = useAuth();
 const { plans, addPlan, groups, setActivePlanId, activeCampId, camps, deletePlan, updatePlan } = usePlans();
 const { language } = useTranslation();
 const router = useRouter();
 const searchParams = useSearchParams();
 const { toast } = useToast();
 const activeCamp = camps.find(c => c.id === activeCampId);
 const isAdmin = role === 'admin';

 const [viewType, setViewType] = useState<"grid" | "list" | "board">("list");
 const [isAdding, setIsAdding] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
 const [deleteInput, setDeleteInput] = useState("");
 const [isBatchDownloading, setIsBatchDownloading] = useState(false);
 const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterGroup, setFilterGroup] = useState<string>("all");
 const [sortBy, setSortBy] = useState<"updatedAt" | "name" | "category">("updatedAt");
 const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
 const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
 const [activeFab, setActiveFab] = useState<string | null>(null);
 const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
 const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
 const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

 const handleSortClick = (nextSortBy: "updatedAt" | "name" | "category") => {
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
 const getPlanDisplayMembers = (plan: typeof plans[number]) => {
   if (plan.leadMember || plan.assistantMember) {
     return [plan.leadMember, plan.assistantMember].filter(Boolean).join('、');
   }
   return toPlainText(plan.members);
 };

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

  useEffect(() => {
    const el = tabRefs.current[filterGroup];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [filterGroup]);

  const switchGroupByDirection = (direction: 1 | -1) => {
    if (groupOrder.length <= 1) return;
    const currentIndex = groupOrder.indexOf(filterGroup);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = safeIndex + direction;
    if (nextIndex < 0 || nextIndex >= groupOrder.length) return;
    setSwipeDirection(direction);
    setFilterGroup(groupOrder[nextIndex]);
  };

  const handleSwipeStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.action-bar-container') ||
      target.closest('.plans-mobile-bar') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.group-tabs-scroll')
    ) {
      swipeStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleSwipeEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (viewType === "board") {
      swipeStartRef.current = null;
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest('.action-bar-container') ||
      target.closest('.plans-mobile-bar') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.group-tabs-scroll')
    ) {
      swipeStartRef.current = null;
      return;
    }
    const start = swipeStartRef.current;
    if (!start) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - start.x;
    const deltaY = t.clientY - start.y;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
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
 toPlainText(p.members).toLowerCase().includes(q) ||
 (p.leadMember && p.leadMember.toLowerCase().includes(q)) ||
 (p.assistantMember && p.assistantMember.toLowerCase().includes(q))
 );
 }
 result = [...result].sort((a, b) => {
  if (sortBy === "updatedAt") {
    const timeCompare = (a.updatedAt || 0) - (b.updatedAt || 0);
    return sortDirection === "asc" ? timeCompare : -timeCompare;
  } else if (sortBy === "category") {
    const catA = getPlanDisplayCategory(a) || "";
    const catB = getPlanDisplayCategory(b) || "";
    const catCompare = catA.localeCompare(catB, "zh-Hant-TW");
    return sortDirection === "asc" ? catCompare : -catCompare;
  } else {
    const nameCompare = toPlainText(a.activityName).localeCompare(toPlainText(b.activityName), "zh-Hant-TW");
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
            className="h-8 w-8 inline-flex items-center justify-center rounded-full text-stone-400 hover:text-foreground hover:bg-stone-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="教案操作"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
          className="w-48 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5"
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleDownloadPlan(plan, "word");
            }}
            className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-orange-500" />
            <span>下載 Word (.docx)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleDownloadPlan(plan, "pdf");
            }}
            className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>下載 PDF (.pdf)</span>
          </DropdownMenuItem>
          {isAdmin && groups.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-400" />
                <span>更換組別</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5">
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
                      className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                      <span className={cn("w-2 h-2 rounded-full shadow-xs shrink-0", params.colorDot)} />
                      <span>{language === 'zh' ? group.nameZh : group.nameEn}</span>
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
              className="cursor-pointer text-xs py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-500/10 focus:text-rose-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>刪除教案</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div 
      className="overflow-x-clip bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground transition-colors font-sans touch-auto overscroll-x-none relative min-h-screen flex flex-col sm:block"
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="max-w-[1720px] mx-auto pt-24 sm:pt-32 pb-28 sm:pb-24 px-4 sm:px-8 md:px-12 xl:px-16 touch-auto relative z-10 w-full">
        {/* ── HEADER ─────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200/80 dark:border-white/10 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rotate-45 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] inline-block" />
              <span className="text-xs font-mono tracking-widest text-orange-600 dark:text-orange-400 font-medium uppercase">
                {activeCamp?.name?.toUpperCase() || "NTUT CHONG DE"} // CURRICULUM DIRECTORY
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-normal tracking-[-0.03em] uppercase leading-[0.96] text-foreground">
              {language === 'zh' ? '教案總覽' : 'Plans Overview'}
              <span className="text-fg-muted font-light ml-3 text-lg sm:text-2xl">
                CURRICULUM DIRECTORY
              </span>
            </h1>
            <p className="text-sm sm:text-base text-fg-secondary font-light max-w-2xl leading-relaxed mt-3">
              {language === 'zh' ? '營隊核心教案架構、即時同步修訂與分工總覽。' : 'Core curriculum architecture, real-time collaboration, and division of responsibilities.'}
            </p>
          </div>

          {/* Actions Cluster (Desktop Only - Mobile is merged to side FAB) */}
          <div className="hidden md:flex flex-wrap items-center gap-3 shrink-0">
            {/* Add Plan Button */}
            <DropdownMenu open={isAdding} onOpenChange={handleAddMenuOpenChange}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "group inline-flex items-center gap-2.5 px-6 sm:px-7 py-3 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer",
                    !isAdmin && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {!isAdmin ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>新增檔案</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5"
              >
                {groups.map((group) => {
                  const params = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                  return (
                    <DropdownMenuItem
                      key={group.id}
                      onSelect={() => handleCreatePlan(group.slug)}
                      className="cursor-pointer font-medium text-xs py-2.5 px-3 rounded-xl hover:bg-orange-500/10 hover:text-orange-600 transition-colors flex items-center gap-2"
                    >
                      <span className={cn("w-2 h-2 rounded-full shadow-xs shrink-0", params.colorDot)} />
                      {language === 'zh' ? group.nameZh : group.nameEn}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Batch Export Button */}
            <DropdownMenu open={isDownloadMenuOpen} onOpenChange={setIsDownloadMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={isBatchDownloading || plans.length === 0}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-foreground/80 hover:text-foreground bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/10 border border-stone-200/90 dark:border-white/15 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer",
                    (isBatchDownloading || plans.length === 0) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Download className="w-3.5 h-3.5 text-orange-500" />
                  <span>{isBatchDownloading ? "封裝下載中..." : "批次匯出"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-60 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5"
              >
                <div className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-fg-muted uppercase">
                  全部教案匯出 (ALL PLANS)
                </div>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleBatchDownload("word", "all");
                  }}
                  className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>所有 Word (.docx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleBatchDownload("pdf", "all");
                  }}
                  className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>所有 PDF (.pdf)</span>
                </DropdownMenuItem>
                <div className="h-px bg-stone-200/60 dark:bg-white/10 my-1 mx-2" />
                <div className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-fg-muted uppercase">
                  目前篩選結果 (FILTERED)
                </div>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleBatchDownload("word", "filtered");
                  }}
                  className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2 text-fg-secondary"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>僅限目前篩選 (Word)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleBatchDownload("pdf", "filtered");
                  }}
                  className="cursor-pointer text-xs py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2 text-fg-secondary"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>僅限目前篩選 (PDF)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── 4-COLUMN HUD METRICS STRIP ── */}
        {/* Desktop Full HUD Strip */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 sm:gap-6 pb-6 mb-8 border-b border-stone-200/80 dark:border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 rotate-45 bg-orange-500" />
              01 / TOTAL PLANS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight text-foreground">
                {plans.length}
              </span>
              <span className="text-xs font-mono text-fg-muted uppercase">RECORDS</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 rotate-45 bg-orange-500" />
              02 / ACTIVE CAMP
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-xl font-normal font-mono tracking-tight text-orange-600 dark:text-orange-400 truncate">
                {activeCamp?.name || "ALL EDITIONS"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 rotate-45 bg-orange-500" />
              03 / DIVISIONS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight text-foreground">
                {groups.length}
              </span>
              <span className="text-xs font-mono text-fg-muted uppercase">TEAMS</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 rotate-45 bg-orange-500" />
              04 / VIEW MODE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-xl font-medium font-mono tracking-wider text-foreground uppercase">
                [ {viewType.toUpperCase()} ]
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Compact Micro HUD Strip (drastically reduced footprint) */}
        <div className="md:hidden grid grid-cols-4 gap-2 py-2 px-3 mb-4 rounded-xl bg-white/60 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 backdrop-blur-sm">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono tracking-tight text-fg-muted uppercase flex items-center gap-1 truncate">
              <span className="w-1 h-1 rotate-45 bg-orange-500 shrink-0" />
              01/PLANS
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-light font-mono text-foreground leading-none">
                {plans.length}
              </span>
              <span className="text-[9px] font-mono text-fg-muted uppercase">REC</span>
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono tracking-tight text-fg-muted uppercase flex items-center gap-1 truncate">
              <span className="w-1 h-1 rotate-45 bg-orange-500 shrink-0" />
              02/CAMP
            </span>
            <span className="text-xs font-mono text-orange-600 dark:text-orange-400 truncate mt-0.5 leading-none">
              {activeCamp?.name || "ALL"}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono tracking-tight text-fg-muted uppercase flex items-center gap-1 truncate">
              <span className="w-1 h-1 rotate-45 bg-orange-500 shrink-0" />
              03/TEAMS
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-light font-mono text-foreground leading-none">
                {groups.length}
              </span>
              <span className="text-[9px] font-mono text-fg-muted uppercase">DIV</span>
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono tracking-tight text-fg-muted uppercase flex items-center gap-1 truncate">
              <span className="w-1 h-1 rotate-45 bg-orange-500 shrink-0" />
              04/VIEW
            </span>
            <span className="text-xs font-mono font-medium text-foreground uppercase mt-0.5 leading-none truncate">
              {viewType}
            </span>
          </div>
        </div>

        {/* ── TOP GROUP TABS (Google Play Style Sticky) ── */}
        <div className="sticky top-[56px] sm:top-[60px] z-30 -mx-4 px-4 sm:-mx-8 sm:px-8 md:-mx-12 md:px-12 xl:-mx-16 xl:px-16 bg-[#FAF8F5]/95 dark:bg-[#0B1012]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-white/10 mb-4 sm:mb-6 overflow-hidden pt-2 transition-all">
          <div className="group-tabs-scroll flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar px-1 pb-0">
            <button
              ref={(el) => { tabRefs.current['all'] = el; }}
              onClick={() => {
                const currentIndex = groupOrder.indexOf(filterGroup);
                setSwipeDirection(currentIndex > 0 ? -1 : 1);
                setFilterGroup('all');
              }}
              className={cn(
                "relative pb-3 pt-1 text-sm sm:text-base font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 focus:outline-none select-none",
                filterGroup === 'all'
                  ? "font-bold text-foreground"
                  : "text-stone-500 dark:text-stone-400 hover:text-foreground font-normal"
              )}
            >
              <span>全部 ALL</span>
              <span className="text-xs opacity-75 font-mono font-normal">({plans.length})</span>
              {filterGroup === 'all' && (
                <motion.div
                  layoutId="group-tab-underline"
                  className="absolute bottom-0 inset-x-0 h-[3px] bg-orange-500 rounded-full shadow-[0_1px_6px_rgba(249,115,22,0.4)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>

            {groups.map((group) => {
              const isActive = filterGroup === group.slug;
              const count = plans.filter((p) => getPlanGroup(p)?.slug === group.slug).length;

              return (
                <button
                  key={group.id}
                  ref={(el) => { tabRefs.current[group.slug] = el; }}
                  onClick={() => {
                    const currentIndex = groupOrder.indexOf(filterGroup);
                    const targetIndex = groupOrder.indexOf(group.slug);
                    setSwipeDirection(targetIndex >= currentIndex ? 1 : -1);
                    setFilterGroup(group.slug);
                  }}
                  className={cn(
                    "relative pb-3 pt-1 text-sm sm:text-base font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 focus:outline-none select-none",
                    isActive
                      ? "font-bold text-foreground"
                      : "text-stone-500 dark:text-stone-400 hover:text-foreground font-normal"
                  )}
                >
                  <span>{language === 'zh' ? group.nameZh : group.nameEn}</span>
                  <span className="text-xs opacity-75 font-mono font-normal">({count})</span>
                  {isActive && (
                    <motion.div
                      layoutId="group-tab-underline"
                      className="absolute bottom-0 inset-x-0 h-[3px] bg-orange-500 rounded-full shadow-[0_1px_6px_rgba(249,115,22,0.4)]"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TOOLBAR (Filter, Search & Controls) ─────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 sm:mb-12">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="請搜尋教案名稱、類別或人員..."
              className="w-full pl-11 pr-14 h-12 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/10 backdrop-blur-md text-sm sm:text-base font-normal text-foreground placeholder:text-fg-muted focus:outline-none focus:border-orange-500/80 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-fg-muted hover:text-orange-500 flex items-center gap-1 z-10 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>CLEAR</span>
              </button>
            )}
          </div>

          {/* Secondary Controls (Sort & View Mode) */}
          <div className="hidden md:flex items-center gap-3 shrink-0 self-end lg:self-auto">
              {/* Sort Controls */}
              <div className="flex items-center gap-1 bg-white/60 dark:bg-white/[0.03] p-1 rounded-full border border-stone-200/80 dark:border-white/10">
                <button
                  onClick={() => handleSortClick('updatedAt')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                    sortBy === 'updatedAt' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium" : "text-fg-muted hover:text-foreground"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">時間</span>
                  {sortBy === 'updatedAt' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />
                  )}
                </button>

                <button
                  onClick={() => handleSortClick('name')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                    sortBy === 'name' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium" : "text-fg-muted hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">名稱</span>
                  {sortBy === 'name' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />
                  )}
                </button>

                <button
                  onClick={() => handleSortClick('category')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                    sortBy === 'category' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium" : "text-fg-muted hover:text-foreground"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">類別</span>
                  {sortBy === 'category' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />
                  )}
                </button>
              </div>

              {/* View Switcher Pill */}
              <div className="flex items-center gap-1 bg-white/60 dark:bg-white/[0.03] p-1 rounded-full border border-stone-200/80 dark:border-white/10">
                <button
                  onClick={() => setViewType("list")}
                  className={cn(
                    "p-2 rounded-full transition-all cursor-pointer",
                    viewType === "list" ? "bg-orange-500 text-white shadow-xs" : "text-fg-muted hover:text-foreground"
                  )}
                  title="清單視圖 (List)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewType("grid")}
                  className={cn(
                    "p-2 rounded-full transition-all cursor-pointer",
                    viewType === "grid" ? "bg-orange-500 text-white shadow-xs" : "text-fg-muted hover:text-foreground"
                  )}
                  title="畫廊視圖 (Grid)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewType("board")}
                  className={cn(
                    "p-2 rounded-full transition-all cursor-pointer",
                    viewType === "board" ? "bg-orange-500 text-white shadow-xs" : "text-fg-muted hover:text-foreground"
                  )}
                  title="看板視圖 (Board)"
                >
                  <Kanban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        {/* ── MOBILE FIXED SIDE BAR (Vertical FABs) ─────────── */}
        <div className="md:hidden">
          <AnimatePresence>
            {activeFab && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60]"
                onClick={() => setActiveFab(null)}
              />
            )}
          </AnimatePresence>

          <FabStagger className="fixed bottom-20 right-3 z-[65] flex flex-col items-end gap-3 pointer-events-none [&>*]:pointer-events-auto">
            {/* 01. View Mode Circle FAB */}
            <div className="relative flex items-center justify-end">
              <AnimatePresence>
                {activeFab === 'view' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-14 bg-white dark:bg-[#14191C] backdrop-blur-xl border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-col w-44 z-20"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
                      檢視版型 VIEW
                    </div>
                    <button
                      onClick={() => { setViewType("list"); setActiveFab(null); }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        viewType === "list"
                          ? "bg-orange-500 text-white font-medium shadow-xs"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <List className="w-4 h-4" />
                      <span>清單 List</span>
                    </button>
                    <button
                      onClick={() => { setViewType("grid"); setActiveFab(null); }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        viewType === "grid"
                          ? "bg-orange-500 text-white font-medium shadow-xs"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>畫廊 Grid</span>
                    </button>
                    <button
                      onClick={() => { setViewType("board"); setActiveFab(null); }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        viewType === "board"
                          ? "bg-orange-500 text-white font-medium shadow-xs"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <Kanban className="w-4 h-4" />
                      <span>看板 Board</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveFab(activeFab === 'view' ? null : 'view')}
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none cursor-pointer",
                  activeFab === 'view'
                    ? "bg-orange-500 text-white border-transparent shadow-orange-500/30"
                    : "bg-white/90 dark:bg-[#14191C]/90 border-stone-200/60 dark:border-white/10 text-foreground"
                )}
                title="切換檢視版型"
              >
                {viewType === "list" && <List className="w-4 h-4" />}
                {viewType === "grid" && <LayoutGrid className="w-4 h-4" />}
                {viewType === "board" && <Kanban className="w-4 h-4" />}
              </motion.button>
            </div>

            {/* 02. Sort Order Circle FAB */}
            <div className="relative flex items-center justify-end">
              <AnimatePresence>
                {activeFab === 'sort' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-14 bg-white dark:bg-[#14191C] backdrop-blur-xl border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-col w-52 z-20"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
                        排序方式 SORT
                      </div>
                      {(sortBy !== 'updatedAt' || sortDirection !== 'desc') && (
                        <button
                          onClick={() => { setSortBy('updatedAt'); setSortDirection('desc'); }}
                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                        >
                          重設
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleSortClick('updatedAt')}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        sortBy === 'updatedAt'
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>更新時間</span>
                      </div>
                      {sortBy === 'updatedAt' && (
                        <span className="text-[10px] flex items-center gap-0.5 text-orange-500 font-mono">
                          {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {sortDirection === 'asc' ? '升冪' : '降冪'}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSortClick('name')}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        sortBy === 'name'
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>教案名稱</span>
                      </div>
                      {sortBy === 'name' && (
                        <span className="text-[10px] flex items-center gap-0.5 text-orange-500 font-mono">
                          {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {sortDirection === 'asc' ? 'A→Z' : 'Z→A'}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSortClick('category')}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs font-mono rounded-xl transition-colors cursor-pointer",
                        sortBy === 'category'
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5" />
                        <span>分類組別</span>
                      </div>
                      {sortBy === 'category' && (
                        <span className="text-[10px] flex items-center gap-0.5 text-orange-500 font-mono">
                          {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {sortDirection === 'asc' ? '升冪' : '降冪'}
                        </span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveFab(activeFab === 'sort' ? null : 'sort')}
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none cursor-pointer",
                  activeFab === 'sort' || (sortBy !== 'updatedAt' || sortDirection !== 'desc')
                    ? "bg-orange-500 text-white border-transparent shadow-orange-500/30"
                    : "bg-white/90 dark:bg-[#14191C]/90 border-stone-200/60 dark:border-white/10 text-foreground"
                )}
                title="排序方式"
              >
                <ArrowUpDown className="w-4 h-4" />
                {(sortBy !== 'updatedAt' || sortDirection !== 'desc') && activeFab !== 'sort' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-[#14191C]" />
                )}
              </motion.button>
            </div>

            {/* 03. Group Filter Circle FAB */}
            <div className="relative flex items-center justify-end">
              <AnimatePresence>
                {activeFab === 'filter' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-14 bottom-0 bg-white dark:bg-[#14191C] backdrop-blur-xl border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-col w-56 max-h-[60vh] overflow-y-auto z-20"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
                        分組篩選 GROUPS
                      </div>
                      <span className="text-[10px] text-foreground font-mono">{filteredPlans.length} 篇</span>
                    </div>
                    <button
                      onClick={() => { setFilterGroup('all'); setActiveFab(null); }}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer text-left",
                        filterGroup === 'all'
                          ? "bg-orange-500 text-white font-medium shadow-xs"
                          : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                      )}
                    >
                      <span>全部教案 ALL</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-mono",
                        filterGroup === 'all' ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-fg-muted"
                      )}>
                        {plans.length}
                      </span>
                    </button>
                    {groups.map((group) => {
                      const isActive = filterGroup === group.slug;
                      const count = plans.filter((p) => getPlanGroup(p)?.slug === group.slug).length;
                      const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                      return (
                        <button
                          key={`fab-group-${group.id}`}
                          onClick={() => { setFilterGroup(group.slug); setActiveFab(null); }}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer text-left mt-0.5",
                            isActive
                              ? "bg-orange-500 text-white font-medium shadow-xs"
                              : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-xs", isActive ? "bg-white" : badgeParams.colorDot)} />
                            <span>{language === 'zh' ? group.nameZh : group.nameEn}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-mono",
                            isActive ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-fg-muted"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveFab(activeFab === 'filter' ? null : 'filter')}
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none cursor-pointer",
                  activeFab === 'filter' || filterGroup !== 'all'
                    ? "bg-orange-500 text-white border-transparent shadow-orange-500/30"
                    : "bg-white/90 dark:bg-[#14191C]/90 border-stone-200/60 dark:border-white/10 text-foreground"
                )}
                title="分組篩選"
              >
                <Filter className="w-4 h-4" />
                {filterGroup !== 'all' && activeFab !== 'filter' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-[#14191C]" />
                )}
              </motion.button>
            </div>

            {/* 04. Batch Download Circle FAB */}
            <div className="relative flex items-center justify-end">
              <AnimatePresence>
                {activeFab === 'download' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-14 bottom-0 bg-white dark:bg-[#14191C] backdrop-blur-xl border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-col w-52 z-20"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
                      批次匯出 EXPORT
                    </div>
                    <button
                      onClick={() => { void handleBatchDownload("word", "all"); setActiveFab(null); }}
                      className="flex items-center px-3 py-2 text-left font-mono text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors text-foreground cursor-pointer"
                    >
                      <FileText className="w-4 h-4 mr-2 text-orange-500" />
                      <span>所有 Word (.docx)</span>
                    </button>
                    <button
                      onClick={() => { void handleBatchDownload("pdf", "all"); setActiveFab(null); }}
                      className="flex items-center px-3 py-2 text-left font-mono text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors text-foreground cursor-pointer"
                    >
                      <FileText className="w-4 h-4 mr-2 text-rose-500" />
                      <span>所有 PDF (.pdf)</span>
                    </button>
                    <div className="h-px w-full bg-stone-200/60 dark:bg-white/10 my-1" />
                    <button
                      onClick={() => { void handleBatchDownload("word", "filtered"); setActiveFab(null); }}
                      className="flex items-center px-3 py-1.5 text-left font-mono text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors text-fg-secondary cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-stone-400" />
                      <span>僅限目前篩選 (Word)</span>
                    </button>
                    <button
                      onClick={() => { void handleBatchDownload("pdf", "filtered"); setActiveFab(null); }}
                      className="flex items-center px-3 py-1.5 text-left font-mono text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors text-fg-secondary cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-stone-400" />
                      <span>僅限目前篩選 (PDF)</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={isBatchDownloading || plans.length === 0}
                onClick={() => setActiveFab(activeFab === 'download' ? null : 'download')}
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none cursor-pointer",
                  (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed",
                  activeFab === 'download'
                    ? "bg-orange-500 text-white border-transparent shadow-orange-500/30"
                    : "bg-white/90 dark:bg-[#14191C]/90 border-stone-200/60 dark:border-white/10 text-foreground"
                )}
                title="批次匯出"
              >
                <Download className={cn("w-4 h-4", activeFab === 'download' ? "text-white" : "text-orange-500")} />
              </motion.button>
            </div>

            {/* 05. Add Plan Circle FAB */}
            <div className="relative flex items-center justify-end">
              <AnimatePresence>
                {activeFab === 'add' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-14 bottom-0 bg-white dark:bg-[#14191C] backdrop-blur-xl border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-col w-56 max-h-[60vh] overflow-y-auto z-20"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
                      新增教案 CREATE PLAN
                    </div>
                    {groups.map((group) => {
                      const params = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                      return (
                        <button
                          key={`m-add-${group.id}`}
                          onClick={() => { handleCreatePlan(group.slug); setActiveFab(null); }}
                          className="px-3 py-2 text-left font-medium text-xs font-mono rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors text-foreground flex items-center gap-2 cursor-pointer mt-0.5"
                        >
                          <span className={cn("w-2 h-2 rounded-full shadow-xs shrink-0", params.colorDot)} />
                          <span>{language === 'zh' ? group.nameZh : group.nameEn}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (!isAdmin) { crewToast(); return; }
                  setActiveFab(activeFab === 'add' ? null : 'add');
                }}
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg border-none flex items-center justify-center transition-all relative z-10 focus:outline-none cursor-pointer",
                  !isAdmin
                    ? "opacity-60 bg-stone-400 dark:bg-stone-700 text-white"
                    : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/30"
                )}
                title="新增教案"
              >
                <motion.div animate={{ rotate: activeFab === 'add' ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <Plus className="w-5 h-5" />
                </motion.div>
              </motion.button>
            </div>
          </FabStagger>
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
              <div className="border border-stone-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-3xl p-12 sm:p-24 flex flex-col items-center justify-center text-center shadow-xs min-h-[420px] relative overflow-hidden">
                <div className="text-[10px] font-mono tracking-widest text-fg-muted uppercase mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  // NO MATCHING PLANS FOUND //
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-white/[0.05] border border-stone-200/80 dark:border-white/10 flex items-center justify-center mb-6 shadow-xs">
                  <FileText className="w-8 h-8 text-stone-300 dark:text-stone-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-normal text-foreground mb-3 tracking-tight">
                  目前沒有任何教案
                </h3>
                <p className="text-fg-muted max-w-md mx-auto text-xs sm:text-sm leading-relaxed mb-8">
                  請嘗試更改篩選條件、清除搜尋關鍵字，或是點擊上方「新增檔案」建立全新的教案內容。
                </p>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => {
                          if (groups.length === 0) {
                            e.preventDefault();
                            toast({
                              title: "無法新增",
                              description: "目前沒有可用組別，請先到設定新增組別。",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>立即新增教案</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      side="bottom"
                      sideOffset={8}
                      className="w-56 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5 z-50"
                    >
                      {groups.map((group) => {
                        const params = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                        return (
                          <DropdownMenuItem
                            key={group.id}
                            onSelect={() => handleCreatePlan(group.slug)}
                            className="cursor-pointer font-medium text-xs py-2.5 px-3 rounded-xl hover:bg-orange-500/10 hover:text-orange-600 transition-colors flex items-center gap-2"
                          >
                            <span className={cn("w-2 h-2 rounded-full shadow-xs shrink-0", params.colorDot)} />
                            {language === 'zh' ? group.nameZh : group.nameEn}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              ) : viewType === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredPlans.map((plan, i) => {
                    const group = getPlanGroup(plan);
                    const groupBadge = getUnifiedGroupBadgeParams(group?.slug || plan.category, group?.nameZh || '');
                    const indexStr = String(i + 1).padStart(2, '0');

                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25, ease: "easeOut" }}
                        className="h-full"
                      >
                        <div
                          onClick={() => handleOpenPlan(plan.id)}
                          className="bg-white/80 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 hover:border-orange-500/40 rounded-2xl p-5 sm:p-6 text-left w-full group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full cursor-pointer relative overflow-hidden backdrop-blur-sm"
                        >
                          {/* Top Bar: Index + Division badge + Actions */}
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-fg-muted group-hover:text-orange-500 transition-colors">
                                {indexStr}
                              </span>
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase border",
                                groupBadge.softBg,
                                groupBadge.softText,
                                groupBadge.softBorder
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-xs", groupBadge.colorDot)} />
                                <span className="truncate">{group ? (language === 'zh' ? group.nameZh : group.nameEn) : '未分類'}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {renderPlanActions(plan)}
                            </div>
                          </div>

                          {/* Title & Category */}
                          <div className="mb-6 flex-1">
                            <h3 className="font-normal text-base sm:text-lg text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug mb-1">
                              {getPlanDisplayName(plan)}
                            </h3>
                            <p className="text-xs text-fg-muted font-mono line-clamp-2 leading-relaxed">
                              {getPlanDisplayCategory(plan) || "暫無細節說明"}
                            </p>
                          </div>

                          {/* Bottom Divider & Metadata */}
                          <div className="flex items-center justify-between pt-4 border-t border-stone-200/60 dark:border-white/5 mt-auto text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-fg-muted">
                              <Clock className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                              <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}</span>
                            </div>
                            {getPlanDisplayMembers(plan) && (
                              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 dark:bg-white/5 rounded-full text-[10px] text-fg-secondary font-sans truncate max-w-[130px] border border-stone-200/50 dark:border-white/5">
                                <Users className="w-3 h-3 text-stone-400 shrink-0" />
                                <span className="truncate">{getPlanDisplayMembers(plan)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : viewType === "board" ? (
                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 no-scrollbar h-full min-h-[600px] snap-x pl-1">
                  {groups.map((group) => {
                    const items = filteredPlans.filter(p => getPlanGroup(p)?.slug === group.slug);
                    const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                    return (
                      <div
                        key={group.id}
                        className="flex-1 min-w-[320px] max-w-[380px] flex flex-col bg-white/40 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 rounded-3xl p-5 snap-center transition-colors backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between mb-5 px-1 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shadow-xs shrink-0", badgeParams.colorDot)} />
                            <h3 className="font-mono text-xs tracking-wider uppercase text-foreground font-medium">
                              {language === 'zh' ? group.nameZh : group.nameEn}
                            </h3>
                          </div>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-stone-200/60 dark:bg-white/10 text-fg-muted font-medium">
                            {items.length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 no-scrollbar">
                          {items.map((plan, i) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              key={plan.id}
                            >
                              <div
                                onClick={() => handleOpenPlan(plan.id)}
                                className="bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 rounded-2xl p-4 cursor-pointer group hover:border-orange-500/50 hover:shadow-lg transition-all duration-200 relative overflow-hidden"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
                                  <h4 className="font-normal text-sm text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                                    {getPlanDisplayName(plan)}
                                  </h4>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    {renderPlanActions(plan)}
                                  </div>
                                </div>
                                <p className="text-xs text-fg-muted font-mono mb-4 line-clamp-1">
                                  {getPlanDisplayCategory(plan) || "暫無細節"}
                                </p>
                                <div className="flex items-center justify-between border-t border-stone-200/60 dark:border-white/5 pt-3">
                                  <div className="text-[11px] text-fg-secondary font-sans truncate max-w-[150px] flex items-center gap-1">
                                    {getPlanDisplayMembers(plan) ? (
                                      <>
                                        <Users className="w-3 h-3 text-stone-400 shrink-0" />
                                        <span className="truncate">{getPlanDisplayMembers(plan)}</span>
                                      </>
                                    ) : (
                                      <span className="text-fg-muted font-mono">—</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-fg-muted flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-stone-400" />
                                    <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          {items.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-fg-muted">
                              <FileText className="w-6 h-6 mb-2 opacity-40" />
                              <p className="text-xs font-mono uppercase tracking-wider">NO PLANS</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── LIST VIEW (FLUID.GLASS FEATURED-PROJECTS 1PX HAIRLINE TABLE) ── */
                <div className="w-full">
                  {/* Desktop Table Header */}
                  <div className="hidden md:grid grid-cols-[48px_minmax(240px,2fr)_150px_160px_110px_48px] items-center gap-6 xl:gap-8 px-6 py-4 border-b border-stone-200/80 dark:border-white/10 text-[10px] font-mono tracking-widest text-fg-muted uppercase">
                    <div>#</div>
                    <div>PLAN / ACTIVITY NAME</div>
                    <div>DIVISION</div>
                    <div>COLLABORATORS</div>
                    <div>MODIFIED</div>
                    <div className="text-right">ACTIONS</div>
                  </div>

                  {/* Desktop Rows */}
                  <div className="hidden md:block divide-y divide-stone-200/60 dark:divide-white/5 border-b border-stone-200/80 dark:border-white/10">
                    {filteredPlans.map((plan, i) => {
                      const group = getPlanGroup(plan);
                      const groupBadge = getUnifiedGroupBadgeParams(group?.slug || plan.category, group?.nameZh || '');
                      const indexStr = String(i + 1).padStart(2, '0');
                      const category = getPlanDisplayCategory(plan);
                      const isUncategorized = !category || category === '無分類';

                      return (
                        <div
                          key={plan.id}
                          onClick={() => handleOpenPlan(plan.id)}
                          className="group grid grid-cols-[48px_minmax(240px,2fr)_150px_160px_110px_48px] items-center gap-6 xl:gap-8 px-6 py-6.5 hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.04] transition-all duration-200 cursor-pointer"
                        >
                          {/* 01: Monospace index */}
                          <div className="font-mono text-xs text-fg-muted group-hover:text-orange-500 transition-colors">
                            {indexStr}
                          </div>

                          {/* 02: Plan name & category */}
                          <div className="pr-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-normal text-[17px] text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:translate-x-1.5 transition-all duration-200 truncate">
                                {getPlanDisplayName(plan)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-orange-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                            </div>
                            {category && (
                              <div className={cn(
                                "text-xs font-mono tracking-tight truncate mt-1 transition-colors",
                                isUncategorized
                                  ? "text-stone-300 dark:text-stone-600 text-[11px]"
                                  : "text-fg-muted"
                              )}>
                                {category}
                              </div>
                            )}
                          </div>

                          {/* 03: Division */}
                          <div>
                            <span className={cn(
                              "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-medium tracking-wider uppercase border",
                              groupBadge.softBg,
                              groupBadge.softText,
                              groupBadge.softBorder
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-xs", groupBadge.colorDot)} />
                              <span className="truncate">{group ? (language === 'zh' ? group.nameZh : group.nameEn) : '未分類'}</span>
                            </span>
                          </div>

                          {/* 04: Collaborators */}
                          <div className="text-xs text-fg-secondary flex items-center gap-2 truncate font-sans">
                            {getPlanDisplayMembers(plan) ? (
                              <>
                                <Users className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{getPlanDisplayMembers(plan)}</span>
                              </>
                            ) : (
                              <span className="text-stone-300 dark:text-stone-600 font-mono text-xs">—</span>
                            )}
                          </div>

                          {/* 05: Modified time */}
                          <div className="text-xs font-mono text-fg-muted flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                            <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span>
                          </div>

                          {/* 06: Actions */}
                          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                            {renderPlanActions(plan)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Rows */}
                  <div className="md:hidden flex flex-col divide-y divide-stone-200/60 dark:divide-white/5 border-y border-stone-200/80 dark:border-white/10">
                    {filteredPlans.map((plan, i) => {
                      const group = getPlanGroup(plan);
                      const groupBadge = getUnifiedGroupBadgeParams(group?.slug || plan.category, group?.nameZh || '');
                      const indexStr = String(i + 1).padStart(2, '0');
                      const category = getPlanDisplayCategory(plan);
                      const isUncategorized = !category || category === '無分類';

                      return (
                        <div
                          key={plan.id}
                          onClick={() => handleOpenPlan(plan.id)}
                          className="py-3 px-4 hover:bg-orange-500/[0.02] dark:hover:bg-orange-500/[0.04] transition-colors cursor-pointer"
                        >
                          {/* Row 1: Index + Plan Name + Division Badge */}
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-mono text-xs text-orange-500 font-semibold shrink-0">
                                {indexStr}
                              </span>
                              <h3 className="font-medium text-[15px] text-foreground truncate">
                                {getPlanDisplayName(plan)}
                              </h3>
                            </div>
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase border shrink-0",
                              groupBadge.softBg,
                              groupBadge.softText,
                              groupBadge.softBorder
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-xs", groupBadge.colorDot)} />
                              <span>{group ? (language === 'zh' ? group.nameZh : group.nameEn) : '未分類'}</span>
                            </span>
                          </div>

                          {/* Row 2: Category & Members + Timestamp & Actions */}
                          <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0 text-fg-muted font-mono text-[11px] truncate">
                              {!isUncategorized && category && (
                                <span className="truncate max-w-[130px] text-fg-secondary">
                                  {category}
                                </span>
                              )}
                              {!isUncategorized && category && getPlanDisplayMembers(plan) && (
                                <span className="text-stone-300 dark:text-stone-600 shrink-0">·</span>
                              )}
                              {getPlanDisplayMembers(plan) && (
                                <div className="flex items-center gap-1 truncate text-fg-secondary">
                                  <Users className="w-3 h-3 text-stone-400 shrink-0" />
                                  <span className="truncate max-w-[130px]">{getPlanDisplayMembers(plan)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-fg-muted">
                                <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                                <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span>
                              </div>
                              {renderPlanActions(plan)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 dark:bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 p-8 rounded-3xl max-w-sm w-full relative space-y-6 shadow-2xl"
            >
              <div className="space-y-2">
                <div className="text-[10px] font-mono tracking-widest text-rose-500 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  // DELETION WARNING //
                </div>
                <h4 className="text-lg font-normal text-foreground">刪除教案檔案</h4>
                <p className="text-xs text-fg-muted leading-relaxed">
                  請輸入 <span className="font-mono text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded font-semibold">delete</span> 以確認永久刪除「{deleteTarget.name}」。此動作不可撤銷。
                </p>
              </div>
              <input
                type="text"
                value={deleteInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)}
                placeholder="delete"
                className="w-full h-11 px-4 rounded-xl bg-stone-100 dark:bg-white/[0.05] border border-stone-200/80 dark:border-white/10 font-mono text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-full text-xs font-mono text-fg-muted hover:text-foreground hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  取消 CANCEL
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteInput !== "delete"}
                  className="px-5 py-2 rounded-full text-xs font-mono font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  確認刪除 DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
