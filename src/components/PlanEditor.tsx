"use client"

import { LessonPlan, SCHEDULE_OPTIONS, PlanVersion, Group } from "@/types/plan";
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
  ZoomIn,
  ZoomOut,
  Maximize,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VersionHistorySidebar } from "./VersionHistorySidebar";
import { DiffHighlighter } from "./DiffHighlighter";
import { getChangedFields } from "@/lib/text-diff";
import { exportToDocx } from "@/lib/export-utils";
import { ActionBar } from "@/components/ActionBar";

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
  groups: Group[];
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
  plan, groups, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo, 
  versions = [], onSaveVersion, onRestoreVersion, onDeleteVersion, onAutoSave, getFullVersionState, onUpdateVersionName, activityTypes = []
}: PlanEditorProps) {
  const { t, language } = useTranslation();
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

  const handlePrint = () => window.print();
  const handleExportWord = async () => {
    try {
      toast({ title: "匯出中", description: "正在產生 Word 檔案..." });
      await exportToDocx(currentPlan);
      toast({ title: "匯出成功", description: "已經成功下載 Word 檔案" });
    } catch (err) {
      toast({ title: "匯出失敗", description: "發生錯誤", variant: "destructive" });
    }
  };

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

  const handleDeleteCanvas = () => {
    if (confirm("確定要刪除此畫布嗎？此操作無法復原。")) {
      handlePlanUpdate({ canvasData: null, canvasHeight: null });
      toast({ title: "畫布已刪除" });
    }
  };

  const hasCanvas = plan.canvasData !== null && plan.canvasData !== undefined;
  const currentGroup = groups.find(group => group.id === currentPlan.groupId)
    || groups.find(group => currentPlan.category === 'teaching' ? group.slug === 'teaching' : group.slug === 'activity')
    || null;
  const currentGroupLabel = currentGroup
    ? (language === 'zh' ? currentGroup.nameZh : currentGroup.nameEn)
    : (currentPlan.category === 'teaching' ? t('TEACHING_PLAN') : t('ACTIVITY_PLAN'));

  return (
    <div className="h-full flex flex-row bg-stone-50 dark:bg-slate-900 font-body transition-colors overflow-hidden relative w-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        <div className="w-full pt-20 md:pt-24 pb-6 md:pb-10 px-4 md:px-6 xl:px-8 flex flex-col min-h-full">
          <div className="w-full md:w-[60%] md:mx-auto flex flex-col min-h-full">
          <header className="relative z-20 flex-none w-full mb-4 md:mb-6 border-b border-stone-200 dark:border-slate-800 pb-6 transition-all">
            <div className="w-full flex justify-between items-start gap-4">
              <div className="flex flex-col w-full text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    currentPlan.category === "activity" 
                      ? "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-200" 
                      : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200"
                  )}>
                    {currentGroupLabel}
                  </span>
                </div>
                <p className="text-xs tracking-[0.18em] text-stone-500 dark:text-slate-400 uppercase font-medium mb-1.5">Lesson Plan Editor // New Draft</p>
                <input
                  value={currentPlan.activityName}
                  onChange={(e) => handlePlanUpdate({ activityName: e.target.value })}
                  className="text-3xl md:text-4xl font-extrabold tracking-tight bg-transparent border-none focus:ring-0 focus:outline-none text-stone-900 dark:text-white w-full px-0"
                  placeholder={t('ENTER_TITLE')}
                  readOnly={isHistoryMode}
                />
              </div>
            </div>
          </header>

          <ActionBar title="" className="md:justify-end gap-1.5 md:gap-2 mb-4">
            {!isHistoryMode && (
              <div className="hidden sm:flex flex-shrink-0 items-center bg-transparent border-none mr-1 sm:mr-2">
                <Input 
                  placeholder="輸入版本名稱..." 
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="h-8 w-[120px] md:w-[150px] bg-transparent border-none text-[10px] font-bold focus-visible:ring-0 shadow-none text-white mix-blend-difference placeholder:text-white/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveVersion();
                  }}
                />
                <Button size="sm" onClick={handleSaveVersion} className="h-8 w-8 p-0 bg-transparent hover:bg-stone-200 dark:hover:bg-slate-700 text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity rounded-lg">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryMode(!isHistoryMode)}
              className={cn(
                "h-9 px-3 rounded-lg font-bold text-xs bg-transparent",
                isHistoryMode ? "text-white mix-blend-difference font-bold opacity-100 underline underline-offset-4" : "text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity"
              )}
            >
              <History className="w-4 h-4 mr-1.5" />
              {isHistoryMode ? "離開紀錄" : t('LOG_BOOK')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg font-bold text-xs bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
                   <FileDown className="w-4 h-4 sm:mr-1.5" />
                   <span className="hidden sm:inline">匯出</span>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-xl">
                 <DropdownMenuItem onClick={handlePrint} className="text-xs font-bold font-fira-code">PDF / PRINT</DropdownMenuItem>
                 <DropdownMenuItem onClick={handleExportWord} className="text-xs font-bold font-fira-code">WORD (.docx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-stone-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo || isHistoryMode} className="h-9 w-9 rounded-lg bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo || isHistoryMode} className="h-9 w-9 rounded-lg bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={pageZoom <= 0.3} className="hidden sm:flex h-9 w-9 rounded-lg bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFitAll} className="hidden sm:flex h-9 w-9 rounded-lg bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={pageZoom >= 2} className="hidden sm:flex h-9 w-9 rounded-lg bg-transparent text-white mix-blend-difference hover:opacity-100 opacity-90 transition-opacity">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </ActionBar>

          <main className="flex-1 flex flex-col relative shrink-0 pb-32 sm:pb-40">
          <div style={{ zoom: pageZoom }}>
          {isLoadingPreview ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center gap-2 text-stone-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest">Reconstructing History...</p>
            </div>
          ) : (
            <Card className="border-x-0 border-y sm:border-stone-200 dark:border-white/5 shadow-none sm:shadow-xl rounded-none sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50">
              <CardContent className="p-4 sm:p-8 md:p-12 space-y-8 md:space-y-12 leading-[1.6]">
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
                      <div className="rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 md:p-3 focus-within:ring-2 focus-within:ring-orange-500/40 focus-within:border-orange-500 transition-all">
                        <textarea
                          value={currentPlan.purpose || ""}
                          onChange={(e) => handlePlanUpdate({ purpose: e.target.value })}
                          className="w-full min-h-[120px] bg-transparent border-none rounded-lg p-3 md:p-4 text-stone-800 dark:text-slate-200 outline-none resize-none font-medium text-sm md:text-base"
                        />
                      </div>
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
                          <div className="mb-6 border border-stone-200 dark:border-white/10 rounded-[1.5rem] overflow-hidden bg-stone-50 dark:bg-white/5">
                            <div className="flex justify-end px-3 pt-3 pb-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteCanvas}
                                className="h-8 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                刪除畫布
                              </Button>
                            </div>
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

                  <section className="w-full flex flex-col">
                    <SectionHeader title={t('MATERIALS')} icon={Package} />
                    {isHistoryMode ? (
                       <DiffHighlighter type="table" oldValue={previousPlan?.props} newValue={previewPlan?.props} />
                    ) : (
                      <div className="w-full lg:w-[85vw] lg:relative lg:left-1/2 lg:-translate-x-1/2">
                        <div className="w-full overflow-x-auto">
                          <PropsTable value={currentPlan.props} onChange={(val) => handlePlanUpdate({ props: val })} />
                        </div>
                      </div>
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
        </main>
          </div>
        </div>
      </div>

      {/* Sidebar - Placed outside the scrollable container so it stays fixed */}
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
          className="w-[300px] md:w-[350px] flex-none animate-in slide-in-from-right duration-300 border-l border-stone-200 dark:border-white/5 bg-white sm:bg-stone-50/50 dark:bg-slate-950 shadow-2xl relative z-10 h-full overflow-y-auto"
        />
      )}

    </div>
  );
}

