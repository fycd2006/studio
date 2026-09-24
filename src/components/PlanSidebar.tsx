
"use client"

import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
 Plus,
 Trash2,
 GripVertical,
 ChevronsLeft,
 ChevronsRight,
 Sparkles,
 FileText,
 Home,
 FolderOpen,
 Settings,
 ShieldCheck,
 ChevronDown,
 Lock,
 Sun,
 Moon,
 Pin,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n-context";
import { LessonPlan, PlanCategory, Camp, Group } from "@/types/plan";
import { Button } from "@/components/ui/button";
import { AdminDialog } from "@/components/AdminDialog";
import { cn, stripHtml } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
 Sidebar,
 SidebarContent,
 SidebarHeader,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupLabel,
 SidebarGroupContent,
 useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { exportToDocx } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlanSidebarProps {
 camps: Camp[];
 activeCampId: string | null;
 onCampSelect: (id: string) => void;
 onCampAdd: (name: string, fields?: Partial<Camp>) => void;
 onCampUpdate: (id: string, updates: Partial<Camp>) => void;
 onCampDelete: (id: string) => void;
 onCampToggleLock: (id: string) => void;
 groups: Group[];
 plans: LessonPlan[];
 activePlanId: string | null;
 onSelect: (id: string) => void;
 onAdd: (groupSlug: string) => string | undefined;
 onDelete: (id: string) => void;
 onReorder: (category: PlanCategory, startIndex: number, endIndex: number) => void;
 viewMode: 'editor' | 'admin';
 setViewMode: (mode: 'editor' | 'admin') => void;
}

/* ── NAV ITEMS (4 core) ─────────────── */
const NAV_ITEMS = [
 { label: "Dashboard", href: "/", icon: Home },
 { label: "Plans", href: "/plans", icon: FolderOpen },
 { label: "Admin", href: "/admin", icon: ShieldCheck },
 { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function PlanSidebar({
 camps, activeCampId, onCampSelect,
 onCampAdd, onCampUpdate, onCampDelete,
 groups, plans, activePlanId, onSelect, onAdd, onDelete, onReorder,
 onCampToggleLock,
 viewMode, setViewMode,
}: PlanSidebarProps) {
 const { state, toggleSidebar, isMobile, isPinned, togglePin } = useSidebar();
 const { toast } = useToast();
 const { role } = useAuth();
 const pathname = usePathname();
 const router = useRouter();
 const [isMounted, setIsMounted] = useState(false);
 const isCollapsed = state === "collapsed";
 const isAdmin = role === 'admin';

 const { theme, setTheme } = useTheme();
 const { language, setLanguage } = useTranslation();

 const resolvePlanGroup = (plan: LessonPlan) => {
 const fallbackSlug = plan.category === 'teaching' ? 'teaching' : 'activity';
 return groups.find(group => group.id === plan.groupId)
 || groups.find(group => group.slug === fallbackSlug)
 || groups[0]
 || null;
 };

 useEffect(() => { setIsMounted(true); }, []);

 const [plansExpanded, setPlansExpanded] = useState(true);
 const [isAddCampOpen, setIsAddCampOpen] = useState(false);
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 const [tempCamp, setTempCamp] = useState<Partial<Camp>>({});

 /* delete confirmation states */
 const [deletePlanTarget, setDeletePlanTarget] = useState<{ id: string; name: string } | null>(null);
 const [deleteCampTarget, setDeleteCampTarget] = useState<string | null>(null);
 const [deleteInput, setDeleteInput] = useState("");

 // RBAC: Crew can only see unlocked camps
 const visibleCamps = useMemo(() => {
 if (role === 'admin') return camps;
 return camps.filter(c => !c.isLocked);
 }, [camps, role]);

 const activeCamp = visibleCamps.find(c => c.id === activeCampId);

 const crewToast = () => toast({
 title: "🔒 唯讀模式",
 description: "您目前的權限為組員，如需修改請聯繫管理員。",
 });

 // Admin dialog no longer needed, everything is open

 const handleDragEnd = (result: any) => {
 if (!result.destination) return;
 const sourceSlug = String(result.source.droppableId);
 const targetSlug = String(result.destination.droppableId);
 if (sourceSlug !== targetSlug) return;
 if (sourceSlug !== 'activity' && sourceSlug !== 'teaching') return;
 onReorder(sourceSlug as PlanCategory, result.source.index, result.destination.index);
 };

 const handleCreateCamp = () => {
 if (tempCamp.name?.trim()) {
 onCampAdd(tempCamp.name, { 
 campStartDate: tempCamp.campStartDate, 
 campEndDate: tempCamp.campEndDate 
 });
 setTempCamp({});
 setIsAddCampOpen(false);
 }
 };

 const handleConfirmDeletePlan = () => {
 if (deletePlanTarget && deleteInput === "delete") {
 onDelete(deletePlanTarget.id);
 setDeletePlanTarget(null);
 setDeleteInput("");
 }
 };

 const handleConfirmDeleteCamp = async () => {
 if (deleteCampTarget && deleteInput === "delete") {
 const campPlans = plans.filter(p => p.campId === deleteCampTarget);
 if (campPlans.length > 0) {
 toast({ title: "備份中 / Backing up", description: `正在自動下載 ${campPlans.length} 份教案。` });
 for (const plan of campPlans) { await exportToDocx(plan); }
 }
 onCampDelete(deleteCampTarget);
 setDeleteCampTarget(null);
 setDeleteInput("");
 }
 };

 return (
 <>
 <Sidebar collapsible="icon">
 {/* ═══ HEADER ═══ */}
 <SidebarHeader className="dark:px-4 px-4 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4 transition-colors z-20 relative">
 <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-3 overflow-hidden">
 <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all duration-300 min-w-max">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/80 dark:bg-white/10 border border-stone-200/80 dark:border-white/10 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 shadow-xs">
 <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"
 onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
 <Sparkles className="h-5 w-5 text-orange-500 dark:text-amber-400 hidden" />
 </div>
 <div className="flex flex-col group-data-[collapsible=icon]:hidden">
 <h1 className="text-[12px] font-normal text-foreground tracking-tight leading-none uppercase">NTUT CD CAMP</h1>
 <span className="text-[8px] font-mono font-medium text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-1">VOLUNTEER STUDIO</span>
 </div>
 </Link>
 {!isMobile && (
 <div className="flex items-center gap-1">
 {!isCollapsed && (
 <Button variant="ghost" size="icon" onClick={togglePin}
 className={cn("h-7 w-7 rounded-lg transition-all shrink-0 cursor-pointer", isPinned ? "text-orange-600 dark:text-orange-400 bg-orange-500/10" : "text-fg-muted hover:bg-stone-500/10 dark:hover:bg-white/5 hover:text-foreground")}
 title={isPinned ? "取消釘選 (Unpin)" : "釘選側邊欄 (Pin sidebar)"}>
 <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
 </Button>
 )}
 <Button variant="ghost" size="icon" onClick={toggleSidebar}
 className="h-7 w-7 rounded-lg text-fg-muted hover:bg-stone-500/10 dark:hover:bg-white/5 hover:text-foreground transition-all shrink-0 cursor-pointer">
 {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
 </Button>
 </div>
 )}
 </div>
 </SidebarHeader>

 <SidebarContent className="px-2 transition-colors z-10 relative">
 {/* ═══ 4 CORE NAV ITEMS ═══ */}
 <SidebarGroup className="p-1 mt-4">
 <nav className="space-y-1">
 {NAV_ITEMS.map((item) => {
 const isActive = pathname === item.href;
 const Icon = item.icon;
 return (
 <Tooltip key={item.href}>
 <TooltipTrigger asChild>
 <Link href={item.href}
 className={cn(
 "group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer",
 "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
 isActive ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium" : "text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5"
 )}>
 {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-500 rounded-r-full" />}
 <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-orange-600 dark:text-orange-400" : "text-fg-muted group-hover/nav:text-foreground")} />
 <span className="text-[11px] font-mono tracking-wide group-data-[collapsible=icon]:hidden uppercase">{item.label}</span>
 </Link>
 </TooltipTrigger>
 <TooltipContent side="right" className={cn("text-[10px] font-mono uppercase tracking-widest", !isCollapsed && "hidden")}>
 {item.label}
 </TooltipContent>
 </Tooltip>
 );
 })}
 </nav>
 </SidebarGroup>

 {/* ═══ PROJECT INFO (expanded only) ═══ */}
 <div className="mt-6 mb-2 px-3 group-data-[collapsible=icon]:hidden">
 <div className="flex flex-col gap-2 p-3 bg-stone-500/[0.04] dark:bg-white/[0.03] rounded-2xl border border-stone-200/80 dark:border-white/10">
 <div className="flex items-center justify-between">
 <label className="text-[9px] font-mono text-fg-muted uppercase tracking-widest leading-none">
 Active Project
 </label>
 {isAdmin && activeCamp && (
 <Button 
 variant="ghost" 
 size="icon" 
 className={cn(
 "h-5 w-5 rounded-md transition-colors",
 activeCamp.isLocked ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10"
 )}
 onClick={() => onCampToggleLock(activeCamp.id)}
 title={activeCamp.isLocked ? "Unlock Project" : "Lock Project"}
 >
 {activeCamp.isLocked ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
 </Button>
 )}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-normal text-foreground truncate">
 {activeCamp?.isLocked ? "🔒 " : ""}{activeCamp?.name || "No Active Project"}
 </span>
 {activeCamp && <Badge className="h-4 px-1.5 text-[8px] font-mono uppercase tracking-widest bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">Live</Badge>}
 </div>
 </div>
 </div>

 {/* ═══ EXPANDABLE PLAN LISTS (expanded sidebar only) ═══ */}
 <div className="group-data-[collapsible=icon]:hidden">
 <DragDropContext onDragEnd={handleDragEnd}>
 {groups.map((group) => {
 const catPlans = plans
 .filter(p => p.campId === activeCampId && resolvePlanGroup(p)?.slug === group.slug)
 .sort((a, b) => a.order - b.order);

 const groupLabel = language === 'zh' ? group.nameZh : group.nameEn;
 const isReorderable = group.slug === 'activity' || group.slug === 'teaching';

 return (
 <SidebarGroup key={group.id} className="p-1 mt-2">
 <div className="flex items-center justify-between mb-1.5 px-2">
 <SidebarGroupLabel className="h-auto p-0 flex items-center gap-2">
 <Link href={`/lesson-plans/${group.slug}`} className="font-bold text-[10px] text-stone-400 dark:text-slate-500 uppercase tracking-[0.15em] hover:text-orange-500 dark:hover:text-amber-400 transition-colors">{groupLabel}</Link>
 <Badge className="h-4 px-1.5 text-[9px] font-bold rounded-md bg-orange-50 text-orange-600 dark:bg-amber-400/10 dark:text-amber-400 transition-colors">
 {catPlans.length}
 </Badge>
 </SidebarGroupLabel>
 <Button variant="ghost" size="icon"
 className="h-6 w-6 text-fg-muted hover:text-orange-500 dark:hover:text-amber-400 hover:bg-[#FAF8F5] dark:hover:bg-white/5 cursor-pointer transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none"
 onClick={() => {
 const newId = onAdd(group.slug);
 if (newId) router.push(`/plans/${newId}`);
 }}>
 <Plus className="h-3.5 w-3.5" />
 </Button>
 </div>

 <SidebarGroupContent>
 {isMounted && (
 <Droppable droppableId={group.slug}>
 {(provided) => (
 <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0.5">
 {catPlans.map((plan, index) => {
 const planTitle = plan.scheduledName
 ? `${plan.scheduledName} - ${stripHtml(plan.activityName) || "..."}`
 : (stripHtml(plan.activityName) || "...");
 const isActive = pathname === `/plans/${plan.id}`;

 return (
 <Draggable key={plan.id} draggableId={plan.id} index={index} isDragDisabled={!isAdmin || !isReorderable}>
 {(provided, snapshot) => (
 <div
 ref={provided.innerRef}
 {...provided.draggableProps}
 className={cn(
 "group/item relative flex items-center gap-2 ml-1 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden",
 isActive ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium border border-orange-500/30" : "text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 font-normal border border-transparent",
 snapshot.isDragging && "shadow-xl bg-white/95 dark:bg-[#14191C]/95 z-50 border border-stone-200/80 dark:border-white/10"
 )}
 onClick={() => {
 if (pathname !== `/plans/${plan.id}`) router.push(`/plans/${plan.id}`);
 }}
 >
 {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-500 rounded-r-full shadow-xs" />}
 {isAdmin && (
 <div {...provided.dragHandleProps} className="opacity-0 group-hover/item:opacity-40">
 <GripVertical className="h-3.5 w-3.5" />
 </div>
 )}
 {!isAdmin && <div {...provided.dragHandleProps} />}
 <FileText className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-orange-600 dark:text-orange-400" : "text-fg-muted")} />
 <div className={cn("flex-1 min-w-0 truncate text-[11px]", isActive ? "text-orange-600 dark:text-orange-400 font-medium max-w-full" : "max-w-full")}>
 {planTitle}
 </div>
 <Button variant="ghost" size="icon"
 className="h-6 w-6 opacity-0 group-hover/item:opacity-100 rounded-md text-fg-muted hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 if (role !== 'admin') {
 toast({ title: "權限不足", description: "僅管理員能刪除教案", variant: "destructive" });
 return;
 }
 setDeletePlanTarget({ id: plan.id, name: stripHtml(plan.activityName) || "未命名教案" });
 setDeleteInput("");
 }}>
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 )}
 </Draggable>
 );
 })}
 {provided.placeholder}
 </div>
 )}
 </Droppable>
 )}
 </SidebarGroupContent>
 </SidebarGroup>
 );
 })}
 </DragDropContext>
 </div>
 </SidebarContent>

 {/* ═══ FOOTER ═══ */}
 <SidebarFooter className="dark:px-3 px-3 py-3 group-data-[collapsible=icon]:px-1.5 transition-colors flex flex-row items-center justify-between z-20 relative">
 <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
 <span className="text-[9px] font-mono text-fg-muted uppercase tracking-widest group-data-[collapsible=icon]:hidden">System Online</span>
 </div>
 {isMounted && (!isCollapsed || isMobile) && (
 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 rounded-lg text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
 >
 {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 px-2 text-xs font-mono rounded-lg text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
 onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
 >
 {language === 'zh' ? 'EN' : '中'}
 </Button>
 </div>
 )}
 </SidebarFooter>
 </Sidebar>

 {/* ═══ TYPE-DELETE PLAN MODAL ═══ */}
 <Dialog open={!!deletePlanTarget} onOpenChange={(open) => { if (!open) { setDeletePlanTarget(null); setDeleteInput(""); } }}>
 <DialogContent className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl max-w-md">
 <DialogHeader><DialogTitle className="text-lg font-normal tracking-tight text-foreground">刪除教案 / Delete Plan</DialogTitle></DialogHeader>
 <div className="space-y-4 py-2">
 <p className="text-xs font-mono text-fg-muted">確認刪除「<strong className="text-foreground">{deletePlanTarget?.name}</strong>」？此操作無法復原。</p>
 <div className="space-y-2">
 <label className="text-[10px] font-mono uppercase tracking-widest text-fg-muted">請輸入 <span className="text-rose-500 font-mono">delete</span> 確認</label>
 <Input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="delete"
 className="font-mono h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-foreground" />
 </div>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="ghost" onClick={() => { setDeletePlanTarget(null); setDeleteInput(""); }} className="rounded-xl font-mono text-xs uppercase tracking-wider h-11 cursor-pointer">取消</Button>
 <Button variant="destructive" onClick={handleConfirmDeletePlan} disabled={deleteInput !== "delete"}
 className="rounded-xl font-mono text-xs uppercase tracking-wider h-11 px-8 cursor-pointer disabled:opacity-40">確認刪除</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ═══ ADD CAMP DIALOG ═══ */}
 <Dialog open={isAddCampOpen} onOpenChange={setIsAddCampOpen}>
 <DialogContent className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl">
 <DialogHeader><DialogTitle className="text-lg font-normal tracking-tight text-foreground">建立營隊專案 / Create Project</DialogTitle></DialogHeader>
 <div className="py-4 space-y-5">
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">名稱 / Name</label>
 <Input placeholder="科學夏令營 / Camp Name" value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-normal text-foreground" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">開始 / Start</label>
 <Input type="date" value={tempCamp.campStartDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, campStartDate: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-mono text-xs text-foreground" />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">結束 / End</label>
 <Input type="date" value={tempCamp.campEndDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, campEndDate: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-mono text-xs text-foreground" />
 </div>
 </div>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="outline" onClick={() => setIsAddCampOpen(false)} className="rounded-xl font-mono text-xs uppercase tracking-wider h-11 cursor-pointer">取消</Button>
 <Button onClick={handleCreateCamp} className="rounded-xl font-mono text-xs uppercase tracking-wider h-11 px-8 cursor-pointer bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xs">確認 / Confirm</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ═══ CAMP SETTINGS DIALOG ═══ */}
 <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
 <DialogContent className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl max-w-lg">
 <DialogHeader><DialogTitle className="text-lg font-normal tracking-tight text-foreground">專案設定 / Project Settings</DialogTitle></DialogHeader>
 <div className="py-4 space-y-6">
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">專案名稱 / Name</label>
 <Input value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-normal text-foreground" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">營期開始 / Start</label>
 <Input type="date" value={tempCamp.campStartDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, campStartDate: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-mono text-xs text-foreground" />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">營期結束 / End</label>
 <Input type="date" value={tempCamp.campEndDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, campEndDate: e.target.value })} className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 font-mono text-xs text-foreground" />
 </div>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 pt-6">
 {[
 { ks: 'meeting1StartDate', ke: 'meeting1EndDate', l: '一收' },
 { ks: 'meeting2StartDate', ke: 'meeting2EndDate', l: '二收' },
 { ks: 'meeting3StartDate', ke: 'meeting3EndDate', l: '三收' },
 { ks: 'trainingStartDate', ke: 'trainingEndDate', l: '集訓' },
 { ks: 'siteStartDate', ke: 'siteEndDate', l: '駐站' },
 ].map(f => (
 <div key={f.l} className="space-y-2">
 <label className="text-[9px] font-black text-stone-400 dark:text-slate-500 uppercase tracking-widest leading-none">{f.l}</label>
 <div className="flex flex-col gap-1.5">
 <Input type="date" value={(tempCamp as any)[f.ks] || ""} onChange={(e) => setTempCamp({ ...tempCamp, [f.ks]: e.target.value })} className="h-8 rounded-lg text-[10px] font-bold px-1.5" />
 <Input type="date" value={(tempCamp as any)[f.ke] || ""} onChange={(e) => setTempCamp({ ...tempCamp, [f.ke]: e.target.value })} className="h-8 rounded-lg text-[10px] font-bold px-1.5" />
 </div>
 </div>
 ))}
 </div>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="rounded-lg font-semibold h-11 cursor-pointer">取消</Button>
 <Button onClick={() => { activeCampId && onCampUpdate(activeCampId, tempCamp); setIsSettingsOpen(false); }} className="gold-btn rounded-lg font-semibold h-11 px-8 cursor-pointer">儲存 / Save</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* End */}
 </>
 );
}
