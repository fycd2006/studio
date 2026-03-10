
"use client"

import { LessonPlan, SCHEDULE_OPTIONS } from "@/types/plan";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownArea } from "@/components/MarkdownArea";
import { PropsTable } from "@/components/PropsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Download, 
  FileDown, 
  Printer,
  CheckCircle2,
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
  Redo2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { exportToDocx, exportToPdf } from "@/lib/export-utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FabricCanvas = dynamic(
  () => import("@/components/FabricCanvas").then((mod) => mod.FabricCanvas),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full flex items-center justify-center rounded-xl bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin opacity-40" />
          <p className="text-[10px] font-black uppercase tracking-widest">載入中 / Loading...</p>
        </div>
      </div>
    )
  }
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
  <div className="flex items-center gap-3 mb-5 pt-6 first:pt-0">
    <div className="w-1 h-4 bg-orange-500 rounded-full" />
    <h3 className="text-[14px] font-black text-slate-950 tracking-tight flex items-center gap-2.5 uppercase">
      {Icon && <Icon className="h-4.5 w-4.5 text-orange-600 opacity-60" />}
      {title}
    </h3>
    <div className="flex-1 h-[1px] bg-slate-200 ml-2" />
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
}

export function PlanEditor({ plan, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo }: PlanEditorProps) {
  const { toast } = useToast();

  const handleExportDocx = async () => {
    try {
      const canvasElement = document.querySelector('.canvas-container canvas') as HTMLCanvasElement;
      const canvasImageData = canvasElement ? canvasElement.toDataURL() : undefined;
      await exportToDocx(plan, canvasImageData);
      toast({ title: "匯出完成 / Exported", description: "檔案已開始下載 / File downloading." });
    } catch (e) {
      console.error(e);
      toast({ title: "匯出失敗 / Failed", variant: "destructive" });
    }
  };

  const handleCanvasSave = useCallback((data: string, height: number) => {
    onUpdate(plan.id, { canvasData: data, canvasHeight: height });
  }, [plan.id, onUpdate]);

  const handlePlanUpdate = useCallback((updates: Partial<LessonPlan>) => {
    onUpdate(plan.id, updates);
  }, [plan.id, onUpdate]);

  const hasCanvas = plan.canvasData !== undefined && plan.canvasData !== null;
  const isScript = plan.scheduledName === '劇本';
  const displayTitle = plan.scheduledName 
    ? `${plan.scheduledName} - ${plan.activityName || "..."}` 
    : (plan.activityName || "New Plan");

  return (
    <div className="h-full flex flex-col p-4 md:p-8 lg:p-12 overflow-y-auto print:p-0 bg-[#FFFBF7] relative">
      <div className="max-w-[1000px] mx-auto w-full space-y-6 md:space-y-10 pb-24">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print px-1">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden h-10 w-10 -ml-2 text-slate-500 bg-white shadow-sm border border-slate-200 rounded-xl" />
              <div className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md">
                {plan.category === 'activity' ? '活動組 / Activity' : '教學組 / Teaching'}
              </div>
              {isSaving ? (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                  <Loader2 className="h-3 w-3 animate-spin text-orange-500" /> 同步中 / Syncing
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> 已同步 / Synced
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-black text-slate-950 leading-tight tracking-tighter uppercase">
              {displayTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-2xl shadow-xl transition-all font-black gap-2 h-11 px-6 bg-orange-600 text-white text-[11px] uppercase tracking-widest hover:bg-orange-700">
                  <Download className="h-4 w-4" /> 匯出 / Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-slate-100 bg-white">
                <DropdownMenuItem onClick={handleExportDocx} className="group rounded-xl cursor-pointer p-3 font-black text-[11px] uppercase tracking-widest">
                  <FileDown className="mr-3 h-4 w-4 text-orange-600" /> Word 文件 (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPdf} className="group rounded-xl cursor-pointer p-3 font-black text-[11px] uppercase tracking-widest">
                  <Printer className="mr-3 h-4 w-4 text-orange-600" /> 列印或 PDF / Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  onClick={onUndo} 
                  disabled={!canUndo}
                  className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-slate-200 text-slate-500 hover:text-orange-600 disabled:opacity-30"
                >
                  <Undo2 className="h-4.5 w-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-[10px] font-black uppercase">上一步 / Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary"
                  size="icon" 
                  onClick={onRedo} 
                  disabled={!canRedo}
                  className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-slate-200 text-slate-500 hover:text-orange-600 disabled:opacity-30"
                >
                  <Redo2 className="h-4.5 w-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-[10px] font-black uppercase">下一步 / Redo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Card className="print:border-none print:shadow-none border border-slate-200 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-6 md:p-10 lg:p-14 space-y-8 md:space-y-12">
            <section className="grid md:grid-cols-12 gap-6 pb-8 border-b border-slate-200">
              <div className="md:col-span-4 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">類別 / Category</label>
                <Select value={plan.scheduledName} onValueChange={(val) => handlePlanUpdate({ scheduledName: val })}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl text-[12px] font-black shadow-none text-slate-950 uppercase">
                    <SelectValue placeholder="選擇類別 / Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-orange-100 shadow-2xl">
                    {SCHEDULE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt} className="rounded-lg font-bold text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-8 space-y-2">
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] px-1">活動名稱 / Activity Name</label>
                <Input 
                  value={plan.activityName} 
                  onChange={(e) => handlePlanUpdate({ activityName: e.target.value })} 
                  placeholder={isScript ? "劇本名稱 / Script Title" : "活動名稱 / Activity Name"} 
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-black text-lg px-5 shadow-none text-slate-950" 
                />
              </div>
            </section>

            {isScript ? (
              <div className="space-y-8 pt-4">
                <MarkdownArea label="劇本內容 / Script Content" value={plan.content} onChange={(val) => handlePlanUpdate({ content: val })} />
              </div>
            ) : (
              <>
                <section>
                  <SectionHeader title="教案成員 / Members" icon={Users} />
                  <Input 
                    value={plan.members} 
                    onChange={(e) => handlePlanUpdate({ members: e.target.value })} 
                    placeholder="主講、助教、示範組員 / Speakers, TAs, Demonstrators..." 
                    className="h-11 bg-white border-slate-200 rounded-xl px-5 text-[13px] font-bold shadow-none text-slate-950" 
                  />
                </section>

                <section>
                  <SectionHeader title="教案目的 / Purpose" icon={Target} />
                  <MarkdownArea value={plan.purpose} onChange={(val) => handlePlanUpdate({ purpose: val })} />
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <SectionHeader title="教案時間 / Time" icon={Clock} />
                    <Input 
                      value={plan.time} 
                      onChange={(e) => handlePlanUpdate({ time: e.target.value })} 
                      placeholder="例：14:00 - 15:30 (90 min)" 
                      className="h-11 bg-white border-slate-200 rounded-xl px-5 text-[13px] font-bold shadow-none text-slate-950" 
                    />
                  </div>
                  <div className="space-y-2">
                    <SectionHeader title="教案地點 / Location" icon={MapPin} />
                    <Input 
                      value={plan.location} 
                      onChange={(e) => handlePlanUpdate({ location: e.target.value })} 
                      placeholder="三樓大教室 / 3F Main Hall..." 
                      className="h-11 bg-white border-slate-200 rounded-xl px-5 text-[13px] font-bold shadow-none text-slate-950" 
                    />
                  </div>
                </section>

                <section>
                  <SectionHeader title="教案流程 / Process" icon={Layout} />
                  <MarkdownArea value={plan.process} onChange={(val) => handlePlanUpdate({ process: val })} />
                </section>

                <section className="space-y-2">
                  <SectionHeader title="詳細內容與圖解 / Illustration" icon={FileText} />
                  
                  {hasCanvas ? (
                    <div className="space-y-1">
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handlePlanUpdate({ canvasData: null, canvasHeight: null })}
                          className="h-7 px-3 text-[9px] font-black text-rose-500 uppercase tracking-widest"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> 移除畫板 / Remove Canvas
                        </Button>
                      </div>
                      <div className="canvas-container bg-white overflow-hidden">
                        <FabricCanvas 
                          initialData={plan.canvasData || '{}'} 
                          initialHeight={plan.canvasHeight || 500} 
                          onSave={handleCanvasSave} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="no-print flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePlanUpdate({ canvasData: '{}', canvasHeight: 500 })}
                        className="h-9 px-5 text-[10px] font-black text-orange-600 border-orange-200 hover:bg-orange-600 hover:text-white gap-2 rounded-xl uppercase tracking-widest"
                      >
                        <Plus className="h-3.5 w-3.5" /> 啟動畫板 / Launch Canvas
                      </Button>
                    </div>
                  )}

                  <MarkdownArea label="詳細說明文本 / Textual Description" value={plan.content} onChange={(val) => handlePlanUpdate({ content: val })} />
                </section>

                <section>
                  <SectionHeader title="人力分工 / Labor Division" icon={Users} />
                  <MarkdownArea value={plan.divisionOfLabor} onChange={(val) => handlePlanUpdate({ divisionOfLabor: val })} />
                </section>

                <section>
                  <SectionHeader title="道具需求 / Props List" icon={Package} />
                  <PropsTable value={plan.props} onChange={(val) => handlePlanUpdate({ props: val })} />
                </section>

                <section>
                  <SectionHeader title="備註事項 / Remarks" icon={StickyNote} />
                  <MarkdownArea value={plan.remarks} onChange={(val) => handlePlanUpdate({ remarks: val })} />
                </section>

                <section>
                  <SectionHeader title="開場與結語 / Remarks" icon={StickyNote} />
                  <MarkdownArea value={plan.openingClosingRemarks} onChange={(val) => handlePlanUpdate({ openingClosingRemarks: val })} />
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
