"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Layout,
  List,
  Lock,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Tent,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { accessibleCamps } from "@/lib/camp-access";
import { usePlans } from "@/hooks/use-plans";
import { useTranslation } from "@/lib/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Camp, Group } from "@/types/plan";

const cardClass =
  "overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-md text-card-foreground shadow-xs";

const popoverContentClass =
  "w-auto overflow-hidden rounded-xl border border-stone-200/80 bg-white/95 p-0 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#14191C]/95";

function parseLocalDate(iso?: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function useIsDesktopSm(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function TimelineSingleDatePicker({
  label,
  value,
  fallbackMonth,
  onSelectDate,
  onClear,
}: {
  label: string;
  value: string;
  fallbackMonth: Date;
  onSelectDate: (iso: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parseLocalDate(value) ?? fallbackMonth);
  const selectedDate = useMemo(() => parseLocalDate(value) ?? undefined, [value]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setMonth(parseLocalDate(value) ?? fallbackMonth);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2 text-left font-mono text-xs transition-all hover:border-orange-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 dark:border-white/10 dark:bg-white/5"
        >
          <span className={cn("truncate", value ? "text-foreground" : "font-sans text-muted-foreground")}>
            {value || "點選日期"}
          </span>
          <Calendar className="size-3.5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={popoverContentClass}>
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 px-3.5 py-2.5 text-xs dark:border-white/10">
          <span className="font-medium text-muted-foreground">點選{label}日期</span>
          {value && (
            <span className="rounded-md bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-orange-700 dark:text-orange-300">
              {value}
            </span>
          )}
        </div>
        <CalendarPicker
          mode="single"
          locale={zhTW}
          month={month}
          onMonthChange={setMonth}
          selected={selectedDate}
          onSelect={(day) => {
            if (!day) return;
            onSelectDate(formatLocalDate(day));
            setOpen(false);
          }}
        />
        <div className="flex items-center justify-between border-t border-stone-200/70 px-3 py-2 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMonth(new Date())}
          >
            回到本月
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              清除日期
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimelineRangeDatePicker({
  label,
  startVal,
  endVal,
  fallbackMonth,
  onSelectRange,
  onClear,
}: {
  label: string;
  startVal: string;
  endVal: string;
  fallbackMonth: Date;
  onSelectRange: (startIso: string, endIso: string) => void;
  onClear: () => void;
}) {
  const isDesktop = useIsDesktopSm();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parseLocalDate(startVal) ?? fallbackMonth);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setPendingStart(null);
    setHoveredDay(null);
    if (nextOpen) {
      setMonth(parseLocalDate(startVal) ?? fallbackMonth);
    }
  };

  const displayedRange = useMemo<DateRange | undefined>(() => {
    if (pendingStart) {
      if (hoveredDay) {
        const [from, to] = hoveredDay < pendingStart ? [hoveredDay, pendingStart] : [pendingStart, hoveredDay];
        return { from, to };
      }
      return { from: pendingStart, to: undefined };
    }
    const from = parseLocalDate(startVal);
    if (!from) return undefined;
    const to = parseLocalDate(endVal) ?? from;
    return to < from ? { from: to, to: from } : { from, to };
  }, [pendingStart, hoveredDay, startVal, endVal]);

  const handleDayClick = (day: Date) => {
    if (!pendingStart) {
      setPendingStart(day);
      setHoveredDay(null);
      return;
    }
    const [startDate, endDate] = day < pendingStart ? [day, pendingStart] : [pendingStart, day];
    onSelectRange(formatLocalDate(startDate), formatLocalDate(endDate));
    setPendingStart(null);
    setHoveredDay(null);
    setOpen(false);
  };

  const displayLabel = startVal
    ? endVal && endVal !== startVal
      ? `${startVal} ➔ ${endVal}`
      : startVal
    : "";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}日期區間`}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2 text-left font-mono text-xs transition-all hover:border-orange-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 dark:border-white/10 dark:bg-white/5"
        >
          <span className={cn("truncate", displayLabel ? "text-foreground" : "font-sans text-muted-foreground")}>
            {displayLabel || "點選開始與結束日期"}
          </span>
          <Calendar className="size-3.5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={popoverContentClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 px-3.5 py-2.5 text-xs dark:border-white/10">
          {pendingStart ? (
            <span className="font-medium text-orange-600 dark:text-orange-400">
              已選開始日 {formatLocalDate(pendingStart)} · 請點選結束日期（再點同一天可設為單日）
            </span>
          ) : (
            <>
              <span className="font-medium text-muted-foreground">點選兩個日期設定{label}區間</span>
              {displayLabel && (
                <span className="rounded-md bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-orange-700 dark:text-orange-300">
                  {displayLabel}
                </span>
              )}
            </>
          )}
        </div>
        <CalendarPicker
          mode="range"
          locale={zhTW}
          numberOfMonths={isDesktop ? 2 : 1}
          month={month}
          onMonthChange={setMonth}
          selected={displayedRange}
          onSelect={() => {}}
          onDayClick={handleDayClick}
          onDayMouseEnter={(day) => {
            if (pendingStart) setHoveredDay(day);
          }}
          onDayMouseLeave={() => {
            if (pendingStart) setHoveredDay(null);
          }}
        />
        <div className="flex items-center justify-between border-t border-stone-200/70 px-3 py-2 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMonth(new Date())}
          >
            回到本月
          </Button>
          {pendingStart ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
              onClick={() => {
                setPendingStart(null);
                setHoveredDay(null);
              }}
            >
              重選
            </Button>
          ) : (
            (startVal || endVal) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                清除日期
              </Button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function describeDateStatus(startIso?: string, endIso?: string) {
  const start = parseLocalDate(startIso);
  if (!start) return null;
  const end = parseLocalDate(endIso) || start;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msDay = 86_400_000;
  const diffStart = Math.round((start.getTime() - today.getTime()) / msDay);
  const diffEnd = Math.round((end.getTime() - today.getTime()) / msDay);
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msDay) + 1);

  let status: string;
  let tone: "upcoming" | "today" | "past";
  if (diffStart === 0 || (diffStart < 0 && diffEnd >= 0)) {
    status = diffStart === 0 && spanDays === 1 ? "今天" : "進行中";
    tone = "today";
  } else if (diffStart > 0) {
    status = `還有 ${diffStart} 天`;
    tone = "upcoming";
  } else {
    status = "已結束";
    tone = "past";
  }

  const duration = endIso && spanDays > 1 ? `${spanDays} 天 ${spanDays - 1} 夜` : endIso ? "1 天" : null;
  return { status, tone, duration };
}

function CustomGroupRow({
  group,
  planCount,
  isConfirmingDelete,
  onSave,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  group: Group;
  planCount: number;
  isConfirmingDelete: boolean;
  onSave: (updates: Partial<Group>) => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [nameZh, setNameZh] = useState(group.nameZh);
  const [nameEn, setNameEn] = useState(group.nameEn);
  const [slug, setSlug] = useState(group.slug);
  const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);

  useEffect(() => setNameZh(group.nameZh), [group.nameZh]);
  useEffect(() => setNameEn(group.nameEn), [group.nameEn]);
  useEffect(() => setSlug(group.slug), [group.slug]);

  const commit = () => {
    const cleanZh = nameZh.trim() || group.nameZh;
    const cleanEn = nameEn.trim() || cleanZh;
    const cleanSlug = slug.trim() || group.slug;
    if (cleanZh === group.nameZh && cleanEn === group.nameEn && cleanSlug === group.slug) {
      setNameZh(group.nameZh);
      setNameEn(group.nameEn);
      setSlug(group.slug);
      return;
    }
    onSave({ nameZh: cleanZh, nameEn: cleanEn, slug: cleanSlug });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200/70 bg-stone-50/60 p-3 dark:border-white/5 dark:bg-white/[0.02] md:grid md:grid-cols-[1.2fr_1.4fr_1fr_auto_auto] md:items-center md:gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full shadow-xs", badgeParams.colorDot)} aria-hidden="true" />
        <Input
          aria-label="組別中文名稱"
          placeholder="中文名稱"
          value={nameZh}
          onChange={(e) => setNameZh(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-9 rounded-lg border-stone-200/80 bg-white text-xs dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <Input
        aria-label="組別英文名稱"
        placeholder="English Name"
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-9 rounded-lg border-stone-200/80 bg-white text-xs dark:border-white/10 dark:bg-white/5"
      />
      <Input
        aria-label="組別路由"
        placeholder="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-9 rounded-lg border-stone-200/80 bg-white font-mono text-xs dark:border-white/10 dark:bg-white/5"
      />
      <span className="inline-flex w-fit items-center rounded-full bg-stone-200/60 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
        {planCount} 份教案
      </span>
      <div className="flex justify-end">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="destructive" className="h-8 text-xs" onClick={onConfirmDelete}>
              確定刪除？
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancelDelete}>
              取消
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`刪除 ${group.nameZh}`}
            className="h-8 w-8 rounded-lg text-stone-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            onClick={onRequestDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface WorkspaceSettingsProps {
  initialAddingProject?: boolean;
  onAddingProjectHandled?: () => void;
}

export function WorkspaceSettings({
  initialAddingProject = false,
  onAddingProjectHandled,
}: WorkspaceSettingsProps) {
  const { role } = useAuth();
  const {
    camps,
    defaultCampId,
    setDefaultCampId,
    activeCampId,
    setActiveCampId,
    updateCamp,
    addCamp,
    activityTypes,
    addActivityType,
    removeActivityType,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    plans,
  } = usePlans();
  const { language, t } = useTranslation();
  const { toast } = useToast();

  const isAdmin = role === "admin";
  const activeCamp = camps.find(c => c.id === activeCampId);
  const visibleCamps = useMemo(() => accessibleCamps(camps, role), [camps, role]);

  const [campSearch, setCampSearch] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(initialAddingProject);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [editingCampName, setEditingCampName] = useState("");

  const [timelineSaved, setTimelineSaved] = useState(false);
  const timelineTimerRef = useRef<number | null>(null);

  const [groupSaved, setGroupSaved] = useState(false);
  const groupSavedTimerRef = useRef<number | null>(null);
  const [newGroupNameZh, setNewGroupNameZh] = useState("");
  const [newGroupNameEn, setNewGroupNameEn] = useState("");
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const deleteGroupTimerRef = useRef<number | null>(null);

  const [newActivityType, setNewActivityType] = useState("");
  const [lastRemovedTag, setLastRemovedTag] = useState<string | null>(null);
  const removedTagTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialAddingProject && isAdmin) {
      setIsAddingProject(true);
      onAddingProjectHandled?.();
    }
  }, [initialAddingProject, isAdmin, onAddingProjectHandled]);

  useEffect(() => {
    return () => {
      if (timelineTimerRef.current) window.clearTimeout(timelineTimerRef.current);
      if (groupSavedTimerRef.current) window.clearTimeout(groupSavedTimerRef.current);
      if (deleteGroupTimerRef.current) window.clearTimeout(deleteGroupTimerRef.current);
      if (removedTagTimerRef.current) window.clearTimeout(removedTagTimerRef.current);
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const projectTemplates = [`${currentYear} 暑期營隊`, `${currentYear + 1} 寒假營隊`];

  const filteredCamps = useMemo(() => {
    const q = campSearch.trim().toLowerCase();
    if (!q) return visibleCamps;
    return visibleCamps.filter(c => c.name.toLowerCase().includes(q));
  }, [visibleCamps, campSearch]);

  const trimmedNewProject = newProjectName.trim();
  const duplicateProject = trimmedNewProject
    ? camps.some(c => c.name.trim().toLowerCase() === trimmedNewProject.toLowerCase())
    : false;

  const handleCreateProject = () => {
    if (!trimmedNewProject) {
      toast({
        title: t("ENTER_PROJECT_NAME_REQUIRED"),
        description: t("PROJECT_NAME_REQUIRED_DESC"),
        variant: "destructive",
      });
      return;
    }
    addCamp(trimmedNewProject);
    setNewProjectName("");
    setIsAddingProject(false);
    toast({ title: t("PROJECT_CREATED"), description: t("PROJECT_CREATED_DESC", { name: trimmedNewProject }) });
  };

  const submitRenameCamp = (id: string) => {
    const name = editingCampName.trim();
    if (!name) {
      toast({ title: t("NAME_CANNOT_BE_EMPTY"), description: t("ENTER_NEW_PROJECT_NAME"), variant: "destructive" });
      return;
    }
    updateCamp(id, { name });
    setEditingCampId(null);
    setEditingCampName("");
    toast({ title: t("PROJECT_RENAMED"), description: t("PROJECT_RENAMED_DESC", { name }) });
  };

  const timelineFields = [
    { startKey: "meeting1StartDate" as const, endKey: "meeting1EndDate" as const, label: "一收", icon: Clock, type: "single" as const },
    { startKey: "meeting2StartDate" as const, endKey: "meeting2EndDate" as const, label: "二收", icon: Clock, type: "single" as const },
    { startKey: "meeting3StartDate" as const, endKey: "meeting3EndDate" as const, label: "三收", icon: Clock, type: "single" as const },
    { startKey: "trainingStartDate" as const, endKey: "trainingEndDate" as const, label: "營隊集訓", icon: Clock, type: "range" as const },
    { startKey: "siteStartDate" as const, endKey: "siteEndDate" as const, label: "駐站", icon: MapPin, type: "single" as const },
    { startKey: "campStartDate" as const, endKey: "campEndDate" as const, label: "營期", icon: Tent, type: "range" as const },
  ];

  const markTimelineSaved = () => {
    setTimelineSaved(true);
    if (timelineTimerRef.current) window.clearTimeout(timelineTimerRef.current);
    timelineTimerRef.current = window.setTimeout(() => setTimelineSaved(false), 2500);
  };

  const updateCampTimeline = (updates: Partial<Camp>) => {
    if (!activeCampId) return;
    updateCamp(activeCampId, updates);
    markTimelineSaved();
  };

  const filledMilestoneCount = activeCamp
    ? timelineFields.filter(f => Boolean(activeCamp[f.startKey])).length
    : 0;

  const defaultCalendarMonth = useMemo(() => {
    if (!activeCamp) return new Date();
    const candidates = [
      activeCamp.meeting1StartDate,
      activeCamp.meeting2StartDate,
      activeCamp.meeting3StartDate,
      activeCamp.trainingStartDate,
      activeCamp.siteStartDate,
      activeCamp.campStartDate,
    ];
    for (const iso of candidates) {
      const parsed = parseLocalDate(iso);
      if (parsed) return parsed;
    }
    return new Date();
  }, [activeCamp]);

  const markGroupSaved = () => {
    setGroupSaved(true);
    if (groupSavedTimerRef.current) window.clearTimeout(groupSavedTimerRef.current);
    groupSavedTimerRef.current = window.setTimeout(() => setGroupSaved(false), 2500);
  };

  const planCountByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plan of plans) {
      if (activeCampId && plan.campId !== activeCampId) continue;
      const gKey = (plan.groupId || "").trim().toLowerCase();
      const cKey = (plan.category || "").trim().toLowerCase();
      const matched =
        groups.find(g => g.id === plan.groupId || g.slug.toLowerCase() === gKey) ||
        groups.find(g => g.slug.toLowerCase() === cKey);
      if (matched) counts.set(matched.id, (counts.get(matched.id) ?? 0) + 1);
    }
    return counts;
  }, [plans, groups, activeCampId]);

  const trimmedGroupZh = newGroupNameZh.trim();
  const duplicateGroup = trimmedGroupZh
    ? groups.some(g => g.nameZh.trim().toLowerCase() === trimmedGroupZh.toLowerCase())
    : false;

  const handleAddGroup = () => {
    if (!trimmedGroupZh || duplicateGroup) return;
    addGroup({ nameZh: trimmedGroupZh, nameEn: newGroupNameEn.trim() || undefined });
    setNewGroupNameZh("");
    setNewGroupNameEn("");
    markGroupSaved();
    toast({ title: "已新增組別", description: `已建立「${trimmedGroupZh}」。` });
  };

  const requestDeleteGroup = (id: string) => {
    setConfirmDeleteGroupId(id);
    if (deleteGroupTimerRef.current) window.clearTimeout(deleteGroupTimerRef.current);
    deleteGroupTimerRef.current = window.setTimeout(() => setConfirmDeleteGroupId(null), 5000);
  };

  const planCountByActivityType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plan of plans) {
      if (activeCampId && plan.campId !== activeCampId) continue;
      const key = (plan.scheduledName || "").trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [plans, activeCampId]);

  const trimmedTag = newActivityType.trim();
  const duplicateTag = trimmedTag
    ? activityTypes.some(item => item.trim().toLowerCase() === trimmedTag.toLowerCase())
    : false;

  const handleAddTag = () => {
    if (!trimmedTag || duplicateTag) return;
    addActivityType(trimmedTag);
    setNewActivityType("");
    toast({ title: "已新增活動類別", description: `已加入「${trimmedTag}」。` });
  };

  const handleRemoveTag = (tag: string) => {
    removeActivityType(tag);
    setLastRemovedTag(tag);
    if (removedTagTimerRef.current) window.clearTimeout(removedTagTimerRef.current);
    removedTagTimerRef.current = window.setTimeout(() => setLastRemovedTag(null), 6000);
    toast({ title: "已移除活動類別", description: `「${tag}」已從標籤清單移除。` });
  };

  return (
    <div className="space-y-8">
      {/* ── 01. PROJECT DIRECTORY ── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="architectural-tag">01</span>
            <h2 className="flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-widest text-foreground">
              <Layout className="size-4 text-orange-500" aria-hidden="true" />
              {t("PROJECT_DIRECTORY")}
            </h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
              {visibleCamps.length} 個專案
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {visibleCamps.length > 4 && (
              <div className="relative w-48 sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={campSearch}
                  onChange={(e) => setCampSearch(e.target.value)}
                  placeholder="搜尋營隊專案…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            )}
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-orange-500/40 px-4 font-mono text-xs uppercase tracking-wider text-orange-600 transition-all hover:bg-orange-500/10 dark:text-orange-400"
                onClick={() => {
                  setIsAddingProject(prev => !prev);
                  if (isAddingProject) setNewProjectName("");
                }}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {isAddingProject ? t("COLLAPSE") : t("NEW_PROJECT")}
              </Button>
            )}
          </div>
        </div>

        {isAdmin && isAddingProject && (
          <div className={cn(cardClass, "space-y-3 border-orange-500/30 p-5 shadow-md")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder={t("CREATE_PROJECT_PLACEHOLDER")}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                  if (e.key === "Escape") {
                    setIsAddingProject(false);
                    setNewProjectName("");
                  }
                }}
                className="h-10 rounded-lg"
                autoFocus
              />
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  disabled={!trimmedNewProject}
                  className="h-10 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 font-mono text-xs text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                  onClick={handleCreateProject}
                >
                  <Check className="mr-1.5 size-4" aria-hidden="true" />
                  {t("CREATE")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-lg px-4 font-mono text-xs text-fg-muted"
                  onClick={() => {
                    setIsAddingProject(false);
                    setNewProjectName("");
                  }}
                >
                  <X className="mr-1.5 size-4" aria-hidden="true" />
                  {t("CANCEL")}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Sparkles className="size-3.5 text-orange-500" aria-hidden="true" />
                快速套用：
              </span>
              {projectTemplates.map(template => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setNewProjectName(template)}
                  className="rounded-full border border-stone-200/80 bg-background/70 px-3 py-1 text-xs text-foreground transition-colors hover:border-orange-500/40 hover:bg-orange-500/5 dark:border-white/10 cursor-pointer"
                >
                  {template}
                </button>
              ))}
              {duplicateProject && (
                <span className="ml-auto text-xs text-amber-700 dark:text-amber-300">
                  已有同名專案，建議加上梯次或年份區分
                </span>
              )}
            </div>
          </div>
        )}

        <div className={cardClass}>
          <div className="divide-y divide-stone-200/60 dark:divide-white/5">
            {visibleCamps.length === 0 && (
              <div
                data-testid="settings-camps-empty"
                className="flex flex-col items-center justify-center p-10 text-center sm:p-14"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-stone-200/60 bg-stone-100 text-stone-400 dark:border-white/10 dark:bg-white/5">
                  <Lock className="size-5" aria-hidden="true" />
                </div>
                <h4 className="text-base font-normal text-foreground">
                  {t("NO_ACCESSIBLE_PROJECTS")}
                </h4>
                <p className="mt-1.5 max-w-sm font-mono text-xs text-fg-muted">
                  {t("NO_ACCESSIBLE_PROJECTS_DESC")}
                </p>
              </div>
            )}
            {visibleCamps.length > 0 && filteredCamps.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                找不到符合「{campSearch}」的營隊專案
              </p>
            )}
            {filteredCamps.map((camp, idx) => {
              const isCurrent = activeCampId === camp.id;
              const isDefault = defaultCampId === camp.id;
              const idxStr = String(idx + 1).padStart(2, "0");
              const dateMeta = describeDateStatus(camp.campStartDate, camp.campEndDate);

              return (
                <div
                  key={camp.id}
                  data-testid={`settings-camp-row-${camp.id}`}
                  className={cn(
                    "group flex flex-col gap-3 p-4 transition-colors hover:bg-orange-500/[0.02] dark:hover:bg-orange-500/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-5 cursor-pointer",
                    isCurrent && "bg-orange-500/[0.04] dark:bg-orange-500/[0.06]",
                  )}
                  onClick={() => {
                    if (editingCampId === camp.id) return;
                    if (activeCampId === camp.id) return;
                    setActiveCampId(camp.id);
                    toast({
                      title: t("SWITCHING_PROJECT"),
                      description: t("SWITCHING_PROJECT_DESC", { name: camp.name }),
                    });
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
                    <span className="w-6 shrink-0 font-mono text-xs text-fg-muted transition-colors group-hover:text-orange-500">
                      {idxStr}
                    </span>
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        isCurrent
                          ? "border-orange-500/30 bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "border-stone-200/60 bg-stone-100 text-stone-400 group-hover:text-orange-500 dark:border-white/10 dark:bg-white/5",
                      )}
                    >
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingCampId === camp.id ? (
                        <Input
                          value={editingCampName}
                          onChange={(e) => setEditingCampName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRenameCamp(camp.id);
                            if (e.key === "Escape") {
                              setEditingCampId(null);
                              setEditingCampName("");
                            }
                          }}
                          className="h-9 w-full max-w-[260px] rounded-lg border-orange-500 bg-white dark:bg-white/10"
                          autoFocus
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-medium text-foreground transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400">
                            {camp.name}
                          </h4>
                          {isCurrent && (
                            <span className="rounded-full border border-orange-500/30 bg-orange-500/15 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-orange-700 dark:text-orange-300">
                              {t("ACTIVE_CORE")}
                            </span>
                          )}
                          {isDefault && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              <Star className="size-2.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                              {t("DEFAULT_PROJECT")}
                            </span>
                          )}
                          {isAdmin && camp.isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                              <Lock className="size-3" aria-hidden="true" />
                              已鎖定
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-fg-muted">
                        <span>
                          {t("ESTABLISHED")}:{" "}
                          {camp.campStartDate
                            ? camp.campEndDate && camp.campEndDate !== camp.campStartDate
                              ? `${camp.campStartDate} → ${camp.campEndDate}`
                              : camp.campStartDate
                            : t("CONTINUOUS")}
                        </span>
                        {dateMeta && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-sans text-[11px]",
                              dateMeta.tone === "today"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : dateMeta.tone === "upcoming"
                                  ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                                  : "bg-stone-100 text-muted-foreground dark:bg-white/10",
                            )}
                          >
                            {dateMeta.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                    {isAdmin && (
                      <>
                        {editingCampId === camp.id ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                submitRenameCamp(camp.id);
                              }}
                              title={t("SAVE_NAME")}
                            >
                              <Check className="size-4" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCampId(null);
                                setEditingCampName("");
                              }}
                              title={t("CANCEL")}
                            >
                              <X className="size-4" aria-hidden="true" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCampId(camp.id);
                              setEditingCampName(camp.name);
                            }}
                            title={t("EDIT_NAME")}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-8 rounded-lg transition-colors",
                            camp.isLocked
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextLocked = !camp.isLocked;
                            updateCamp(camp.id, { isLocked: nextLocked });
                            toast({
                              title: nextLocked ? "已鎖定專案" : "已解鎖專案",
                              description: nextLocked
                                ? `「${camp.name}」已對隊輔隱藏，僅管理員可檢視。`
                                : `「${camp.name}」已開放所有營隊成員存取。`,
                            });
                          }}
                          title={camp.isLocked ? (language === "zh" ? "解鎖專案" : "Unlock Project") : (language === "zh" ? "鎖定專案" : "Lock Project")}
                        >
                          {camp.isLocked ? <Lock className="size-3.5" aria-hidden="true" /> : <Unlock className="size-3.5" aria-hidden="true" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-8 rounded-lg transition-colors",
                            isDefault
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "text-stone-400 hover:bg-stone-100 hover:text-amber-500 dark:hover:bg-white/5",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultCampId(camp.id);
                            toast({
                              title: t("DEFAULT_PROJECT_SET"),
                              description: t("DEFAULT_PROJECT_SET_DESC", { name: camp.name }),
                            });
                          }}
                          title={isDefault ? t("DEFAULT_PROJECT") : t("SET_AS_DEFAULT_PROJECT")}
                        >
                          <Star className={cn("size-3.5", isDefault && "fill-current")} aria-hidden="true" />
                        </Button>
                      </>
                    )}
                    <ChevronRight
                      className={cn(
                        "size-4 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-stone-600",
                        isCurrent && "text-orange-500",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 02. TIMELINE SCHEDULE ── */}
      {isAdmin && activeCamp && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="architectural-tag">02</span>
              <h2 className="flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-widest text-foreground">
                <Calendar className="size-4 text-orange-500" aria-hidden="true" />
                {t("TIMELINE_SETUP")}
              </h2>
              <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                {activeCamp.name}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
                已設定 {filledMilestoneCount} / {timelineFields.length}
              </span>
            </div>
            {timelineSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="size-3.5" aria-hidden="true" />
                已自動儲存
              </span>
            )}
          </div>

          <div className={cn(cardClass, "p-5 sm:p-6")}>
            <div className="divide-y divide-stone-200/60 dark:divide-white/5">
              {timelineFields.map((field) => {
                const Icon = field.icon;
                const startVal = (activeCamp[field.startKey] as string) || "";
                const endVal = field.type === "range" ? ((activeCamp[field.endKey] as string) || "") : "";
                const hasValue = Boolean(startVal || endVal);
                const meta = describeDateStatus(startVal, field.type === "range" ? endVal : undefined);

                return (
                  <div
                    key={field.label}
                    className="group flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Icon className="size-4 text-orange-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-foreground">{field.label}</span>
                      {meta && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            meta.tone === "today"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : meta.tone === "upcoming"
                                ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                                : "bg-stone-100 text-muted-foreground dark:bg-white/10",
                          )}
                        >
                          {meta.status}
                          {meta.duration ? ` · ${meta.duration}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[340px]">
                      <div className="min-w-0 flex-1">
                        {field.type === "single" ? (
                          <TimelineSingleDatePicker
                            label={field.label}
                            value={startVal}
                            fallbackMonth={defaultCalendarMonth}
                            onSelectDate={(iso) => updateCampTimeline({ [field.startKey]: iso })}
                            onClear={() => updateCampTimeline({ [field.startKey]: "" })}
                          />
                        ) : (
                          <TimelineRangeDatePicker
                            label={field.label}
                            startVal={startVal}
                            endVal={endVal}
                            fallbackMonth={defaultCalendarMonth}
                            onSelectRange={(nextStart, nextEnd) =>
                              updateCampTimeline({ [field.startKey]: nextStart, [field.endKey]: nextEnd })
                            }
                            onClear={() =>
                              updateCampTimeline({ [field.startKey]: "", [field.endKey]: "" })
                            }
                          />
                        )}
                      </div>
                      {hasValue && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`清除${field.label}日期`}
                          title="清除日期"
                          onClick={() =>
                            updateCampTimeline(
                              field.type === "range"
                                ? { [field.startKey]: "", [field.endKey]: "" }
                                : { [field.startKey]: "" },
                            )
                          }
                          className="size-8 shrink-0 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/5"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 03. GROUP MANAGEMENT ── */}
      {isAdmin && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="architectural-tag">03</span>
              <h2 className="flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-widest text-foreground">
                <List className="size-4 text-orange-500" aria-hidden="true" />
                {language === "zh" ? "組別架構管理" : "Division Structure Management"}
              </h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
                {groups.length} 個組別
              </span>
            </div>
            {groupSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="size-3.5" aria-hidden="true" />
                已自動儲存
              </span>
            )}
          </div>

          <div className={cn(cardClass, "p-5 sm:p-6")}>
            <div className="mb-3 hidden px-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted md:grid md:grid-cols-[1.2fr_1.4fr_1fr_auto_auto] md:gap-3">
              <div>{language === "zh" ? "中文名稱" : "Chinese Name"}</div>
              <div>{language === "zh" ? "英文名稱" : "English Name"}</div>
              <div>{language === "zh" ? "路由 / 縮寫" : "Route / Slug"}</div>
              <div>教案數</div>
              <div className="w-10 text-right">{language === "zh" ? "操作" : "Action"}</div>
            </div>

            <div className="mb-5 space-y-2.5">
              {groups.map((group) => {
                const isDefault = group.slug === "activity" || group.slug === "teaching" || group.slug === "admin";
                const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                const planCount = planCountByGroup.get(group.id) ?? 0;

                if (isDefault) {
                  return (
                    <div
                      key={group.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200/60 bg-stone-50/40 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.015] md:grid md:grid-cols-[1.2fr_1.4fr_1fr_auto_auto] md:gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2.5 shrink-0 rounded-full", badgeParams.colorDot)} aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground">{group.nameZh}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{group.nameEn}</span>
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                            badgeParams.softBg,
                            badgeParams.softText,
                            badgeParams.softBorder,
                          )}
                        >
                          /{group.slug}
                        </span>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full bg-stone-200/60 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
                        {planCount} 份教案
                      </span>
                      <span className="rounded-full border border-stone-200/80 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground dark:border-white/10">
                        系統預設
                      </span>
                    </div>
                  );
                }

                return (
                  <CustomGroupRow
                    key={group.id}
                    group={group}
                    planCount={planCount}
                    isConfirmingDelete={confirmDeleteGroupId === group.id}
                    onSave={(updates) => {
                      updateGroup(group.id, updates);
                      markGroupSaved();
                    }}
                    onRequestDelete={() => requestDeleteGroup(group.id)}
                    onConfirmDelete={() => {
                      deleteGroup(group.id);
                      setConfirmDeleteGroupId(null);
                      markGroupSaved();
                      toast({ title: "已刪除組別", description: `已移除自訂組別「${group.nameZh}」。` });
                    }}
                    onCancelDelete={() => setConfirmDeleteGroupId(null)}
                  />
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[1.2fr_1.4fr_1fr_auto] md:items-center">
                <Input
                  placeholder={language === "zh" ? "新增中文名稱（必填）" : "New Chinese Name"}
                  value={newGroupNameZh}
                  onChange={(e) => setNewGroupNameZh(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGroup();
                  }}
                  className="h-9 rounded-lg border-stone-200/80 bg-white text-xs dark:border-white/10 dark:bg-white/5"
                />
                <Input
                  placeholder="English Name（選填）"
                  value={newGroupNameEn}
                  onChange={(e) => setNewGroupNameEn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGroup();
                  }}
                  className="h-9 rounded-lg border-stone-200/80 bg-white text-xs dark:border-white/10 dark:bg-white/5"
                />
                <span className="px-1 font-mono text-[11px] italic text-fg-muted">
                  {language === "zh" ? "自動產生 Slug" : "Auto Slug"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={!trimmedGroupZh || duplicateGroup}
                  onClick={handleAddGroup}
                  className="h-9 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 font-mono text-xs text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                >
                  {language === "zh" ? "新增組別" : "Add"}
                </Button>
              </div>
              {duplicateGroup && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  已有相同名稱的組別「{trimmedGroupZh}」
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 04. ACTIVITY TYPES ── */}
      {isAdmin && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="architectural-tag">04</span>
            <h2 className="flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-widest text-foreground">
              <Tag className="size-4 text-orange-500" aria-hidden="true" />
              {language === "zh" ? "活動類別標籤" : "Activity Category Tags"}
            </h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-white/10">
              {activityTypes.length} 個標籤
            </span>
          </div>

          <div className={cn(cardClass, "space-y-4 p-5 sm:p-6")}>
            <div className="flex flex-wrap gap-2">
              {activityTypes?.map((type) => {
                const count = planCountByActivityType.get(type) ?? 0;
                return (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-100/80 px-3 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/5"
                  >
                    <span>{type}</span>
                    {count > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground">· {count}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`移除 ${type}`}
                      onClick={() => handleRemoveTag(type)}
                      className="ml-0.5 rounded-full p-0.5 text-stone-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </div>

            {lastRemovedTag && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <span>已移除標籤「{lastRemovedTag}」</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    addActivityType(lastRemovedTag);
                    setLastRemovedTag(null);
                    if (removedTagTimerRef.current) window.clearTimeout(removedTagTimerRef.current);
                  }}
                  className="h-7 gap-1 text-xs text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  復原
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex max-w-md items-center gap-2.5">
                <Input
                  placeholder={language === "zh" ? "新增活動類型（例如：晚會活動）" : "Add activity type"}
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="h-10 rounded-lg text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                  }}
                />
                <Button
                  type="button"
                  disabled={!trimmedTag || duplicateTag}
                  onClick={handleAddTag}
                  className="h-10 shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 font-mono text-xs text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                >
                  {language === "zh" ? "新增" : "Add"}
                </Button>
              </div>
              {duplicateTag && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  此類別「{trimmedTag}」已存在
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
