"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { RotationTableData, LessonPlan, PropItem, Camp, CampItem } from "@/types/plan";
import { AdminTimer } from "@/components/AdminTimer";
import { AdminRotationTable } from "@/components/AdminRotationTable";
import { Button } from "@/components/ui/button";
import { Clock, Table as TableIcon, Plus, Lock, Unlock, Calendar, Undo2, Redo2, Package2, ZoomIn, ZoomOut, Maximize, MoreHorizontal } from "lucide-react";
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
import { useTranslation } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ActionBar } from "@/components/ActionBar";
import { usePathname, useSearchParams } from "next/navigation";

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

 // Unlock feature removed as everything is open by default

 const filteredTables = useMemo(() => {
 return tables.filter(t => (t.day || "Day 1") === selectedDay);
 }, [tables, selectedDay]);

 const dayOptions = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

 const teachingPlans = plans.filter(p => p.category === 'teaching').sort((a, b) => a.order - b.order);
 const activityPlans = plans.filter(p => p.category === 'activity').sort((a, b) => a.order - b.order);

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
 const activityPropsFlattened = activityPlans.flatMap(plan => 
 plan.props.map(prop => ({ plan, prop }))
 );
 const teachingPropsFlattened = teachingPlans.flatMap(plan => 
 plan.props.map(prop => ({ plan, prop }))
 );
 
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

 const renderPropTable = (title: string, propItems: { plan: LessonPlan; prop: PropItem }[]) => {
 // Group props by schedule category
 const propGroups = propItems.reduce((acc, item) => {
 const cat = item.plan.scheduledName || '未分類 / Uncategorized';
 if (!acc[cat]) { acc[cat] = []; }
 acc[cat].push(item);
 return acc;
 }, {} as Record<string, { plan: LessonPlan; prop: PropItem }[]>);

 return (
 <div className="w-full bg-white dark:bg-[hsl(var(--bar-theme-))] rounded-2xl dark:/[0.08] overflow-hidden mb-8 transition-colors shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] border-none">
 <div className="py-3 px-4 flex justify-between items-center dark:/[0.08] bg-[#FBF9F6] dark:bg-black/20">
 <h2 className="font-fira-code font-black text-[#2C2A28] dark:text-slate-100 tracking-[0.1em] uppercase text-sm">{title}</h2>
 </div>
 
 <div className="w-full overflow-x-auto touch-pan-x touch-pan-y overscroll-x-contain">
 <table className="w-full text-sm text-left  table-fixed">
 <thead className="text-stone-500 dark:text-slate-200 text-[10px] font-fira-code font-black uppercase tracking-[0.2em] sticky top-0 bg-white/90 dark:bg-black/20 backdrop-blur-xl z-10 dark:/[0.08] shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <tr>
 <th className="w-[12%] px-4 py-3  dark:/[0.06]">{t('CATEGORY')}</th>
 <th className="w-[14%] px-4 py-3  dark:/[0.06]">{t('SUBJECT')}</th>
 <th className="w-[12%] px-4 py-3  dark:/[0.06]">{t('ASSIGNED_PERSONNEL')}</th>
 <th className="w-[16%] px-4 py-3  dark:/[0.06] min-w-[100px]  dark:/[0.06]">{t('PROP_NAME')}</th>
 <th className="w-[8%] px-4 py-3  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">Qty</th>
 <th className="w-[8%] px-4 py-3  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">Unit</th>
 <th className="w-[16%] px-4 py-3  dark:/[0.06] min-w-[100px]  dark:/[0.06]">{t('OP_REMARKS')}</th>
 <th className="w-[7%] px-4 py-3 text-center  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">{t('PACKED')}</th>
 <th className="w-[7%] px-4 py-3 text-center  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">{t('CHECKED')}</th>
 </tr>
 </thead>
 <tbody>
 {Object.keys(propGroups).length === 0 ? (
 <tr><td colSpan={9} className="text-center py-12 text-slate-500 dark:text-slate-600 font-bold">目前沒有任何道具資料</td></tr>
 ) : null}
 
 {Object.entries(propGroups).map(([categoryName, items], gIndex) => {
 // To merge rows correctly within a category, group by plan ID
 const plansInGroup = items.reduce((acc, item) => {
 if (!acc[item.plan.id]) { acc[item.plan.id] = []; }
 acc[item.plan.id].push(item);
 return acc;
 }, {} as Record<string, { plan: LessonPlan; prop: PropItem }[]>);

 return Object.entries(plansInGroup).map(([planId, planItems], pIndex) => (
 planItems.map((item, iIndex) => {
 const isFirstInGroup = pIndex === 0 && iIndex === 0;
 const isFirstInPlan = iIndex === 0;

 return (
 <tr key={`${item.plan.id}-${item.prop.id}`} className={cn(
 "group  dark:/[0.06] hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200",
 item.prop.isFromClub && item.prop.isToPurchase ? "bg-emerald-50/30 dark:bg-emerald-900/12" : "bg-white dark:bg-transparent"
 )}>
 {isFirstInGroup && (
 <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top  dark:/[0.06]" rowSpan={items.length}>
 {categoryName}
 </td>
 )}
 {isFirstInPlan && (
 <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top  dark:/[0.06]" rowSpan={planItems.length}>
 {item.plan.activityName || '-'}
 </td>
 )}
 {isFirstInPlan && (
 <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top  dark:/[0.06]" rowSpan={planItems.length}>
 {item.plan.members || '-'}
 </td>
 )}
 <td className="px-2 py-2 align-middle  dark:/[0.06]">
 <PropInput 
 value={item.prop.name}
 onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { name: v })}
 disabled={isLocked}
 className="font-medium text-slate-700 dark:text-slate-200"
 />
 </td>
 <td className="px-2 py-2 align-middle  dark:/[0.06]">
 <PropInput 
 value={item.prop.quantity}
 onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { quantity: v })}
 disabled={isLocked}
 className="text-center font-fira-code font-bold text-slate-700 dark:text-slate-200"
 />
 </td>
 <td className="px-2 py-2 align-middle  dark:/[0.06]">
 <PropInput 
 value={item.prop.unit === 'custom' ? '' : item.prop.unit}
 onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { unit: v })}
 disabled={isLocked}
 className="text-center text-slate-600 dark:text-slate-400"
 />
 </td>
 <td className="px-2 py-2 align-middle  dark:/[0.06]">
 <PropInput 
 value={item.prop.remarks || ''}
 onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { remarks: v })}
 disabled={isLocked}
 className="text-slate-500 dark:text-slate-400"
 />
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center items-center h-full">
 <Checkbox 
 checked={item.prop.isFromClub || false} 
 disabled={isLocked}
 onCheckedChange={(c) => handleUpdatePropItem(item.plan.id, item.prop.id, { isFromClub: c === true })}
 className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
 />
 </div>
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center items-center h-full">
 <Checkbox 
 checked={item.prop.isToPurchase || false} 
 disabled={isLocked}
 onCheckedChange={(c) => handleUpdatePropItem(item.plan.id, item.prop.id, { isToPurchase: c === true })}
 className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
 />
 </div>
 </td>
 </tr>
 );
 })
 ));
 })}
 
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
 <div className="w-full bg-white dark:bg-[hsl(var(--bar-theme-))] rounded-2xl dark:/[0.08] overflow-hidden mb-8 transition-colors shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] border-none">
 <div className="py-3 px-4 flex justify-between items-center dark:/[0.08] bg-[#FBF9F6] dark:bg-black/20">
 <h2 className="text-center font-fira-code font-black text-[#2C2A28] dark:text-slate-100 tracking-[0.1em] uppercase text-sm">{t('PROPS_LIST')}</h2></div>
 
 <div className="w-full overflow-x-auto touch-pan-x touch-pan-y overscroll-x-contain">
 <table className="w-full text-sm text-left  table-fixed">
 <thead className="text-stone-500 dark:text-slate-200 text-[10px] font-fira-code font-black uppercase tracking-[0.2em] sticky top-0 z-10 bg-white/90 dark:bg-black/20 backdrop-blur-xl dark:/[0.08] shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <tr>
 <th className="w-[16%] px-4 py-3  dark:/[0.06]">{t('PROP_USAGE')}</th>
 <th className="w-[16%] px-4 py-3  dark:/[0.06] min-w-[100px]  dark:/[0.06]">{t('PROP_NAME')}</th>
 <th className="w-[16%] px-4 py-3  dark:/[0.06]">{t('ASSIGNED_PERSONNEL')}</th>
 <th className="w-[28%] px-4 py-3  dark:/[0.06]">{t('MATERIALS')}</th>
 <th className="w-[12%] px-4 py-3 text-center  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">{t('PACKED')}</th>
 <th className="w-[12%] px-4 py-3 text-center  dark:/[0.06] whitespace-nowrap  dark:/[0.06]">{t('CHECKED')}</th>
 {!isLocked && <th className="w-[10%] px-4 py-3 text-center  dark:/[0.06]">操作</th>}
 </tr>
 </thead>
 
 {/* 1. 活動組 */}
 <tbody>
 <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-orange-600 dark:text-amber-500 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">活動組 - 教案道具確認</td></tr>
 {Object.keys(activityGroups).length === 0 ? (
 <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold  dark:/[0.06]">目前沒有活動組資料</td></tr>
 ) : Object.entries(activityGroups).map(([categoryName, catePlans]) => (
 catePlans.map((plan, pIndex) => (
 <tr key={`act-${plan.id}`} className={cn(
 "group  dark:/[0.06] hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200",
 plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-50/30 dark:bg-emerald-900/12" : "bg-white dark:bg-transparent"
 )}>
 {pIndex === 0 && (
 <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top  dark:/[0.06]" rowSpan={catePlans.length}>
 {categoryName}
 </td>
 )}
 <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top  dark:/[0.06]">
 {plan.activityName || '-'}
 </td>
 <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top  dark:/[0.06]">
 {plan.members || '-'}
 </td>
 <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm  dark:/[0.06]">
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
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center items-center h-full">
 <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
 </div>
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center flex-col items-center h-full">
 <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
 </div>
 </td>
 {!isLocked && <td className="px-4 py-3 text-center align-middle  dark:/[0.06]"></td>}
 </tr>
 ))
 ))}
 </tbody>

 {/* 2. 教學組 */}
 <tbody>
 <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">教學組 - 教案道具確認</td></tr>
 {Object.keys(teachingGroups).length === 0 ? (
 <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold  dark:/[0.06]">目前沒有教學組資料</td></tr>
 ) : Object.entries(teachingGroups).map(([categoryName, catePlans]) => (
 catePlans.map((plan, pIndex) => (
 <tr key={`tch-${plan.id}`} className={cn(
 "group  dark:/[0.06] hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200",
 plan.isPreDepartureChecked && plan.isPropsPacked ? "bg-emerald-50/30 dark:bg-emerald-900/10" : "bg-white dark:bg-slate-900/20"
 )}>
 {pIndex === 0 && (
 <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top  dark:/[0.06]" rowSpan={catePlans.length}>
 {categoryName}
 </td>
 )}
 <td className="px-4 py-3 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 align-top  dark:/[0.06]">
 {plan.activityName || '-'}
 </td>
 <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 align-top  dark:/[0.06]">
 {plan.members || '-'}
 </td>
 <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm  dark:/[0.06]">
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
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center items-center h-full">
 <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
 </div>
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center flex-col items-center h-full">
 <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500" />
 </div>
 </td>
 {!isLocked && <td className="px-4 py-3 text-center align-middle  dark:/[0.06]"></td>}
 </tr>
 ))
 ))}
 </tbody>

 {/* 3. 營期物品 */}
 <tbody>
 <tr><td colSpan={isLocked ? 6 : 7} className="px-4 py-4 font-fira-code font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm uppercase tracking-widest bg-transparent  dark:/[0.06]">營期其他物品確認</td></tr>
 {Object.keys(usageGroups).length === 0 ? (
 <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-slate-400 dark:text-slate-600 font-bold  dark:/[0.06]">目前沒有營期物品資料</td></tr>
 ) : Object.entries(usageGroups).map(([usageName, items]) => (
 items.map((item, pIndex) => (
 <tr key={`cmp-${item.id}`} className={cn(
 "group  dark:/[0.06] hover:bg-[#FBF9F6] dark:hover:bg-[#FBF9F6]/[0.04] transition-colors duration-200",
 item.isChecked && item.isPacked ? "bg-emerald-50/30 dark:bg-emerald-900/10" : "bg-white dark:bg-slate-900/20"
 )}>
 {pIndex === 0 && (
 <td className="px-4 py-3 font-fira-code font-black text-xs sm:text-sm text-slate-800 dark:text-slate-400 align-top  dark:/[0.06]" rowSpan={items.length}>
 {isLocked ? (
 usageName
 ) : (
 <PropInput
 value={item.usage}
 onChange={(v) => {
 items.forEach(i => handleUpdateCampItem(i.id, { usage: v }));
 }}
 disabled={isLocked}
 className="font-black text-slate-800 dark:text-slate-200"
 />
 )}
 </td>
 )}
 <td className="px-4 py-3 align-middle  dark:/[0.06]">
 <PropInput 
 value={item.name}
 onChange={(v) => handleUpdateCampItem(item.id, { name: v })}
 disabled={isLocked}
 className="font-bold text-slate-700 dark:text-slate-300"
 />
 </td>
 <td className="px-4 py-3 text-xs sm:text-sm text-slate-400 dark:text-slate-600 align-middle  dark:/[0.06]">
 -
 </td>
 <td className="px-4 py-3 text-xs sm:text-sm text-slate-400 dark:text-slate-600 align-middle  dark:/[0.06]">
 -
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
 <div className="flex justify-center items-center h-full">
 <Checkbox 
 checked={item.isPacked || false} 
 disabled={isLocked}
 onCheckedChange={(c) => handleUpdateCampItem(item.id, { isPacked: c === true })}
 className="h-5 w-5 dark:data-[state=checked]:bg-emerald-500"
 />
 </div>
 </td>
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
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
 <td className="px-4 py-3 text-center align-middle  dark:/[0.06]">
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
 <main className="flex-1 min-w-0 w-full relative">
 <div className="w-full pt-28 sm:pt-24 px-4 sm:px-6 md:px-8 lg:px-10 pb-8 md:pb-12">
 <Tabs value={activeMainTab} onValueChange={handleMainTabChange} className="w-full flex flex-col items-stretch space-y-6">
 <header className="relative z-20 no-print w-full mb-8 sm:mb-16 dark:/[0.06] pb-6 sm:pb-8">
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
 "fixed right-3 top-[calc(env(safe-area-inset-top)+104px)] z-[70] h-9 px-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-colors bg-[#FBF9F6]/95 backdrop-blur-sm shadow-[0_8px_30px_rgba(140,120,100,0.08)] sm:static sm:top-auto sm:right-auto sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:shadow-none",
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

 <ActionBar title="Admin Actions" className="md:justify-end">
 <div className="flex w-full flex-wrap items-center justify-start gap-2 md:gap-3 md:w-auto md:flex-nowrap md:mr-auto">
 <TabsList className="bg-stone-100 dark:bg-slate-800/50 p-1 rounded-xl h-10 w-full sm:w-auto justify-start shadow-none grid grid-cols-3 md:flex">
 <TabsTrigger value="timer" className="rounded-lg font-bold text-[10px] gap-1.5 px-3 md:px-4 tracking-widest uppercase h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-none data-[state=active]:text-orange-600 dark:data-[state=active]:text-amber-400 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <Clock className="h-3 w-3" /> <span className="hidden md:inline">{t('TIMER_CONTROL')}</span>
 </TabsTrigger>
 <TabsTrigger value="tables" className="rounded-lg font-bold text-[10px] gap-1.5 px-3 md:px-4 tracking-widest uppercase h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-none data-[state=active]:text-orange-600 dark:data-[state=active]:text-amber-400 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <TableIcon className="h-3 w-3" /> <span className="hidden md:inline">{t('ROTATION_TABLE')}</span>
 </TabsTrigger>
 <TabsTrigger value="props" className="rounded-lg font-bold text-[10px] gap-1.5 px-3 md:px-4 tracking-widest uppercase h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-none data-[state=active]:text-orange-600 dark:data-[state=active]:text-amber-400 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <Package2 className="h-3 w-3" /> <span className="hidden md:inline">{t('PROPS_LIST')}</span>
 </TabsTrigger>
 </TabsList>

 {activeMainTab === 'props' && (
 <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-slate-800/50 rounded-xl h-9">
 {['activity', 'teaching', 'all-props'].map((tab) => (
 <button key={tab} onClick={() => setActivePropsTab(tab as typeof activePropsTab)} className={cn("px-3 h-7 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activePropsTab === tab ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
 {tab === 'activity' ? '活動' : tab === 'teaching' ? '教學' : '營期'}
 </button>
 ))}
 </div>
 )}
 </div>

 <Button variant="ghost" size="sm" onClick={handlePrint} className="h-9 px-3 rounded-lg font-bold text-xs bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 匯出 / PRINT
 </Button>
 <Button variant="ghost" size="icon" onClick={onUndoTable} disabled={!canUndoTable || isLocked} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 <Undo2 className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={onRedoTable} disabled={!canRedoTable || isLocked} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 <Redo2 className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.3 || activeMainTab === 'timer'} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 <ZoomOut className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={handleFitAll} disabled={activeMainTab === 'timer'} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 <Maximize className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 2 || activeMainTab === 'timer'} className="h-9 w-9 rounded-lg bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 transition-opacity">
 <ZoomIn className="h-4 w-4" />
 </Button>
 </ActionBar>

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

 <TabsContent value="props" className="m-0 data-[state=active]:flex flex-col pb-32">
 <div
 className="w-full"
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 >
 <div
 className="w-full space-y-8"
 style={{ zoom }}
 >
 <div className={cn("transition-opacity duration-300", isLocked ? "opacity-90" : "opacity-100")}>
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
