"use client";

import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Check, ChevronDown, ChevronRight, History, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlanVersion } from "@/types/plan";

const autoSaveInterval = 10 * 60 * 1000;

function isAutoSave(version: PlanVersion) {
  return version.isAuto ?? (version.type === "patch" || /^Auto Save(?: - | \(Exit\)$)/.test(version.name));
}

function isNamed(version: PlanVersion) {
  return Boolean(version.versionName?.trim() || (!isAutoSave(version) && version.name.trim()));
}

interface VersionHistorySidebarProps {
  versions: PlanVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: PlanVersion) => void;
  onDelete?: (versionId: string) => void | Promise<void>;
  onBackToCurrent: () => void;
  onUpdateVersionName?: (versionId: string, name: string) => void | Promise<void>;
  onSaveVersion?: (name: string) => void | Promise<void>;
  onClose: () => void;
}

export function VersionHistorySidebar({
  versions, selectedVersionId, onSelectVersion, onDelete, onBackToCurrent,
  onUpdateVersionName, onSaveVersion, onClose,
}: VersionHistorySidebarProps) {
  const [namedOnly, setNamedOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  const days = new Map<string, PlanVersion[][]>();
  for (const version of versions) {
    if (namedOnly && !isNamed(version)) continue;
    const date = new Date(version.createdAt);
    const day = isToday(date) ? "今天" : isYesterday(date) ? "昨天" : "更早 · " + format(date, "yyyy/MM/dd");
    const groups = days.get(day) ?? [];
    const group = groups[groups.length - 1];
    if (group && isAutoSave(version) && !isNamed(version) && isAutoSave(group[0]) &&
        !isNamed(group[0]) && group[0].createdAt - version.createdAt <= autoSaveInterval) {
      group.push(version);
    } else {
      groups.push([version]);
    }
    days.set(day, groups);
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setNameError(false);
  };

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId || saving) return;
    const name = editName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    setNameError(false);
    try {
      if (editingId === "current") await onSaveVersion?.(name);
      else await onUpdateVersionName?.(editingId, name);
      setEditingId(null);
    } catch {
      setNameError(true);
    } finally {
      setSaving(false);
    }
  };

  const nameForm = (current: boolean) => (
    <form onSubmit={saveName} className="flex flex-wrap items-center gap-1 p-2">
      <Input
        data-testid={current ? "version-save-input" : undefined}
        aria-label="版本名稱"
        placeholder="版本名稱"
        value={editName}
        maxLength={120}
        onChange={(event) => setEditName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) setEditingId(null);
        }}
        className="h-8 min-w-0 flex-1"
        autoFocus
      />
      <Button size="icon" variant="ghost" type="submit" disabled={saving}
        data-testid={current ? "version-save-confirm" : undefined}
        aria-label="儲存名稱" className="h-8 w-8"><Check className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" type="button" disabled={saving}
        onClick={() => setEditingId(null)} aria-label="取消命名" className="h-8 w-8"><X className="h-4 w-4" /></Button>
      {nameError && <p role="alert" className="w-full text-xs text-destructive">儲存名稱失敗，請再試一次。</p>}
    </form>
  );

  const versionRow = (version: PlanVersion) => (
    <div key={version.id} className={cn("rounded-lg border border-transparent", selectedVersionId === version.id &&
      "border-orange-300 bg-orange-50 dark:border-amber-600/60 dark:bg-amber-400/10")}>
      {editingId === version.id ? nameForm(false) : (
        <div className="flex items-center gap-0.5 pr-1">
          <button type="button" data-testid={`version-row-${version.id}`} onClick={() => onSelectVersion(version)}
            aria-pressed={selectedVersionId === version.id}
            className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg p-2.5 text-left hover:bg-muted">
            <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: version.authorColor || "#64748b" }} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{version.versionName || version.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {version.authorName || "未知修改者"} · <time dateTime={new Date(version.createdAt).toISOString()}>
                  {format(version.createdAt, "HH:mm:ss")}
                </time>
              </span>
            </span>
          </button>
          {onUpdateVersionName && (
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="命名此版本"
              onClick={() => startEdit(version.id, isNamed(version) ? version.versionName || version.name : "")}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && selectedVersionId === version.id && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="刪除此版本"
              data-testid={`version-delete-${version.id}`} onClick={() => onDelete(version.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <aside data-testid="version-sidebar" aria-label="版本紀錄"
      className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold leading-tight">
            <History className="h-4 w-4 text-orange-600 dark:text-amber-400" />
            版本紀錄
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}
            aria-label="收起版本紀錄" data-testid="version-sidebar-close"><X className="h-4 w-4" /></Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={namedOnly} onChange={(event) => setNamedOnly(event.target.checked)} />
          僅顯示已命名版本
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
        <div className="rounded-lg border">
          {editingId === "current" ? nameForm(true) : (
            <div className="flex items-center gap-1 p-1">
              <button type="button" data-testid="version-current-row" onClick={onBackToCurrent}
                aria-pressed={selectedVersionId === null}
                className={cn("flex-1 rounded-md p-2 text-left text-sm font-semibold hover:bg-muted",
                  selectedVersionId === null && "bg-muted")}>當前版本</button>
              {onSaveVersion && (
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="儲存當前版本"
                  data-testid="version-save-trigger" onClick={() => startEdit("current", "")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {[...days].map(([day, groups]) => (
          <section key={day} className="space-y-1">
            <h3 className="px-2 text-xs font-semibold text-muted-foreground">{day}</h3>
            {groups.map((group) => {
              const newest = group[0];
              if (group.length === 1) return versionRow(newest);
              const open = expanded[newest.id] ?? group.some((version) => version.id === selectedVersionId);
              const oldest = group[group.length - 1];
              return (
                <div key={newest.id}>
                  <button type="button" aria-expanded={open} data-testid="version-auto-group"
                    onClick={() => setExpanded((previous) => ({ ...previous, [newest.id]: !open }))}
                    className="flex w-full items-center gap-2 rounded-lg p-2.5 text-left text-sm hover:bg-muted">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>自動存檔 · {group.length} 筆</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(oldest.createdAt, "HH:mm")}–{format(newest.createdAt, "HH:mm")}
                    </span>
                  </button>
                  {open && <div className="ml-3 border-l pl-2">{group.map(versionRow)}</div>}
                </div>
              );
            })}
          </section>
        ))}
        {days.size === 0 && (
          <p className="px-2 text-sm text-muted-foreground">{namedOnly ? "尚無已命名版本" : "尚無版本紀錄"}</p>
        )}
      </div>
    </aside>
  );
}
