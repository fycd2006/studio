"use client"

import { LessonPlan, SCHEDULE_OPTIONS, PlanVersion, Group } from "@/types/plan";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownArea } from "@/components/MarkdownArea";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
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
  MoreHorizontal,
  RotateCcw,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { exportToDocx, exportToPdf } from "@/lib/export-utils";
import { ActionBar } from "@/components/ActionBar";
import { usePresence } from "@/hooks/use-presence";

const FieldContainer = ({
  children,
  field,
  isLockedByOther,
  getLockInfo
}: {
  children: React.ReactNode,
  field: string,
  isLockedByOther: (f: string) => boolean,
  getLockInfo: (f: string) => any
}) => {
  const locked = isLockedByOther(field);
  const info = getLockInfo(field);
  return (
    <div className="relative group">
      <div className={cn("transition-opacity", locked && "opacity-50 pointer-events-none")}>
        {children}
      </div>
      {locked && info && (
        <div className="absolute -top-3 right-2 z-10 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {info.name} 編輯中...
        </div>
      )}
    </div>
  );
};


const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
  <div className="flex items-center gap-3 mb-4 pt-6 first:pt-0 border-b border-stone-100 dark:border-white/5 pb-2">
    {Icon && <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500 opacity-80" />}
    <h3 className="text-sm font-bold text-stone-700 dark:text-slate-300 tracking-wide">
      {title}
    </h3>
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
  const { lockField, unlockField, isLockedByOther, getLockInfo } = usePresence(plan.id);

  // History Mode State
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
  const [previewPlan, setPreviewPlan] = useState<LessonPlan | null>(null);
  const [previousPlan, setPreviousPlan] = useState<LessonPlan | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Versions UI state
  const [newVersionName, setNewVersionName] = useState("");
  const [showNamedOnly, setShowNamedOnly] = useState(false);

  // Global Editor Zoom
  const [pageZoom, setPageZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth > 0 && windowWidth < 768;
  const [isMobilePrintView, setIsMobilePrintView] = useState(false);
  const isPrintMode = !isMobile || isMobilePrintView;

  const handleZoomIn = () => setPageZoom(prev => Math.min(2, prev + 0.1));
  const handleZoomOut = () => setPageZoom(prev => Math.max(0.3, prev - 0.1));
  const handleFitAll = () => setPageZoom(1);

  const handlePrint = async () => {
    try {
      toast({ title: "匯出中", description: "正在產生 PDF 檔案..." });
      await exportToPdf(currentPlan);
      toast({ title: "匯出成功", description: "已下載 PDF 檔案" });
    } catch {
      toast({ title: "匯出失敗", description: "發生錯誤", variant: "destructive" });
    }
  };
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

  // Local history stack
  const [localHistory, setLocalHistory] = useState<{ past: LessonPlan[], future: LessonPlan[] }>({ past: [], future: [] });

  const recordHistory = useCallback(() => {
    setLocalHistory(prev => {
      const last = prev.past[prev.past.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(localPlan)) return prev;
      return { past: [...prev.past.slice(-20), localPlan], future: [] };
    });
  }, [localPlan]);

  const handleFocus = useCallback((field: string) => {
    lockField(field);
    recordHistory();
  }, [lockField, recordHistory]);

  const handleBlur = useCallback((field: string) => {
    unlockField(field);
  }, [unlockField]);

  useEffect(() => {
    // Merge remote plan with pending local changes so stale server echoes
    // don't revert immediate local actions.
    setLocalPlan({ ...plan, ...pendingUpdatesRef.current });
  }, [plan]);

  // Clean up debounce timeout on unmount (actual flush logic is below in the beforeunload effect)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePlanUpdate = (updates: Partial<LessonPlan>) => {
    // Update local UI immediately
    if (Object.keys(pendingUpdatesRef.current).length === 0) {
      // Record snapshot right before a new burst of typing
      recordHistory();
    }
    setLocalPlan(prev => ({ ...prev, ...updates }));

    // Merge into pending
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    // Debounce the actual Firestore write
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onUpdate(plan.id, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {}; // Clear pending after dispatch
    }, 1500);
  };

  const handlePlanUpdateImmediate = (updates: Partial<LessonPlan>) => {
    setLocalPlan(prev => ({ ...prev, ...updates }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onUpdate(plan.id, pendingUpdatesRef.current);
    pendingUpdatesRef.current = {};
  };

  const handleLocalUndo = () => {
    if (localHistory.past.length === 0 || isHistoryMode) return;
    const previous = localHistory.past[localHistory.past.length - 1];
    setLocalHistory(prev => ({
      past: prev.past.slice(0, -1),
      future: [localPlan, ...prev.future]
    }));
    handlePlanUpdateImmediate(previous);
  };

  const handleLocalRedo = () => {
    if (localHistory.future.length === 0 || isHistoryMode) return;
    const next = localHistory.future[0];
    setLocalHistory(prev => ({
      past: [...prev.past, localPlan],
      future: localHistory.future.slice(1)
    }));
    handlePlanUpdateImmediate(next);
  };

  const handleLocalUndoRef = useRef(handleLocalUndo);
  const handleLocalRedoRef = useRef(handleLocalRedo);

  useEffect(() => {
    handleLocalUndoRef.current = handleLocalUndo;
    handleLocalRedoRef.current = handleLocalRedo;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleLocalRedoRef.current();
        } else {
          handleLocalUndoRef.current();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleLocalRedoRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentPlan = isHistoryMode ? (previewPlan || plan) : localPlan;
  const isScriptMode = currentPlan.scheduledName === '劇本';

  // Auto-Save Trigger
  const autoSaveRef = useRef(onAutoSave);
  // Keep the ref updated with the latest function without triggering effect re-runs
  useEffect(() => {
    autoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  const onUpdateRef = useRef(onUpdate);
  const planIdRef = useRef(plan.id);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport && toolbarRef.current) {
        const offset = window.innerHeight - window.visualViewport.height;
        toolbarRef.current.style.bottom = `${offset}px`;
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

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

  const handleSaveVersion = (name?: string) => {
    // Flush pending updates immediately before saving version
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      onUpdateRef.current(planIdRef.current, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    const nameToSave = name || newVersionName;
    if (!nameToSave.trim()) {
      toast({ title: "請輸入版本名稱", variant: "destructive" });
      return;
    }
    onSaveVersion?.(nameToSave.trim());
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

  const currentGroup = groups.find(group => group.id === currentPlan.groupId)
    || groups.find(group => currentPlan.category === 'teaching' ? group.slug === 'teaching' : group.slug === 'activity')
    || null;
  const currentGroupLabel = currentGroup
    ? (language === 'zh' ? currentGroup.nameZh : currentGroup.nameEn)
    : (currentPlan.category === 'teaching' ? t('TEACHING_PLAN') : t('ACTIVITY_PLAN'));

  return (
    <div className={cn(
      "flex flex-row font-body transition-colors relative w-full min-h-[100dvh]",
      isPrintMode ? "bg-[#FBF9F6] dark:bg-[hsl(var(--bar-theme))]" : "bg-white dark:bg-slate-800"
    )}>
      <div className="flex-1 min-w-0 relative flex flex-col">
        <div className={cn(
          "w-full flex flex-col items-center",
          isPrintMode ? "pt-20 md:pt-24 px-4 md:px-0" : "pt-20 pb-0 px-4"
        )}>
          <div className="w-full md:max-w-[816px] flex flex-col">
            <header className="relative z-20 flex-none w-full mb-4 md:mb-6 dark:pb-6 transition-all">
              <div className="w-full max-w-full flex justify-between items-start gap-4">
                <div className="flex flex-col w-full text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border-none",
                      currentPlan.category === "activity"
                        ? "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 "
                        : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 "
                    )}>
                      {currentGroupLabel}
                    </span>
                  </div>
                  <p className="text-xs tracking-[0.18em] text-stone-500 dark:text-slate-400 uppercase font-medium mb-1.5">Lesson Plan Editor // New Draft</p>
                  <input
                    value={currentPlan.activityName}
                    onChange={(e) => handlePlanUpdate({ activityName: e.target.value })}
                    className="text-3xl md:text-4xl font-extrabold tracking-tight bg-transparent  focus:ring-0 focus:outline-none text-[#2C2A28] dark:text-white w-full px-0"
                    placeholder={t('ENTER_TITLE')}
                    readOnly={isHistoryMode}
                  />
                </div>
              </div>
            </header>
          </div>
        </div>

        <ActionBar title="" className="md:justify-end gap-1.5 md:gap-2">
          <div className="hidden md:flex flex-row items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-1 mr-auto shadow-sm">
            <MarkdownToolbar className="bg-transparent border-none sm:border-none px-0" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            title="版本紀錄"
            onClick={() => {
              const willOpen = !isSidebarOpen;
              setIsSidebarOpen(willOpen);
              if (willOpen && !isHistoryMode) setIsHistoryMode(true);
              if (!willOpen && !selectedVersion) setIsHistoryMode(false);
            }}
            className={cn(
              "h-9 w-9 p-0 flex justify-center items-center rounded-lg font-bold text-xs bg-transparent transition-all",
              isSidebarOpen ? "text-[#2C2A28] dark:text-white bg-stone-200 dark:bg-slate-800 opacity-100" : "text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 hover:bg-stone-200 dark:hover:bg-slate-800"
            )}
          >
            <History className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg font-bold text-xs bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                <FileDown className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">匯出</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 rounded-xl">
              <DropdownMenuItem onClick={handlePrint} className="text-xs font-bold font-fira-code">PDF (.pdf)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWord} className="text-xs font-bold font-fira-code">WORD (.docx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-stone-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          <Button variant="ghost" size="icon" onClick={handleLocalUndo} disabled={localHistory.past.length === 0 || isHistoryMode} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLocalRedo} disabled={localHistory.future.length === 0 || isHistoryMode} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={pageZoom <= 0.3} className="flex h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFitAll} className="flex h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={pageZoom >= 2} className="flex h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity">
            <ZoomIn className="h-4 w-4" />
          </Button>
          {isMobile && (
            <>
              <div className="w-px h-6 bg-stone-200 dark:bg-slate-700 mx-1"></div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobilePrintView(!isMobilePrintView)} className="flex h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity" title="切換檢視模式">
                {isMobilePrintView ? <Smartphone className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </Button>
            </>
          )}
        </ActionBar>

        <div className="w-full flex flex-col items-center px-0 sm:px-4 md:px-6 xl:px-8">
          <div className="w-full md:max-w-none flex flex-col items-center">
            <main className="flex-1 w-full flex flex-col items-center relative shrink-0 overflow-visible pb-32 sm:pb-40">
              <div
                className="relative"
                style={{
                  width: isPrintMode ? `${816 * pageZoom}px` : '100%',
                  maxWidth: isPrintMode ? 'none' : '100%',
                }}
              >
                <div
                  style={isPrintMode ? {
                    zoom: pageZoom,
                    width: '816px',
                    transformOrigin: 'top left',
                  } as any : {
                    width: '100%',
                    fontSize: `${16 * pageZoom}px`
                  }}
                  className={cn(
                    "transition-all duration-200 ease-out",
                    !isPrintMode && "[&_.prose]:text-[inherit] [&_.prose_p]:text-[inherit] [&_.prose_li]:text-[inherit] [&_.prose_h1]:text-[2em] [&_.prose_h2]:text-[1.5em] [&_.prose_h3]:text-[1.17em]"
                  )}
                >
                {isLoadingPreview ? (
                  <div className="h-full min-h-[260px] w-full md:w-[816px] flex flex-col items-center justify-center gap-2 text-stone-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest">Reconstructing History...</p>
                  </div>
                ) : (
                  <div className={cn(
                    "w-full overflow-visible bg-white dark:bg-slate-800 transition-all",
                    isPrintMode ? "shadow-md rounded-none sm:rounded-sm border-none sm:border border-stone-200 dark:border-slate-700" : "shadow-none rounded-none border-none"
                  )}>
                    <div className={cn(
                      "leading-[1.6]",
                      isPrintMode ? "px-6 md:px-10 py-10 space-y-6 md:space-y-8" : "px-2 py-6 space-y-5"
                    )}>
                      {isHistoryMode && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-orange-50/50 dark:bg-amber-400/5 rounded-2xl dark:mb-8 gap-4 border-none">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                            <div>
                              <span className="text-sm font-black text-[#2C2A28] dark:text-white uppercase tracking-tight block">歷史紀錄 / History View</span>
                              {selectedVersion && (
                                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                                  Showing: {selectedVersion.versionName || selectedVersion.name} ({format(new Date(selectedVersion.createdAt), "MM/dd HH:mm")})
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedVersion && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setSelectedVersion(null);
                                  setIsHistoryMode(false);
                                  setIsSidebarOpen(false);
                                }}
                                className="h-10 px-4 rounded-xl font-bold text-xs flex-1 sm:flex-none"
                              >
                                取消 / Cancel
                              </Button>
                              <Button
                                onClick={() => handleRestoreVersion(selectedVersion.id)}
                                className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 flex-1 sm:flex-none"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" /> 還原 / Restore
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-12">
                        <section>
                          <SectionHeader title="活動類型" icon={Layout} />
                          {isHistoryMode ? (
                            <DiffHighlighter type="text" oldValue={previousPlan?.scheduledName} newValue={previewPlan?.scheduledName} />
                          ) : (
                            <Select value={currentPlan.scheduledName || ""} onValueChange={(val) => handlePlanUpdate({ scheduledName: val })}>
                              <SelectTrigger className="h-12 rounded-none px-2 font-bold text-base bg-transparent dark:bg-transparent shadow-none hover:bg-stone-50 dark:hover:bg-slate-700 border-none focus:ring-0">
                                <SelectValue placeholder="-- 請選擇活動類型 --" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl font-bold bg-white dark:bg-slate-800 overflow-hidden shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
                                {activityTypes.map(type => (
                                  <SelectItem key={type} value={type} className="rounded-lg cursor-pointer hover:bg-[#FBF9F6] dark:hover:bg-slate-700">{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </section>

                        {!isScriptMode && (
                          <section>
                            <SectionHeader title={t('SUBJECT')} icon={Target} />
                            {isHistoryMode ? (
                              <DiffHighlighter type="text" oldValue={previousPlan?.activityName} newValue={previewPlan?.activityName} />
                            ) : (
                              <FieldContainer field="activityName" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                <MarkdownArea
                                  value={currentPlan.activityName}
                                  onChange={(val) => handlePlanUpdate({ activityName: val })}
                                  onFocus={() => handleFocus('activityName')}
                                  onBlur={() => handleBlur('activityName')}
                                  placeholder="輸入教案名稱 / Enter subject title"
                                  minHeight="38px"
                                />
                              </FieldContainer>
                            )}
                          </section>
                        )}

                        {!isScriptMode && (
                          <section>
                            <SectionHeader title={t('CASE_PERSONNEL')} icon={Users} />
                            {isHistoryMode ? (
                              <DiffHighlighter type="text" oldValue={previousPlan?.members} newValue={previewPlan?.members} />
                            ) : (
                              <FieldContainer field="members" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                <MarkdownArea
                                  value={currentPlan.members}
                                  onChange={(val) => handlePlanUpdate({ members: val })}
                                  onFocus={() => handleFocus('members')}
                                  onBlur={() => handleBlur('members')}
                                  placeholder="列出相關人員... / List members..."
                                  minHeight="38px"
                                />
                              </FieldContainer>
                            )}
                          </section>
                        )}

                        <section>
                          <SectionHeader title={t('MISSION_OBJ')} icon={Target} />
                          {isHistoryMode ? (
                            <DiffHighlighter type="markdown" oldValue={previousPlan?.purpose} newValue={previewPlan?.purpose} />
                          ) : (
                            <FieldContainer field="purpose" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                              <MarkdownArea
                                value={currentPlan.purpose || ""}
                                onChange={(val) => handlePlanUpdate({ purpose: val })}
                                onFocus={() => handleFocus('purpose')}
                                onBlur={() => handleBlur('purpose')}
                                placeholder="描述活動目標與宗旨... / Describe mission objectives..."
                                minHeight="120px"
                              />
                            </FieldContainer>
                          )}
                        </section>

                        {!isScriptMode && (
                          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <SectionHeader title={t('TIME_WINDOW')} icon={Clock} />
                              {isHistoryMode ? (
                                <DiffHighlighter type="text" oldValue={previousPlan?.time} newValue={previewPlan?.time} />
                              ) : (
                                <FieldContainer field="time" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                  <MarkdownArea
                                    value={currentPlan.time}
                                    onChange={(val) => handlePlanUpdate({ time: val })}
                                    onFocus={() => handleFocus('time')}
                                    onBlur={() => handleBlur('time')}
                                    placeholder="14:00 - 15:30"
                                    minHeight="38px"
                                  />
                                </FieldContainer>
                              )}
                            </div>
                            <div className="space-y-2">
                              <SectionHeader title={t('VENUE')} icon={MapPin} />
                              {isHistoryMode ? (
                                <DiffHighlighter type="text" oldValue={previousPlan?.location} newValue={previewPlan?.location} />
                              ) : (
                                <FieldContainer field="location" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                  <MarkdownArea
                                    value={currentPlan.location}
                                    onChange={(val) => handlePlanUpdate({ location: val })}
                                    onFocus={() => handleFocus('location')}
                                    onBlur={() => handleBlur('location')}
                                    placeholder="3F Main Hall"
                                    minHeight="38px"
                                  />
                                </FieldContainer>
                              )}
                            </div>
                          </section>
                        )}

                        {!isScriptMode && (
                          <section>
                            <SectionHeader title={t('PROCEDURES')} icon={Layout} />
                            {isHistoryMode ? (
                              <DiffHighlighter type="markdown" oldValue={previousPlan?.process} newValue={previewPlan?.process} />
                            ) : (
                              <FieldContainer field="process" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                <MarkdownArea
                                  value={currentPlan.process}
                                  onChange={(val) => handlePlanUpdate({ process: val })}
                                  onFocus={() => handleFocus('process')}
                                  onBlur={() => handleBlur('process')}
                                  placeholder="詳細描述活動流程... / Describe the procedures..."
                                />
                              </FieldContainer>
                            )}
                          </section>
                        )}

                        <section>
                          <SectionHeader title={t('VISUAL_BLUEPRINT')} icon={FileText} />
                          <FieldContainer field="content" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                            <MarkdownArea
                              value={currentPlan.content}
                              onChange={(val) => handlePlanUpdate({ content: val })}
                              onFocus={() => handleFocus('content')}
                              onBlur={() => handleBlur('content')}
                              placeholder="撰寫教案內容... (支援貼上圖片) / Write lesson content here..."
                            />
                          </FieldContainer>
                        </section>

                        <section className="w-full flex flex-col">
                          <SectionHeader title={t('MATERIALS')} icon={Package} />
                          {isHistoryMode ? (
                            <DiffHighlighter type="table" oldValue={previousPlan?.props} newValue={previewPlan?.props} />
                          ) : (
                            <div className="w-full">
                              <FieldContainer field="props" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                <div className="w-full overflow-x-auto pb-2">
                                  <PropsTable
                                    value={currentPlan.props}
                                    onChange={(val) => handlePlanUpdate({ props: val })}
                                    onFocus={() => handleFocus('props')}
                                    onBlur={() => handleBlur('props')}
                                  />
                                </div>
                              </FieldContainer>
                            </div>
                          )}
                        </section>

                        {!isScriptMode && (
                          <section>
                            <SectionHeader title={t('OPENING_CLOSING') || "開場與結語"} icon={StickyNote} />
                            {isHistoryMode ? (
                              <DiffHighlighter type="markdown" oldValue={previousPlan?.openingClosingRemarks} newValue={previewPlan?.openingClosingRemarks} />
                            ) : (
                              <FieldContainer field="openingClosingRemarks" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                                <MarkdownArea
                                  value={currentPlan.openingClosingRemarks || ""}
                                  onChange={(val) => handlePlanUpdate({ openingClosingRemarks: val })}
                                  onFocus={() => handleFocus('openingClosingRemarks')}
                                  onBlur={() => handleBlur('openingClosingRemarks')}
                                  placeholder="開場白與結語備註... / Opening & closing remarks..."
                                  minHeight="120px"
                                />
                              </FieldContainer>
                            )}
                          </section>
                        )}

                        <section>
                          <SectionHeader title="備註" icon={StickyNote} />
                          {isHistoryMode ? (
                            <DiffHighlighter type="markdown" oldValue={previousPlan?.remarks} newValue={previewPlan?.remarks} />
                          ) : (
                            <FieldContainer field="remarks" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo}>
                              <MarkdownArea
                                value={currentPlan.remarks || ""}
                                onChange={(val) => handlePlanUpdate({ remarks: val })}
                                onFocus={() => handleFocus('remarks')}
                                onBlur={() => handleBlur('remarks')}
                                placeholder="加入備註 (選填)... / Add remarks (Optional)..."
                                minHeight="120px"
                              />
                            </FieldContainer>
                          )}
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <div 
        ref={toolbarRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] pb-[env(safe-area-inset-bottom)] pointer-events-none transition-[bottom] duration-150 ease-out">
        <div className="pointer-events-auto bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] w-full">
          <MarkdownToolbar className="justify-start pb-2 pt-1 shadow-none border-none border-t-0" />
        </div>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close version history"
          className="fixed inset-0 z-[95] bg-black/20 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Global fixed drawer */}
      {isSidebarOpen && (
        <VersionHistorySidebar
          versions={versions}
          selectedVersionId={selectedVersion?.id || null}
          onSelectVersion={(v) => {
            setSelectedVersion(v);
            setIsHistoryMode(!!v);
            if (window.innerWidth < 640) {
              setIsSidebarOpen(false);
            }
          }}
          onDelete={handleDeleteVersion}
          showNamedOnly={showNamedOnly}
          onToggleFilter={() => setShowNamedOnly(!showNamedOnly)}
          onClose={() => setIsSidebarOpen(false)}
          onBackToCurrent={() => {
            setSelectedVersion(null);
            setIsHistoryMode(false);
            if (window.innerWidth < 640) setIsSidebarOpen(false);
          }}
          onUpdateVersionName={onUpdateVersionName}
          onSaveVersion={handleSaveVersion}
          className=""
        />
      )}

    </div>
  );
}

