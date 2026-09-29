"use client"

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Coffee
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
  const [teamCount, setTeamCount] = useState(4);
  const [targetStationCount, setTargetStationCount] = useState(3);
  const [firstRoundRestPlanIds, setFirstRoundRestPlanIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category stats
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    let totalCount = 0;
    plans.forEach((p) => {
      if (p.category === "activity") {
        totalCount++;
        const cat = stripHtml(p.scheduledName) || "未分類";
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });
    return {
      totalCount,
      categories: Array.from(map.entries()).map(([name, count]) => ({ name, count })),
    };
  }, [plans]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const hasInitializedCategory = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedCategory.current = false;
      return;
    }
    if (!hasInitializedCategory.current && categoryStats.categories.length > 0) {
      const preferred = categoryStats.categories.find(
        (c) => c.name.includes("闖關") || c.name.includes("遊戲")
      ) || categoryStats.categories[0];
      if (preferred) setSelectedCategory(preferred.name);
      hasInitializedCategory.current = true;
    }
  }, [categoryStats.categories, isOpen]);

  const [tableTitle, setTableTitle] = useState(`${day} 大地遊戲闖關表`);

  useEffect(() => {
    const catLabel = selectedCategory === "all" ? "大地遊戲" : selectedCategory;
    const suffix = catLabel.endsWith("闖關") || catLabel.endsWith("遊戲") || catLabel.endsWith("大賽") ? "輪轉表" : "闖關表";
    setTableTitle(`${day} ${catLabel}${suffix}`);
  }, [day, selectedCategory]);

  const filteredPlans = useMemo(() => {
    const activityPlans = plans.filter((p) => p.category === "activity");
    if (selectedCategory === "all") return activityPlans;
    return activityPlans.filter((p) => (stripHtml(p.scheduledName) || "未分類") === selectedCategory);
  }, [plans, selectedCategory]);

  const [stationItems, setStationItems] = useState<StationItemState[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const initialItems: StationItemState[] = filteredPlans.map((p, idx) => {
      const lead = stripHtml(p.leadMember) || stripHtml(p.members).split("、")[0] || stripHtml(p.members) || "";
      const assistant = stripHtml(p.assistantMember) || "";
      const loc = p.location || "";
      return {
        planId: p.id,
        checked: idx < 3,
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
    setTargetStationCount(Math.min(3, Math.max(1, filteredPlans.length)));
  }, [filteredPlans, isOpen]);

  const checkedStations = useMemo(() => stationItems.filter((s) => s.checked), [stationItems]);
  const checkedCount = checkedStations.length;
  const activeMatches = Math.floor(teamCount / 2);
  const maxRestCount = Math.max(0, checkedCount - activeMatches);

  // Sync and limit firstRoundRestPlanIds
  useEffect(() => {
    setFirstRoundRestPlanIds((prev) => {
      const validCheckedIds = new Set(stationItems.filter((s) => s.checked).map((s) => s.planId));
      const filtered = prev.filter((id) => validCheckedIds.has(id));
      if (filtered.length > maxRestCount) {
        return filtered.slice(0, maxRestCount);
      }
      return filtered;
    });
  }, [stationItems, maxRestCount]);

  const handleToggleRestStation = (planId: string) => {
    setFirstRoundRestPlanIds((prev) => {
      if (prev.includes(planId)) {
        return prev.filter((id) => id !== planId);
      }
      if (prev.length >= maxRestCount) {
        return prev;
      }
      return [...prev, planId];
    });
  };

  const handleStationCountChange = (count: number) => {
    setTargetStationCount(count);
    setStationItems((prev) => prev.map((item, idx) => ({ ...item, checked: idx < count })));
  };

  const handleStationFieldChange = (index: number, field: "name" | "location" | "lead" | "assistant", value: string) => {
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
      setTargetStationCount(next.filter((s) => s.checked).length);
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
        firstRoundRestStationIds: firstRoundRestPlanIds,
        stations: checked.map((s) => ({
          planId: s.planId, name: s.name, location: s.location, lead: s.lead, assistant: s.assistant,
        })),
      });
      const updatedPlans = checked
        .filter((s) => s.location !== s.originalLocation || s.lead !== s.originalLead || s.assistant !== s.originalAssistant)
        .map((s) => ({ id: s.planId, location: s.location, lead: s.lead, assistant: s.assistant }));
      await onGenerate(schedule, updatedPlans);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl studio-sheet shadow-2xl">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>智能排關</span>
            <span className="architectural-tag text-muted-foreground font-normal normal-case tracking-normal">
              {checkedCount} 關 · {teamCount} 隊
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            自動排定闖關輪轉表
          </DialogDescription>
        </DialogHeader>

        <div className="border-t hairline-divider" />

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">

          {/* Parameters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Day */}
            <div className="space-y-1">
              <span className="architectural-tag text-[10px]">天數</span>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-8 rounded-xl text-xs bg-background border-border text-foreground cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <span className="architectural-tag text-[10px]">教案類型</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 rounded-xl text-xs bg-background border-border text-foreground cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">全部 ({categoryStats.totalCount})</SelectItem>
                  {categoryStats.categories.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-xs">
                      {c.name} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Count */}
            <div className="space-y-1">
              <span className="architectural-tag text-[10px]">小隊數</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button" variant="outline" size="icon"
                  className="h-8 w-7 rounded-xl shrink-0"
                  disabled={teamCount <= 2}
                  onClick={() => setTeamCount((prev) => Math.max(2, prev - 2))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <div className="flex-1 text-center text-xs font-bold py-1.5 bg-background rounded-xl border border-border text-foreground">
                  {teamCount}
                </div>
                <Button
                  type="button" variant="outline" size="icon"
                  className="h-8 w-7 rounded-xl shrink-0"
                  disabled={teamCount >= 16}
                  onClick={() => setTeamCount((prev) => prev + 2)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Station Count */}
            <div className="space-y-1">
              <span className="architectural-tag text-[10px]">關卡數</span>
              <Select
                value={String(checkedCount || targetStationCount)}
                onValueChange={(val) => handleStationCountChange(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 rounded-xl text-xs bg-background border-border text-foreground cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={String(num)} disabled={num > stationItems.length} className="text-xs">
                      {num} 關{num === 4 ? " ☕" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optimization hint — single subtle line */}
          <p className="text-[10px] text-muted-foreground architectural-tag normal-case tracking-normal leading-relaxed">
            <Sparkles className="w-3 h-3 inline-block mr-1 text-primary align-[-2px]" />
            自動最佳化：① 競爭隊伍不同 ② 零重複闖關 ③ 關主隔關輪休
          </p>

          {/* Table Title */}
          <Input
            value={tableTitle}
            onChange={(e) => setTableTitle(e.target.value)}
            className="h-8 rounded-xl text-xs bg-background border-border text-foreground"
            placeholder="闖關表標題"
          />

          {/* ── 第一輪輪空選擇 (Round 1 BYE / Rest Selection) ── */}
          {maxRestCount > 0 ? (
            <div className="rounded-xl border border-border/80 studio-sheet p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-foreground">第一輪輪空關卡</span>
                  <span className="text-[10px] text-muted-foreground architectural-tag normal-case tracking-normal">
                    自由指定第 1 輪休息關卡
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {firstRoundRestPlanIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFirstRoundRestPlanIds([])}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                      firstRoundRestPlanIds.length >= maxRestCount
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    已選 {firstRoundRestPlanIds.length} / 上限 {maxRestCount} 關
                    {firstRoundRestPlanIds.length >= maxRestCount && " (已達上限)"}
                  </span>
                </div>
              </div>

              {/* Station chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {checkedStations.map((item, idx) => {
                  const isResting = firstRoundRestPlanIds.includes(item.planId);
                  const isLimitReached = firstRoundRestPlanIds.length >= maxRestCount;
                  const isDisabled = !isResting && isLimitReached;

                  return (
                    <button
                      key={item.planId}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleToggleRestStation(item.planId)}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-left",
                        isResting
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200 font-medium shadow-2xs cursor-pointer"
                          : isDisabled
                          ? "opacity-40 border-border/60 bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-background border-border hover:border-primary/40 hover:bg-accent/50 text-foreground cursor-pointer"
                      )}
                      title={isDisabled ? `已達第一輪輪空上限 (${maxRestCount} 關)` : undefined}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-black/5 dark:bg-white/10">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[130px]">{item.name}</span>
                      {isResting ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0 ml-0.5">
                          輪空 ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          出賽
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {firstRoundRestPlanIds.length === 0
                  ? `* 未選取時，系統將自動指定後續 ${maxRestCount} 關輪休。`
                  : firstRoundRestPlanIds.length < maxRestCount
                  ? `* 尚可指定 ${maxRestCount - firstRoundRestPlanIds.length} 關，未指定名額由系統自動指派。`
                  : `* 已選滿 ${maxRestCount} 關，第一輪由上述標記關卡輪空休息。`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-muted-foreground/70" />
                第一輪輪空：所有關卡全開出賽（{teamCount} 隊同時對抗）
              </span>
              <span className="architectural-tag text-[9px]">全開運作</span>
            </div>
          )}

          {/* ── Stations Checklist ── */}
          <div className="space-y-2">
            {stationItems.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-2xl">
                <p className="text-xs text-muted-foreground">此分類無活動教案</p>
              </div>
            ) : (
              stationItems.map((item, idx) => {
                const hasChanges =
                  item.location !== item.originalLocation ||
                  item.lead !== item.originalLead ||
                  item.assistant !== item.originalAssistant;

                return (
                  <div
                    key={item.planId}
                    className={cn(
                      "rounded-xl border transition-all duration-150",
                      item.checked
                        ? "studio-sheet shadow-2xs p-3"
                        : "opacity-40 border-border/50 p-3"
                    )}
                  >
                    {/* Row: checkbox + name */}
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id={`s-${item.planId}`}
                        checked={item.checked}
                        onCheckedChange={() => handleToggleCheck(idx)}
                        className="rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor={`s-${item.planId}`} className="text-xs font-semibold text-foreground cursor-pointer truncate flex-1">
                        {item.name}
                      </label>
                      {item.checked && firstRoundRestPlanIds.includes(item.planId) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 architectural-tag normal-case tracking-normal font-semibold">
                          第 1 輪輪空
                        </span>
                      )}
                      {hasChanges && item.checked && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 architectural-tag normal-case tracking-normal">已修改</span>
                      )}
                    </div>

                    {/* Editable fields (only when checked) */}
                    {item.checked && (
                      <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t hairline-divider">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />地點
                          </span>
                          <Input
                            value={item.location}
                            onChange={(e) => handleStationFieldChange(idx, "location", e.target.value)}
                            placeholder="地點"
                            className={cn(
                              "h-7 text-[11px] rounded-lg bg-background border-border",
                              item.location !== item.originalLocation && "border-emerald-500/50"
                            )}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-primary flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />主關主
                          </span>
                          <Input
                            value={item.lead}
                            onChange={(e) => handleStationFieldChange(idx, "lead", e.target.value)}
                            placeholder="負責人"
                            className={cn(
                              "h-7 text-[11px] rounded-lg bg-background border-border",
                              item.lead !== item.originalLead && "border-emerald-500/50"
                            )}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                            <UserPlus className="w-2.5 h-2.5" />副關主
                          </span>
                          <Input
                            value={item.assistant}
                            onChange={(e) => handleStationFieldChange(idx, "assistant", e.target.value)}
                            placeholder="副手"
                            className={cn(
                              "h-7 text-[11px] rounded-lg bg-background border-border",
                              item.assistant !== item.originalAssistant && "border-emerald-500/50"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t hairline-divider" />
        <div className="px-5 py-3 flex items-center justify-end gap-2">
          <Button
            type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}
            className="rounded-full text-xs h-8 px-4"
          >
            取消
          </Button>
          <Button
            type="button" onClick={handleGenerate}
            disabled={isSubmitting || checkedCount === 0}
            className="rounded-full text-xs font-medium h-8 px-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 btn-tactile cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            {isSubmitting ? "生成中..." : "生成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
