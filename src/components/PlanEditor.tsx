
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
  Redo2,
  History,
  Save,
  Eye,
  Filter,
  ArrowLeft,
  RotateCcw
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from "@/components/ui/sheet";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useCallback, useState, useRef, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeDiff, getChangedFields, type DiffSegment } from "@/lib/text-diff";

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
  versions?: PlanVersion[];
  onSaveVersion?: (name: string) => void;
  onRestoreVersion?: (versionId: string) => void;
  onDeleteVersion?: (versionId: string) => void;
}

export function PlanEditor({ plan, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo, versions = [], onSaveVersion, onRestoreVersion, onDeleteVersion }: PlanEditorProps) {
  const { toast } = useToast();
  const [isVersionSheetOpen, setIsVersionSheetOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const lastSavedPlanRef = useRef(JSON.stringify(plan));
  const [previewVersion, setPreviewVersion] = useState<PlanVersion | null>(null);
  const [showNamedOnly, setShowNamedOnly] = useState(false);

  // Filter versions: hide auto-saved snapshots when filter is on
  const filteredVersions = useMemo(() => {
    if (!showNamedOnly) return versions;
    return versions.filter(v => !v.name.startsWith('自動儲存'));
  }, [versions, showNamedOnly]);

  // Compute changed fields for preview
  const previewChangedFields = useMemo(() => {
    if (!previewVersion) return [];
    return getChangedFields(previewVersion.snapshot as any, plan as any);
  }, [previewVersion, plan]);

  const handleSaveVersion = () => {
    if (!newVersionName.trim()) {
      toast({ title: "請輸入版本名稱", variant: "destructive" });
      return;
    }
    onSaveVersion?.(newVersionName);
    setNewVersionName("");
    toast({ title: "版本已儲存" });
  };

  const handleRestoreVersion = (version: PlanVersion) => {
    // Auto-save current state before restoring
    const autoName = `自動儲存 (還原前) - ${format(new Date(), "MM/dd HH:mm")}`;
    onSaveVersion?.(autoName);

    onRestoreVersion?.(version.id);
    lastSavedPlanRef.current = JSON.stringify(version.snapshot);
    setPreviewVersion(null);
    setIsVersionSheetOpen(false);
    toast({ title: "已還原版本", description: `從「${version.name}」還原，還原前的狀態已自動儲存。` });
  };

  const handleDeleteVersion = (version: PlanVersion) => {
    if (confirm(`確定要刪除版本「${version.name}」嗎？此操作無法復原。`)) {
      onDeleteVersion?.(version.id);
      if (previewVersion?.id === version.id) setPreviewVersion(null);
      toast({ title: "已刪除版本", description: version.name });
    }
  };

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

            <Sheet open={isVersionSheetOpen} onOpenChange={setIsVersionSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-2xl transition-all font-black gap-2 h-11 px-4 border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 text-[11px] uppercase tracking-widest bg-white">
                  <History className="h-4 w-4" /> 紀錄 
                  {versions.length > 0 && (
                    <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px]">{versions.length}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg bg-[#FFFBF7] p-0 flex flex-col border-l-slate-200 no-print z-[100]">
                <div className="p-6 pb-2">
                  <SheetHeader>
                    <SheetTitle className="font-headline font-black text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                      <History className="h-5 w-5 text-orange-600" /> 版本紀錄
                    </SheetTitle>
                    <SheetDescription className="text-slate-500 font-bold text-xs">
                      儲存教案的歷史紀錄，點擊預覽差異後再決定是否還原。
                    </SheetDescription>
                  </SheetHeader>
                </div>
                
                <div className="px-6 py-4 border-b border-slate-200 bg-white/50 space-y-3">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="輸入版本名稱 (例: 冬令營_雨天備案)" 
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      className="bg-white border-slate-200 shadow-sm h-11 font-bold text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveVersion();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSaveVersion}
                      className="h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md px-4 font-black"
                    >
                      <Save className="h-4 w-4 flex-shrink-0" />
                    </Button>
                  </div>
                  <button
                    onClick={() => setShowNamedOnly(!showNamedOnly)}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                      showNamedOnly 
                        ? 'bg-orange-50 border-orange-200 text-orange-600' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {showNamedOnly ? '只顯示命名版本' : '顯示全部版本'}
                  </button>
                </div>

                {/* Preview Panel */}
                {previewVersion && (
                  <div className="px-6 py-4 border-b border-orange-200 bg-orange-50/50 space-y-4 max-h-[40vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewVersion(null)} className="text-slate-400 hover:text-slate-600">
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
                            <Eye className="h-4 w-4 text-orange-500" /> 預覽：{previewVersion.name}
                          </h4>
                          <time className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                            {format(new Date(previewVersion.createdAt), "yyyy/MM/dd HH:mm")}
                          </time>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleRestoreVersion(previewVersion)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-xl"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> 還原為此版本
                      </Button>
                    </div>

                    {previewChangedFields.length === 0 ? (
                      <p className="text-sm text-slate-400 font-bold text-center py-4">此版本與目前內容完全相同</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">有 {previewChangedFields.length} 個欄位不同：</p>
                        {previewChangedFields.map((fieldName) => {
                          const fieldKey = Object.entries({
                            activityName: '活動名稱', scheduledName: '類別', members: '教案成員',
                            time: '教案時間', location: '教案地點', purpose: '教案目的',
                            process: '教案流程', content: '詳細內容', divisionOfLabor: '人力分工',
                            remarks: '備註事項', openingClosingRemarks: '開場與結語',
                          }).find(([, label]) => label === fieldName)?.[0];

                          if (!fieldKey) return <div key={fieldName} className="text-xs font-bold text-slate-500">{fieldName}（已變更）</div>;

                          const oldVal = String((previewVersion.snapshot as any)[fieldKey] || '');
                          const newVal = String((plan as any)[fieldKey] || '');
                          const diff = computeDiff(oldVal, newVal);

                          return (
                            <div key={fieldName} className="bg-white rounded-xl p-3 border border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{fieldName}</h5>
                              <div className="text-xs leading-relaxed whitespace-pre-wrap break-words font-medium">
                                {diff.map((seg, i) => {
                                  if (seg.type === 'same') return <span key={i}>{seg.text}</span>;
                                  if (seg.type === 'add') return <span key={i} className="bg-emerald-100 text-emerald-800 px-0.5 rounded">{seg.text}</span>;
                                  if (seg.type === 'remove') return <span key={i} className="bg-rose-100 text-rose-600 line-through px-0.5 rounded">{seg.text}</span>;
                                  return null;
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {filteredVersions.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <History className="h-5 w-5" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm">還沒有任何版本紀錄</p>
                    </div>
                  ) : (
                    <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {filteredVersions.map((version) => {
                        const isAutoSave = version.name.startsWith('自動儲存');
                        const isSelected = previewVersion?.id === version.id;
                        return (
                        <div key={version.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors ${
                            isSelected ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300' 
                            : isAutoSave ? 'bg-slate-50 text-slate-300 group-hover:bg-slate-100 group-hover:text-slate-500' 
                            : 'bg-slate-50 text-orange-400 group-hover:bg-orange-50 group-hover:text-orange-600'
                          }`}>
                            {isAutoSave ? <History className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          
                          <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl shadow-sm border transition-all cursor-pointer ${
                            isSelected ? 'bg-orange-50 border-orange-200 shadow-md' 
                            : 'bg-white border-slate-100 hover:shadow-md group-hover:border-orange-100'
                          }`}
                            onClick={() => setPreviewVersion(isSelected ? null : version)}
                          >
                            <div className="flex flex-col gap-1 mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-black text-sm line-clamp-1 ${
                                  isAutoSave ? 'text-slate-400' : 'text-slate-800'
                                }`}>{version.name}</h4>
                                {!isAutoSave && (
                                  <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">Named</span>
                                )}
                              </div>
                              <time className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                {format(new Date(version.createdAt), "MM/dd HH:mm")}
                              </time>
                            </div>
                            <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); setPreviewVersion(version); }}
                              className={`flex-1 text-[10px] font-black uppercase tracking-widest border-slate-200 h-8 ${
                                isSelected ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> 預覽
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version); }}
                              className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 border-slate-200 h-8 hover:bg-rose-50 px-2.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
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

                <section>
                  <SectionHeader title="劇本內容 / Script Content" icon={FileText} />
                  <MarkdownArea value={plan.content} onChange={(val) => handlePlanUpdate({ content: val })} />
                </section>

                <section>
                  <SectionHeader title="道具需求 / Props List" icon={Package} />
                  <PropsTable value={plan.props} onChange={(val) => handlePlanUpdate({ props: val })} />
                </section>

                <section>
                  <SectionHeader title="備註事項 / Remarks" icon={StickyNote} />
                  <MarkdownArea value={plan.remarks} onChange={(val) => handlePlanUpdate({ remarks: val })} />
                </section>
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
