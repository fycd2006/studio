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
import { useToast } from "@/hooks/use-toast";
import { exportToDocx } from "@/lib/export-utils";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useState, useRef, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeDiff, getChangedFields } from "@/lib/text-diff";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
  onSaveVersion?: (name: string) => void;
  onRestoreVersion?: (versionId: string) => void;
  onDeleteVersion?: (versionId: string) => void;
}

export function PlanEditor({ plan, onUpdate, isSaving, onUndo, onRedo, canUndo, canRedo, versions = [], onSaveVersion, onRestoreVersion, onDeleteVersion }: PlanEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isVersionSheetOpen, setIsVersionSheetOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [previewVersion, setPreviewVersion] = useState<PlanVersion | null>(null);
  const [showNamedOnly, setShowNamedOnly] = useState(false);

  const filteredVersions = useMemo(() => {
    if (!showNamedOnly) return versions;
    return versions.filter(v => !v.name.startsWith(t('SAVED')));
  }, [versions, showNamedOnly]);

  const previewChangedFields = useMemo(() => {
    if (!previewVersion) return [];
    return getChangedFields(previewVersion.snapshot as any, plan as any);
  }, [previewVersion, plan]);

  const handlePlanUpdate = (updates: Partial<LessonPlan>) => {
    onUpdate(plan.id, updates);
  };

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
    const autoName = `自動儲存 (還原前) - ${format(new Date(), "MM/dd HH:mm")}`;
    onSaveVersion?.(autoName);
    onRestoreVersion?.(version.id);
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

  const handleCanvasSave = (data: string, height: number) => {
    handlePlanUpdate({ canvasData: data, canvasHeight: height });
  };

  const isScript = plan.category === 'teaching';
  const hasCanvas = plan.canvasData !== null && plan.canvasData !== undefined;

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-slate-900 font-body selection:bg-orange-100 dark:selection:bg-amber-400/30 antialiased transition-colors">
      {/* ── HEADER ───────────────────────── */}
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-6">
          <div className="md:hidden -ml-2">
            <SidebarTrigger />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                plan.category === "activity" 
                  ? "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-400/20" 
                  : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-400/20"
              )}>
                {plan.category === "activity" ? t('ACTIVITY_PLAN') : t('TEACHING_PLAN')}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Last Save: {plan.updatedAt ? new Date(plan.updatedAt).toLocaleTimeString() : "—"}
              </span>
            </div>
            <input
              value={plan.activityName}
              onChange={(e) => handlePlanUpdate({ activityName: e.target.value })}
              className="text-2xl font-black tracking-tight bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-stone-300 dark:placeholder:text-slate-700 w-full md:w-[400px] text-stone-900 dark:text-white transition-colors"
              placeholder={t('ENTER_TITLE')}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-stone-100 dark:bg-white/5 p-1 rounded-xl mr-4 border border-stone-200 dark:border-white/5">
            <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all text-stone-600 dark:text-slate-400">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all text-stone-600 dark:text-slate-400">
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
          
          <Sheet open={isVersionSheetOpen} onOpenChange={setIsVersionSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-stone-200 dark:border-white/10 font-bold uppercase tracking-widest text-[10px] h-9 hover:bg-stone-50 dark:hover:bg-white/5 bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 transition-all"
              >
                <History className="w-4 h-4 mr-2" /> {t('LOG_BOOK')}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-stone-50 dark:bg-slate-900 border-l border-stone-200 dark:border-white/5 transition-colors">
              <SheetHeader className="p-6 bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-white/5 transition-colors">
                <SheetTitle className="text-xl font-black tracking-tight text-stone-900 dark:text-white uppercase">
                  {t('VERSION_LOGS')}
                </SheetTitle>
              </SheetHeader>
              
              <div className="p-6 bg-white dark:bg-slate-900 border-b border-stone-100 dark:border-white/5 space-y-4 transition-colors">
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('LIST_MEMBERS')} 
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    className="h-11 rounded-xl bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10 font-bold text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-600 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveVersion();
                    }}
                  />
                  <Button 
                    onClick={handleSaveVersion}
                    className="h-11 bg-orange-600 dark:bg-amber-400 hover:opacity-90 text-white dark:text-slate-900 shadow-md px-4 font-black rounded-xl transition-all"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  onClick={() => setShowNamedOnly(!showNamedOnly)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                    showNamedOnly 
                      ? 'bg-orange-50 dark:bg-amber-400/10 border-orange-200 dark:border-amber-400/30 text-orange-600 dark:text-amber-400' 
                      : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-white'
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {showNamedOnly ? 'Named Only' : 'Show All'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredVersions.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center gap-3">
                    <History className="h-8 w-8 text-stone-200 dark:text-slate-800" />
                    <p className="text-stone-400 dark:text-slate-600 font-bold text-sm uppercase tracking-widest">No Records</p>
                  </div>
                ) : (
                  filteredVersions.map((version) => (
                    <div 
                      key={version.id} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group",
                        previewVersion?.id === version.id 
                          ? "bg-orange-50 dark:bg-amber-400/5 border-orange-200 dark:border-amber-400/30 shadow-md" 
                          : "bg-white dark:bg-white/5 border-stone-100 dark:border-white/5 hover:border-orange-100 dark:hover:border-amber-400/30 shadow-sm"
                      )}
                      onClick={() => setPreviewVersion(version)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-white leading-tight mb-1">{version.name}</h4>
                          <time className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest">
                            {format(new Date(version.createdAt), "MM/dd HH:mm")}
                          </time>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version); }}
                          className="h-8 w-8 p-0 text-stone-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-stone-50 border-stone-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-100"
                          onClick={(e) => { e.stopPropagation(); handleRestoreVersion(version); }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1.5" /> 還原
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-orange-600 dark:bg-amber-400 hover:opacity-90 text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-[10px] h-9 shadow-sm transition-all"
          >
            <FileDown className="w-4 h-4 mr-2" /> {t('EXPORT_FILE')}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
        <Card className="border-stone-200 dark:border-white/5 shadow-xl shadow-stone-200/20 dark:shadow-none rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 transition-colors">
          <CardContent className="p-8 md:p-12 space-y-12">
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-stone-100 dark:border-white/5">
              <div className="md:col-span-4 space-y-3">
                <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">{t('CATEGORY')}</label>
                <Select value={plan.scheduledName} onValueChange={(val) => handlePlanUpdate({ scheduledName: val })}>
                  <SelectTrigger className="h-12 bg-stone-50 dark:bg-white/5 border-stone-100 dark:border-white/10 rounded-xl text-xs font-bold shadow-none text-stone-900 dark:text-white uppercase tracking-widest focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-amber-400/10 transition-all">
                    <SelectValue placeholder={t('SELECT_TYPE')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-stone-100 dark:border-white/10 shadow-2xl bg-white dark:bg-slate-900">
                    {SCHEDULE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt} className="rounded-lg font-bold text-[11px] uppercase tracking-wider py-2.5">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-8 space-y-3">
                <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">{t('SUBJECT')}</label>
                <Input 
                  value={plan.activityName} 
                  onChange={(e) => handlePlanUpdate({ activityName: e.target.value })} 
                  className="h-12 bg-stone-50 dark:bg-white/5 border-stone-100 dark:border-white/10 rounded-xl font-bold text-lg px-5 shadow-none text-stone-900 dark:text-white focus-visible:ring-4 focus-visible:ring-orange-500/10 dark:focus-visible:ring-amber-400/10 transition-all" 
                />
              </div>
            </section>

            <div className="space-y-12">
              <section>
                <SectionHeader title={t('CASE_PERSONNEL')} icon={Users} />
                <Input 
                  value={plan.members} 
                  onChange={(e) => handlePlanUpdate({ members: e.target.value })} 
                  placeholder={t('LIST_MEMBERS')} 
                  className="h-12 bg-white dark:bg-white/5 border-stone-100 dark:border-white/10 rounded-xl px-5 text-sm font-bold shadow-none text-stone-900 dark:text-white focus-visible:ring-4 focus-visible:ring-orange-500/10 dark:focus-visible:ring-amber-400/10 transition-all" 
                />
              </section>

              <section>
                <SectionHeader title={t('MISSION_OBJ')} icon={Target} />
                <textarea
                  value={plan.purpose || ""}
                  onChange={(e) => handlePlanUpdate({ purpose: e.target.value })}
                  className="w-full min-h-[120px] bg-white dark:bg-white/5 border border-stone-100 dark:border-white/10 rounded-[1.5rem] p-6 text-stone-700 dark:text-slate-300 leading-relaxed focus:ring-4 focus:ring-orange-500/5 dark:focus:ring-amber-400/5 focus:border-orange-500 dark:focus:border-amber-400 outline-none transition-all resize-none font-medium"
                  placeholder={t('GUIDELINES')}
                />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <SectionHeader title={t('TIME_WINDOW')} icon={Clock} />
                  <Input 
                    value={plan.time} 
                    onChange={(e) => handlePlanUpdate({ time: e.target.value })} 
                    placeholder="14:00 - 15:30 (90 min)" 
                    className="h-12 bg-white dark:bg-white/5 border-stone-100 dark:border-white/10 rounded-xl px-5 text-sm font-bold shadow-none text-stone-900 dark:text-white focus-visible:ring-4 focus-visible:ring-orange-500/10 dark:focus-visible:ring-amber-400/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <SectionHeader title={t('VENUE')} icon={MapPin} />
                  <Input 
                    value={plan.location} 
                    onChange={(e) => handlePlanUpdate({ location: e.target.value })} 
                    placeholder="3F Main Hall..." 
                    className="h-12 bg-white dark:bg-white/5 border-stone-100 dark:border-white/10 rounded-xl px-5 text-sm font-bold shadow-none text-stone-900 dark:text-white focus-visible:ring-4 focus-visible:ring-orange-500/10 dark:focus-visible:ring-amber-400/10 transition-all" 
                  />
                </div>
              </section>

              <section>
                <SectionHeader title={t('PROCEDURES')} icon={Layout} />
                <MarkdownArea value={plan.process} onChange={(val) => handlePlanUpdate({ process: val })} />
              </section>

              <section>
                <SectionHeader title={t('VISUAL_BLUEPRINT')} icon={FileText} />
                {hasCanvas ? (
                  <div className="mb-6 space-y-4">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePlanUpdate({ canvasData: null, canvasHeight: null })}
                        className="text-[10px] font-bold text-orange-600 dark:text-amber-400 uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> {t('REMOVE_CANVAS')}
                      </Button>
                    </div>
                    <div className="border border-stone-100 dark:border-white/5 rounded-[1.5rem] overflow-hidden bg-stone-50 dark:bg-white/5 shadow-inner transition-colors">
                      <FabricCanvas 
                        initialData={plan.canvasData || '{}'} 
                        initialHeight={plan.canvasHeight || 500} 
                        onSave={handleCanvasSave} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePlanUpdate({ canvasData: '{}', canvasHeight: 500 })}
                      className="h-10 px-5 text-[10px] font-bold text-orange-600 dark:text-amber-400 border-orange-200 dark:border-amber-400/30 hover:bg-orange-50 dark:hover:bg-amber-400/10 rounded-xl uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> {t('ADD_CANVAS')}
                    </Button>
                  </div>
                )}
                <MarkdownArea value={plan.content} onChange={(val) => handlePlanUpdate({ content: val })} />
              </section>

              <section>
                <SectionHeader title={t('CASE_PERSONNEL')} icon={Users} />
                <MarkdownArea value={plan.divisionOfLabor} onChange={(val) => handlePlanUpdate({ divisionOfLabor: val })} />
              </section>

              <section>
                <SectionHeader title={t('MATERIALS')} icon={Package} />
                <PropsTable value={plan.props} onChange={(val) => handlePlanUpdate({ props: val })} />
              </section>

              <section>
                <SectionHeader title={t('STIPULATIONS')} icon={StickyNote} />
                <MarkdownArea value={plan.remarks} onChange={(val) => handlePlanUpdate({ remarks: val })} />
              </section>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Undo/Redo - Fixed Bottom Right */}
      <div className="fixed bottom-8 right-8 flex items-center gap-3 z-50 no-print">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary"
                size="icon" 
                onClick={onUndo} 
                disabled={!canUndo}
                className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-stone-200 dark:border-white/10 text-stone-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-amber-400 hover:scale-110 transition-all disabled:opacity-20"
              >
                <Undo2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-widest bg-stone-900 text-white border-none px-3 py-2 rounded-lg">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary"
                size="icon" 
                onClick={onRedo} 
                disabled={!canRedo}
                className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-stone-200 dark:border-white/10 text-stone-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-amber-400 hover:scale-110 transition-all disabled:opacity-20"
              >
                <Redo2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-widest bg-stone-900 text-white border-none px-3 py-2 rounded-lg">Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
