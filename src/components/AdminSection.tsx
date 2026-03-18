"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { RotationTableData, LessonPlan, PropItem, Camp, CampItem } from "@/types/plan";
import { AdminTimer } from "@/components/AdminTimer";
import { AdminRotationTable } from "@/components/AdminRotationTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, Unlock, Calendar, Undo2, Redo2, Package2, ZoomIn, ZoomOut, RotateCcw, Layout, FileText, Sparkles, Clock, Table as TableIcon, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDialog } from "@/components/AdminDialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  const [isLocked, setIsLocked] = useState(true);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("Day 1");
  const [activePropsTab, setActivePropsTab] = useState<'activity' | 'teaching' | 'all-props'>('activity');

  // Zoom state for props list
  const [propsZoom, setPropsZoom] = useState(1);
  const propsContainerRef = useRef<HTMLDivElement>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const handleZoomIn = useCallback(() => {
    setPropsZoom(z => Math.min(z + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPropsZoom(z => Math.max(z - 0.1, 0.3));
  }, []);

  const handleZoomReset = useCallback(() => {
    setPropsZoom(1);
  }, []);

  // Pinch-to-zoom gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = propsZoom;
    }
  }, [propsZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scale = currentDist / pinchStartDistRef.current;
      const newZoom = Math.min(2, Math.max(0.3, pinchStartZoomRef.current * scale));
      setPropsZoom(newZoom);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchStartDistRef.current = null;
  }, []);

  // Ctrl+Wheel zoom
  useEffect(() => {
    const container = propsContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setPropsZoom(z => Math.min(2, Math.max(0.3, z + delta)));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleUnlockClick = () => {
    if (isLocked) {
      setIsAdminDialogOpen(true);
    } else {
      setIsLocked(true);
    }
  };

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
        className={cn("h-8 md:h-10 px-2 text-xs sm:text-sm bg-transparent hover:bg-white focus:bg-white transition-all shadow-none focus:shadow-sm font-medium", disabled ? "border-transparent text-slate-800 opacity-100 placeholder:text-transparent" : "border-transparent hover:border-slate-200 focus:border-orange-400", className)}
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
      <Card className="glass-card rounded-[2.5rem] border-none overflow-hidden mb-12 shadow-2xl shadow-primary/5">
        <div className="bg-gradient-to-r from-primary via-primary to-secondary py-5 px-8 flex justify-between items-center">
          <h2 className="font-headline font-black text-white tracking-widest uppercase text-lg flex items-center gap-3">
             <Package2 className="w-5 h-5" />
             {title}
          </h2>
        </div>
      
        <div className="w-full overflow-x-auto touch-pan-x touch-pan-y scrollbar-hide overscroll-x-contain">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="bg-orange-50/80 text-orange-900 text-[11px] sm:text-xs font-black uppercase">
              <tr>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 min-w-[100px] border-b border-b-orange-200/80">遊戲類別</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[120px]">名稱</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[100px]">關主</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[200px]">項目名稱 / Item Name</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[80px]">數量 / Qty</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[80px]">單位 / Unit</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 border-b border-b-orange-200/80 min-w-[200px]">備註 / Remarks</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 bg-orange-100/60 min-w-[100px] text-center border-b border-b-orange-200/80">社團本身就有</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-orange-200/50 bg-orange-100/60 min-w-[80px] text-center border-b border-b-orange-200/80">購買</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(propGroups).length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500 font-bold">目前沒有任何道具資料</td></tr>
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
                      <tr key={`${item.plan.id}-${item.prop.id}`} className="border-b border-slate-100 hover:bg-orange-50/30 transition-colors">
                        {isFirstInGroup && (
                          <td className="px-2 md:px-4 py-2 md:py-3 font-black text-xs sm:text-sm text-slate-800 border-r border-orange-100 align-top bg-orange-50/40" rowSpan={items.length}>
                            {categoryName}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-2 md:px-4 py-2 md:py-3 font-bold text-xs sm:text-sm text-slate-700 border-r border-slate-200 align-top" rowSpan={planItems.length}>
                            {item.plan.activityName || '-'}
                          </td>
                        )}
                        {isFirstInPlan && (
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs sm:text-sm text-slate-600 border-r border-slate-200 align-top" rowSpan={planItems.length}>
                            {item.plan.members || '-'}
                          </td>
                        )}
                        <td className="px-1 md:px-2 py-1 md:py-2 border-r border-slate-200 align-middle">
                          <PropInput 
                            value={item.prop.name}
                            onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { name: v })}
                            disabled={isLocked}
                            className="font-medium text-slate-700"
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-200 align-middle">
                           <PropInput 
                            value={item.prop.quantity}
                            onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { quantity: v })}
                            disabled={isLocked}
                            className="text-center text-slate-600"
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-200 align-middle">
                           <PropInput 
                            value={item.prop.unit === 'custom' ? '' : item.prop.unit}
                            onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { unit: v })}
                            disabled={isLocked}
                            className="text-center text-slate-600"
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-200 align-middle">
                           <PropInput 
                            value={item.prop.remarks || ''}
                            onChange={(v) => handleUpdatePropItem(item.plan.id, item.prop.id, { remarks: v })}
                            disabled={isLocked}
                            className="text-slate-500"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-slate-200 text-center align-middle">
                          <div className="flex justify-center items-center h-full">
                            <Checkbox 
                              checked={item.prop.isFromClub || false} 
                              disabled={isLocked}
                              onCheckedChange={(c) => handleUpdatePropItem(item.plan.id, item.prop.id, { isFromClub: c === true })}
                              className="h-5 w-5 border-2 border-slate-400"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <div className="flex justify-center items-center h-full">
                            <Checkbox 
                              checked={item.prop.isToPurchase || false} 
                              disabled={isLocked}
                              onCheckedChange={(c) => handleUpdatePropItem(item.plan.id, item.prop.id, { isToPurchase: c === true })}
                              className="h-5 w-5 border-2 border-slate-400"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ));
              })}
            </tbody>
          </table>
        </div>
      </Card>
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
      <Card className="glass-card rounded-[2.5rem] border-none overflow-hidden mb-12 shadow-2xl shadow-primary/5">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 py-5 px-8 flex justify-between items-center">
          <h2 className="font-headline font-black text-white tracking-widest uppercase text-lg flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary" />
            活動、教學與營期物品總表
          </h2>
          {!isLocked && (
            <Button 
               onClick={handleAddCampItem}
               size="sm" 
               className="h-10 px-6 bg-primary text-white hover:bg-primary/90 border-0 rounded-2xl shadow-xl shadow-primary/20 font-black text-[10px] tracking-widest uppercase"
            >
              <Plus className="h-4 w-4 mr-2" /> 新增營期物品
            </Button>
          )}
        </div>
        
        <div className="w-full overflow-x-auto touch-pan-x touch-pan-y scrollbar-hide overscroll-x-contain">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 text-[11px] sm:text-xs font-black uppercase">
              <tr>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 min-w-[120px] border-b border-slate-200">類別 / 用途</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 border-b border-slate-200 min-w-[150px]">名稱</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 border-b border-slate-200 min-w-[120px]">關主 / 負責人</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 border-b border-slate-200 min-w-[200px]">道具細項</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 bg-orange-50/80 text-orange-800 min-w-[120px] text-center border-b border-slate-200">是否齊全與裝袋</th>
                <th className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 bg-emerald-50/80 text-emerald-800 min-w-[120px] text-center border-b border-slate-200">出發前確認</th>
                {!isLocked && <th className="px-2 md:px-4 py-2 md:py-3 w-16 border-b border-slate-200 text-center">操作</th>}
              </tr>
            </thead>
            
            {/* 1. 活動組 */}
            <tbody>
              <tr className="bg-orange-100/50"><td colSpan={isLocked ? 6 : 7} className="px-4 py-2 font-black text-orange-800 text-sm">1. 活動組 - 教案道具確認</td></tr>
              {Object.keys(activityGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-slate-400 font-bold">目前沒有活動教案</td></tr>
              ) : Object.entries(activityGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`act-${plan.id}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {pIndex === 0 && (
                      <td className="px-2 md:px-4 py-2 md:py-3 font-black text-xs sm:text-sm text-slate-800 border-r border-slate-200 align-top" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-2 md:px-4 py-2 md:py-3 font-bold text-xs sm:text-sm text-slate-700 border-r border-slate-200 align-top">
                      {plan.activityName || '-'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-xs sm:text-sm text-slate-600 border-r border-slate-200 align-top">
                      {plan.members || '-'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-slate-600 border-r border-slate-200 text-xs sm:text-sm">
                      {plan.props.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {plan.props.map(prop => (
                            <li key={prop.id}>
                              <span className="font-bold text-slate-800">{prop.name}</span> * {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}
                              {prop.remarks && <span className="text-slate-400 ml-1">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic font-medium">無所需物品</span>
                      )}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 border-2" />
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center flex-col items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 border-2" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle border-l border-slate-200"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 2. 教學組 */}
            <tbody>
              <tr className="bg-blue-100/50"><td colSpan={isLocked ? 6 : 7} className="px-4 py-2 font-black text-blue-800 text-sm">2. 教學組 - 教案道具確認</td></tr>
              {Object.keys(teachingGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-slate-400 font-bold">目前沒有教學教案</td></tr>
              ) : Object.entries(teachingGroups).map(([categoryName, catePlans]) => (
                catePlans.map((plan, pIndex) => (
                  <tr key={`tch-${plan.id}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {pIndex === 0 && (
                      <td className="px-2 md:px-4 py-2 md:py-3 font-black text-xs sm:text-sm text-slate-800 border-r border-slate-200 align-top" rowSpan={catePlans.length}>
                        {categoryName}
                      </td>
                    )}
                    <td className="px-2 md:px-4 py-2 md:py-3 font-bold text-xs sm:text-sm text-slate-700 border-r border-slate-200 align-top">
                      {plan.activityName || '-'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-xs sm:text-sm text-slate-600 border-r border-slate-200 align-top">
                      {plan.members || '-'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-slate-600 border-r border-slate-200 text-xs sm:text-sm">
                      {plan.props.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {plan.props.map(prop => (
                            <li key={prop.id}>
                              <span className="font-bold text-slate-800">{prop.name}</span> * {prop.quantity} {prop.unit === 'custom' ? '' : prop.unit}
                              {prop.remarks && <span className="text-slate-400 ml-1">({prop.remarks})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic font-medium">無所需物品</span>
                      )}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPropsPacked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPropsPacked: c === true })} className="h-5 w-5 border-2" />
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox checked={plan.isPreDepartureChecked || false} disabled={isLocked} onCheckedChange={(c) => onUpdatePlan(plan.id, { isPreDepartureChecked: c === true })} className="h-5 w-5 border-2" />
                      </div>
                    </td>
                    {!isLocked && <td className="px-4 py-3 text-center align-middle border-l border-slate-200"></td>}
                  </tr>
                ))
              ))}
            </tbody>

            {/* 3. 營期物品 */}
            <tbody>
              <tr className="bg-emerald-100/50"><td colSpan={isLocked ? 6 : 7} className="px-4 py-2 font-black text-emerald-800 text-sm">3. 營期其他物品確認</td></tr>
              {Object.keys(usageGroups).length === 0 ? (
                <tr><td colSpan={isLocked ? 6 : 7} className="text-center py-4 text-slate-400 font-bold">目前沒有營期物品資料</td></tr>
              ) : Object.entries(usageGroups).map(([usageName, items]) => (
                items.map((item, pIndex) => (
                  <tr key={`cmp-${item.id}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    {pIndex === 0 && (
                      <td className="px-2 md:px-4 py-2 md:py-3 font-black text-xs sm:text-sm text-slate-800 border-r border-slate-200 align-top" rowSpan={items.length}>
                        {isLocked ? (
                           usageName
                        ) : (
                          <div className="flex flex-col gap-1">
                             <PropInput 
                                value={item.usage}
                                onChange={(v) => {
                                  items.forEach(i => handleUpdateCampItem(i.id, { usage: v }));
                                }}
                                disabled={isLocked}
                                className="font-black text-slate-800 bg-white/50"
                              />
                              <span className="text-[10px] text-slate-400 font-normal">修改將套用至同類組</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 align-middle">
                       <PropInput 
                          value={item.name}
                          onChange={(v) => handleUpdateCampItem(item.id, { name: v })}
                          disabled={isLocked}
                          className="font-bold text-slate-700"
                        />
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-xs sm:text-sm text-slate-400 border-r border-slate-200 align-middle text-center">
                      -
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-xs sm:text-sm text-slate-400 border-r border-slate-200 align-middle text-center">
                      -
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox 
                          checked={item.isPacked || false} 
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isPacked: c === true })}
                          className="h-5 w-5 border-2"
                        />
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-slate-200 text-center align-middle">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox 
                          checked={item.isChecked || false} 
                          disabled={isLocked}
                          onCheckedChange={(c) => handleUpdateCampItem(item.id, { isChecked: c === true })}
                          className="h-5 w-5 border-2"
                        />
                      </div>
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-3 text-center align-middle border-l border-slate-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCampItem(item.id)}
                          className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          刪除
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden page-enter relative scrollbar-hide transition-colors duration-300">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between no-print bg-card/80 dark:bg-card/60 backdrop-blur-2xl sticky top-0 z-40 shrink-0 border-b border-border">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden -ml-2 h-10 w-10 text-muted-foreground bg-card rounded-xl shadow-sm border border-border" />
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/20 dark:shadow-primary/10 shrink-0 rotate-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <Badge variant="outline" className="w-fit bg-primary/5 text-primary border-primary/10 mb-1 rounded-full px-2 py-0 font-bold text-[9px] uppercase tracking-tighter">Admin Control</Badge>
            <h2 className="text-xl md:text-2xl font-headline font-bold text-foreground tracking-tight leading-none uppercase flex items-center gap-2">
              行政管理 <span className="text-primary/30 font-thin italic text-sm">Dashboard</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant={isLocked ? "ghost" : "default"} 
            size="sm" 
            onClick={handleUnlockClick}
            className={cn(
              "rounded-xl font-bold text-[11px] gap-2 h-11 px-6 transition-all tracking-widest uppercase cursor-pointer btn-press",
              isLocked 
                ? "text-muted-foreground hover:text-primary hover:bg-primary/5 border-transparent" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 dark:shadow-primary/10 border-none btn-shimmer"
            )}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            <span className="hidden sm:inline">{isLocked ? "管理員解鎖" : "解鎖中"}</span>
            <span className="sm:hidden">{isLocked ? "解鎖" : "鎖定"}</span>
          </Button>
        </div>
      </header>

      {/* Floating Undo/Redo Buttons */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50 no-print">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary"
                size="icon" 
                onClick={onUndoTable} 
                disabled={!canUndoTable || isLocked}
                className="h-9 w-9 rounded-full bg-card/80 backdrop-blur-md shadow-lg border border-border text-muted-foreground hover:text-primary disabled:opacity-30 cursor-pointer"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-[10px] font-black uppercase">上一步 / Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary"
                size="icon" 
                onClick={onRedoTable} 
                disabled={!canRedoTable || isLocked}
                className="h-9 w-9 rounded-full bg-card/80 backdrop-blur-md shadow-lg border border-border text-muted-foreground hover:text-primary disabled:opacity-30 cursor-pointer"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-[10px] font-black uppercase">下一步 / Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="timer" className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="px-4 md:px-8 py-4 border-b border-border no-print bg-card/50 dark:bg-card/30 backdrop-blur-xl shrink-0">
            <TabsList className="bg-secondary/50 dark:bg-secondary p-1.5 rounded-xl border border-border w-full md:w-auto h-12">
              <TabsTrigger value="timer" className="flex-1 md:flex-none rounded-xl font-bold text-[11px] gap-2 px-8 tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:text-primary-foreground transition-all uppercase cursor-pointer">
                <Clock className="h-4 w-4" /> 計時同步
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex-1 md:flex-none rounded-xl font-bold text-[11px] gap-2 px-8 tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:text-primary-foreground transition-all uppercase cursor-pointer">
                <TableIcon className="h-4 w-4" /> 闖關表
              </TabsTrigger>
              <TabsTrigger value="props" className="flex-1 md:flex-none rounded-xl font-bold text-[11px] gap-2 px-8 tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:text-primary-foreground transition-all uppercase cursor-pointer">
                <Package2 className="h-4 w-4" /> 道具清單
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <TabsContent value="timer" className="m-0 h-full">
              <AdminTimer 
                timer={timer} 
                isLocked={isLocked} 
              />
            </TabsContent>

            <TabsContent value="tables" className="m-0 data-[state=active]:flex flex-col h-full overflow-hidden">
              <div className="px-4 md:px-8 py-3 bg-primary/5 border-b border-border flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[9px] font-bold text-muted-foreground tracking-widest hidden sm:inline">天數</span>
                  </div>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-32 h-8 rounded-lg font-bold text-[10px] border-border bg-card shadow-none">
                      <SelectValue placeholder="選擇" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-2xl">
                      {dayOptions.map(day => (
                        <SelectItem key={day} value={day} className="rounded-lg font-bold text-xs">{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {!isLocked && (
                  <Button onClick={() => onAddTable(selectedDay)} variant="outline" size="sm" className="rounded-xl font-bold gap-2 h-8 px-4 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-[9px] tracking-widest shadow-sm btn-press cursor-pointer">
                    <Plus className="h-3 w-3" /> 新增
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12">
                <div className="max-w-6xl mx-auto space-y-12 pb-24">
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
                      <div className="w-16 h-16 rounded-3xl bg-card flex items-center justify-center text-muted-foreground/30 shadow-sm border border-border">
                        <TableIcon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground tracking-widest">目前無資料</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="props" className="m-0 data-[state=active]:flex flex-col h-full overflow-hidden bg-background">
              <div className="shrink-0 px-4 md:px-8 py-3 border-b border-border bg-primary/5 backdrop-blur-md flex items-center justify-between no-print">
                <div className="flex items-center gap-2 p-1 bg-card/50 w-fit rounded-xl border border-border">
                   {['activity', 'teaching', 'all-props'].map((tab) => (
                     <button
                       key={tab}
                       onClick={() => setActivePropsTab(tab as typeof activePropsTab)}
                       className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200",
                         activePropsTab === tab
                           ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                           : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                       )}
                     >
                       {tab === 'activity' ? '活動組' : tab === 'teaching' ? '教學組' : '各闖關道具與營期物品確認'}
                     </button>
                   ))}
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-md rounded-xl border border-border px-2 py-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={propsZoom <= 0.3}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 disabled:opacity-30"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    onClick={handleZoomReset}
                    className="min-w-[3rem] text-center text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors tracking-wider"
                  >
                    {Math.round(propsZoom * 100)}%
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={propsZoom >= 2}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 disabled:opacity-30"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div
                ref={propsContainerRef}
                className="flex-1 overflow-auto p-4 md:p-8"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="mx-auto space-y-8 pb-32"
                  style={{
                    transform: `scale(${propsZoom})`,
                    transformOrigin: 'top left',
                    width: `${100 / propsZoom}%`,
                  }}
                >
                  <div className={cn("transition-opacity duration-300", isLocked ? "opacity-80" : "opacity-100")}>
                    {!isLocked && (
                      <div className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-3 py-2 rounded-lg border border-green-200 dark:border-green-500/20 font-bold">
                        <Unlock className="h-4 w-4" /> 解鎖成功，現在可以打勾編輯道具狀態。
                      </div>
                    )}
                    {isLocked && (
                      <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-500/20 font-bold">
                        <Lock className="h-4 w-4" /> 管理員權限已鎖定。請點擊右上角解鎖以編輯道具狀態。
                      </div>
                    )}
                     {activePropsTab === 'activity' && renderPropTable('活動組', activityPropsFlattened)}
                     {activePropsTab === 'teaching' && renderPropTable('教學組', teachingPropsFlattened)}
                     {activePropsTab === 'all-props' && renderCombinedTable()}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <AdminDialog 
        open={isAdminDialogOpen}
        onOpenChange={setIsAdminDialogOpen}
        onConfirm={() => setIsLocked(false)}
        title="管理權限解鎖 / Unlock Admin Permissions"
      />
    </div>
  );
}
