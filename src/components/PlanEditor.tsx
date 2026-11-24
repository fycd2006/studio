"use client"

import { LessonPlan, SCHEDULE_OPTIONS, PlanVersion, Group } from "@/types/plan";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveActivitySelectV3 } from "@/components/responsive-activity-select-v3";
import { O2RichEditor } from "@/components/O2RichEditor";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { PropsTable } from "@/components/PropsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
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
  Layers,
  BookOpen,
  Undo2,
  Redo2,
  History,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize,
  MoreHorizontal,
  RotateCcw,
  Smartphone,
  Check,
  Pencil,
  Palette,
  ChevronUp,
  ChevronDown,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { cn, getUnifiedGroupBadgeParams, stripHtml } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { actionBarTheme } from "@/lib/actionbar-theme";
import { useTranslation } from "@/lib/i18n-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VersionHistorySidebar } from "./VersionHistorySidebar";
import { DiffHighlighter } from "./DiffHighlighter";
import { exportToDocx, exportToPdf } from "@/lib/export-utils";
import { utf8Length } from "@/lib/editor-image";
import { usePresence } from "@/hooks/use-presence";

const FabricCanvas = dynamic(
  () => import("@/components/FabricCanvas").then((mod) => mod.FabricCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex flex-col gap-2.5 items-center justify-center border border-dashed border-stone-200/80 dark:border-white/10 rounded-lg bg-stone-50/50 dark:bg-white/[0.02]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm text-fg-muted font-bold">正在載入藍圖畫布...</span>
      </div>
    )
  }
);

const FieldContainer = ({
  children,
  field,
  isLockedByOther,
  getLockInfo,
  onTakeover
}: {
  children: React.ReactNode,
  field: string,
  isLockedByOther: (f: string) => boolean,
  getLockInfo: (f: string) => any,
  onTakeover?: (f: string) => void
}) => {
  const locked = isLockedByOther(field);
  const info = getLockInfo(field);
  return (
    <div className="relative group" data-editor-field={field} data-testid={`editor-field-${field}`}>
      <div className={cn("transition-opacity", locked && "opacity-50 pointer-events-none")}>
        {children}
      </div>
      {locked && info && (() => {
        let hash = 0;
        const uid = info.uid || '';
        for (let i = 0; i < uid.length; i++) {
          hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return (
          <div 
            style={{ backgroundColor: `hsl(${hue}, 72%, 42%)` }}
            className="absolute -top-3 right-2 z-10 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-md flex items-center gap-1.5 animate-in fade-in-30 zoom-in-95 duration-200 pointer-events-auto"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{info.name} 編輯中</span>
            {onTakeover && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTakeover(field);
                }}
                className="ml-1 px-1.5 py-0.5 bg-black/30 hover:bg-black/50 active:scale-95 text-[9px] font-medium rounded transition-all cursor-pointer underline hover:no-underline"
                title="若對方意外斷線或未釋放，可點擊強制接管編輯"
              >
                強制接管
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
};


const SectionHeader = ({ title, icon: Icon, tag, actions }: {
  title: string;
  icon?: React.ElementType;
  tag?: string;
  actions?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 mb-4 pt-4 md:pt-8 first:pt-0 border-b hairline-divider pb-3 transition-colors">
    <div className="flex items-center gap-2.5">
      <h3 className="text-base sm:text-lg font-sans font-medium text-foreground tracking-tight transition-colors">
        {title}
      </h3>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {actions}
      {tag && (
        <span className="architectural-tag text-[10px] tracking-technical text-fg-muted hidden sm:inline-flex">
          {tag}
        </span>
      )}
      {Icon && <Icon className="h-4 w-4 text-muted-foreground/60 transition-colors" />}
    </div>
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
  /** 回傳 true 代表真的建了一筆版本；false 代表沒有。 */
  onSaveVersion?: (name: string, isAuto?: boolean, draft?: LessonPlan) => Promise<boolean>;
  /** 回傳還原後的完整狀態；null 代表還原失敗（內容沒有被改動）。 */
  onRestoreVersion?: (versionId: string) => Promise<LessonPlan | null>;
  /** 回傳 true 代表真的刪掉了；false 代表沒刪（取消刪除）。 */
  onDeleteVersion?: (versionId: string) => Promise<boolean>;
  onAutoSave?: () => void;
  getFullVersionState?: (version: PlanVersion) => Promise<LessonPlan>;
  onUpdateVersionName?: (versionId: string, versionName: string) => Promise<void>;
  activityTypes?: string[];
}

export function PlanEditor({
  plan, groups, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo,
  versions = [], onSaveVersion, onRestoreVersion, onDeleteVersion, onAutoSave, getFullVersionState, onUpdateVersionName, activityTypes = []
}: PlanEditorProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { lockField, unlockField, forceTakeoverField, isLockedByOther, getLockInfo } = usePresence(plan.id);

  const handleTakeover = useCallback((field: string) => {
    forceTakeoverField(field);
    toast({
      title: "已接管欄位編輯權",
      description: "您已成功接管該欄位，可直接開始編輯。",
    });
  }, [forceTakeoverField, toast]);

  // History Mode State
  const [blueprintMode, setBlueprintMode] = useState<'text' | 'canvas'>(plan.canvasData ? 'canvas' : 'text');

  const blueprintPlanId = useRef(plan.id);
  useEffect(() => {
    if (blueprintPlanId.current === plan.id) return;
    blueprintPlanId.current = plan.id;
    setBlueprintMode(plan.canvasData ? 'canvas' : 'text');
  }, [plan.id, plan.canvasData]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const selectedVersion = versions.find((version) => version.id === selectedVersionId);
  const selectedIndex = versions.findIndex((version) => version.id === selectedVersionId);
  const previousVersion = selectedIndex >= 0 ? versions[selectedIndex + 1] : undefined;
  const isHistoryMode = Boolean(selectedVersionId);
  const showHistoryBar = isSidebarOpen || isHistoryMode;
  const [previewPlan, setPreviewPlan] = useState<LessonPlan | null>(null);
  const [previousPlan, setPreviousPlan] = useState<LessonPlan | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const [changePosition, setChangePosition] = useState(-1);
  const [changeCount, setChangeCount] = useState(0);

  const jumpToChange = (direction: number) => {
    if (changeCount === 0) return;
    setChangePosition((position) => position < 0
      ? (direction > 0 ? 0 : changeCount - 1)
      : (position + direction + changeCount) % changeCount);
  };

  useEffect(() => {
    if (changePosition < 0) return;
    const changes = previewContentRef.current?.querySelectorAll<HTMLElement>("[data-version-change]");
    changes?.forEach((element, index) => {
      for (const token of ["outline", "outline-2", "outline-orange-500"]) {
        element.classList.toggle(token, index === changePosition);
      }
    });
    changes?.[changePosition]?.scrollIntoView({ block: "center" });
  }, [changePosition, previewPlan, previousPlan]);

  const returnToEditor = () => {
    setSelectedVersionId(null);
    setIsSidebarOpen(false);
  };


  // Global Editor Zoom
  const [pageZoom, setPageZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(0);
  const PRINT_PAGE_WIDTH = 816;
  const MOBILE_PRINT_SIDE_PADDING = 24;
  const SCROLL_DELTA_THRESHOLD = 6;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth > 0 && windowWidth < 768;
  const [isMobilePrintView, setIsMobilePrintView] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(true);

  // Mobile defaults to read-only; desktop stays unlocked (like Google Docs mobile)
  useEffect(() => {
    if (isMobile) setIsEditingMode(false);
  }, [isMobile]);
  const mobileToolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      if (typeof window !== "undefined" && window.visualViewport && mobileToolbarRef.current) {
        if (window.innerWidth < 768) {
          const offset = window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop);
          const keyboardOffset = Math.max(0, offset);
          mobileToolbarRef.current.style.bottom = `${keyboardOffset}px`;
          if (keyboardOffset > 10) {
            mobileToolbarRef.current.style.paddingBottom = "4px";
          } else {
            mobileToolbarRef.current.style.paddingBottom = "max(0.4rem, env(safe-area-inset-bottom))";
          }
        } else {
          mobileToolbarRef.current.style.bottom = "";
          mobileToolbarRef.current.style.paddingBottom = "";
        }
      }
    };

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  // Google Docs style top bar collapse state (persisted)
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("plan-editor-topbar-collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleTopBar = (collapsed: boolean) => {
    setIsTopBarCollapsed(collapsed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("plan-editor-topbar-collapsed", String(collapsed));
      } catch {
        // ignore
      }
    }
  };
  const [isFabVisible, setIsFabVisible] = useState(true);
  const isPrintMode = !showHistoryBar && (!isMobile || isMobilePrintView);
  const isReadOnlyMode = isMobile && !isEditingMode;
  const isInteractionLocked = showHistoryBar || isReadOnlyMode;

  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);

  const getClampedScrollY = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(Math.max(window.scrollY || 0, 0), maxScrollable);
  }, []);

  useEffect(() => {
    if (isEditingMode) {
      setIsFabVisible(false);
      return;
    }

    lastScrollYRef.current = getClampedScrollY();
    setIsFabVisible(true);

    const updateFabVisibility = () => {
      scrollTickingRef.current = false;
      const currentY = getClampedScrollY();
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      if (currentY <= 8) {
        setIsFabVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) >= SCROLL_DELTA_THRESHOLD) {
        setIsFabVisible(delta < 0);
        lastScrollYRef.current = currentY;
      }
    };

    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;
      window.requestAnimationFrame(updateFabVisibility);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [getClampedScrollY, isEditingMode, SCROLL_DELTA_THRESHOLD]);

  const mobilePrintFitZoom = useMemo(() => {
    if (!isMobile || !isMobilePrintView || windowWidth <= 0) return 1;
    const availableWidth = Math.max(0, windowWidth - MOBILE_PRINT_SIDE_PADDING);
    return Math.min(1, availableWidth / PRINT_PAGE_WIDTH);
  }, [isMobile, isMobilePrintView, windowWidth]);

  useEffect(() => {
    if (isMobile && isMobilePrintView) {
      setPageZoom(mobilePrintFitZoom);
    }
  }, [isMobile, isMobilePrintView, mobilePrintFitZoom]);

  const handleZoomIn = () => setPageZoom(prev => Math.min(2, prev + 0.1));
  const handleZoomOut = () => setPageZoom(prev => Math.max(0.3, prev - 0.1));
  const handleFitAll = () => setPageZoom(1);

  const handlePrint = async () => {
    try {
      toast({ title: "匯出中", description: "正在產生 PDF 檔案..." });
      await exportToPdf(getLiveDraft(), { useSaveDialog: false });
      toast({ title: "匯出成功", description: "已下載 PDF 檔案" });
    } catch (err) {
      console.error("PDF export failed", err);
      toast({ title: "匯出失敗", description: "發生錯誤", variant: "destructive" });
    }
  };
  const handleExportWord = async () => {
    try {
      toast({ title: "匯出中", description: "正在產生 Word 檔案..." });
      await exportToDocx(getLiveDraft(), undefined, { useSaveDialog: false });
      toast({ title: "匯出成功", description: "已經成功下載 Word 檔案" });
    } catch (err) {
      console.error("Word export failed", err);
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

  const flushPendingUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      onUpdate(plan.id, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
    }
  }, [plan.id, onUpdate]);

  const handleFocus = useCallback((field: string) => {
    lockField(field);
    recordHistory();
  }, [lockField, recordHistory]);

  const handleBlur = useCallback((field: string) => {
    unlockField(field);
    flushPendingUpdates();
  }, [unlockField, flushPendingUpdates]);

  useEffect(() => {
    // Merge remote plan with pending local changes so stale server echoes
    // don't revert immediate local actions.
    setLocalPlan({ ...plan, ...pendingUpdatesRef.current });
  }, [plan]);

  // Ensure any pending typing updates are flushed to Firestore before unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingUpdates();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

  const handlePlanUpdate = (updates: Partial<LessonPlan>) => {
    // 卸載進行中（父層的清理函式**先於**子層執行，實測確認）：
    // 這時候再排一個 400ms 的 debounce，等於把子層卸載時補送上來的內容
    // 交給一個沒人會再結算的計時器。直接寫出去。
    if (isUnmountingRef.current) {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
      onUpdateRef.current(planIdRef.current, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
      return;
    }
    // Update local UI immediately
    if (Object.keys(pendingUpdatesRef.current).length === 0) {
      // Record snapshot right before a new burst of typing
      recordHistory();
    }
    setLocalPlan(prev => ({ ...prev, ...updates }));

    // Merge into pending
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    // Debounce the actual Firestore write with responsive 400ms window
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      flushPendingUpdates();
    }, 400);
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

  const getLiveDraft = () => {
    const current = { ...localPlan, ...pendingUpdatesRef.current };
    for (const element of planEditorRef.current?.querySelectorAll<HTMLElement>("[data-editor-field]") ?? []) {
      const field = element.dataset.editorField as keyof LessonPlan;
      const richText = element.querySelector<HTMLElement>("[data-rich-text-editor]");
      if (richText && typeof current[field] === "string") {
        Object.assign(current, { [field]: richText.innerHTML.replace(/\u200b/g, "") });
      }
    }
    return current;
  };

  // Leave room for Firestore's document overhead and edits after pasting.
  const remainingPasteBytes = () => Math.max(0, 900_000 - utf8Length(JSON.stringify(getLiveDraft())));

  const currentPlan = isHistoryMode ? (previewPlan || plan) : localPlan;
  const isScriptMode = currentPlan.scheduledName === '劇本';

  // Decoupled Lead and Assistant member handling
  const parsedLegacyMembers = useMemo(() => {
    const raw = stripHtml(currentPlan.members || '');
    if (!raw) return { lead: '', assistant: '' };
    const parts = raw.split('、').map(s => s.trim()).filter(Boolean);
    return {
      lead: parts[0] || '',
      assistant: parts.slice(1).join('、')
    };
  }, [currentPlan.members]);

  const leadDisplayValue = currentPlan.leadMember !== undefined
    ? stripHtml(currentPlan.leadMember)
    : parsedLegacyMembers.lead;

  const assistantDisplayValue = currentPlan.assistantMember !== undefined
    ? stripHtml(currentPlan.assistantMember)
    : parsedLegacyMembers.assistant;

  const handleLeadMemberChange = (val: string) => {
    const cleanLead = stripHtml(val);
    const currentAsst = currentPlan.assistantMember !== undefined
      ? stripHtml(currentPlan.assistantMember)
      : parsedLegacyMembers.assistant;
    const combined = [cleanLead.trim(), currentAsst.trim()].filter(Boolean).join('、');
    handlePlanUpdate({
      leadMember: cleanLead,
      assistantMember: currentAsst,
      members: combined
    });
  };

  const handleAssistantMemberChange = (val: string) => {
    const cleanAsst = stripHtml(val);
    const currentLead = currentPlan.leadMember !== undefined
      ? stripHtml(currentPlan.leadMember)
      : parsedLegacyMembers.lead;
    const combined = [currentLead.trim(), cleanAsst.trim()].filter(Boolean).join('、');
    handlePlanUpdate({
      leadMember: currentLead,
      assistantMember: cleanAsst,
      members: combined
    });
  };

  // Auto-Save Trigger
  const autoSaveRef = useRef(onAutoSave);
  // Keep the ref updated with the latest function without triggering effect re-runs
  useEffect(() => {
    autoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  const onUpdateRef = useRef(onUpdate);
  const planIdRef = useRef(plan.id);
  /** 卸載是否已經開始（父層清理函式一跑就是 true，子層的卸載補送會晚於它）。 */
  const isUnmountingRef = useRef(false);


  useEffect(() => {
    onUpdateRef.current = onUpdate;
    planIdRef.current = plan.id;
  }, [onUpdate, plan.id]);

  useEffect(() => {
    // ⚠️ 一定要在這裡重設回 false。
    // React 的嚴格模式（dev）會 mount → 跑清理函式 → 再 mount，所以下面那個
    // `isUnmountingRef.current = true` 在**畫面剛開好時**就會被設成 true。
    // 不重設的話它會一直是 true → 每一次打字都走「立即寫入」那條路
    // → 父層每個字都重新 render → 受控的 input 把後面的字吃掉。
    // 實測症狀：在主關主欄位打「王小明」，資料庫裡只存到「小明」。
    isUnmountingRef.current = false;

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
      isUnmountingRef.current = true;
      // Flush pending on unmount
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        onUpdateRef.current(planIdRef.current, pendingUpdatesRef.current);
        pendingUpdatesRef.current = {};
      }
      // Only execute auto-save on true component unmount (e.g. navigation)
      autoSaveRef.current?.();
    };
  }, []);

  useEffect(() => {
    setPreviewPlan(null);
    setPreviousPlan(null);
    setPreviewError(false);
    setChangePosition(-1);
    setChangeCount(0);
    if (!selectedVersion || !getFullVersionState) {
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);
    const load = async () => {
      try {
        const target = await getFullVersionState(selectedVersion);
        const prior = previousVersion
          ? await getFullVersionState(previousVersion).catch(() => null)
          : null;
        if (cancelled) return;
        setPreviewPlan(target);
        setPreviousPlan(prior);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load version preview:", error);
        setPreviewError(true);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedVersion, previousVersion, getFullVersionState]);

  useEffect(() => {
    const content = previewContentRef.current;
    if (!content) return;
    const countChanges = () => setChangeCount(content.querySelectorAll("[data-version-change]").length);
    countChanges();
    const observer = new MutationObserver(countChanges);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [previewPlan, previousPlan, blueprintMode, isLoadingPreview]);

  const handleSaveVersion = async (name: string) => {
    const draft = getLiveDraft();
    flushPendingUpdates();

    const nameToSave = name.trim();
    if (!nameToSave) {
      toast({ title: "請輸入版本名稱", variant: "destructive" });
      return;
    }
    // ⚠️ 要等它存完才知道存不存得成。存檔會在「內容跟最後一筆版本一樣」時
    //    什麼都不做（plans-context 的 saveNewVersion），而那在這個產品裡是常態 ——
    //    離開編輯器會自動存一筆，所以進來看一看就按儲存的話，現況往往等於最後一筆。
    //    原本這裡不 await 也不看結果就跳「版本已儲存」，使用者會以為書籤存好了。
    let saved = false;
    try {
      saved = (await onSaveVersion?.(nameToSave, false, draft)) ?? false;
    } catch (err) {
      console.error('[PlanEditor] 儲存版本失敗:', err);
      saved = false;
    }

    if (!saved) {
      toast({
        title: "版本沒有存成",
        description: "請稍後再試一次；目前的內容沒有受到影響。",
        variant: "destructive",
      });
      throw new Error("Version was not saved");
    }

    toast({ title: "版本已儲存" });
  };

  /**
   * 還原到某一個版本。
   *
   * 原本這裡是「呼叫 → 不 await → 無條件跳『已還原版本』」，造成兩個後果：
   *
   *   1. 重建失敗（例如基準快照被刪掉了）時畫面照樣說成功，而資料一個字都沒變。
   *      使用者以為救回來了，然後在舊內容上繼續編輯。
   *   2. 還原成功了，但 localPlan 還停在還原前的草稿。退出歷史模式時那些欄位編輯器
   *      會重新掛上，並在 350ms 後把草稿寫回 Firestore，把剛還原的內容蓋掉。
   *      實測 2026-10-16：資料庫先變成舊版內容，接著又被改回還原前的草稿。
   *
   * 所以：等它結束 → 用它回傳的狀態把本地草稿換掉 → 才退出歷史模式並報成功。
   * 失敗就留在歷史模式並說實話，不要讓使用者在「以為已還原」的狀態下繼續打字。
   */
  const handleRestoreVersion = async (versionId: string) => {
    if (isRestoring) return;
    flushPendingUpdates();
    setIsRestoring(true);
    let restored: LessonPlan | null | undefined;
    try {
      restored = await onRestoreVersion?.(versionId);
    } catch (err) {
      console.error('[PlanEditor] 還原版本失敗:', err);
      restored = null;
    } finally {
      setIsRestoring(false);
    }

    if (!restored) {
      toast({
        title: "還原失敗",
        description: "這個版本重建不出來（基準快照可能已被刪除），目前的內容沒有被改動。",
        variant: "destructive",
      });
      return;
    }

    // 丟掉還沒送出的草稿 —— 「還原」的語意就是「不要現在這一份」
    pendingUpdatesRef.current = {};
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLocalPlan(restored);

    returnToEditor();
    toast({ title: "已還原版本" });
  };

  /**
   * 刪一筆版本紀錄。
   *
   * ⚠️ 兩件事都不能省：
   *
   * 1. **要等結果再提示。** plans-context 的 deletePlanVersion 在「刪了會讓後面的
   *    歷史救不回來」時會取消刪除並回傳 false。原本這裡不 await、無條件跳
   *    「已刪除版本」—— 使用者看到成功提示、那一列還在，只會以為畫面壞了。
   *
   * 2. **刪掉的是正在預覽的那一筆時，要一起離開歷史模式。** 只清 selectedVersion
   *    的話，isHistoryMode 還是 true → 欄位全部停在唯讀的 DiffHighlighter、
   *    而橫幅上的「取消」鈕掛在 `selectedVersion &&` 底下、此時不存在
   *    → 畫面卡在空白的歷史檢視，只能從面板的「目前狀態」那一列繞回來。
   */
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm("確定要刪除此版本嗎？")) return;

    let deleted = false;
    try {
      deleted = (await onDeleteVersion?.(versionId)) ?? false;
    } catch (err) {
      console.error('[PlanEditor] 刪除版本失敗:', err);
      deleted = false;
    }

    if (!deleted) {
      toast({
        title: "版本沒有刪掉",
        description: "這一筆是後面版本的重建基準，而那些版本接不回去；為了不讓歷史變成救不回來的廢資料，這次沒有刪除。",
        variant: "destructive",
      });
      return;
    }

    if (selectedVersion?.id === versionId) {
      setSelectedVersionId(null);
    }
    toast({ title: "已刪除版本" });
  };

  const currentGroup = groups.find(group => group.id === currentPlan.groupId)
    || groups.find(group => currentPlan.category === 'teaching' ? group.slug === 'teaching' : group.slug === 'activity')
    || null;
  const currentGroupLabel = currentGroup
    ? (language === 'zh' ? currentGroup.nameZh : currentGroup.nameEn)
    : (currentPlan.category === 'teaching' ? t('TEACHING_PLAN') : t('ACTIVITY_PLAN'));

  return (
    <div ref={planEditorRef} className={cn(
      "flex flex-row font-body transition-colors relative w-full min-h-[100dvh] bg-background text-foreground"
    )}>
      <div className="flex-1 min-w-0 relative flex flex-col">
        {showHistoryBar ? (
          <header data-testid={isHistoryMode ? "editor-history-banner" : undefined}
            className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2 sm:px-5">
            <Button type="button" variant="ghost" size="icon" aria-label="返回教案編輯"
              data-testid="editor-version-cancel" onClick={returnToEditor} disabled={isRestoring}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="mr-auto min-w-0">
              <p className="truncate text-sm font-semibold">
                {selectedVersion ? selectedVersion.versionName || selectedVersion.name : "當前版本"}
              </p>
              {selectedVersion && (
                <p className="text-xs text-muted-foreground">
                  {format(selectedVersion.createdAt, "yyyy/MM/dd HH:mm:ss")} · {selectedVersion.authorName || "未知修改者"}
                </p>
              )}
            </div>
            {selectedVersion && (
              <div className="flex items-center gap-0.5" aria-label="變更位置">
                <Button type="button" variant="ghost" size="icon" aria-label="上一個變更"
                  disabled={!changeCount} onClick={() => jumpToChange(-1)} className="h-8 w-8">
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="min-w-9 text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {changePosition + 1}/{changeCount}
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label="下一個變更"
                  disabled={!changeCount} onClick={() => jumpToChange(1)} className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            {!isSidebarOpen && (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)}
                aria-label="展開版本紀錄" data-testid="editor-history-trigger" disabled={isRestoring}>
                <History className="h-4 w-4" /> <span className="hidden sm:inline">版本紀錄</span>
              </Button>
            )}
            {selectedVersion && onRestoreVersion && (
              <Button type="button" size="sm" data-testid="editor-version-restore"
                disabled={isLoadingPreview || !previewPlan || isRestoring}
                onClick={() => void handleRestoreVersion(selectedVersion.id)}>
                {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                還原此版本
              </Button>
            )}
          </header>
        ) : (
        <TooltipProvider delayDuration={200}>
          <div className="sticky top-0 z-40 w-full bg-[#FAF8F5] dark:bg-[#0B1012] border-b border-stone-200/80 dark:border-white/10 shadow-2xs select-none">
            {/* Row 1: Document Info & Global Actions (Collapsible) */}
            <div
              className={cn(
                "w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-200 ease-in-out overflow-hidden bg-[#FAF8F5] dark:bg-[#0B1012]",
                isTopBarCollapsed
                  ? "max-h-0 opacity-0 py-0 border-b-0 pointer-events-none"
                  : "max-h-20 opacity-100 py-1.5 sm:py-2 border-b border-stone-200/60 dark:border-white/5"
              )}
            >
              {/* Left: Navigation, Badge, Title Input, Cloud Status */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  data-testid="editor-back"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.history.length > 1) {
                      router.back();
                    } else {
                      router.push('/plans');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer group shrink-0"
                  title="返回上一頁"
                  aria-label="返回上一頁"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-orange-500" />
                  <span className="hidden sm:inline">返回</span>
                </button>

                <div className="w-px h-4 bg-stone-200 dark:bg-white/10 shrink-0" />

                {/* Group Badge */}
                {(() => {
                  const params = getUnifiedGroupBadgeParams(currentGroup?.slug || currentPlan.category, currentGroup?.nameZh || '');
                  return (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-medium tracking-wider uppercase border shrink-0",
                      params.softBg,
                      params.softText,
                      params.softBorder
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-xs", params.colorDot)} />
                      <span>{currentGroupLabel}</span>
                    </span>
                  );
                })()}

                {/* Editable Document Title (Google Docs style) */}
                <input
                  data-testid="editor-title-input"
                  value={(currentPlan.activityName || "").replace(/<[^>]*>?/gm, '')}
                  onChange={(e) => handlePlanUpdate({ activityName: e.target.value })}
                  className="text-sm sm:text-base font-bold font-headline tracking-tight bg-transparent hover:bg-stone-200/50 dark:hover:bg-white/5 focus:bg-white dark:focus:bg-stone-900 border border-transparent hover:border-stone-300/70 dark:hover:border-white/15 focus:border-orange-500/50 rounded-lg px-2 py-0.5 transition-all text-foreground truncate max-w-[140px] sm:max-w-[240px] md:max-w-[380px] lg:max-w-[500px] focus:outline-none placeholder:text-muted-foreground/40"
                  placeholder={t('ENTER_TITLE')}
                  readOnly={isInteractionLocked}
                  title="教案名稱 (點擊修改)"
                />

                {/* Cloud Save Status */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1" data-testid="editor-save-status">
                  {isSaving ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden md:inline font-mono text-[11px]">儲存中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500" title="所有變更已自動儲存至雲端">
                      <Cloud className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                      <span className="hidden lg:inline text-[11px] font-mono">已儲存至雲端</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: History, Export, and Collapse Chevron */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  title="版本紀錄"
                  data-testid="editor-history-trigger"
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn(
                    "h-8 px-2.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 gap-1.5",
                    isSidebarOpen && "bg-stone-200 dark:bg-white/15 text-orange-600 dark:text-orange-400"
                  )}
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">版本紀錄</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="editor-export-trigger"
                      className="h-8 px-2.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 gap-1.5"
                    >
                      <FileDown className="w-4 h-4" />
                      <span className="hidden sm:inline">匯出</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 rounded-lg border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#14191C] shadow-2xl p-1.5 z-[60]">
                    <DropdownMenuItem data-testid="editor-export-pdf" onClick={handlePrint} className="text-xs font-mono py-2 px-3 rounded-md cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span>PDF (.pdf)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="editor-export-word" onClick={handleExportWord} className="text-xs font-mono py-2 px-3 rounded-md cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <span>WORD (.docx)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5" />

                {/* Collapse Top Row Button (Desktop only) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTopBar(true)}
                      className="hidden md:inline-flex h-8 w-8 rounded-lg text-stone-500 hover:text-foreground hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0"
                      aria-label="收闔頂部列"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">收闔頂部列 (只留工具列)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Row 2: Formatting Toolbar (Desktop only: Sticks flush to top: 0 when Row 1 is collapsed, Hidden on mobile) */}
            <div className="hidden md:flex w-full px-2 sm:px-4 py-1 items-center justify-between gap-1 overflow-x-auto scrollbar-hide bg-[#FAF8F5] dark:bg-[#0B1012]">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
                {/* Mobile Done Button */}
                {isMobile && isEditingMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingMode(false)}
                    className="h-8 w-8 rounded-lg bg-orange-600/10 text-orange-600 hover:bg-orange-600/20 dark:bg-amber-400/15 dark:text-amber-400 shrink-0"
                    title="完成編輯"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}

                {/* Studio Command Tag */}
                <div className="hidden lg:flex items-center gap-1.5 pl-1 pr-2 text-[10px] font-mono font-bold tracking-wider text-stone-400 dark:text-stone-500 uppercase select-none shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                  <span>COMMAND</span>
                </div>

                {/* Undo / Redo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLocalUndo}
                      disabled={localHistory.past.length === 0 || isHistoryMode}
                      className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0 disabled:opacity-40"
                      aria-label="復原"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">復原 (Ctrl+Z)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLocalRedo}
                      disabled={localHistory.future.length === 0 || isHistoryMode}
                      className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0 disabled:opacity-40"
                      aria-label="重做"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">重做 (Ctrl+Y)</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

                {/* Zoom Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-xs font-fira-code text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 gap-1 shrink-0"
                      title="縮放頁面"
                    >
                      <span>{Math.round(pageZoom * 100)}%</span>
                      <ChevronDown className="h-3 w-3 text-stone-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 rounded-lg border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#14191C] shadow-2xl p-1.5 z-[60]">
                    <DropdownMenuItem onClick={handleZoomIn} disabled={pageZoom >= 2} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                      <ZoomIn className="h-3.5 w-3.5" /> 放大 (Zoom In)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleZoomOut} disabled={pageZoom <= 0.3} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                      <ZoomOut className="h-3.5 w-3.5" /> 縮小 (Zoom Out)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleFitAll} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                      <Maximize className="h-3.5 w-3.5" /> 重設 (100%)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

                {/* Rich Text Markdown Formatting Toolbar */}
                <MarkdownToolbar className="bg-transparent border-none px-0" />
              </div>

              {/* Right actions: Mobile print view & Expand/Collapse Toggle */}
              <div className="flex items-center gap-1 shrink-0 pl-2">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobilePrintView(!isMobilePrintView)}
                    className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10"
                    title="切換檢視模式"
                  >
                    {isMobilePrintView ? <Smartphone className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </Button>
                )}

                {/* Google Docs-style Collapse / Expand Chevron on the right of toolbar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTopBar(!isTopBarCollapsed)}
                      className={cn(
                        "h-8 w-8 rounded-lg shrink-0 transition-colors",
                        isTopBarCollapsed
                          ? "text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
                          : "text-stone-500 hover:text-foreground hover:bg-stone-200/70 dark:hover:bg-white/10"
                      )}
                      aria-label={isTopBarCollapsed ? "展開頂部列" : "收闔頂部列"}
                    >
                      {isTopBarCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isTopBarCollapsed ? "展開頂部列" : "收闔頂部列 (只留工具列)"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </TooltipProvider>
        )}

        <div className="w-full flex flex-col items-center px-0 sm:px-4 md:px-6 xl:px-8 pt-3 sm:pt-6">
          <div className="w-full md:max-w-none flex flex-col items-center">
            <main className="flex-1 w-full flex flex-col items-center relative shrink-0 overflow-visible pb-32 sm:pb-40">
              <div
                className="relative"
                style={{
                  width: isPrintMode ? `${PRINT_PAGE_WIDTH * pageZoom}px` : '100%',
                  maxWidth: isPrintMode ? 'none' : showHistoryBar ? '900px' : '100%',
                }}
              >
                <div
                  style={isPrintMode ? {
                    zoom: pageZoom,
                    width: `${PRINT_PAGE_WIDTH}px`,
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
                  {isHistoryMode && !previewPlan ? (
                    <div role={previewError || !selectedVersion ? "alert" : "status"}
                      className="flex min-h-[260px] w-full items-center justify-center gap-2 p-4 text-muted-foreground">
                      {!previewError && selectedVersion && <Loader2 className="h-5 w-5 animate-spin" />}
                      {previewError || !selectedVersion ? "無法開啟此版本，請選擇另一個版本。" : "正在載入版本…"}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-full overflow-visible transition-all",
                      isPrintMode
                        ? "studio-sheet rounded-none sm:rounded-xl"
                        : "studio-sheet rounded-xl border hairline-divider my-2 sm:my-6"
                    )}>
                      <div className={cn(
                        "leading-[1.65]",
                        isPrintMode ? "px-6 md:px-10 py-10 space-y-6 md:space-y-8" : "px-4 sm:px-8 md:px-12 py-8 sm:py-10 space-y-8"
                      )}>
                        {isHistoryMode && previousVersion && !previousPlan && (
                          <p role="status" className="text-sm text-muted-foreground">無法載入前一版本，以下顯示所選版本內容。</p>
                        )}
                        <div ref={previewContentRef} className="space-y-6 md:space-y-12">
                          <section>
                            <SectionHeader title="活動類型" icon={Layers} tag="ACTIVITY TYPE" />
                            {isHistoryMode ? (
                              <DiffHighlighter type="text" oldValue={(previousPlan ?? previewPlan)?.scheduledName} newValue={previewPlan?.scheduledName} />
                            ) : (
                              <ResponsiveActivitySelectV3
                                value={currentPlan.scheduledName || ""}
                                onValueChange={(val) => handlePlanUpdate({ scheduledName: val })}
                                options={activityTypes}
                                disabled={isInteractionLocked}
                              />
                            )}
                          </section>

                          {!isScriptMode && (
                            <section>
                              <SectionHeader title={t('SUBJECT')} icon={Target} tag="SUBJECT" />
                              {isHistoryMode ? (
                                <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.activityName} newValue={previewPlan?.activityName} />
                              ) : (
                                <FieldContainer field="activityName" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                  <O2RichEditor
                                    getPasteBudget={remainingPasteBytes}
                                    value={currentPlan.activityName}
                                    onChange={(val) => handlePlanUpdate({ activityName: val })}
                                    onFocus={() => handleFocus('activityName')}
                                    onBlur={() => handleBlur('activityName')}
                                    placeholder="輸入教案名稱 / Enter subject title"
                                    minHeight="38px"
                                    readOnly={isInteractionLocked}
                                    simplified={true}
                                  />
                                </FieldContainer>
                              )}
                            </section>
                          )}

                          {!isScriptMode && (
                            <section>
                              <SectionHeader title={t('CASE_PERSONNEL')} icon={Users} tag="CREW" />
                              {isHistoryMode ? (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                  <div>
                                    <div className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                      <span>{t('LEAD')}</span>
                                    </div>
                                    <DiffHighlighter
                                      type="text"
                                      oldValue={stripHtml((previousPlan ?? previewPlan)?.leadMember || (previousPlan ?? previewPlan)?.members)}
                                      newValue={stripHtml(previewPlan?.leadMember || previewPlan?.members)}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                      <span>{t('ASSISTANT')}</span>
                                    </div>
                                    <DiffHighlighter
                                      type="text"
                                      oldValue={stripHtml((previousPlan ?? previewPlan)?.assistantMember)}
                                      newValue={stripHtml(previewPlan?.assistantMember)}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                  <div>
                                    <div className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                      <span>{t('LEAD')}</span>
                                    </div>
                                    <FieldContainer field="leadMember" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                      <div className={cn(
                                        "w-full rounded-lg border bg-white/50 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700/50 shadow-2xs transition-all duration-300 relative group overflow-hidden",
                                        "focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500/40 dark:focus-within:border-amber-400/40 hover:border-stone-300 dark:hover:border-slate-600",
                                        isInteractionLocked && "opacity-80 cursor-default"
                                      )}>
                                        <input
                                          type="text"
                                          value={leadDisplayValue}
                                          onChange={(e) => handleLeadMemberChange(e.target.value)}
                                          onFocus={() => handleFocus('leadMember')}
                                          onBlur={() => handleBlur('leadMember')}
                                          placeholder="主關主姓名 / Lead..."
                                          disabled={isInteractionLocked}
                                          className="w-full h-[38px] px-3 md:px-4 bg-transparent text-stone-800 dark:text-slate-100 outline-none text-[14px] placeholder:text-stone-400 dark:placeholder:text-slate-500 font-medium transition-colors"
                                        />
                                      </div>
                                    </FieldContainer>
                                  </div>
                                  <div>
                                    <div className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                      <span>{t('ASSISTANT')}</span>
                                    </div>
                                    <FieldContainer field="assistantMember" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                      <div className={cn(
                                        "w-full rounded-lg border bg-white/50 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700/50 shadow-2xs transition-all duration-300 relative group overflow-hidden",
                                        "focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500/40 dark:focus-within:border-amber-400/40 hover:border-stone-300 dark:hover:border-slate-600",
                                        isInteractionLocked && "opacity-80 cursor-default"
                                      )}>
                                        <input
                                          type="text"
                                          value={assistantDisplayValue}
                                          onChange={(e) => handleAssistantMemberChange(e.target.value)}
                                          onFocus={() => handleFocus('assistantMember')}
                                          onBlur={() => handleBlur('assistantMember')}
                                          placeholder="副關主姓名 / Assistant..."
                                          disabled={isInteractionLocked}
                                          className="w-full h-[38px] px-3 md:px-4 bg-transparent text-stone-800 dark:text-slate-100 outline-none text-[14px] placeholder:text-stone-400 dark:placeholder:text-slate-500 font-medium transition-colors"
                                        />
                                      </div>
                                    </FieldContainer>
                                  </div>
                                </div>
                              )}
                            </section>
                          )}

                          <section>
                            <SectionHeader title={t('MISSION_OBJ')} icon={Target} tag="MISSION" />
                            {isHistoryMode ? (
                              <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.purpose} newValue={previewPlan?.purpose} />
                            ) : (
                              <FieldContainer field="purpose" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                <O2RichEditor
                                  getPasteBudget={remainingPasteBytes}
                                  value={currentPlan.purpose || ""}
                                  onChange={(val) => handlePlanUpdate({ purpose: val })}
                                  onFocus={() => handleFocus('purpose')}
                                  onBlur={() => handleBlur('purpose')}
                                  placeholder="描述活動目標與宗旨... / Describe mission objectives..."
                                  minHeight="120px"
                                  readOnly={isInteractionLocked}
                                />
                              </FieldContainer>
                            )}
                          </section>

                          {!isScriptMode && (
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                <SectionHeader title={t('TIME_WINDOW')} icon={Clock} tag="DURATION" />
                                {isHistoryMode ? (
                                  <DiffHighlighter type="text" oldValue={(previousPlan ?? previewPlan)?.time} newValue={previewPlan?.time} />
                                ) : (
                                  <FieldContainer field="time" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                    <O2RichEditor
                                      getPasteBudget={remainingPasteBytes}
                                      value={currentPlan.time}
                                      onChange={(val) => handlePlanUpdate({ time: val })}
                                      onFocus={() => handleFocus('time')}
                                      onBlur={() => handleBlur('time')}
                                      placeholder="20min"
                                      minHeight="38px"
                                      readOnly={isInteractionLocked}
                                      simplified={true}
                                    />
                                  </FieldContainer>
                                )}
                              </div>
                              <div className="space-y-2">
                                <SectionHeader title={t('VENUE')} icon={MapPin} tag="VENUE" />
                                {isHistoryMode ? (
                                  <DiffHighlighter type="text" oldValue={(previousPlan ?? previewPlan)?.location} newValue={previewPlan?.location} />
                                ) : (
                                  <FieldContainer field="location" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                    <O2RichEditor
                                      getPasteBudget={remainingPasteBytes}
                                      value={currentPlan.location}
                                      onChange={(val) => handlePlanUpdate({ location: val })}
                                      onFocus={() => handleFocus('location')}
                                      onBlur={() => handleBlur('location')}
                                      placeholder="3F Main Hall"
                                      minHeight="38px"
                                      readOnly={isInteractionLocked}
                                      simplified={true}
                                    />
                                  </FieldContainer>
                                )}
                              </div>
                            </section>
                          )}

                          {!isScriptMode && (
                            <section>
                              <SectionHeader title={t('PROCEDURES')} icon={Layout} tag="WORKFLOW" />
                              {isHistoryMode ? (
                                <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.process} newValue={previewPlan?.process} />
                              ) : (
                                <FieldContainer field="process" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                  <O2RichEditor
                                    getPasteBudget={remainingPasteBytes}
                                    value={currentPlan.process}
                                    onChange={(val) => handlePlanUpdate({ process: val })}
                                    onFocus={() => handleFocus('process')}
                                    onBlur={() => handleBlur('process')}
                                    placeholder="詳細描述活動流程... / Describe the procedures..."
                                    readOnly={isInteractionLocked}
                                  />
                                </FieldContainer>
                              )}
                            </section>
                          )}

                           <section className="flex w-full flex-col">
                             <SectionHeader title={t('VISUAL_BLUEPRINT')} actions={!isHistoryMode && (
                               <div role="group" aria-label={language === 'zh' ? '教案內容檢視' : 'Lesson content view'}
                                 className="flex items-center gap-0.5 rounded-lg border bg-muted/35 p-0.5">
                                 {([
                                   ['text', language === 'zh' ? '文字描述' : 'Text', FileText],
                                   ['canvas', language === 'zh' ? '手繪藍圖' : 'Drawing', Palette],
                                 ] as const).map(([mode, label, Icon]) => (
                                   <button key={mode} type="button" aria-pressed={blueprintMode === mode}
                                     onClick={() => setBlueprintMode(mode)}
                                     className={cn("flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium sm:px-3",
                                       blueprintMode === mode ? "bg-background text-foreground shadow-sm"
                                         : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                                     <Icon className="h-3.5 w-3.5" />
                                     {label}
                                   </button>
                                 ))}
                               </div>
                             )} />

                             {isHistoryMode && (
                               <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.content} newValue={previewPlan?.content} />
                             )}
                             {(!isHistoryMode || currentPlan.canvasImage ||
                               (previousPlan && previousPlan.canvasData !== previewPlan?.canvasData)) && (blueprintMode === 'text' && !isHistoryMode ? (
                               <FieldContainer field="content" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                 <O2RichEditor
                                   getPasteBudget={remainingPasteBytes}
                                   value={currentPlan.content}
                                   onChange={(val) => handlePlanUpdate({ content: val })}
                                   onFocus={() => handleFocus('content')}
                                   onBlur={() => handleBlur('content')}
                                   placeholder="撰寫教案內容... (支援貼上圖片) / Write lesson content here..."
                                   readOnly={isInteractionLocked}
                                 />
                               </FieldContainer>
                             ) : (
                               <div className="w-full relative">
                                 {isInteractionLocked ? (
                                   <div className="relative border border-stone-200/80 dark:border-white/10 rounded-lg p-4 bg-white/80 dark:bg-white/[0.03] flex flex-col items-center justify-center gap-3 min-h-[300px]">
                                     {isHistoryMode && previousPlan && previousPlan.canvasData !== previewPlan?.canvasData && (
                                       <span data-version-change className="absolute left-3 top-3 rounded bg-muted px-2 py-1 text-xs">手繪藍圖已修改</span>
                                     )}
                                     {currentPlan.canvasImage ? (
                                       <img 
                                         src={currentPlan.canvasImage} 
                                         alt="手繪視覺藍圖" 
                                         className="max-w-full h-auto object-contain rounded-lg"
                                         style={{ maxHeight: `${currentPlan.canvasHeight || 500}px` }}
                                       />
                                     ) : (
                                       <span className="text-muted-foreground text-sm font-bold">（尚無手繪視覺藍圖）</span>
                                     )}
                                     {isReadOnlyMode && !showHistoryBar && (
                                       <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingMode(true)}>
                                         <Pencil className="h-4 w-4" />
                                         {language === 'zh' ? '編輯藍圖' : 'Edit drawing'}
                                       </Button>
                                     )}
                                   </div>
                                 ) : (
                                   <FieldContainer field="canvasData" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                     <div 
                                       className="w-full"
                                       onFocus={(event) => {
                                         if (!event.currentTarget.contains(event.relatedTarget)) handleFocus('canvasData');
                                       }}
                                       onBlur={(event) => {
                                         if (!event.currentTarget.contains(event.relatedTarget)) handleBlur('canvasData');
                                       }}
                                     >
                                       <FabricCanvas
                                         initialData={currentPlan.canvasData}
                                         initialHeight={currentPlan.canvasHeight || 500}
                                         onSave={(data, height, image) => {
                                           handlePlanUpdate({
                                             canvasData: data,
                                             canvasHeight: height,
                                             canvasImage: image
                                           });
                                         }}
                                       />
                                     </div>
                                   </FieldContainer>
                                 )}
                               </div>
                             ))}
                           </section>

                          {isHistoryMode && (previewPlan?.divisionOfLabor || previousPlan?.divisionOfLabor) && (
                            <section>
                              <SectionHeader title="分工" icon={Users} tag="DIVISION OF LABOR" />
                              <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.divisionOfLabor} newValue={previewPlan?.divisionOfLabor} />
                            </section>
                          )}

                          <section className="w-full flex flex-col">
                            <SectionHeader title={t('MATERIALS')} icon={Package} tag="MATERIALS & PROPS" />
                            {isHistoryMode ? (
                              <DiffHighlighter type="table" oldValue={(previousPlan ?? previewPlan)?.props} newValue={previewPlan?.props} />
                            ) : (
                              <div className="w-full">
                                <FieldContainer field="props" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                  <PropsTable
                                    value={currentPlan.props}
                                    onChange={(val) => handlePlanUpdate({ props: val })}
                                    onFocus={() => handleFocus('props')}
                                    onBlur={() => handleBlur('props')}
                                    readOnly={isInteractionLocked}
                                  />
                                </FieldContainer>
                              </div>
                            )}
                          </section>

                          {!isScriptMode && (
                            <section>
                              <SectionHeader title={t('OPENING_CLOSING') || "開場與結語"} icon={StickyNote} tag="REMARKS" />
                              {isHistoryMode ? (
                                <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.openingClosingRemarks} newValue={previewPlan?.openingClosingRemarks} />
                              ) : (
                                <FieldContainer field="openingClosingRemarks" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                  <O2RichEditor
                                    getPasteBudget={remainingPasteBytes}
                                    value={currentPlan.openingClosingRemarks || ""}
                                    onChange={(val) => handlePlanUpdate({ openingClosingRemarks: val })}
                                    onFocus={() => handleFocus('openingClosingRemarks')}
                                    onBlur={() => handleBlur('openingClosingRemarks')}
                                    placeholder="開場與結語... / Opening & closing..."
                                    minHeight="120px"
                                    readOnly={isInteractionLocked}
                                  />
                                </FieldContainer>
                              )}
                            </section>
                          )}

                          <section>
                            <SectionHeader title="備註" icon={StickyNote} tag="OPERATIONAL NOTES" />
                            {isHistoryMode ? (
                              <DiffHighlighter type="markdown" oldValue={(previousPlan ?? previewPlan)?.remarks} newValue={previewPlan?.remarks} />
                            ) : (
                              <FieldContainer field="remarks" isLockedByOther={isLockedByOther} getLockInfo={getLockInfo} onTakeover={handleTakeover}>
                                <O2RichEditor
                                  getPasteBudget={remainingPasteBytes}
                                  value={currentPlan.remarks || ""}
                                  onChange={(val) => handlePlanUpdate({ remarks: val })}
                                  onFocus={() => handleFocus('remarks')}
                                  onBlur={() => handleBlur('remarks')}
                                  placeholder="加入備註 (選填)... / Add remarks (Optional)..."
                                  minHeight="120px"
                                  readOnly={isInteractionLocked}
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


      {/* ── MOBILE BOTTOM TOOLBAR (100% Solid / Opaque, Fixed at Bottom) ── */}
      {!showHistoryBar && <TooltipProvider delayDuration={200}>
        <div
          ref={mobileToolbarRef}
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-40 w-full bg-[#FAF8F5] dark:bg-[#0B1012] border-t border-stone-200/80 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none pt-1 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-out",
            isEditingMode
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide py-0.5">
            <div className="flex items-center gap-1 flex-nowrap shrink-0">
              {/* Mobile Done Editing Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingMode(false)}
                className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 transition-colors bg-orange-600/10 text-orange-600 hover:bg-orange-600/20 dark:bg-amber-400/15 dark:text-amber-400"
                title="完成編輯"
              >
                <Check className="h-3.5 w-3.5" />
                <span>完成</span>
              </Button>

              <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Undo / Redo */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLocalUndo}
                disabled={localHistory.past.length === 0 || isHistoryMode}
                className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0 disabled:opacity-40"
                aria-label="復原"
              >
                <Undo2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLocalRedo}
                disabled={localHistory.future.length === 0 || isHistoryMode}
                className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0 disabled:opacity-40"
                aria-label="重做"
              >
                <Redo2 className="h-4 w-4" />
              </Button>

              <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Zoom Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs font-fira-code text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 gap-1 shrink-0"
                    title="縮放頁面"
                  >
                    <span>{Math.round(pageZoom * 100)}%</span>
                    <ChevronDown className="h-3 w-3 text-stone-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40 rounded-lg border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#14191C] shadow-2xl p-1.5 z-[60]">
                  <DropdownMenuItem onClick={handleZoomIn} disabled={pageZoom >= 2} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                    <ZoomIn className="h-3.5 w-3.5" /> 放大 (Zoom In)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleZoomOut} disabled={pageZoom <= 0.3} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                    <ZoomOut className="h-3.5 w-3.5" /> 縮小 (Zoom Out)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFitAll} className="text-xs py-2 px-3 rounded-md gap-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 font-mono">
                    <Maximize className="h-3.5 w-3.5" /> 重設 (100%)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Rich Text Markdown Formatting Toolbar */}
              <MarkdownToolbar className="bg-transparent border-none px-0" />
            </div>

            {/* Right controls: Mobile print view switch */}
            <div className="flex items-center gap-1 shrink-0 pl-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobilePrintView(!isMobilePrintView)}
                className="h-8 w-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10 shrink-0"
                title="切換檢視模式"
              >
                {isMobilePrintView ? <Smartphone className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </TooltipProvider>}

      {/* Floating Action Button (FAB) for entering edit mode on mobile (Google Docs mobile style) */}
      {!showHistoryBar && <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsEditingMode(true)}
        title="進入編輯模式"
        className={cn(
          "fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-[70] h-14 w-14 rounded-lg bg-orange-600 text-white dark:bg-amber-400 dark:text-[#0B1012] shadow-[0_10px_28px_rgba(234,88,12,0.32)] dark:shadow-[0_10px_28px_rgba(251,191,36,0.28)] border-none transition-all duration-300 ease-out md:hidden",
          !isEditingMode && isFabVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-8 opacity-0 pointer-events-none"
        )}
      >
        <Pencil className="h-5 w-5" />
      </Button>}

      {isSidebarOpen && (
        <>
          <button type="button" aria-label="收起版本紀錄" data-testid="version-sidebar-overlay"
            className="fixed inset-0 z-50 bg-black/35 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] h-[min(65dvh,34rem)] overflow-hidden rounded-t-xl border bg-card shadow-xl md:sticky md:inset-x-auto md:bottom-auto md:top-0 md:z-30 md:h-[100dvh] md:w-72 md:shrink-0 md:self-start md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none lg:w-80">
            <VersionHistorySidebar
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={(version) => {
                if (isRestoring) return;
                if (version.id !== selectedVersionId) {
                  setPreviewPlan(null);
                  setPreviousPlan(null);
                  setPreviewError(false);
                  setSelectedVersionId(version.id);
                }
                if (isMobile) setIsSidebarOpen(false);
              }}
              onDelete={isRestoring || !onDeleteVersion ? undefined : handleDeleteVersion}
              onClose={() => setIsSidebarOpen(false)}
              onBackToCurrent={() => {
                if (isRestoring) return;
                setSelectedVersionId(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              onUpdateVersionName={onUpdateVersionName}
              onSaveVersion={onSaveVersion ? handleSaveVersion : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}
