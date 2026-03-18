
"use client"

import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Plus, 
  Trash2, 
  FolderOpen, 
  BookOpen, 
  GripVertical, 
  ChevronsLeft, 
  ChevronsRight,
  ShieldCheck,
  Settings2,
  BellRing,
  Sparkles,
  Package2,
  FileText,
  Home,
  Gamepad2,
  Map,
  Sun,
  Drama,
  Utensils,
  Music,
  Flame,
  Compass,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { LessonPlan, PlanCategory, Camp } from "@/types/plan";
import { Button } from "@/components/ui/button";
import { AdminDialog } from "@/components/AdminDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { differenceInDays, parseISO, isValid } from "date-fns";

/** Map scheduledName to a unique lucide icon */
function getScheduleIcon(scheduledName?: string): LucideIcon {
  if (!scheduledName) return FileText;
  const s = scheduledName.toLowerCase();
  if (s.includes('大地') || s.includes('遊戲'))  return Map;
  if (s.includes('科學') || s.includes('闖關'))  return Gamepad2;
  if (s.includes('劇本') || s.includes('戲劇'))  return Drama;
  if (s.includes('起床'))                        return Sun;
  if (s.includes('烹飪') || s.includes('料理'))  return Utensils;
  if (s.includes('音樂') || s.includes('歌'))    return Music;
  if (s.includes('營火') || s.includes('晚會'))  return Flame;
  if (s.includes('探索') || s.includes('定向'))  return Compass;
  return FileText;
}

interface PlanSidebarProps {
  camps: Camp[];
  activeCampId: string | null;
  onCampSelect: (id: string) => void;
  onCampAdd: (name: string, startDate?: string, endDate?: string) => void;
  onCampUpdate: (id: string, updates: Partial<Camp>) => void;
  onCampDelete: (id: string) => void;
  plans: LessonPlan[];
  activePlanId: string | null;
  onSelect: (id: string) => void;
  onAdd: (category: PlanCategory) => void;
  onDelete: (id: string) => void;
  onReorder: (category: PlanCategory, startIndex: number, endIndex: number) => void;
  viewMode: 'editor' | 'admin';
  setViewMode: (mode: 'editor' | 'admin') => void;
}

export function PlanSidebar({ 
  camps,
  activeCampId,
  onCampSelect,
  onCampAdd,
  onCampUpdate,
  onCampDelete,
  plans, 
  activePlanId, 
  onSelect, 
  onAdd, 
  onDelete, 
  onReorder,
  viewMode,
  setViewMode
}: PlanSidebarProps) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const isCollapsed = state === "collapsed";
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isAddCampOpen, setIsAddCampOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempCamp, setTempCamp] = useState<Partial<Camp>>({});

  const activeCamp = camps.find(c => c.id === activeCampId);

  const countdowns = useMemo(() => {
    if (!activeCamp) return null;
    const today = new Date();
    
    const calculateDays = (dateStr?: string) => {
      if (!dateStr) return null;
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return differenceInDays(date, today);
    };

    return [
      { label: "一籌 / 1st Meeting", days: calculateDays(activeCamp.meeting1Date) },
      { label: "二籌 / 2nd Meeting", days: calculateDays(activeCamp.meeting2Date) },
      { label: "三籌 / 3rd Meeting", days: calculateDays(activeCamp.meeting3Date) },
      { label: "營期開始 / Camp Start", days: calculateDays(activeCamp.startDate) }
    ].filter(item => item.days !== null);
  }, [activeCamp]);

  const nearestEvent = useMemo(() => {
    if (!countdowns || countdowns.length === 0) return null;
    const upcoming = countdowns.filter(c => (c.days ?? 0) >= 0);
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0];
  }, [countdowns]);

  const [adminDialog, setAdminDialog] = useState<{ 
    open: boolean; 
    action: 'add' | 'delete' | 'deleteCamp' | 'settings'; 
    category?: PlanCategory; 
    id?: string 
  }>({
    open: false,
    action: 'add',
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const category = result.source.droppableId as PlanCategory;
    onReorder(category, result.source.index, result.destination.index);
  };

  const handleCreateCamp = () => {
    if (tempCamp.name?.trim()) {
      onCampAdd(tempCamp.name, tempCamp.startDate, tempCamp.endDate);
      setTempCamp({});
      setIsAddCampOpen(false);
    }
  };

  const handleConfirmDeleteCamp = async (campId: string) => {
    const campPlans = plans.filter(p => p.campId === campId);
    if (campPlans.length > 0) {
      toast({ title: "備份中 / Backing up", description: `正在自動下載 ${campPlans.length} 份教案。` });
      for (const plan of campPlans) { await exportToDocx(plan); }
    }
    onCampDelete(campId);
  };

  return (
    <>
      {/* ═══════════════ Glassmorphism Sidebar ═══════════════ */}
      <Sidebar collapsible="icon" className="border-r border-white/10 dark:border-white/5 bg-white/60 dark:bg-[#111520]/60 backdrop-blur-2xl">
        <SidebarHeader className="bg-transparent border-b border-primary/5 dark:border-white/5 px-4 py-5 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-3">
            <Link href="/" className="flex items-center gap-3 group/logo cursor-pointer" onClick={() => setViewMode('editor')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-card shadow-lg shadow-primary/10 dark:shadow-primary/5 border border-border p-1 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 animate-float group-hover/logo:shadow-primary/30 transition-shadow">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }} 
                />
                <Sparkles className="h-6 w-6 text-primary hidden" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <h1 className="text-[14px] font-headline font-bold text-foreground tracking-tight leading-none uppercase group-hover/logo:text-primary transition-colors">
                  NTUT CD CAMP
                </h1>
                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1.5 opacity-80">Volunteer Studio</span>
              </div>
            </Link>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
              {/* Theme Toggle */}
              <ThemeToggle className="group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8" />
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all shrink-0 cursor-pointer"
                >
                  {isCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="bg-transparent px-3">
          <div className="mt-6 mb-4 space-y-4 group-data-[collapsible=icon]:hidden px-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">專案 / Project</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer" onClick={() => {
                  setTempCamp(activeCamp || {});
                  setAdminDialog({ open: true, action: 'settings' });
                }}>
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer" onClick={() => {
                  setTempCamp({});
                  setIsAddCampOpen(true);
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={activeCampId || ""} onValueChange={onCampSelect}>
              <SelectTrigger className="h-11 bg-card border-border rounded-xl text-[11px] font-bold shadow-sm text-foreground hover:border-primary/30 transition-all">
                <SelectValue placeholder="選擇營隊 / Select" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-primary/10 shadow-2xl p-2">
                {camps.map(camp => (
                  <SelectItem key={camp.id} value={camp.id} className="rounded-lg font-bold text-xs py-2.5">{camp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Countdown Banner */}
            {nearestEvent && (
              <div className="mt-4 p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg shadow-primary/20 dark:shadow-primary/10 flex items-center justify-between group/banner overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover/banner:scale-150" />
                <div className="flex flex-col relative z-10">
                  <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest leading-none">{nearestEvent.label}</span>
                  <span className="text-[13px] font-bold text-white mt-1.5">{nearestEvent.days} 天後 / Days</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10">
                  <BellRing className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Home Button */}
          <SidebarGroup className="p-1 mt-4 space-y-1.5">
            <Link href="/">
              <div
                className={cn(
                  "group/home relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer border",
                  viewMode === 'editor' && !activePlanId
                    ? "bg-primary/10 dark:bg-primary/15 text-primary border-primary/20 shadow-sm group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
                    : "bg-transparent text-muted-foreground hover:bg-card hover:text-foreground border-transparent hover:border-border group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
                )}
                onClick={() => setViewMode('editor')}
              >
                <Home className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover/home:scale-110", viewMode === 'editor' && !activePlanId ? "text-primary" : "text-muted-foreground group-hover/home:text-primary")} />
                <span className="text-[11px] font-bold tracking-widest group-data-[collapsible=icon]:hidden uppercase">首頁 / Overview</span>
              </div>
            </Link>

            {/* Admin Nav Item */}
            <div
              className={cn(
                "group/admin relative flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 cursor-pointer border",
                viewMode === 'admin' 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 dark:shadow-primary/10 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
                  : "bg-card text-foreground hover:bg-primary/5 border-transparent hover:border-primary/20 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
              )}
              onClick={() => setViewMode('admin')}
            >
              <ShieldCheck className={cn("h-5 w-5 shrink-0 transition-transform group-hover/admin:scale-110", viewMode === 'admin' ? "text-white" : "text-primary")} />
              <span className="text-[11px] font-bold tracking-widest group-data-[collapsible=icon]:hidden uppercase">行政管理 / Admin Sync</span>
            </div>
          </SidebarGroup>

          {/* ═══════ Plan Categories with Section Headers ═══════ */}
          <DragDropContext onDragEnd={handleDragEnd}>
            {[
              { key: 'activity', label: '活動組 / Activity', sectionLabel: 'ACTIVITY PLANS', icon: Sparkles, accent: "text-primary", bg: "bg-primary/10" },
              { key: 'teaching', label: '教學組 / Teaching', sectionLabel: 'TEACHING PLANS', icon: BookOpen, accent: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
            ].map((cat, catIndex) => {
              const catPlans = plans
                .filter(p => p.campId === activeCampId && p.category === cat.key)
                .sort((a, b) => a.order - b.order);

              return (
                <SidebarGroup key={cat.key} className="p-1 mt-2">
                  {/* Divider between groups */}
                  {catIndex > 0 && (
                    <div className="px-4 mb-3 group-data-[collapsible=icon]:px-1">
                      <div className="h-px bg-border" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3 px-2">
                    <SidebarGroupLabel className="h-auto p-0 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                      <cat.icon className={cn("h-3.5 w-3.5", cat.accent)} />
                      <span className="font-bold text-[10px] text-muted-foreground font-headline uppercase tracking-[0.2em]">{cat.label}</span>
                      <Badge className={cn("h-4 px-2 text-[9px] font-bold rounded-md border-none", cat.bg, cat.accent)}>
                        {catPlans.length}
                      </Badge>
                    </SidebarGroupLabel>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary group-data-[collapsible=icon]:hidden rounded-xl cursor-pointer"
                      onClick={() => setAdminDialog({ open: true, action: 'add', category: cat.key as PlanCategory })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <SidebarGroupContent>
                    {isMounted && (
                      <Droppable droppableId={cat.key}>
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                            {catPlans.map((plan, index) => {
                              const planTitle = plan.scheduledName 
                                ? `${plan.scheduledName} - ${plan.activityName || "..."}` 
                                : (plan.activityName || "...");
                              const PlanIcon = getScheduleIcon(plan.scheduledName);

                              return (
                                <Draggable key={plan.id} draggableId={plan.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={cn(
                                        "group/item relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 cursor-pointer border-l-[3px]",
                                        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:py-2",
                                        activePlanId === plan.id && viewMode === 'editor'
                                          ? "bg-primary/5 dark:bg-primary/10 text-primary border-primary shadow-sm" 
                                          : "bg-transparent text-muted-foreground border-transparent hover:bg-card hover:text-foreground hover:shadow-md hover:shadow-primary/5 hover:translate-x-1",
                                        snapshot.isDragging && "shadow-2xl bg-card z-50 scale-105 border-primary/20"
                                      )}
                                      onClick={() => {
                                        onSelect(plan.id);
                                        setViewMode('editor');
                                      }}
                                    >
                                      <div {...provided.dragHandleProps} className="opacity-0 group-hover/item:opacity-40 group-data-[collapsible=icon]:hidden shrink-0">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      {/* Dynamic icon per plan */}
                                      <PlanIcon className={cn(
                                        "h-4 w-4 shrink-0 transition-colors",
                                        activePlanId === plan.id && viewMode === 'editor' ? "text-primary" : "text-muted-foreground group-hover/item:text-primary"
                                      )} />
                                      <div className="flex-1 truncate text-[11px] font-bold group-data-[collapsible=icon]:hidden uppercase tracking-tight">
                                        {planTitle}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover/item:opacity-100 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 group-data-[collapsible=icon]:hidden transition-all cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAdminDialog({ open: true, action: 'delete', id: plan.id });
                                        }}
                                      >
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

          {/* Delete Camp Button */}
          <div className="mt-12 px-2 space-y-4 group-data-[collapsible=icon]:hidden pb-20">
            <button 
              className="w-full flex items-center justify-center h-11 rounded-xl text-rose-500 bg-rose-50/30 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all border border-dashed border-rose-200 dark:border-rose-500/20 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              onClick={() => setAdminDialog({ open: true, action: 'deleteCamp', id: activeCampId! })}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              安全刪除此營隊專案
            </button>
          </div>
        </SidebarContent>
      </Sidebar>

      {/* ═══════════════ Create Camp Dialog ═══════════════ */}
      <Dialog open={isAddCampOpen} onOpenChange={setIsAddCampOpen}>
        <DialogContent className="max-md rounded-2xl p-8 bg-card border-border shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase tracking-tight text-foreground">建立營隊專案 / Create Project</DialogTitle></DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">名稱 / Name</label>
              <Input placeholder="科學夏令營 / Camp Name" value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">開始 / Start</label>
                <Input type="date" value={tempCamp.startDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, startDate: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">結束 / End</label>
                <Input type="date" value={tempCamp.endDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, endDate: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddCampOpen(false)} className="rounded-xl font-bold h-11 cursor-pointer">取消 / Cancel</Button>
            <Button onClick={handleCreateCamp} className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 btn-shimmer btn-press cursor-pointer">確認 / Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Settings Dialog ═══════════════ */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-lg rounded-2xl p-8 bg-card border-border shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase tracking-tight text-foreground">專案設定 / Settings</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">專案名稱 / Project Name</label>
              <Input value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">營期開始 / Start</label>
                <Input type="date" value={tempCamp.startDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, startDate: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">營期結束 / End</label>
                <Input type="date" value={tempCamp.endDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, endDate: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-border pt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">一籌 / 1st</label>
                <Input type="date" value={tempCamp.meeting1Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting1Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">二籌 / 2nd</label>
                <Input type="date" value={tempCamp.meeting2Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting2Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-widest">三籌 / 3rd</label>
                <Input type="date" value={tempCamp.meeting3Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting3Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="rounded-xl font-bold h-11 cursor-pointer">取消 / Cancel</Button>
            <Button onClick={() => { activeCampId && onCampUpdate(activeCampId, tempCamp); setIsSettingsOpen(false); }} className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 btn-shimmer btn-press cursor-pointer">儲存 / Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Admin Dialog ═══════════════ */}
      <AdminDialog
        open={adminDialog.open}
        onOpenChange={(open) => setAdminDialog(prev => ({ ...prev, open }))}
        title={
          adminDialog.action === 'add' ? "新增教案 / Add Plan" : 
          adminDialog.action === 'deleteCamp' ? "刪除專案 / Delete Project" : 
          adminDialog.action === 'settings' ? "專案設定 / Settings" : "刪除教案 / Delete Plan"
        }
        onConfirm={() => {
          if (adminDialog.action === 'add' && adminDialog.category) onAdd(adminDialog.category);
          else if (adminDialog.action === 'delete' && adminDialog.id) onDelete(adminDialog.id);
          else if (adminDialog.action === 'deleteCamp' && adminDialog.id) handleConfirmDeleteCamp(adminDialog.id);
          else if (adminDialog.action === 'settings') setIsSettingsOpen(true);
        }}
      />
    </>
  );
}
