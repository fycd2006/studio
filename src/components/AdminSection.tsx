"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { RotationTableData, LessonPlan, PropItem, Camp, CampItem, Group } from "@/types/plan";
import { AdminTimer } from "@/components/AdminTimer";
import { AdminRotationTable } from "@/components/AdminRotationTable";
import { Button } from "@/components/ui/button";
import { Clock, Table as TableIcon, Plus, Lock, Unlock, Undo2, Redo2, Package2, ZoomIn, ZoomOut, Maximize, MoreHorizontal, FileDown, Zap, Calendar } from "lucide-react";
import { SmartRotationWizardModal } from "@/components/SmartRotationWizardModal";
import { GeneratedSchedule } from "@/lib/rotation-scheduler";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDialog } from "@/components/AdminDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, stripHtml } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ActionBar } from "@/components/ActionBar";
import { actionBarTheme } from "@/lib/actionbar-theme";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useActionBarStore } from "@/store/action-bar-store";
import { exportAdminExcel } from "@/lib/export-excel";

interface AdminSectionProps {
  tables: RotationTableData[];
  onAddTable: (dayOrData?: string | Partial<RotationTableData>) => void;
  onUpdateTable: (id: string, updates: Partial<RotationTableData>) => void;
  onDeleteTable: (id: string) => void;
  onUndoTable?: () => void;
  onRedoTable?: () => void;
  canUndoTable?: boolean;
  canRedoTable?: boolean;
  timer: any;
  plans: LessonPlan[];
  groups: Group[];
  onUpdatePlan: (id: string, updates: Partial<LessonPlan>) => void;
  camps: Camp[];
  activeCampId: string | null;
  onUpdateCamp: (id: string, updates: Partial<Camp>) => void;
}

type MainTab = 'timer' | 'tables' | 'props';

export function AdminSection({
  tables, onAddTable, onUpdateTable, onDeleteTable,
  onUndoTable, onRedoTable, canUndoTable, canRedoTable,
  timer,
  plans,
  groups,
  onUpdatePlan,
  camps,
  activeCampId,
  onUpdateCamp
}: AdminSectionProps) {
  const resolveMainTabFromHash = useCallback((hash: string): MainTab => {
    const normalized = hash.replace('#', '').toLowerCase();
    if (normalized === 'tables' || normalized === 'rotation') return 'tables';
    if (normalized === 'props') return 'props';
    return 'timer';
  }, []);

  const { t } = useTranslation();
  const { role } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAutoEnterSaver = searchParams.get('saver') === '1';
  const [isLocked, setIsLocked] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("Day 1");
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('timer');
  const [activePropsTab, setActivePropsTab] = useState<'activity' | 'teaching' | 'all-props'>('activity');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleWizardGenerate = useCallback(async (
    schedule: GeneratedSchedule,
    updatedPlans: Array<{ id: string; location: string; lead: string; assistant: string }>
  ) => {
    onAddTable(schedule);

    updatedPlans.forEach((p) => {
      const cleanLead = stripHtml(p.lead);
      const cleanAsst = stripHtml(p.assistant);
      const combined = [cleanLead, cleanAsst].filter(Boolean).join('、');
      onUpdatePlan(p.id, {
        location: p.location,
        leadMember: cleanLead,
        assistantMember: cleanAsst,
        members: combined
      });
    });

    toast({
      title: "⚡ 智能闖關表已生成",
      description: `已成功生成「${schedule.title}」，主副關主與地點已全域同步至教案庫。`,
    });
  }, [onAddTable, onUpdatePlan, toast]);

  // Zoom state for tables and props list
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.1, 0.3));
  }, []);

  const handleFitAll = useCallback(() => {
    setZoom(1);
  }, []);

  const handlePrint = () => window.print();

  const handleExportExcel = useCallback(() => {
    if (!activeCampId) {
      toast({ title: "無可匯出專案", description: "請先選擇一個營隊專案。", variant: "destructive" });
      return;
    }
    const campName = camps.find((c) => c.id === activeCampId)?.name || "專案";
    try {
      exportAdminExcel(activeCampId, campName, camps, plans, tables);
      toast({ title: "匯出成功", description: "Excel 檔案已開始下載。" });
    } catch (e) {
      console.error("Export excel failed", e);
      toast({ title: "匯出失敗", description: "無法產生 Excel 檔案。", variant: "destructive" });
    }
  }, [activeCampId, camps, plans, tables, toast]);

  // Pinch-to-zoom gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scale = currentDist / pinchStartDistRef.current;
      const newZoom = Math.min(2, Math.max(0.3, pinchStartZoomRef.current * scale));
      setZoom(newZoom);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchStartDistRef.current = null;
  }, []);

  // Ctrl+Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keep main admin tab synced with URL query/hash and custom event for navbar navigation.
  useEffect(() => {
    const tabFromQuery = (searchParams.get('tab') || '').toLowerCase();
    if (tabFromQuery === 'timer' || tabFromQuery === 'tables' || tabFromQuery === 'props') {
      if (tabFromQuery !== activeMainTab) setActiveMainTab(tabFromQuery as MainTab);
      return;
    }

    const tabFromHash = resolveMainTabFromHash(window.location.hash);
    if (tabFromHash !== activeMainTab) setActiveMainTab(tabFromHash);
  }, [searchParams, resolveMainTabFromHash, activeMainTab]);

  useEffect(() => {
    const handleTabSync = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail === 'timer' || custom.detail === 'tables' || custom.detail === 'props') {
        setActiveMainTab(custom.detail as MainTab);
      }
    };
    window.addEventListener('admin-tab-change', handleTabSync);
    return () => window.removeEventListener('admin-tab-change', handleTabSync);
  }, []);

  const handleMainTabChange = useCallback((value: string) => {
    if (value !== 'timer' && value !== 'tables' && value !== 'props') return;
    const nextTab = value as MainTab;
    setActiveMainTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    const nextUrl = `${pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
    window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: nextTab }));
  }, [pathname, searchParams]);

  // Toggle fullscreen mode for props spreadsheet
  const setIsFullscreen = useActionBarStore((s) => s.setIsFullscreen);
  useEffect(() => {
    setIsFullscreen(activeMainTab === 'props');
    return () => setIsFullscreen(false);
  }, [activeMainTab, setIsFullscreen]);

  // Unlock feature removed as everything is open by default

  const filteredTables = useMemo(() => {
    return tables.filter(t => (t.day || "Day 1") === selectedDay);
  }, [tables, selectedDay]);

  const dayOptions = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

  const normalizeKey = (value?: string | null) => (value || "").trim().toLowerCase();

  const mapCategoryToSlug = (value?: string | null) => {
    const key = normalizeKey(value);
    if (key === 'teaching' || key === '教學' || key === '教學組' || key === 'teachinggroup' || key === 'teaching-group') return 'teaching';
    if (key === 'activity' || key === '活動' || key === '活動組' || key === 'activitygroup' || key === 'activity-group') return 'activity';
    return key;
  };

  const resolvePlanMainType = (plan: LessonPlan): 'activity' | 'teaching' => {
    const byGroupIdOrSlug = groups.find(
      g => g.id === plan.groupId || normalizeKey(g.slug) === normalizeKey(plan.groupId)
    );
    const categoryKey = mapCategoryToSlug(plan.category);
    const groupSlugKey = mapCategoryToSlug(byGroupIdOrSlug?.slug);
    const groupNameZhKey = mapCategoryToSlug(byGroupIdOrSlug?.nameZh);
    const groupNameEnKey = mapCategoryToSlug(byGroupIdOrSlug?.nameEn);
    const groupIdKey = mapCategoryToSlug(plan.groupId);

    const teachingHint = [categoryKey, groupSlugKey, groupNameZhKey, groupNameEnKey, groupIdKey]
      .some(v => v.includes('teaching') || v.includes('教學'));

    if (teachingHint) return 'teaching';
    return 'activity';
  };

  const teachingPlans = plans.filter(p => resolvePlanMainType(p) === 'teaching').sort((a, b) => a.order - b.order);
  const activityPlans = plans.filter(p => resolvePlanMainType(p) === 'activity').sort((a, b) => a.order - b.order);

  const groupByCategory = (lessonPlans: LessonPlan[]) => {
    return lessonPlans.reduce((acc, plan) => {
      const cat = plan.scheduledName || '未分類 / Uncategorized';
      if (!acc[cat]) { acc[cat] = []; }
      acc[cat].push(plan);
      return acc;
    }, {} as Record<string, LessonPlan[]>);
  };

  const activityGroups = groupByCategory(activityPlans);
  const teachingGroups = groupByCategory(teachingPlans);

  // Create flattened prop list for Activity and Teaching tables
  type PropTableRow = { plan: LessonPlan; prop: PropItem | null };

  const toPropRows = (targetPlans: LessonPlan[]): PropTableRow[] =>
    targetPlans.flatMap((plan): PropTableRow[] => {
      const props = plan.props || [];
      if (props.length === 0) {
        return [{ plan, prop: null }];
      }
      return props.map((prop) => ({ plan, prop }));
    });

  const activityPropsFlattened = toPropRows(activityPlans);
  const teachingPropsFlattened = toPropRows(teachingPlans);

  const handleUpdatePropItem = (planId: string, propId: string, updates: Partial<PropItem>) => {
    if (isLocked) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const updatedProps = plan.props.map(p =>
      p.id === propId ? { ...p, ...updates } : p
    );

    onUpdatePlan(planId, { props: updatedProps });
  };

  const handleUpdateCampItem = (campItemId: string, updates: Partial<CampItem>) => {
    if (isLocked || !activeCampId) return;
    const camp = camps.find(c => c.id === activeCampId);
    if (!camp) return;

    const currentItems = camp.campItems || [];
    const updatedItems = currentItems.map(item =>
      item.id === campItemId ? { ...item, ...updates } : item
    );

    onUpdateCamp(activeCampId, { campItems: updatedItems });
  };

  const activeCamp = camps.find(c => c.id === activeCampId);
  const campItems = activeCamp?.campItems || [];

  const handleAddCampItem = () => {
    if (isLocked || !activeCampId) return;
    const camp = camps.find(c => c.id === activeCampId);
    if (!camp) return;

    const newItem: CampItem = {
      id: Math.random().toString(36).substr(2, 9),
      usage: '未分類',
      name: '新物品',
      isPacked: false,
      isChecked: false
    };

    onUpdateCamp(activeCampId, { campItems: [...(camp.campItems || []), newItem] });
  };

  const handleDeleteCampItem = (campItemId: string) => {
    if (isLocked || !activeCampId) return;
    const camp = camps.find(c => c.id === activeCampId);
    if (!camp) return;

    onUpdateCamp(activeCampId, {
      campItems: (camp.campItems || []).filter(item => item.id !== campItemId)
    });
  };

  // Debounced Prop Input Component
  const PropInput = ({
    value,
    onChange,
    disabled,
    className
  }: {
    value: string,
    onChange: (val: string) => void,
    disabled: boolean,
    className?: string
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const resize = useCallback(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }, []);

    useEffect(() => {
      if (!disabled) {
        resize();
      }
    }, [localValue, disabled, resize]);

    if (disabled) {
      return (
        <div className={cn("min-h-8 md:min-h-10 px-2 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-transparent text-center font-fira-sans font-medium leading-normal flex items-center justify-center w-full", className)}>
          <span className="w-full break-all whitespace-pre-wrap block text-center">
            {value || ""}
          </span>
        </div>
      );
    }

    return (
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onChange(localValue)}
        onInput={resize}
        rows={1}
        className={cn(
          "w-full min-h-8 md:min-h-10 resize-none bg-transparent px-2 py-2 text-center text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-fira-sans font-medium rounded-none focus:outline-none focus:bg-blue-50/60 dark:focus:bg-blue-500/5 transition-all overflow-y-hidden leading-normal border-none whitespace-pre-wrap break-all",
          className
        )}
      />
    );
  };

  const renderPropTable = (title: string, propItems: PropTableRow[]) => {
    // Group props by schedule category
    const propGroups = propItems.reduce((acc, item) => {
      const cat = item.plan.scheduledName || '未分類 / Uncategorized';
      if (!acc[cat]) { acc[cat] = []; }
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, PropTableRow[]>);

    return (
      <div className="w-full bg-white/80 dark:bg-white/[0.02] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl overflow-hidden flex-1 flex flex-col shadow-xs my-2">
        <div className="w-full overflow-auto flex-1 min-h-0 pr-12 sm:pr-0">
          <table className="w-full min-w-[760px] md:min-w-[1000px] text-sm text-left border-collapse">
            <thead className="text-fg-muted text-[11px] font-mono uppercase tracking-[0.2em] sticky top-0 bg-[#FAF8F5]/90 dark:bg-[#12171A]/90 backdrop-blur-xl z-10 border-b border-stone-200/80 dark:border-white/10 text-center">
              <tr>
                <th className="w-[12%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('CATEGORY')}</th>
                <th className="w-[14%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('SUBJECT')}</th>
                <th className="w-[12%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('ASSIGNED_PERSONNEL')}</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200/80 dark:border-white/10">{t('PROP_NAME')}</th>
                <th className="w-[8%] px-4 py-3 whitespace-nowrap border-r border-stone-200/80 dark:border-white/10 font-mono">Qty</th>
                <th className="w-[8%] px-4 py-3 whitespace-nowrap border-r border-stone-200/80 dark:border-white/10 font-mono">Unit</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200/80 dark:border-white/10">{t('OP_REMARKS')}</th>
                <th className="w-[7%] px-4 py-3 whitespace-nowrap border-r border-stone-200/80 dark:border-white/10">{t('PACKED')}</th>
                <th className="w-[7%] px-4 py-3 whitespace-nowrap">{t('CHECKED')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(propGroups).length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-fg-muted font-mono text-xs tracking-wider border-b border-stone-200/80 dark:border-white/10">目前沒有任何道具資料</td></tr>
              ) : null}

              {Object.entries(propGroups).map(([categoryName, items], gIndex) => {
                // To merge rows correctly within a category, group by plan ID
                const plansInGroup = items.reduce((acc, item) => {
                  if (!acc[item.plan.id]) { acc[item.plan.id] = []; }
                  acc[item.plan.id].push(item);
                  return acc;
                }, {} as Record<string, PropTableRow[]>);

                return Object.entries(plansInGroup).map(([planId, planItems], pIndex) => (
                  planItems.map((item, iIndex) => {
                    const isFirstInGroup = pIndex === 0 && iIndex === 0;
                    const isFirstInPlan = iIndex === 0;

                    return (
                      <tr key={`${item.plan.id}-${item.prop?.id ?? 'no-prop'}`} className={cn(
                        "group hover:bg-stone-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-200 border-b border-stone-200/60 dark:border-white/10 last:border-0",
                        item.prop?.isFromClub && item.prop?.isToPurchase ? "bg-emerald-500/[0.06] dark:bg-emerald-500/10" : "bg-transparent"
                      )}>
                        {isFirstInGroup && (
                          <td className="px-4 py-3 font-mono text-xs text-foreground align-top border-r border-stone-200/80 dark:border-white/10 font-normal" rowSpan={items.length}>
                            {categoryName}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-4 py-3 text-xs sm:text-sm text-foreground align-top border-r border-stone-200/80 dark:border-white/10 whitespace-pre-wrap break-all font-normal" rowSpan={planItems.length}>
                            {stripHtml(item.plan.activityName) || '-'}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-4 py-3 text-xs sm:text-sm text-fg-muted align-top border-r border-stone-200/80 dark:border-white/10 whitespace-pre-wrap break-all" rowSpan={planItems.length}>
                            {stripHtml(item.plan.members) || '-'}
                          </td>
                        )}
                        <td className={cn("align-middle border-r border-stone-200/80 dark:border-white/10", item.prop ? "p-0" : "px-2 py-2")}>
                          {item.prop ? (
                            <PropInput
                              value={item.prop.name}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { name: v })}
                              disabled={isLocked}
                              className="font-normal text-foreground text-center"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-xs text-fg-muted italic">無所需物品</div>
                          )}
                        </td>
                        <td className={cn("align-middle border-r border-stone-200/80 dark:border-white/10", item.prop ? "p-0" : "px-2 py-2")}>
                          {item.prop ? (
                            <PropInput
                              value={item.prop.quantity}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { quantity: v })}
                              disabled={isLocked}
                              className="text-center font-mono text-foreground"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-fg-muted">-</div>
                          )}
                        </td>
                        <td className={cn("align-middle border-r border-stone-200/80 dark:border-white/10", item.prop ? "p-0" : "px-2 py-2")}>
                          {item.prop ? (
                            <PropInput
                              value={item.prop.unit === 'custom' ? '' : item.prop.unit}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { unit: v })}
                              disabled={isLocked}
                              className="text-center text-fg-muted font-mono text-xs"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-fg-muted">-</div>
                          )}
                        </td>
                        <td className={cn("align-middle border-r border-stone-200/80 dark:border-white/10", item.prop ? "p-0" : "px-2 py-2")}>
                          {item.prop ? (
                            <PropInput
                              value={item.prop.remarks || ''}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { remarks: v })}
                              disabled={isLocked}
                              className="text-fg-muted text-center"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-fg-muted">-</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                          <div className="flex justify-center items-center h-full">
                            <Checkbox
                              checked={item.prop?.isFromClub || false}
                              disabled={isLocked || !item.prop}
                              onCheckedChange={(c) => {
                                if (!item.prop) return;
                                handleUpdatePropItem(item.plan.id, item.prop.id, { isFromClub: c === true });
                              }}
                              className="h-5 w-5 rounded-md"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <div className="flex justify-center items-center h-full">
                            <Checkbox
                              checked={item.prop?.isToPurchase || false}
                              disabled={isLocked || !item.prop}
                              onCheckedChange={(c) => {
                                if (!item.prop) return;
                                handleUpdatePropItem(item.plan.id, item.prop.id, { isToPurchase: c === true });
                              }}
                              className="h-5 w-5 rounded-md"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ));
              })}

              {/* Empty placeholder rows */}
              {Array.from({ length: 25 }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-[46px] border-b border-stone-200/40 dark:border-white/[0.04] bg-transparent hover:bg-stone-500/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 bg-stone-500/[0.02] dark:bg-white/[0.01] border-t border-stone-200/80 dark:border-white/10">
                  {!isLocked && (
                    <Button
                      onClick={handleAddCampItem}
                      size="sm"
                      variant="ghost"
                      className="w-full h-10 text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 transition-all gap-2 font-mono text-xs uppercase tracking-widest border-none"
                    >
                      <Plus className="h-4 w-4" /> 新增道具
                    </Button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderCombinedTable = () => {
    // Group camp items
    const usageGroups = campItems.reduce((acc, item) => {
      const u = item.usage || '未分類 / Uncategorized';
      if (!acc[u]) { acc[u] = []; }
      acc[u].push(item);
      return acc;
    }, {} as Record<string, CampItem[]>);

    return (
      <div className="w-full bg-white/80 dark:bg-white/[0.02] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl overflow-hidden flex-1 flex flex-col shadow-xs my-2">
        <div className="w-full overflow-auto flex-1 min-h-0 pr-12 sm:pr-0">
          <table className="w-full min-w-[760px] md:min-w-[1000px] text-sm text-left border-collapse">
            <thead className="text-fg-muted text-[11px] font-mono uppercase tracking-[0.2em] sticky top-0 z-10 bg-[#FAF8F5]/90 dark:bg-[#12171A]/90 backdrop-blur-xl border-b border-stone-200/80 dark:border-white/10 text-center">
              <tr>
                <th className="w-[16%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('PROP_USAGE')}</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200/80 dark:border-white/10">{t('PROP_NAME')}</th>
                <th className="w-[16%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('ASSIGNED_PERSONNEL')}</th>
                <th className="w-[28%] px-4 py-3 border-r border-stone-200/80 dark:border-white/10">{t('MATERIALS')}</th>
                <th className="w-[12%] px-4 py-3 whitespace-nowrap border-r border-stone-200/80 dark:border-white/10">{t('PACKED')}</th>
                <th className="w-[12%] px-4 py-3 whitespace-nowrap border-r border-stone-200/80 dark:border-white/10">{t('CHECKED')}</th>
                {!isLocked && <th className="w-[10%] px-4 py-3 text-center">操作</th>}
              </tr>
            </thead>

            {/* 1. 活動組 */}
            <tbody>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-500/5 dark:bg-orange-500/10 border-b border-stone-200/80 dark:border-white/10 font-medium">
                  // 01. 活動組 // 教案道具確認
                </td>
              </tr>
              {Object.keys(activityGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-fg-muted font-mono text-xs border-b border-stone-200/80 dark:border-white/10">目前沒有活動組資料</td></tr>
              ) : Object.entries(activityGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`act-${plan.id}`} className={cn(
                    "group hover:bg-stone-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-200 border-b border-stone-200/60 dark:border-white/10 last:border-0",
                    plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-500/[0.06] dark:bg-emerald-500/10" : "bg-transparent"
                  )}>
                    {pIndex === 0 && (
                      <td className="px-4 py-3 font-mono text-xs text-foreground align-top border-r border-stone-200/80 dark:border-white/10 break-all font-normal" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs sm:text-sm text-foreground align-top border-r border-stone-200/80 dark:border-white/10 text-center whitespace-pre-wrap break-all font-normal">
                      {stripHtml(plan.activityName) || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-fg-muted align-top border-r border-stone-200/80 dark:border-white/10 text-center whitespace-pre-wrap break-all">
                      {stripHtml(plan.members) || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs sm:text-sm border-r border-stone-200/80 dark:border-white/10 break-all">
                      {plan.props.length > 0 ? (
                        <ul className="space-y-1.5 list-none">
                          {plan.props.map(prop => (
                            <li key={prop.id} className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0" />
                              <span className="font-normal text-foreground break-all">{prop.name}</span>
                              <span className="text-orange-600 dark:text-orange-400 font-mono px-1 text-[11px] shrink-0 font-medium">× {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}</span>
                              {prop.remarks && <span className="text-fg-muted ml-1 text-[11px] break-all">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-fg-muted italic text-xs">無所需物品</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 rounded-md" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center flex-col items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 rounded-md" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 2. 教學組 */}
            <tbody>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 border-b border-stone-200/80 dark:border-white/10 font-medium">
                  // 02. 教學組 // 教案道具確認
                </td>
              </tr>
              {Object.keys(teachingGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-fg-muted font-mono text-xs border-b border-stone-200/80 dark:border-white/10">目前沒有教學組資料</td></tr>
              ) : Object.entries(teachingGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`tch-${plan.id}`} className={cn(
                    "group hover:bg-stone-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-200 border-b border-stone-200/60 dark:border-white/10 last:border-0",
                    plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-500/[0.06] dark:bg-emerald-500/10" : "bg-transparent"
                  )}>
                    {pIndex === 0 && (
                      <td className="px-4 py-3 font-mono text-xs text-foreground align-top border-r border-stone-200/80 dark:border-white/10 break-all font-normal" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs sm:text-sm text-foreground align-top border-r border-stone-200/80 dark:border-white/10 text-center whitespace-pre-wrap break-all font-normal">
                      {stripHtml(plan.activityName) || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-fg-muted align-top border-r border-stone-200/80 dark:border-white/10 text-center whitespace-pre-wrap break-all">
                      {stripHtml(plan.members) || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs sm:text-sm border-r border-stone-200/80 dark:border-white/10 break-all">
                      {plan.props.length > 0 ? (
                        <ul className="space-y-1.5 list-none">
                          {plan.props.map(prop => (
                            <li key={prop.id} className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0" />
                              <span className="font-normal text-foreground break-all">{prop.name}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-mono px-1 text-[11px] shrink-0 font-medium">× {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}</span>
                              {prop.remarks && <span className="text-fg-muted ml-1 text-[11px] break-all">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-fg-muted italic text-xs">無所需物品</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 rounded-md" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center flex-col items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 rounded-md" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 3. 營期物品 */}
            <tbody>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-stone-200/80 dark:border-white/10 font-medium">
                  // 03. 營期其他物品 // 物資統籌確認
                </td>
              </tr>
              {Object.keys(usageGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-fg-muted font-mono text-xs border-b border-stone-200/80 dark:border-white/10">目前沒有營期物品資料</td></tr>
              ) : Object.entries(usageGroups).map(([usageName, items]) => (
                items.map((item, pIndex) => (
                  <tr key={`cmp-${item.id}`} className={cn(
                    "group hover:bg-stone-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-200 border-b border-stone-200/60 dark:border-white/10 last:border-0",
                    item.isChecked && item.isPacked ? "bg-emerald-500/[0.06] dark:bg-emerald-500/10" : "bg-transparent"
                  )}>
                    {pIndex === 0 && (
                      <td className={cn("font-mono text-xs text-foreground align-top border-r border-stone-200/80 dark:border-white/10 break-all font-normal", isLocked ? "px-4 py-3" : "p-0")} rowSpan={items.length}>
                        {isLocked ? (
                          usageName
                        ) : (
                          <PropInput
                            value={item.usage}
                            onChange={(v) => {
                              items.forEach(i => handleUpdateCampItem(i.id, { usage: v }));
                            }}
                            disabled={isLocked}
                            className="font-normal text-foreground text-center"
                          />
                        )}
                      </td>
                    )}
                    <td className="p-0 align-middle border-r border-stone-200/80 dark:border-white/10">
                      <PropInput
                        value={item.name}
                        onChange={(v) => handleUpdateCampItem(item.id, { name: v })}
                        disabled={isLocked}
                        className="font-normal text-foreground text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted align-middle border-r border-stone-200/80 dark:border-white/10 text-center">
                      -
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted align-middle border-r border-stone-200/80 dark:border-white/10 text-center">
                      -
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={item.isPacked || false}
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isPacked: c === true })}
                          className="h-5 w-5 rounded-md"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200/80 dark:border-white/10">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={item.isChecked || false}
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isChecked: c === true })}
                          className="h-5 w-5 rounded-md"
                        />
                      </div>
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-3 text-center align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCampItem(item.id)}
                          className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs"
                        >
                          刪除
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ))}

              {/* Empty placeholder rows */}
              {Array.from({ length: 25 }).map((_, i) => (
                <tr key={`empty-combined-${i}`} className="h-[46px] border-b border-stone-200/40 dark:border-white/[0.04] bg-transparent hover:bg-stone-500/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-200/40 dark:border-white/[0.04] h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  {!isLocked && <td className="h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 bg-stone-500/[0.02] dark:bg-white/[0.01] border-t border-stone-200/80 dark:border-white/10">
                  {!isLocked && (
                    <Button
                      onClick={handleAddCampItem}
                      size="sm"
                      variant="ghost"
                      className="w-full h-10 text-fg-muted hover:text-foreground hover:bg-stone-500/10 dark:hover:bg-white/5 transition-all gap-2 font-mono text-xs uppercase tracking-widest border-none"
                    >
                      <Plus className="h-4 w-4" /> 新增道具
                    </Button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground animate-in fade-in duration-500 relative transition-colors font-sans min-h-screen">
      <main className="flex-1 min-w-0 w-full relative flex flex-col">
        <div className={cn("w-full pt-14 sm:pt-16 pb-8 md:pb-12 transition-all duration-300 flex-1 flex flex-col", activeMainTab === 'props' ? "px-0 pt-14 sm:pt-16 pb-0" : "px-4 sm:px-6 md:px-8 lg:px-10")}>
          <Tabs value={activeMainTab} onValueChange={handleMainTabChange} className={cn("w-full flex flex-col items-stretch flex-1", activeMainTab === 'props' ? "space-y-0" : "space-y-4 sm:space-y-6")}>

            {activeMainTab !== 'timer' && (
              <ActionBar position="top" title="操作列" className="scrollbar-hide">
                <div className="flex w-full items-center justify-between gap-1.5 sm:gap-3 flex-nowrap min-w-0">
                  
                  {/* Left Cluster: Lock & Contextual Controls */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    {/* Lock Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isLocked) {
                          if (role === 'admin') setIsLocked(false);
                          else toast({ title: "權限不足", description: "僅管理員能解鎖", variant: "destructive" });
                        } else {
                          setIsLocked(true);
                        }
                      }}
                      className={cn(
                        "h-8 sm:h-9 px-2.5 sm:px-3 rounded-full font-mono text-xs gap-1.5 transition-all cursor-pointer",
                        isLocked
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                      )}
                      title={isLocked ? "點擊解鎖編輯" : "點擊鎖定"}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isLocked ? "bg-rose-500" : "bg-emerald-500 animate-pulse")} />
                      {isLocked ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Unlock className="h-3.5 w-3.5 shrink-0" />}
                      <span className="hidden sm:inline font-medium">{isLocked ? "已鎖定" : "可編輯"}</span>
                    </Button>

                    <div className={cn(actionBarTheme.separator, "mx-0.5")} />

                    {/* Tables: Day selector + Wizard + Add table */}
                    {activeMainTab === 'tables' && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Day Selector */}
                        <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-white/10 rounded-full px-2 py-0.5 border border-stone-300/60 dark:border-white/10">
                          <Calendar className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger className="h-7 w-16 sm:w-20 border-0 bg-transparent shadow-none font-mono text-xs text-foreground focus:ring-0 p-0 text-center font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-stone-200/80 dark:border-white/10 shadow-2xl bg-white dark:bg-[#14191C] font-mono text-xs p-1">
                              {dayOptions.map(d => (
                                <SelectItem key={d} value={d} className="rounded-lg text-xs cursor-pointer">{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {!isLocked && (
                          <>
                            <Button
                              onClick={() => setIsWizardOpen(true)}
                              size="sm"
                              className="rounded-full font-mono text-xs uppercase tracking-wider gap-1.5 h-8 px-2.5 sm:px-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Zap className="h-3.5 w-3.5 fill-white shrink-0" />
                              <span className="hidden sm:inline">智能排關</span>
                              <span className="sm:hidden">排關</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAddTable(selectedDay)}
                              className="rounded-full font-mono text-xs uppercase tracking-wider gap-1 h-8 px-2.5 sm:px-3 border-stone-300 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 shadow-2xs cursor-pointer"
                              title="新增空白輪替表"
                            >
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              <span className="hidden sm:inline">空白表</span>
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Props: Sub-tabs */}
                    {activeMainTab === 'props' && (
                      <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-stone-200/60 dark:bg-white/10 rounded-full border border-stone-300/60 dark:border-white/10">
                        {(['activity', 'teaching', 'all-props'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActivePropsTab(tab)}
                            className={cn(
                              "px-2.5 sm:px-3.5 py-1 rounded-full text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap",
                              activePropsTab === tab
                                ? "bg-white dark:bg-white/20 text-orange-600 dark:text-orange-400 font-semibold shadow-xs"
                                : "text-stone-600 hover:text-foreground dark:text-stone-400"
                            )}
                          >
                            {tab === 'activity' ? '活動道具' : tab === 'teaching' ? '教學道具' : '全營期道具'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Cluster: Tools & Export */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
                    {/* Tables: Undo / Redo & Zoom */}
                    {activeMainTab === 'tables' && (
                      <>
                        <div className="hidden sm:flex items-center bg-stone-200/60 dark:bg-white/10 rounded-full p-0.5 border border-stone-300/60 dark:border-white/10">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onUndoTable} 
                            disabled={!canUndoTable || isLocked} 
                            className="h-7 w-7 rounded-full text-foreground hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            title="復原 (Undo)"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onRedoTable} 
                            disabled={!canRedoTable || isLocked} 
                            className="h-7 w-7 rounded-full text-foreground hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            title="重做 (Redo)"
                          >
                            <Redo2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Zoom Dropdown (Desktop) */}
                        <div className="hidden sm:block">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2.5 rounded-full font-mono text-xs uppercase tracking-wider gap-1 bg-stone-200/60 dark:bg-white/10 border border-stone-300/60 dark:border-white/10 hover:bg-stone-300/80 dark:hover:bg-white/15"
                                title="縮放表格"
                              >
                                <ZoomIn className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                                <span>{Math.round(zoom * 100)}%</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6} className="w-36 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-xl p-1 font-mono text-xs">
                              <DropdownMenuItem onClick={handleZoomIn} disabled={zoom >= 2} className="cursor-pointer gap-2 py-1.5 rounded-lg">
                                <ZoomIn className="h-3.5 w-3.5" /> 放大 (+10%)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleZoomOut} disabled={zoom <= 0.3} className="cursor-pointer gap-2 py-1.5 rounded-lg">
                                <ZoomOut className="h-3.5 w-3.5" /> 縮小 (-10%)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleFitAll} className="cursor-pointer gap-2 py-1.5 rounded-lg">
                                <Maximize className="h-3.5 w-3.5" /> 重設 (100%)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className={cn(actionBarTheme.separator, "hidden sm:block mx-0.5")} />
                      </>
                    )}

                    {/* Export Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 sm:px-3.5 rounded-full font-mono text-xs tracking-wider uppercase bg-stone-200/80 dark:bg-white/15 hover:bg-stone-300 dark:hover:bg-white/20 gap-1.5 text-foreground cursor-pointer"
                          title="匯出"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">匯出</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6} className="w-44 bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl rounded-xl p-1.5 font-sans">
                        <DropdownMenuItem onSelect={handleExportExcel} className="cursor-pointer font-medium text-xs py-2 px-3 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors">
                          匯出 Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handlePrint} className="cursor-pointer font-medium text-xs py-2 px-3 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors">
                          列印 / Print
                        </DropdownMenuItem>
                        {/* On mobile, also expose Undo/Redo/Zoom in the dropdown */}
                        {activeMainTab === 'tables' && (
                          <div className="sm:hidden border-t border-stone-200 dark:border-white/10 mt-1 pt-1">
                            <DropdownMenuItem onSelect={onUndoTable} disabled={!canUndoTable || isLocked} className="cursor-pointer font-medium text-xs py-1.5 px-3 rounded-lg gap-2">
                              <Undo2 className="h-3.5 w-3.5" /> 復原 (Undo)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onRedoTable} disabled={!canRedoTable || isLocked} className="cursor-pointer font-medium text-xs py-1.5 px-3 rounded-lg gap-2">
                              <Redo2 className="h-3.5 w-3.5" /> 重做 (Redo)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleFitAll} className="cursor-pointer font-medium text-xs py-1.5 px-3 rounded-lg gap-2">
                              <Maximize className="h-3.5 w-3.5" /> 縮放重設 (100%)
                            </DropdownMenuItem>
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              </ActionBar>
            )}

            <div className="w-full flex-1 relative">
              <TabsContent value="timer" className="m-0 h-full w-full">
                <AdminTimer
                  timer={timer}
                  isLocked={isLocked}
                  autoEnterSaverMode={shouldAutoEnterSaver}
                  tables={tables}
                  plans={plans}
                  selectedDay={selectedDay}
                  camps={camps}
                  activeCampId={activeCampId}
                  onUpdateCamp={onUpdateCamp}
                />
              </TabsContent>

              <TabsContent value="tables" className="m-0 data-[state=active]:flex flex-col space-y-6 md:space-y-8 pb-32">

                <div
                  className="w-full flex flex-col space-y-12"
                  style={{ touchAction: 'pan-x pan-y' }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="w-full space-y-12 origin-top-left"
                    style={{ zoom }}
                  >
                    {filteredTables.length > 0 ? (
                      filteredTables.map((table) => (
                        <AdminRotationTable
                          key={table.id}
                          table={table}
                          isReadOnly={isLocked}
                          onUpdate={(updates) => onUpdateTable(table.id, updates)}
                          onDelete={() => onDeleteTable(table.id)}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-fg-muted shadow-xs">
                          <TableIcon className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-mono text-fg-muted tracking-widest uppercase">目前無輪替表資料</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="props" className="m-0 data-[state=active]:flex flex-col flex-1 min-h-0 pb-0">
                <div
                  className="w-full flex-1 flex flex-col"
                  style={{ touchAction: 'pan-x pan-y' }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="w-full flex-1 flex flex-col origin-top-left"
                    style={{ zoom }}
                  >
                    <div className={cn("transition-opacity duration-300 flex-1 flex flex-col", isLocked ? "opacity-90" : "opacity-100")}>
                      {activePropsTab === 'activity' && renderPropTable('活動組', activityPropsFlattened)}
                      {activePropsTab === 'teaching' && renderPropTable('教學組', teachingPropsFlattened)}
                      {activePropsTab === 'all-props' && renderCombinedTable()}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Smart Rotation Wizard Modal */}
      <SmartRotationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        plans={plans}
        defaultDay={selectedDay}
        onGenerate={handleWizardGenerate}
      />
    </div>
  );
}
