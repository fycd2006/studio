"use client"

import React, { useState, useMemo, useEffect } from "react";
import { LessonPlan } from "@/types/plan";
import { generateRotationSchedule, GeneratedSchedule } from "@/lib/rotation-scheduler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Zap, 
  MapPin, 
  User, 
  UserPlus, 
  Plus, 
  Minus, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";

interface SmartRotationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: LessonPlan[];
  onGenerate: (
    schedule: GeneratedSchedule, 
    updatedPlans: Array<{ id: string; location: string; lead: string; assistant: string }>
  ) => Promise<void>;
  defaultDay?: string;
}

interface StationItemState {
  planId: string;
  checked: boolean;
  name: string;
  location: string;
  lead: string;
  assistant: string;
  originalLocation: string;
  originalLead: string;
  originalAssistant: string;
}

function stripHtml(html: string = ""): string {
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export function SmartRotationWizardModal({
  isOpen,
  onClose,
  plans,
  onGenerate,
  defaultDay = "Day 1",
}: SmartRotationWizardModalProps) {
  const { t } = useTranslation();
  const [day, setDay] = useState(defaultDay);
  const [teamCount, setTeamCount] = useState(4); // Default 4 teams
  const [roundOption, setRoundOption] = useState<"all_stations" | "all_opponents">("all_stations");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract distinct activity types from plans
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    plans.forEach((p) => {
      const cat = stripHtml(p.scheduledName);
      if (cat) set.add(cat);
    });
    // Add default fallbacks if empty
    if (set.size === 0) {
      set.add("大地遊戲");
      set.add("分站闖關");
    }
    return Array.from(set);
  }, [plans]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (distinctCategories.length > 0 && selectedCategory === "all") {
      // Default to first category if available
      const preferred = distinctCategories.find(c => c.includes("大地") || c.includes("闖關")) || distinctCategories[0];
      if (preferred) setSelectedCategory(preferred);
    }
  }, [distinctCategories, selectedCategory]);

  const [tableTitle, setTableTitle] = useState(`${day} 大地遊戲闖關表`);

  useEffect(() => {
    const catLabel = selectedCategory === "all" ? "大地遊戲" : selectedCategory;
    setTableTitle(`${day} ${catLabel}闖關表`);
  }, [day, selectedCategory]);

  // Filter plans based on selectedCategory
  const filteredPlans = useMemo(() => {
    if (selectedCategory === "all") {
      return plans.filter((p) => p.category === "activity");
    }
    return plans.filter((p) => {
      const name = stripHtml(p.scheduledName);
      return name === selectedCategory || p.category === "activity";
    });
  }, [plans, selectedCategory]);

  // Stations state
  const [stationItems, setStationItems] = useState<StationItemState[]>([]);

  // When filteredPlans change or modal opens, initialize station items
  useEffect(() => {
    if (!isOpen) return;
    const initialItems: StationItemState[] = filteredPlans.map((p) => {
      const lead = p.leadMember || stripHtml(p.members).split("、")[0] || stripHtml(p.members) || "";
      const assistant = p.assistantMember || "";
      const loc = p.location || "";
      return {
        planId: p.id,
        checked: true, // Default checked
        name: stripHtml(p.activityName) || "未命名關卡",
        location: loc,
        lead,
        assistant,
        originalLocation: loc,
        originalLead: lead,
        originalAssistant: assistant,
      };
    });
    setStationItems(initialItems);
  }, [filteredPlans, isOpen]);

  const checkedCount = stationItems.filter((s) => s.checked).length;

  const handleStationFieldChange = (
    index: number,
    field: "name" | "location" | "lead" | "assistant",
    value: string
  ) => {
    setStationItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleToggleCheck = (index: number) => {
    setStationItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked: !next[index].checked };
      return next;
    });
  };

  const handleGenerate = async () => {
    const checked = stationItems.filter((s) => s.checked);
    if (checked.length === 0) return;

    setIsSubmitting(true);
    try {
      const schedule = generateRotationSchedule({
        tableTitle,
        day,
        teamCount,
        roundOption,
        stations: checked.map((s) => ({
          planId: s.planId,
          name: s.name,
          location: s.location,
          lead: s.lead,
          assistant: s.assistant,
        })),
      });

      // Find plans that need global syncing
      const updatedPlans = checked
        .filter(
          (s) =>
            s.location !== s.originalLocation ||
            s.lead !== s.originalLead ||
            s.assistant !== s.originalAssistant
        )
        .map((s) => ({
          id: s.planId,
          location: s.location,
          lead: s.lead,
          assistant: s.assistant,
        }));

      await onGenerate(schedule, updatedPlans);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-stone-200/70 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span>智能排定闖關表</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  雙隊對戰制
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                選擇天數與關卡，系統自動帶入主副關主與地點，並生成零撞關輪轉對戰表。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
          {/* Section 1: Basic Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-stone-100/60 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-stone-200/60 dark:border-white/5">
            {/* Day */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>天數 (Day)</span>
              </label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-9 rounded-xl font-mono text-xs bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-stone-200 dark:border-white/10 shadow-xl bg-white dark:bg-[#14191C]">
                  {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map((d) => (
                    <SelectItem key={d} value={d} className="text-xs font-mono">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-stone-400" />
                <span>活動類型</span>
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-stone-200 dark:border-white/10 shadow-xl bg-white dark:bg-[#14191C]">
                  <SelectItem value="all" className="text-xs">
                    全部活動教案
                  </SelectItem>
                  {distinctCategories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Count Stepper */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>參賽小隊數</span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/5 shrink-0"
                  disabled={teamCount <= 2}
                  onClick={() => setTeamCount((prev) => Math.max(2, prev - 2))}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="flex-1 text-center font-mono font-bold text-xs sm:text-sm py-1.5 px-2 bg-white dark:bg-white/5 rounded-xl border border-stone-200 dark:border-white/10 text-foreground">
                  {teamCount} 隊
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/5 shrink-0"
                  disabled={teamCount >= 16}
                  onClick={() => setTeamCount((prev) => prev + 2)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table Title Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400">
              表格標題 (Table Title)
            </label>
            <Input
              value={tableTitle}
              onChange={(e) => setTableTitle(e.target.value)}
              className="h-9 rounded-xl text-xs bg-stone-50/50 dark:bg-white/[0.03] border-stone-200 dark:border-white/10 text-foreground"
              placeholder="輸入闖關表標題..."
            />
          </div>

          {/* Section 2: Stations Checklist & Master/Location Live Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>勾選當日關卡與確認關主/地點</span>
                <span className="text-[10px] font-mono font-normal text-stone-400">
                  (已選 {checkedCount} 關)
                </span>
              </label>
              <div className="text-[10px] font-mono text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span>修改將自動全域同步回寫教案</span>
              </div>
            </div>

            {stationItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 dark:border-white/10 rounded-2xl bg-stone-50/50 dark:bg-white/[0.01]">
                <p className="text-xs text-stone-400">在此分類下未找到活動教案，請切換活動類型。</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stationItems.map((item, idx) => {
                  const isLocationChanged = item.location !== item.originalLocation;
                  const isLeadChanged = item.lead !== item.originalLead;
                  const isAssistantChanged = item.assistant !== item.originalAssistant;
                  const hasAnyChanges = isLocationChanged || isLeadChanged || isAssistantChanged;

                  return (
                    <div
                      key={item.planId}
                      className={cn(
                        "p-3 rounded-2xl border transition-all duration-200",
                        item.checked
                          ? "bg-white dark:bg-white/[0.03] border-stone-200/90 dark:border-white/15 shadow-2xs"
                          : "opacity-45 bg-stone-50/60 dark:bg-white/[0.01] border-stone-200/50 dark:border-white/5"
                      )}
                    >
                      {/* Top Checkbox & Station Name */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Checkbox
                            id={`check-${item.planId}`}
                            checked={item.checked}
                            onCheckedChange={() => handleToggleCheck(idx)}
                            className="rounded-md data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <label
                            htmlFor={`check-${item.planId}`}
                            className="text-xs sm:text-sm font-bold text-foreground cursor-pointer truncate flex items-center gap-2"
                          >
                            <span className="text-[10px] font-mono text-orange-500 font-normal">
                              #{idx + 1}
                            </span>
                            <span className="truncate">{item.name}</span>
                          </label>
                        </div>
                        {hasAnyChanges && item.checked && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            🔗 全域同步
                          </span>
                        )}
                      </div>

                      {/* Inputs Grid: Location, Lead, Assistant */}
                      {item.checked && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-stone-100 dark:border-white/5">
                          {/* Location */}
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                            <Input
                              value={item.location}
                              onChange={(e) =>
                                handleStationFieldChange(idx, "location", e.target.value)
                              }
                              placeholder="關卡地點 (Location)..."
                              className={cn(
                                "h-8 pl-8 text-xs rounded-xl bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10",
                                isLocationChanged && "border-emerald-500/60 ring-1 ring-emerald-500/20"
                              )}
                            />
                          </div>

                          {/* Lead */}
                          <div className="relative">
                            <User className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-2.5" />
                            <Input
                              value={item.lead}
                              onChange={(e) =>
                                handleStationFieldChange(idx, "lead", e.target.value)
                              }
                              placeholder="主關主姓名..."
                              className={cn(
                                "h-8 pl-8 text-xs rounded-xl bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10",
                                isLeadChanged && "border-emerald-500/60 ring-1 ring-emerald-500/20"
                              )}
                            />
                          </div>

                          {/* Assistant */}
                          <div className="relative">
                            <UserPlus className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                            <Input
                              value={item.assistant}
                              onChange={(e) =>
                                handleStationFieldChange(idx, "assistant", e.target.value)
                              }
                              placeholder="副關主姓名..."
                              className={cn(
                                "h-8 pl-8 text-xs rounded-xl bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10",
                                isAssistantChanged && "border-emerald-500/60 ring-1 ring-emerald-500/20"
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Special 3-station option toggle */}
          {checkedCount === 3 && teamCount === 4 && (
            <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                <span>3 關卡 × 4 小隊賽制模式</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRoundOption("all_stations")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    roundOption === "all_stations"
                      ? "bg-white dark:bg-white/10 border-orange-500 shadow-2xs font-bold text-foreground"
                      : "bg-transparent border-stone-200 dark:border-white/10 text-stone-500"
                  )}
                >
                  <div className="font-mono text-xs">3 回合賽程</div>
                  <div className="text-[10px] font-normal text-stone-400 mt-0.5">每隊跑完 3 關</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRoundOption("all_opponents")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    roundOption === "all_opponents"
                      ? "bg-white dark:bg-white/10 border-orange-500 shadow-2xs font-bold text-foreground"
                      : "bg-transparent border-stone-200 dark:border-white/10 text-stone-500"
                  )}
                >
                  <div className="font-mono text-xs">4 回合賽程</div>
                  <div className="text-[10px] font-normal text-stone-400 mt-0.5">每隊交手 3 隊各 1 次</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200/70 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 hidden sm:block">
            <span>
              已選 {checkedCount} 關卡 · {teamCount} 隊伍
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full text-xs font-mono px-4 h-9"
            >
              取消
            </Button>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isSubmitting || checkedCount === 0}
              className="rounded-full text-xs font-mono font-medium px-5 h-9 bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isSubmitting ? "正在生成並同步..." : "一鍵智能生成"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
