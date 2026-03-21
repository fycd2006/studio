"use client"

import React, { useMemo } from 'react';
import { PlanVersion } from "@/types/plan";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { 
  History, 
  RotateCcw, 
  User, 
  Clock, 
  ChevronRight,
  Filter,
  CheckCircle2,
  Trash2,
  Pencil,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/i18n-context";

interface VersionHistorySidebarProps {
  versions: PlanVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: PlanVersion | null) => void;
  onRestore: (versionId: string) => void;
  onDelete?: (versionId: string) => void;
  showNamedOnly: boolean;
  onToggleFilter: () => void;
  onBackToCurrent: () => void;
  onUpdateVersionName: (versionId: string, newName: string) => void;
  className?: string;
}

export function VersionHistorySidebar({
  versions,
  selectedVersionId,
  onSelectVersion,
  onRestore,
  onDelete,
  showNamedOnly,
  onToggleFilter,
  onBackToCurrent,
  onUpdateVersionName,
  className
}: VersionHistorySidebarProps) {
  const { t } = useTranslation();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  const handleStartEdit = (e: React.SyntheticEvent, version: PlanVersion) => {
    e.stopPropagation();
    setEditingId(version.id);
    setEditName(version.versionName || version.name);
  };

  const handleSaveEdit = (e: React.SyntheticEvent, versionId: string) => {
    e.stopPropagation();
    if (editName.trim()) {
      onUpdateVersionName(versionId, editName.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const groupedVersions = useMemo(() => {
    const groups: Record<string, PlanVersion[]> = {
      Today: [],
      Yesterday: [],
      Earlier: []
    };

    versions.forEach(v => {
      const date = new Date(v.createdAt);
      if (isToday(date)) groups.Today.push(v);
      else if (isYesterday(date)) groups.Yesterday.push(v);
      else groups.Earlier.push(v);
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, [versions]);

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-slate-900 border-l border-stone-200 dark:border-white/5", className)}>
      <div className="p-6 border-b border-stone-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-white uppercase flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600 dark:text-amber-400" />
            版本紀錄 / History
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleFilter}
            className={cn(
              "h-8 px-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              showNamedOnly ? "bg-orange-50 text-orange-600" : "text-stone-400 hover:text-stone-600"
            )}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {showNamedOnly ? "Named Only" : "Show All"}
          </Button>
        </div>

        {selectedVersionId && (
          <Button 
            className="w-full bg-orange-600 dark:bg-amber-400 hover:opacity-90 text-white dark:text-slate-900 font-black rounded-xl h-11 shadow-lg shadow-orange-500/10 dark:shadow-none transition-all uppercase tracking-widest text-xs"
            onClick={() => onRestore(selectedVersionId)}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> 還原此版本 / Restore
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">
              目前狀態 / Current
            </h3>
            <div 
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer relative group",
                selectedVersionId === null
                  ? "bg-orange-50/50 dark:bg-amber-400/5 border-orange-200 dark:border-amber-400/30 shadow-sm" 
                  : "bg-white dark:bg-white/5 border-stone-100 dark:border-white/5 hover:border-orange-100 dark:hover:border-amber-400/20"
              )}
              onClick={onBackToCurrent}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-orange-500 shadow-inner">
                  <span className="text-xs font-black uppercase">LIVE</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center h-8">
                  <span className="font-bold text-sm text-stone-900 dark:text-white truncate block">
                    當前版本 (Current Draft)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {groupedVersions.map(([groupName, list]) => (
            <div key={groupName} className="space-y-4">
              <h3 className="text-[10px] font-black text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">
                {groupName}
              </h3>
              <div className="space-y-2">
                {list.map((version) => (
                  <div 
                    key={version.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer relative group",
                      selectedVersionId === version.id 
                        ? "bg-orange-50/50 dark:bg-amber-400/5 border-orange-200 dark:border-amber-400/30 shadow-sm" 
                        : "bg-white dark:bg-white/5 border-stone-100 dark:border-white/5 hover:border-orange-100 dark:hover:border-amber-400/20"
                    )}
                    onClick={() => onSelectVersion(version)}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white overflow-hidden shadow-inner"
                        style={{ backgroundColor: version.authorColor || '#cbd5e1' }}
                      >
                        <span className="text-xs font-black uppercase">{(version.authorName || 'A').charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {editingId === version.id ? (
                            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                              <Input 
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="h-7 text-xs px-2 py-0 font-bold"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(e, version.id);
                                  if (e.key === 'Escape') handleCancelEdit(e);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 shrink-0" onClick={(e) => handleSaveEdit(e, version.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0" onClick={handleCancelEdit}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-stone-900 dark:text-white truncate block">
                              {version.versionName || version.name}
                            </span>
                          )}
                          {version.type === 'snapshot' && editingId !== version.id && (
                             <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Full Snapshot" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-widest">
                            {version.authorName}
                          </span>
                          <span className="text-[10px] text-stone-300 dark:text-slate-700">•</span>
                          <time className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest">
                            {format(new Date(version.createdAt), "HH:mm")}
                          </time>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId !== version.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-stone-400 hover:text-stone-600"
                          onClick={(e) => handleStartEdit(e, version)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && selectedVersionId === version.id && editingId !== version.id && (
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 text-stone-300 hover:text-rose-500"
                           onClick={(e) => {
                             e.stopPropagation();
                             onDelete(version.id);
                           }}
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                         </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {!versions.length && (
         <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
           <History className="h-12 w-12 mb-4 text-stone-200" />
           <p className="font-bold text-xs uppercase tracking-widest text-stone-400">尚無紀錄 / NO HISTORY</p>
         </div>
      )}
    </div>
  );
}
