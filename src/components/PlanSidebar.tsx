
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
  FileText
} from "lucide-react";
import { LessonPlan, PlanCategory, Camp } from "@/types/plan";
import { Button } from "@/components/ui/button";
import { AdminDialog } from "@/components/AdminDialog";
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
      <Sidebar collapsible="icon" className="border-r border-slate-300 bg-white">
        <SidebarHeader className="bg-white border-b border-orange-100 px-4 py-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm border border-orange-100/50 p-0.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }} 
                />
                <Sparkles className="h-5 w-5 text-orange-600 hidden" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <h1 className="text-[12px] font-black text-slate-950 tracking-tight leading-none uppercase">
                  NTUT CD CAMP
                </h1>
                <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest mt-1">VOLUNTEER STUDIO</span>
              </div>
            </div>
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all shrink-0"
              >
                {isCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="bg-white px-2">
          <div className="mt-5 mb-3 space-y-3 group-data-[collapsible=icon]:hidden px-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em]">專案 / Project</span>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={() => {
                  setTempCamp(activeCamp || {});
                  setAdminDialog({ open: true, action: 'settings' });
                }}>
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={() => {
                  setTempCamp({});
                  setIsAddCampOpen(true);
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={activeCampId || ""} onValueChange={onCampSelect}>
              <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl text-[11px] font-black shadow-none text-slate-950">
                <SelectValue placeholder="選擇營隊 / Select" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-orange-100 shadow-2xl">
                {camps.map(camp => (
                  <SelectItem key={camp.id} value={camp.id} className="rounded-lg font-black text-xs">{camp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {nearestEvent && (
              <div className="mt-4 p-3.5 bg-orange-600 rounded-2xl shadow-xl shadow-orange-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-orange-100 uppercase tracking-widest leading-none">{nearestEvent.label}</span>
                  <span className="text-[12px] font-black text-white mt-1">{nearestEvent.days} 天後 / Days</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <BellRing className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>

          <SidebarGroup className="p-1 mt-4">
            <div
              className={cn(
                "group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer border",
                viewMode === 'admin' 
                  ? "bg-orange-600 text-white border-orange-600 shadow-lg group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
                  : "bg-white text-slate-950 hover:bg-orange-50 border-transparent hover:border-orange-200 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
              )}
              onClick={() => setViewMode('admin')}
            >
              <ShieldCheck className={cn("h-5 w-5 shrink-0", viewMode === 'admin' ? "text-white" : "text-orange-600")} />
              <span className="text-[11px] font-black tracking-tight group-data-[collapsible=icon]:hidden uppercase">行政管理 / Admin Sync</span>
            </div>
          </SidebarGroup>

          <DragDropContext onDragEnd={handleDragEnd}>
            {[
              { key: 'activity', label: '活動組 / Activity', icon: FolderOpen },
              { key: 'teaching', label: '教學組 / Teaching', icon: BookOpen },
            ].map((cat) => {
              const catPlans = plans
                .filter(p => p.campId === activeCampId && p.category === cat.key)
                .sort((a, b) => a.order - b.order);

              return (
                <SidebarGroup key={cat.key} className="p-1 mt-5">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <SidebarGroupLabel className="h-auto p-0 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                      <span className="font-black text-[10px] text-slate-950 uppercase tracking-[0.2em]">{cat.label}</span>
                      <Badge className="h-4 px-2 text-[9px] font-black rounded-lg bg-orange-50 text-orange-600 border-none">
                        {catPlans.length}
                      </Badge>
                    </SidebarGroupLabel>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-500 group-data-[collapsible=icon]:hidden"
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

                              return (
                                <Draggable key={plan.id} draggableId={plan.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={cn(
                                        "group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer border-l-2",
                                        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:py-2",
                                        activePlanId === plan.id && viewMode === 'editor'
                                          ? "bg-orange-50 text-orange-600 border-orange-500" 
                                          : "bg-white text-slate-950 border-transparent hover:bg-slate-50",
                                        snapshot.isDragging && "shadow-xl bg-white z-50"
                                      )}
                                      onClick={() => {
                                        onSelect(plan.id);
                                        setViewMode('editor');
                                      }}
                                    >
                                      <div {...provided.dragHandleProps} className="opacity-0 group-hover:opacity-40 group-data-[collapsible=icon]:hidden">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <div className="hidden group-data-[collapsible=icon]:block">
                                        <FileText className={cn("h-4 w-4 shrink-0", activePlanId === plan.id ? "text-orange-600" : "text-slate-400")} />
                                      </div>
                                      <div className="flex-1 truncate text-[11px] font-black group-data-[collapsible=icon]:hidden uppercase">
                                        {planTitle}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 rounded-lg text-slate-400 hover:text-rose-600 group-data-[collapsible=icon]:hidden"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAdminDialog({ open: true, action: 'delete', id: plan.id });
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
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

          <div className="mt-10 px-2 space-y-4 group-data-[collapsible=icon]:hidden pb-20">
            <button 
              className="w-full flex items-center justify-center h-10 rounded-xl text-rose-600 bg-rose-50/50 hover:bg-rose-100 transition-all border border-dashed border-rose-300 text-[10px] font-black uppercase tracking-widest"
              onClick={() => setAdminDialog({ open: true, action: 'deleteCamp', id: activeCampId! })}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              安全刪除此營隊專案
            </button>
          </div>
        </SidebarContent>
      </Sidebar>

      <Dialog open={isAddCampOpen} onOpenChange={setIsAddCampOpen}>
        <DialogContent className="max-md rounded-[2.5rem] p-8 bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black uppercase tracking-tight">建立營隊專案 / Create Project</DialogTitle></DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">名稱 / Name</label>
              <Input placeholder="科學夏令營 / Camp Name" value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl font-black" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">開始 / Start</label>
                <Input type="date" value={tempCamp.startDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, startDate: e.target.value })} className="h-11 rounded-xl font-black" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">結束 / End</label>
                <Input type="date" value={tempCamp.endDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, startDate: e.target.value })} className="h-11 rounded-xl font-black" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddCampOpen(false)} className="rounded-xl font-black h-11">取消 / Cancel</Button>
            <Button onClick={handleCreateCamp} className="rounded-xl font-black bg-orange-600 text-white h-11 px-8">確認 / Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-lg rounded-[2.5rem] p-8 bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black uppercase tracking-tight">專案設定 / Settings</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">專案名稱 / Project Name</label>
              <Input value={tempCamp.name || ""} onChange={(e) => setTempCamp({ ...tempCamp, name: e.target.value })} className="h-11 rounded-xl font-black" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">營期開始 / Start</label>
                <Input type="date" value={tempCamp.startDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, startDate: e.target.value })} className="h-11 rounded-xl font-black" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">營期結束 / End</label>
                <Input type="date" value={tempCamp.endDate || ""} onChange={(e) => setTempCamp({ ...tempCamp, endDate: e.target.value })} className="h-11 rounded-xl font-black" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">一籌 / 1st</label>
                <Input type="date" value={tempCamp.meeting1Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting1Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">二籌 / 2nd</label>
                <Input type="date" value={tempCamp.meeting2Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting2Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">三籌 / 3rd</label>
                <Input type="date" value={tempCamp.meeting3Date || ""} onChange={(e) => setTempCamp({ ...tempCamp, meeting3Date: e.target.value })} className="h-10 rounded-lg text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="rounded-xl font-black h-11">取消 / Cancel</Button>
            <Button onClick={() => { activeCampId && onCampUpdate(activeCampId, tempCamp); setIsSettingsOpen(false); }} className="rounded-xl font-black bg-orange-600 text-white h-11 px-8">儲存 / Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
