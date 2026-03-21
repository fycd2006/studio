"use client"

import { LessonPlan, SCHEDULE_OPTIONS, PlanVersion } from "@/types/plan";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownArea } from "@/components/MarkdownArea";
import { PropsTable } from "@/components/PropsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  FileDown, 
  Plus, 
  Trash2, 
  FileText, 
  Users, 
  Package, 
  StickyNote, 
  MapPin, 
  Clock, 
  Target, 
  Layout, 
  Undo2, 
  Redo2, 
  History, 
  Save, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { VersionHistorySidebar } from "./VersionHistorySidebar";
import { DiffHighlighter } from "./DiffHighlighter";
import { getChangedFields } from "@/lib/text-diff";

const FabricCanvas = dynamic(
  () => import("@/components/FabricCanvas").then((mod) => mod.FabricCanvas),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full flex items-center justify-center rounded-xl bg-stone-50">
        <div className="flex flex-col items-center gap-2 text-stone-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-[10px] font-extrabold uppercase tracking-widest">載入中 / Loading...</p>
        </div>
      </div>
    )
  }
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
  <div className="flex items-center gap-3 mb-6 pt-8 first:pt-0">
    <div className="w-1.5 h-6 bg-orange-500 dark:bg-amber-400 rounded-full transition-colors" />
    <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2.5 uppercase">
      {Icon && <Icon className="h-4.5 w-4.5 text-orange-500 dark:text-amber-400 opacity-80 transition-colors" />}
      {title}
    </h3>
    <div className="flex-1 h-[1px] bg-stone-100 dark:bg-white/5 ml-2 transition-colors" />
  </div>
);

interface PlanEditorProps {
  plan: LessonPlan;
  onUpdate: (id: string, updates: Partial<LessonPlan>) => void;
  isSaving: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  versions?: PlanVersion[];
  onSaveVersion?: (name: string, isAuto?: boolean) => void;
  onRestoreVersion?: (versionId: string) => void;
  onDeleteVersion?: (versionId: string) => void;
  onAutoSave?: () => void;
  getFullVersionState?: (version: PlanVersion) => Promise<LessonPlan>;
  onUpdateVersionName?: (versionId: string, versionName: string) => void;
  activityTypes?: string[];
}

export function PlanEditor({ 
  plan, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo, 
  versions = [], onSaveVersion, onRestoreVersion, onDeleteVersion, onAutoSave, getFullVersionState, onUpdateVersionName, activityTypes = []
}: PlanEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // History Mode State
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
  const [previewPlan, setPreviewPlan] = useState<LessonPlan | null>(null);
  const [previousPlan, setPreviousPlan] = useState<LessonPlan | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Versions UI state
  const [newVersionName, setNewVersionName] = useState("");
  const [showNamedOnly, setShowNamedOnly] = useState(false);

  // Global Editor Zoom
  const [pageZoom, setPageZoom] = useState(1);
  const handleZoomIn = () => setPageZoom(prev => Math.min(2, prev + 0.1));
  const handleZoomOut = () => setPageZoom(prev => Math.max(0.3, prev - 0.1));
  const handleFitAll = () => setPageZoom(1);

  // Local state for smooth typing without spamming Firestore
  const [localPlan, setLocalPlan] = useState<LessonPlan>(plan);
  const pendingUpdatesRef = useRef<Partial<LessonPlan>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only sync from remote if we don't have pending local updates
    if (Object.keys(pendingUpdatesRef.current).length === 0) {
      setLocalPlan(plan);
    }
  }, [plan]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePlanUpdate = (updates: Partial<LessonPlan>) => {
    // Update local UI immediately
    setLocalPlan(prev => ({ ...prev, ...updates }));
    
    // Merge into pending
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    // Debounce the actual Firestore write
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onUpdate(plan.id, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {}; // Clear pending after dispatch
    }, 1000);
  };

  const currentPlan = isHistoryMode ? (previewPlan || plan) : localPlan;

  // Auto-Save Trigger
  const autoSaveRef = useRef(onAutoSave);
  // Keep the ref updated with the latest function without triggering effect re-runs
  useEffect(() => {
    autoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  const onUpdateRef = useRef(onUpdate);
  const planIdRef = useRef(plan.id);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    planIdRef.current = plan.id;
  }, [onUpdate, plan.id]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush pending updates before unload
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        onUpdateRef.current(planIdRef.current, pendingUpdatesRef.current);
        pendingUpdatesRef.current = {};
      }
      autoSaveRef.current?.();
      delete e['returnValue']; 
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush pending on unmount
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        onUpdateRef.current(planIdRef.current, pendingUpdatesRef.current);
        pendingUpdatesRef.current = {};
      }
      // Only execute auto-save on true component unmount (e.g. navigation)
      autoSaveRef.current?.();
    };
  }, []);

  // Load preview data when version selected
  useEffect(() => {
    if (!selectedVersion || !getFullVersionState) {
      setPreviewPlan(null);
      setPreviousPlan(null);
      return;
    }

    const load = async () => {
      setIsLoadingPreview(true);
      try {
        const targetState = await getFullVersionState(selectedVersion);
        setPreviewPlan(targetState);

        const currentIdx = versions.findIndex(v => v.id === selectedVersion.id);
        if (currentIdx < versions.length - 1) {
          const prevState = await getFullVersionState(versions[currentIdx + 1]);
          setPreviousPlan(prevState);
        } else {
          setPreviousPlan(null);
        }
      } catch (err) {
        console.error("Failed to load version preview:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    };
    load();
  }, [selectedVersion, getFullVersionState, versions]);

  // Note: handlePlanUpdate was moved higher up, so we'll just leave this spot empty to prevent duplication.

  const handleSaveVersion = () => {
    if (!newVersionName.trim()) {
      toast({ title: "請輸入版本名稱", variant: "destructive" });
      return;
    }
    onSaveVersion?.(newVersionName);
    setNewVersionName("");
    toast({ title: "版本已儲存" });
  };

  const handleRestoreVersion = (versionId: string) => {
    onRestoreVersion?.(versionId);
    setIsHistoryMode(false);
    setSelectedVersion(null);
    toast({ title: "已還原版本" });
  };

  const handleDeleteVersion = (versionId: string) => {
    if (confirm("確定要刪除此版本嗎？")) {
      onDeleteVersion?.(versionId);
      if (selectedVersion?.id === versionId) setSelectedVersion(null);
      toast({ title: "已刪除版本" });
    }
  };

  const handleCanvasSave = (data: string, height: number) => {
    handlePlanUpdate({ canvasData: data, canvasHeight: height });
  };

  const hasCanvas = plan.canvasData !== null && plan.canvasData !== undefined;

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-slate-900 font-body transition-colors">
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-white/5 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 sticky top-0 z-40 transition-colors">
        <div className="flex items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="md:hidden mt-1 md:mt-0 -ml-2 shrink-0">
            <SidebarTrigger />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                currentPlan.category === "activity" 
                  ? "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-100 placeholder:opacity-50" 
                  : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-100"
              )}>
                {currentPlan.category === "activity" ? t('ACTIVITY_PLAN') : t('TEACHING_PLAN')}
              </span>
            </div>
            <input
              value={currentPlan.activityName}
              onChange={(e) => handlePlanUpdate({ activityName: e.target.value })}
              className="text-xl md:text-2xl font-black tracking-tight bg-transparent border-none focus:ring-0 focus:outline-none text-stone-900 dark:text-white"
              placeholder={t('ENTER_TITLE')}
              readOnly={isHistoryMode}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {!isHistoryMode && (
             <div className="flex flex-shrink-0 items-center bg-stone-100 dark:bg-white/5 p-1 rounded-xl border border-stone-200 dark:border-white/5">
               <Input 
                 placeholder="命名此版本..." 
                 value={newVersionName}
                 onChange={(e) => setNewVersionName(e.target.value)}
                 className="h-8 w-[150px] bg-transparent border-none text-[10px] font-bold focus-visible:ring-0"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') handleSaveVersion();
                 }}
               />
               <Button size="sm" onClick={handleSaveVersion} className="h-8 w-8 p-0 bg-transparent hover:bg-white/10 text-stone-400 hover:text-orange-600 rounded-lg">
                 <Save className="h-3.5 w-3.5" />
               </Button>
             </div>
          )}

          <div className="flex flex-shrink-0 items-center bg-stone-100 dark:bg-white/5 p-1 rounded-xl border border-stone-200 dark:border-white/5">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsHistoryMode(!isHistoryMode)} 
              className={cn(
                "h-8 px-4 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all",
                isHistoryMode ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <History className="w-3.5 h-3.5 mr-2" /> 
              {isHistoryMode ? "離開紀錄" : t('LOG_BOOK')}
            </Button>
          </div>

          <Button size="sm" onClick={() => window.print()} className="bg-orange-600 dark:bg-amber-400 text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-[10px] h-9 shrink-0 whitespace-nowrap">
            <FileDown className="w-4 h-4 mr-2 hidden sm:inline" /> <span className="sm:hidden">匯出</span><span className="hidden sm:inline">{t('EXPORT_FILE')}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-x-auto overflow-y-hidden relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 sm:p-4 md:p-8 lg:p-12 max-w-5xl mx-auto w-full min-w-[320px] md:min-w-[500px] lg:min-w-[600px] shrink-0">
          <div style={{ zoom: pageZoom }}>
          {isLoadingPreview ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Reconstructing History...</p>
            </div>
          ) : (
            <Card className="border-x-0 border-y sm:border-stone-200 dark:border-white/5 shadow-none sm:shadow-xl rounded-none sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50">
              <CardContent className="p-4 sm:p-8 md:p-12 space-y-8 md:space-y-12">
                {isHistoryMode && (
                  <div className="flex items-center justify-between p-6 bg-orange-50/50 dark:bg-amber-400/5 rounded-2xl border border-orange-100 dark:border-amber-400/20 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                      <div>
                        <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight block">紀錄預覽 / History View</span>
                        {selectedVersion && (
                          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                            Showing: {selectedVersion.name} ({format(new Date(selectedVersion.createdAt), "MM/dd HH:mm")})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-12">
                  <section>
                    <SectionHeader title="活動類型" icon={Layout} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="text" oldValue={previousPlan?.scheduledName} newValue={previewPlan?.scheduledName} />
                    ) : (
                      <Select value={currentPlan.scheduledName || ""} onValueChange={(val) => handlePlanUpdate({ scheduledName: val })}>
                        <SelectTrigger className="h-12 rounded-xl px-5 font-bold shadow-none text-base border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                          <SelectValue placeholder="-- 請選擇活動類型 --" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl font-bold bg-white dark:bg-slate-800 border overflow-hidden">
                          {activityTypes.map(type => (
                            <SelectItem key={type} value={type} className="rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-700">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('SUBJECT')} icon={Target} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="text" oldValue={previousPlan?.activityName} newValue={previewPlan?.activityName} />
                    ) : (
                      <Input value={currentPlan.activityName} onChange={(e) => handlePlanUpdate({ activityName: e.target.value })} className="h-12 rounded-xl font-bold text-lg px-5 shadow-none" />
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('CASE_PERSONNEL')} icon={Users} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="text" oldValue={previousPlan?.members} newValue={previewPlan?.members} />
                    ) : (
                      <Input value={currentPlan.members} onChange={(e) => handlePlanUpdate({ members: e.target.value })} placeholder={t('LIST_MEMBERS')} className="h-12 rounded-xl px-5 shadow-none font-bold" />
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('MISSION_OBJ')} icon={Target} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="markdown" oldValue={previousPlan?.purpose} newValue={previewPlan?.purpose} />
                    ) : (
                      <textarea
                        value={currentPlan.purpose || ""}
                        onChange={(e) => handlePlanUpdate({ purpose: e.target.value })}
                        className="w-full min-h-[120px] bg-white dark:bg-white/5 border border-stone-100 dark:border-white/10 rounded-[1.5rem] p-4 md:p-6 text-stone-700 dark:text-slate-300 outline-none transition-all resize-none font-medium text-sm md:text-base"
                      />
                    )}
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <SectionHeader title={t('TIME_WINDOW')} icon={Clock} />
                       {isHistoryMode ? (
                          <DiffHighlighter type="text" oldValue={previousPlan?.time} newValue={previewPlan?.time} />
                       ) : (
                         <Input value={currentPlan.time} onChange={(e) => handlePlanUpdate({ time: e.target.value })} placeholder="14:00 - 15:30" className="h-12 rounded-xl px-5 shadow-none font-bold" />
                       )}
                    </div>
                    <div className="space-y-2">
                       <SectionHeader title={t('VENUE')} icon={MapPin} />
                       {isHistoryMode ? (
                          <DiffHighlighter type="text" oldValue={previousPlan?.location} newValue={previewPlan?.location} />
                       ) : (
                         <Input value={currentPlan.location} onChange={(e) => handlePlanUpdate({ location: e.target.value })} placeholder="3F Main Hall" className="h-12 rounded-xl px-5 shadow-none font-bold" />
                       )}
                    </div>
                  </section>

                  <section>
                    <SectionHeader title={t('PROCEDURES')} icon={Layout} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="markdown" oldValue={previousPlan?.process} newValue={previewPlan?.process} />
                    ) : (
                      <MarkdownArea value={currentPlan.process} onChange={(val) => handlePlanUpdate({ process: val })} />
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('VISUAL_BLUEPRINT')} icon={FileText} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="canvas" oldValue={previousPlan?.canvasData} newValue={previewPlan?.canvasData} />
                    ) : (
                      <>
                        {hasCanvas ? (
                          <div className="mb-6 border border-stone-100 dark:border-white/5 rounded-[1.5rem] overflow-hidden bg-stone-50 dark:bg-white/5">
                            <FabricCanvas 
                              initialData={currentPlan.canvasData || '{}'} 
                              initialHeight={currentPlan.canvasHeight || 500} 
                              onSave={handleCanvasSave} 
                            />
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handlePlanUpdate({ canvasData: '{}', canvasHeight: 500 })} className="h-10 px-5 text-[10px] font-bold text-orange-600 border-orange-200 rounded-xl uppercase tracking-widest mb-4">
                            <Plus className="h-4 w-4 mr-2" /> {t('ADD_CANVAS')}
                          </Button>
                        )}
                        <MarkdownArea value={currentPlan.content} onChange={(val) => handlePlanUpdate({ content: val })} />
                      </>
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('MATERIALS')} icon={Package} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="table" oldValue={previousPlan?.props} newValue={previewPlan?.props} />
                    ) : (
                      <PropsTable value={currentPlan.props} onChange={(val) => handlePlanUpdate({ props: val })} />
                    )}
                  </section>

                  <section>
                    <SectionHeader title={t('OPENING_CLOSING') || "開場與結語"} icon={StickyNote} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="markdown" oldValue={previousPlan?.openingClosingRemarks} newValue={previewPlan?.openingClosingRemarks} />
                    ) : (
                      <MarkdownArea value={currentPlan.openingClosingRemarks || ""} onChange={(val) => handlePlanUpdate({ openingClosingRemarks: val })} />
                    )}
                  </section>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>

        {isHistoryMode && (
          <VersionHistorySidebar
            versions={versions}
            selectedVersionId={selectedVersion?.id || null}
            onSelectVersion={setSelectedVersion}
            onRestore={handleRestoreVersion}
            onDelete={handleDeleteVersion}
            showNamedOnly={showNamedOnly}
            onToggleFilter={() => setShowNamedOnly(!showNamedOnly)}
            onBackToCurrent={() => {
              setSelectedVersion(null);
              setIsHistoryMode(false);
            }}
            onUpdateVersionName={(id, name) => onUpdateVersionName?.(id, name)}
            className="w-[300px] md:w-[350px] flex-none animate-in slide-in-from-right duration-300 border-l border-stone-200 dark:border-white/5 bg-white sm:bg-stone-50/50 dark:bg-slate-950 shadow-2xl relative z-10"
          />
        )}
      </main>

      {/* Floating Action Panel (Global Editor) */}
      <div className="fixed bottom-6 right-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 flex items-center gap-1.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo || isHistoryMode} className="h-12 w-12 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <Undo2 className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">上一步 / Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo || isHistoryMode} className="h-12 w-12 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <Redo2 className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">下一步 / Redo</TooltipContent>
          </Tooltip>
          
          <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={pageZoom <= 0.3} className="h-12 w-12 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <ZoomOut className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">縮小 / Zoom Out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleFitAll} className="h-12 w-12 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <Maximize className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">適合視窗 / Fit All</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={pageZoom >= 2} className="h-12 w-12 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <ZoomIn className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">放大 / Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
