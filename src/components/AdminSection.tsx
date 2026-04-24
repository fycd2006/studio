"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { RotationTableData, LessonPlan, PropItem, Camp, CampItem, Group } from "@/types/plan";
import { AdminTimer } from "@/components/AdminTimer";
import { AdminRotationTable } from "@/components/AdminRotationTable";
import { Button } from "@/components/ui/button";
import { Clock, Table as TableIcon, Plus, Lock, Unlock, Calendar, Undo2, Redo2, Package2, ZoomIn, ZoomOut, Maximize, MoreHorizontal, FileDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { FabStagger } from "@/components/FabStagger";
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
  onAddTable: (day: string) => void;
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
  const [activeFab, setActiveFab] = useState<string | null>(null);
  const [activePropsTab, setActivePropsTab] = useState<'activity' | 'teaching' | 'all-props'>('activity');

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

  // Keep main admin tab synced with URL query/hash for navbar dropdown navigation.
  useEffect(() => {
    const tabFromQuery = (searchParams.get('tab') || '').toLowerCase();
    if (tabFromQuery === 'timer' || tabFromQuery === 'tables' || tabFromQuery === 'props') {
      if (tabFromQuery !== activeMainTab) setActiveMainTab(tabFromQuery as MainTab);
      return;
    }

    const tabFromHash = resolveMainTabFromHash(window.location.hash);
    if (tabFromHash !== activeMainTab) setActiveMainTab(tabFromHash);
  }, [searchParams, resolveMainTabFromHash, activeMainTab]);

  const handleMainTabChange = useCallback((value: string) => {
    if (value !== 'timer' && value !== 'tables' && value !== 'props') return;
    const nextTab = value as MainTab;
    setActiveMainTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    const nextUrl = `${pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
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

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    return (
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onChange(localValue)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange(localValue);
            e.currentTarget.blur();
          }
        }}
        disabled={disabled}
        className={cn("h-8 md:h-10 px-2 text-xs sm:text-sm bg-transparent hover:bg-[#FBF9F6] dark:hover:bg-white/[0.06] focus:bg-[#FBF9F6] dark:focus:bg-white/[0.08] transition-all shadow-none focus:shadow-sm font-fira-sans font-medium", disabled ? " text-slate-800 dark:text-slate-200 opacity-100 placeholder:text-transparent" : "", className)}
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
      <div className="w-full bg-white dark:bg-slate-900/40 overflow-hidden flex-1 flex flex-col">


        <div className="w-full overflow-auto flex-1 min-h-0">
          <table className="w-full min-w-[760px] md:min-w-[1000px] text-sm text-left border-collapse">
            <thead className="text-stone-500 dark:text-slate-200 text-[10px] font-fira-code font-black uppercase tracking-[0.2em] sticky top-0 bg-[#FBF9F6]/95 dark:bg-slate-900/95 backdrop-blur-xl z-10 border-b border-stone-200 dark:border-slate-800 text-center">
              <tr>
                <th className="w-[12%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('CATEGORY')}</th>
                <th className="w-[14%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('SUBJECT')}</th>
                <th className="w-[12%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('ASSIGNED_PERSONNEL')}</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200 dark:border-slate-800">{t('PROP_NAME')}</th>
                <th className="w-[8%] px-4 py-3 whitespace-nowrap border-r border-stone-200 dark:border-slate-800">Qty</th>
                <th className="w-[8%] px-4 py-3 whitespace-nowrap border-r border-stone-200 dark:border-slate-800">Unit</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200 dark:border-slate-800">{t('OP_REMARKS')}</th>
                <th className="w-[7%] px-4 py-3 whitespace-nowrap border-r border-stone-200 dark:border-slate-800">{t('PACKED')}</th>
                <th className="w-[7%] px-4 py-3 whitespace-nowrap">{t('CHECKED')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(propGroups).length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500 dark:text-slate-600 font-bold border-b border-stone-200 dark:border-slate-800">目前沒有任何道具資料</td></tr>
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
                        "group hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200 border-b border-stone-200 dark:border-slate-800 last:border-0",
                        item.prop?.isFromClub && item.prop?.isToPurchase ? "bg-emerald-50/30 dark:bg-emerald-900/12" : "bg-white dark:bg-transparent"
                      )}>
                        {isFirstInGroup && (
                          <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={items.length}>
                            {categoryName}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={planItems.length}>
                            {item.plan.activityName || '-'}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={planItems.length}>
                            {item.plan.members || '-'}
                          </td>
                        )}
                        <td className="px-2 py-2 align-middle border-r border-stone-200 dark:border-slate-800">
                          {item.prop ? (
                            <PropInput
                              value={item.prop.name}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { name: v })}
                              disabled={isLocked}
                              className="font-medium text-slate-700 dark:text-slate-200 text-center"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">無所需物品</div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-middle border-r border-stone-200 dark:border-slate-800">
                          {item.prop ? (
                            <PropInput
                              value={item.prop.quantity}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { quantity: v })}
                              disabled={isLocked}
                              className="text-center font-fira-code font-bold text-slate-700 dark:text-slate-200"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600">-</div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-middle border-r border-stone-200 dark:border-slate-800">
                          {item.prop ? (
                            <PropInput
                              value={item.prop.unit === 'custom' ? '' : item.prop.unit}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { unit: v })}
                              disabled={isLocked}
                              className="text-center text-slate-600 dark:text-slate-400"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600">-</div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-middle border-r border-stone-200 dark:border-slate-800">
                          {item.prop ? (
                            <PropInput
                              value={item.prop.remarks || ''}
                              onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop!.id, { remarks: v })}
                              disabled={isLocked}
                              className="text-slate-500 dark:text-slate-400 text-center"
                            />
                          ) : (
                            <div className="h-8 md:h-10 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600">-</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                          <div className="flex justify-center items-center h-full">
                            <Checkbox
                              checked={item.prop?.isFromClub || false}
                              disabled={isLocked || !item.prop}
                              onCheckedChange={(c) => {
                                if (!item.prop) return;
                                handleUpdatePropItem(item.plan.id, item.prop.id, { isFromClub: c === true });
                              }}
                              className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
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
                              className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ));
              })}


              {/* Empty placeholder rows like Google Sheets */}
              {Array.from({ length: 25 }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-[46px] border-b border-stone-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/10 hover:bg-[#FBF9F6] dark:hover:bg-slate-800/20">
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 bg-[#FBF9F6] dark:bg-white/[0.02] dark:/[0.06] shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
                  {!isLocked && (
                    <Button
                      onClick={handleAddCampItem}
                      size="sm"
                      variant="ghost"
                      className="w-full h-10 dark:/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all gap-2 font-bold tracking-widest shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none"
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
      <div className="w-full bg-white dark:bg-slate-900/40 overflow-hidden flex-1 flex flex-col">


        <div className="w-full overflow-auto flex-1 min-h-0">
          <table className="w-full min-w-[760px] md:min-w-[1000px] text-sm text-left border-collapse">
            <thead className="text-stone-500 dark:text-slate-200 text-[10px] font-fira-code font-black uppercase tracking-[0.2em] sticky top-0 z-10 bg-[#FBF9F6]/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-stone-200 dark:border-slate-800 text-center">
              <tr>
                <th className="w-[16%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('PROP_USAGE')}</th>
                <th className="w-[16%] px-4 py-3 min-w-[100px] border-r border-stone-200 dark:border-slate-800">{t('PROP_NAME')}</th>
                <th className="w-[16%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('ASSIGNED_PERSONNEL')}</th>
                <th className="w-[28%] px-4 py-3 border-r border-stone-200 dark:border-slate-800">{t('MATERIALS')}</th>
                <th className="w-[12%] px-4 py-3 whitespace-nowrap border-r border-stone-200 dark:border-slate-800">{t('PACKED')}</th>
                <th className="w-[12%] px-4 py-3 whitespace-nowrap border-r border-stone-200 dark:border-slate-800">{t('CHECKED')}</th>
                {!isLocked && <th className="w-[10%] px-4 py-3 text-center">操作</th>}
              </tr>
            </thead>

            {/* 1. 活動組 */}
            <tbody>
              <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-orange-600 dark:text-amber-500 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">活動組 - 教案道具確認</td></tr>
              {Object.keys(activityGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold border-b border-stone-200 dark:border-slate-800">目前沒有活動組資料</td></tr>
              ) : Object.entries(activityGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`act-${plan.id}`} className={cn(
                    "group hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200 border-b border-stone-200 dark:border-slate-800 last:border-0",
                    plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-50/30 dark:bg-emerald-900/12" : "bg-white dark:bg-transparent"
                  )}>
                    {pIndex === 0 && (
                      <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top border-r border-stone-200 dark:border-slate-800 text-center">
                      {plan.activityName || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800 text-center">
                      {plan.members || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm border-r border-stone-200 dark:border-slate-800">
                      {plan.props.length > 0 ? (
                        <ul className="space-y-1.5 list-none">
                          {plan.props.map(prop => (
                            <li key={prop.id} className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{prop.name}</span>
                              <span className="text-orange-500 dark:text-amber-400 font-fira-code px-1.5 py-0.5 bg-orange-50 dark:bg-amber-400/10 rounded-md text-[10px] font-bold">× {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}</span>
                              {prop.remarks && <span className="text-slate-400 dark:text-slate-500 ml-1 text-[11px]">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic font-medium">無所需物品</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center flex-col items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 2. 教學組 */}
            <tbody>
              <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">教學組 - 教案道具確認</td></tr>
              {Object.keys(teachingGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold border-b border-stone-200 dark:border-slate-800">目前沒有教學組資料</td></tr>
              ) : Object.entries(teachingGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`tch-${plan.id}`} className={cn(
                    "group hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200 border-b border-stone-200 dark:border-slate-800 last:border-0",
                    plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-50/30 dark:bg-emerald-900/10" : "bg-white dark:bg-slate-900/20"
                  )}>
                    {pIndex === 0 && (
                      <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top border-r border-stone-200 dark:border-slate-800 text-center">
                      {plan.activityName || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800 text-center">
                      {plan.members || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm border-r border-stone-200 dark:border-slate-800">
                      {plan.props.length > 0 ? (
                        <ul className="space-y-1.5 list-none">
                          {plan.props.map(prop => (
                            <li key={prop.id} className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{prop.name}</span>
                              <span className="text-blue-500 dark:text-blue-400 font-fira-code px-1.5 py-0.5 bg-blue-50 dark:bg-blue-400/10 rounded-md text-[10px] font-bold">× {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}</span>
                              {prop.remarks && <span className="text-slate-400 dark:text-slate-500 ml-1 text-[11px]">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic font-medium">無所需物品</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center flex-col items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 3. 營期物品 */}
            <tbody>
              <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">營期其他物品確認</td></tr>
              {Object.keys(usageGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-slate-400 dark:text-slate-600 font-bold border-b border-stone-200 dark:border-slate-800">目前沒有營期物品資料</td></tr>
              ) : Object.entries(usageGroups).map(([usageName, items]) => (
                items.map((item, pIndex) => (
                  <tr key={`cmp-${item.id}`} className={cn(
                    "group hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200 border-b border-stone-200 dark:border-slate-800 last:border-0",
                    item.isChecked && item.isPacked ? "bg-emerald-50/30 dark:bg-emerald-900/10" : "bg-white dark:bg-slate-900/20"
                  )}>
                    {pIndex === 0 && (
                      <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top border-r border-stone-200 dark:border-slate-800" rowSpan={items.length}>
                        {isLocked ? (
                          usageName
                        ) : (
                          <PropInput
                            value={item.usage}
                            onChange={(v) => {
                              items.forEach(i => handleUpdateCampItem(i.id, { usage: v }));
                            }}
                            disabled={isLocked}
                            className="font-black text-slate-800 dark:text-slate-200 text-center"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 align-middle border-r border-stone-200 dark:border-slate-800">
                      <PropInput
                        value={item.name}
                        onChange={(v) => handleUpdateCampItem(item.id, { name: v })}
                        disabled={isLocked}
                        className="font-bold text-slate-700 dark:text-slate-300 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-400 dark:text-slate-600 align-middle border-r border-stone-200 dark:border-slate-800 text-center">
                      -
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-400 dark:text-slate-600 align-middle border-r border-stone-200 dark:border-slate-800 text-center">
                      -
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={item.isPacked || false}
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isPacked: c === true })}
                          className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle border-r border-stone-200 dark:border-slate-800">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={item.isChecked || false}
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isChecked: c === true })}
                          className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-3 text-center align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCampItem(item.id)}
                          className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          刪除
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ))}


              {/* Empty placeholder rows like Google Sheets */}
              {Array.from({ length: 25 }).map((_, i) => (
                <tr key={`empty-combined-${i}`} className="h-[46px] border-b border-stone-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/10 hover:bg-[#FBF9F6] dark:hover:bg-slate-800/20">
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  <td className="border-r border-stone-100 dark:border-slate-800/50 h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>
                  {!isLocked && <td className="h-[46px] min-h-[46px] p-0 m-0 leading-none text-transparent select-none">&nbsp;</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 bg-[#FBF9F6] dark:bg-white/[0.02] dark:/[0.06] shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
                  {!isLocked && (
                    <Button
                      onClick={handleAddCampItem}
                      size="sm"
                      variant="ghost"
                      className="w-full h-10 dark:/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all gap-2 font-bold tracking-widest shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none"
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
    <div className="flex flex-col bg-[#FBF9F6] dark:bg-[hsl(var(--bar-theme))] animate-in fade-in duration-500 relative transition-colors font-fira-sans min-h-screen">
      <main className="flex-1 min-w-0 w-full relative flex flex-col">
        <div className={cn("w-full pt-20 sm:pt-24 pb-8 md:pb-12 transition-all duration-300 flex-1 flex flex-col", activeMainTab === 'props' ? "px-0 pt-16 sm:pt-20 pb-0" : "px-4 sm:px-6 md:px-8 lg:px-10")}>
          <Tabs value={activeMainTab} onValueChange={handleMainTabChange} className={cn("w-full flex flex-col items-stretch flex-1", activeMainTab === 'props' ? "space-y-0" : "space-y-2 sm:space-y-6")}>
            <header className={cn("relative z-20 no-print w-full dark:/[0.06] transition-all duration-300", activeMainTab === 'props' ? "mb-0 pb-2 px-4 sm:px-6 md:px-8 lg:px-10" : "mb-2 sm:mb-16 pb-2 sm:pb-8")}>
              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 transition-colors">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A28] dark:text-white mb-1.5 sm:mb-2">
                    {t('ADMIN_TITLE')}
                  </h1>
                  <p className="text-stone-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs">Control Center // Operations</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isLocked) {
                      if (role === 'admin') setIsLocked(false);
                      else toast({ title: "權限不足", description: "僅管理員能解鎖行政中樞", variant: "destructive" });
                    } else {
                      setIsLocked(true);
                    }
                  }}
                  className={cn(
                    "hidden md:flex h-9 px-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-colors sm:bg-transparent sm:backdrop-blur-none sm:shadow-none",
                    isLocked
                      ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  )}
                >
                  {isLocked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Unlock className="h-3.5 w-3.5 mr-1" />}
                  {isLocked ? "已鎖定" : "已解鎖"}
                </Button>
              </div>
            </header>

            <ActionBar title="Admin Actions" className={cn("hidden md:!flex !flex-nowrap md:justify-center !items-center gap-2 overflow-x-auto scrollbar-hide", activeMainTab === 'props' && "px-4 sm:px-6 md:px-8")}>
              <div className="order-1 flex w-full items-center gap-2 md:gap-3 md:w-auto md:flex-row md:items-center md:flex-nowrap min-w-max">
                <TabsList className={cn("flex items-center p-1.5 rounded-xl shrink-0 h-9 w-auto max-w-full overflow-x-auto scrollbar-hide gap-1.5", actionBarTheme.clusterInset)}>
                  <TabsTrigger value="timer" className={actionBarTheme.tabTrigger}>
                    <Clock className="h-3 w-3" /> <span className="hidden md:inline">{t('TIMER_CONTROL')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="tables" className={actionBarTheme.tabTrigger}>
                    <TableIcon className="h-3 w-3" /> <span className="hidden md:inline">{t('ROTATION_TABLE')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="props" className={actionBarTheme.tabTrigger}>
                    <Package2 className="h-3 w-3" /> <span className="hidden md:inline">{t('PROPS_LIST')}</span>
                  </TabsTrigger>
                </TabsList>

                <div className={cn(actionBarTheme.separator, "hidden md:block mx-0.5")} />

                {activeMainTab === 'props' && (
                  <div className={cn("hidden md:flex items-center gap-1 p-1.5 rounded-xl h-9 w-full md:w-auto overflow-x-auto scrollbar-hide", actionBarTheme.clusterInset)}>
                    {['activity', 'teaching', 'all-props'].map((tab) => (
                      <button key={tab} onClick={() => setActivePropsTab(tab as typeof activePropsTab)} className={cn("px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activePropsTab === tab ? 'bg-stone-300/80 dark:bg-slate-700/80 text-stone-950 dark:text-white' : 'text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200')}>
                        {tab === 'activity' ? '活動' : tab === 'teaching' ? '教學' : '營期'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="order-2 ml-auto hidden md:flex w-full items-center justify-end gap-1.5 md:w-auto md:ml-0">
                <div className={cn(actionBarTheme.separator, "hidden md:block mx-0.5")} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        actionBarTheme.control,
                        "h-10 px-4 rounded-full font-black text-xs tracking-wide bg-stone-200/60 dark:bg-slate-800/70 hover:bg-stone-300/80 dark:hover:bg-slate-700/80"
                      )}
                      title="匯出"
                    >
                      <FileDown className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">匯出</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={8} className="w-44 bg-background dark:bg-slate-800 border-none rounded-xl p-1">
                    <DropdownMenuItem onSelect={handleExportExcel} className="cursor-pointer font-semibold">
                      匯出 Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handlePrint} className="cursor-pointer font-semibold">
                      列印 / Print
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className={cn(actionBarTheme.separator, "hidden md:block mx-0.5")} />

                <Button variant="ghost" size="icon" onClick={onUndoTable} disabled={!canUndoTable || isLocked} className={cn(actionBarTheme.control, actionBarTheme.controlIcon, actionBarTheme.controlElevated)}>
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onRedoTable} disabled={!canRedoTable || isLocked} className={cn(actionBarTheme.control, actionBarTheme.controlIcon, actionBarTheme.controlElevated)}>
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.3 || activeMainTab === 'timer'} className={cn(actionBarTheme.control, actionBarTheme.controlIcon, actionBarTheme.controlElevated)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleFitAll} disabled={activeMainTab === 'timer'} className={cn(actionBarTheme.control, actionBarTheme.controlIcon, actionBarTheme.controlElevated)}>
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 2 || activeMainTab === 'timer'} className={cn(actionBarTheme.control, actionBarTheme.controlIcon, actionBarTheme.controlElevated)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </ActionBar>

            {/* Mobile Floating Controls (Vertical Side Alignment) */}
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

              <FabStagger className="fixed bottom-20 right-2 z-[65] flex flex-col items-end gap-3 pointer-events-none [&>*]:pointer-events-auto">
                
                {/* Export FAB */}
                <div className="relative flex items-center justify-end">
                  <AnimatePresence>
                    {activeFab === 'export' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-14 bg-background/95 backdrop-blur-xl border border-stone-200/60 dark:border-slate-700/60 rounded-xl shadow-xl p-1 flex flex-col w-44"
                      >
                        <button onClick={() => { handleExportExcel(); setActiveFab(null); }} className="px-4 py-3 text-left font-semibold text-sm rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors text-stone-700 dark:text-slate-200">
                          匯出 Excel (.xlsx)
                        </button>
                        <button onClick={() => { handlePrint(); setActiveFab(null); }} className="px-4 py-3 text-left font-semibold text-sm rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors text-stone-700 dark:text-slate-200">
                          列印 / Print
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveFab(activeFab === 'export' ? null : 'export')}
                    className={cn(
                      "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none",
                      activeFab === 'export' ? "bg-stone-200/90 dark:bg-slate-700/90 border-transparent ring-2 ring-orange-500/50" : "bg-white/90 dark:bg-slate-800/90 border-stone-200/50 dark:border-slate-700/50"
                    )}
                    title="匯出"
                  >
                    <FileDown className="h-5 w-5 text-stone-700 dark:text-slate-300" />
                  </motion.button>
                </div>

                {/* Tools FAB */}
                {activeMainTab !== 'timer' && (
                  <div className="relative flex items-center justify-end">
                    <AnimatePresence>
                      {activeFab === 'tools' && (
                        <motion.div
                          initial={{ opacity: 0, x: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 10, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="absolute right-14 bg-background/95 backdrop-blur-xl border border-stone-200/60 dark:border-slate-700/60 rounded-xl shadow-xl p-2 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { onUndoTable?.(); setActiveFab(null); }} disabled={!canUndoTable || isLocked} className="h-10 w-10 rounded-full">
                              <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { onRedoTable?.(); setActiveFab(null); }} disabled={!canRedoTable || isLocked} className="h-10 w-10 rounded-full">
                              <Redo2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="h-px w-full bg-stone-200 dark:bg-slate-700 my-1" />
                          <div className="flex items-center justify-between gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { handleZoomOut(); setActiveFab(null); }} disabled={zoom <= 0.3} className="h-10 w-10 rounded-full">
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { handleFitAll(); setActiveFab(null); }} className="h-10 w-10 rounded-full">
                              <Maximize className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { handleZoomIn(); setActiveFab(null); }} disabled={zoom >= 2} className="h-10 w-10 rounded-full">
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveFab(activeFab === 'tools' ? null : 'tools')}
                      className={cn(
                        "h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none",
                        activeFab === 'tools' ? "bg-stone-200/90 dark:bg-slate-700/90 border-transparent ring-2 ring-orange-500/50" : "bg-white/90 dark:bg-slate-800/90 border-stone-200/50 dark:border-slate-700/50"
                      )}
                      title="工具"
                    >
                      <MoreHorizontal className="h-5 w-5 text-stone-700 dark:text-slate-300" />
                    </motion.button>
                  </div>
                )}

                <div className="h-px w-6 bg-stone-200 dark:bg-slate-700 my-1 mr-2.5" />

                {/* Main Tabs as vertical FABs */}
                <div className="relative flex items-center justify-end w-full">
                  <AnimatePresence>
                    {activeMainTab === 'props' && activeFab === 'props' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-14 bg-background/95 backdrop-blur-xl border border-stone-200/60 dark:border-slate-700/60 rounded-full shadow-lg p-1 flex items-center gap-1"
                      >
                        {['activity', 'teaching', 'all-props'].map((tab) => (
                          <button
                            key={`mobile-${tab}`}
                            onClick={() => { setActivePropsTab(tab as typeof activePropsTab); setActiveFab(null); }}
                            className={cn(
                              "px-4 h-9 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap focus:outline-none",
                              activePropsTab === tab
                                ? 'bg-stone-300/80 dark:bg-slate-700/80 text-stone-950 dark:text-white'
                                : 'text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200'
                            )}
                          >
                            {tab === 'activity' ? '活動' : tab === 'teaching' ? '教學' : '營期'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { handleMainTabChange('props'); setActiveFab(activeFab === 'props' ? null : 'props'); }} 
                    className={cn("h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none", 
                      activeMainTab === 'props' 
                        ? 'bg-stone-300/90 dark:bg-slate-700/90 border-transparent text-stone-900 dark:text-white ring-2 ring-stone-400 dark:ring-slate-500 ring-offset-1 ring-offset-background' 
                        : 'bg-white/90 dark:bg-slate-800/90 border-stone-200/50 dark:border-slate-700/50 text-stone-500 dark:text-slate-400')}
                  >
                    <Package2 className="h-5 w-5" />
                  </motion.button>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { handleMainTabChange('tables'); setActiveFab(null); }} 
                  className={cn("h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none", 
                    activeMainTab === 'tables' 
                      ? 'bg-stone-300/90 dark:bg-slate-700/90 border-transparent text-stone-900 dark:text-white ring-2 ring-stone-400 dark:ring-slate-500 ring-offset-1 ring-offset-background' 
                      : 'bg-white/90 dark:bg-slate-800/90 border-stone-200/50 dark:border-slate-700/50 text-stone-500 dark:text-slate-400')}
                >
                  <TableIcon className="h-5 w-5" />
                </motion.button>

                {/* Lock FAB */}
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (isLocked) {
                      if (role === 'admin') setIsLocked(false);
                      else toast({ title: "權限不足", description: "僅管理員能解鎖", variant: "destructive" });
                    } else {
                      setIsLocked(true);
                    }
                    setActiveFab(null);
                  }} 
                  className={cn("h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none", 
                    isLocked 
                      ? 'bg-rose-50/90 dark:bg-rose-950/90 border-rose-200/50 dark:border-rose-800/50 text-rose-600 dark:text-rose-400' 
                      : 'bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400')}
                >
                  {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                </motion.button>

                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { handleMainTabChange('timer'); setActiveFab(null); }} 
                  className={cn("h-11 w-11 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-colors relative z-10 focus:outline-none", 
                    activeMainTab === 'timer' 
                      ? 'bg-stone-300/90 dark:bg-slate-700/90 border-transparent text-stone-900 dark:text-white ring-2 ring-stone-400 dark:ring-slate-500 ring-offset-1 ring-offset-background' 
                      : 'bg-white/90 dark:bg-slate-800/90 border-stone-200/50 dark:border-slate-700/50 text-stone-500 dark:text-slate-400')}
                >
                  <Clock className="h-5 w-5" />
                </motion.button>

              </FabStagger>
            </div>

            <div className="w-full flex-1 relative">
              <TabsContent value="timer" className="m-0 h-full w-full">
                <AdminTimer
                  timer={timer}
                  isLocked={isLocked}
                  autoEnterSaverMode={shouldAutoEnterSaver}
                />
              </TabsContent>

              <TabsContent value="tables" className="m-0 data-[state=active]:flex flex-col space-y-6 md:space-y-8 pb-32">
                <div className="bg-orange-50/20 dark:bg-slate-900/50 rounded-2xl dark:/[0.06] p-4 shrink-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mt-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-orange-400 dark:text-slate-500 shrink-0" />
                      <span className="text-[9px] font-fira-code font-black text-slate-500 dark:text-slate-400 tracking-widest hidden sm:inline">天數</span>
                    </div>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger className="w-32 h-8 rounded-lg font-fira-code font-black text-[10px] dark:/[0.12] bg-white dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
                        <SelectValue placeholder="選擇" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl dark:/[0.12] shadow-2xl dark:bg-slate-800 dark:text-slate-200 font-fira-code">
                        {dayOptions.map(day => (
                          <SelectItem key={day} value={day} className="rounded-lg font-bold text-xs dark:focus:bg-slate-700">{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!isLocked && (
                    <Button onClick={() => onAddTable(selectedDay)} className="rounded-xl font-black gap-2 h-8 px-5 bg-orange-600 dark:bg-amber-400 text-white dark:text-[#2C2A28] hover:opacity-90 transition-all text-[10px] tracking-widest shadow-lg shadow-orange-600/20 dark:shadow-none">
                      <Plus className="h-3 w-3" /> 新增
                    </Button>
                  )}
                </div>

                <div
                  className="w-full flex flex-col space-y-12"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="w-full space-y-12"
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
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-800/50 flex items-center justify-center text-orange-200 dark:text-slate-600 dark:/[0.12]/50 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
                          <TableIcon className="h-6 w-6" />
                        </div>
                        <p className="text-[10px] font-fira-code font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">目前無資料</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="props" className="m-0 data-[state=active]:flex flex-col flex-1 min-h-0 pb-0">
                <div
                  className="w-full flex-1 flex flex-col"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="w-full flex-1 flex flex-col"
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

    </div>
  );
}
