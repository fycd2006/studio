"use client"

import { useState, useEffect } from "react";
import { RotationTableData, Station } from "@/types/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, X, MapPin, User, UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";

function CellInput({ 
  value, 
  onSave, 
  placeholder, 
  className, 
  readOnly 
}: { 
  value: string; 
  onSave: (val: string) => void; 
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value || "");
    }
  }, [value, isFocused]);

  if (readOnly) {
    return (
      <div className={cn("flex items-center justify-center h-full text-foreground font-normal text-xs sm:text-sm px-2 py-1.5", className)}>
        {value || "—"}
      </div>
    );
  }

  return (
    <input
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        setIsFocused(false);
        onSave(localValue);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className={cn(
        "w-full h-full text-center focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all bg-transparent hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-lg text-foreground font-normal text-xs sm:text-sm px-2 py-1.5 placeholder:text-stone-300 dark:placeholder:text-stone-600",
        className
      )}
    />
  );
}

interface AdminRotationTableProps {
  table: RotationTableData;
  onUpdate: (updates: Partial<RotationTableData>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export function AdminRotationTable({ table, onUpdate, onDelete, isReadOnly = true }: AdminRotationTableProps) {
  const { t } = useTranslation();
  
  const addStation = () => {
    if (isReadOnly) return;
    const newStationId = Math.random().toString(36).substr(2, 9);
    const newStation: Station = {
      id: newStationId,
      name: `${t('STATION_LABEL')}${table.stations.length + 1}`,
      location: '',
      lead: '',
      assistant: ''
    };
    onUpdate({
      stations: [...table.stations, newStation],
      rounds: table.rounds.map(r => ({ cells: [...r.cells, ''] })),
      teamOrders: table.teamOrders.map(t => ({ 
        ...t, 
        stations: [...(t.stations || new Array(table.stations.length).fill('')), ''] 
      }))
    });
  };

  const removeStation = (idx: number) => {
    if (isReadOnly || table.stations.length <= 1) return;
    onUpdate({
      stations: table.stations.filter((_, i) => i !== idx),
      rounds: table.rounds.map(r => ({ cells: r.cells.filter((_, i) => i !== idx) })),
      teamOrders: table.teamOrders.map(t => ({
        ...t,
        stations: (t.stations || []).filter((_, i) => i !== idx)
      }))
    });
  };

  const updateStation = (idx: number, updates: Partial<Station>) => {
    if (isReadOnly) return;
    const newStations = [...table.stations];
    newStations[idx] = { ...newStations[idx], ...updates };
    onUpdate({ stations: newStations });
  };

  const updateRoundCell = (roundIdx: number, stationIdx: number, val: string) => {
    if (isReadOnly) return;
    const newRounds = [...table.rounds];
    const newCells = [...newRounds[roundIdx].cells];
    newCells[stationIdx] = val;
    newRounds[roundIdx] = { ...newRounds[roundIdx], cells: newCells };
    onUpdate({ rounds: newRounds });
  };

  const updateTeamOrder = (teamIdx: number, stationIdx: number, val: string) => {
    if (isReadOnly) return;
    const newTeams = [...table.teamOrders];
    const stations = Array.isArray(newTeams[teamIdx].stations) ? [...newTeams[teamIdx].stations] : new Array(table.stations.length).fill('');
    stations[stationIdx] = val;
    newTeams[teamIdx] = { ...newTeams[teamIdx], stations };
    onUpdate({ teamOrders: newTeams });
  };

  const unifiedAddBtnStyle = "rounded-full font-mono text-xs uppercase tracking-wider gap-1.5 h-8 px-4 border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-all shadow-xs";

  return (
    <Card className="rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 shadow-xs overflow-hidden w-full max-w-4xl mx-auto transition-colors">
      <CardContent className="p-0">
        
        {/* Table Title Bar */}
        <div className="bg-stone-900 dark:bg-black/40 text-white py-3 px-6 flex items-center justify-between border-b border-stone-200/80 dark:border-white/10">
          <div className="w-8">
            {!isReadOnly && (
              <button
                onClick={addStation}
                className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/30 text-white transition-all flex items-center justify-center cursor-pointer"
                title="新增關卡 (Add Station)"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <CellInput 
            value={table.title} 
            readOnly={isReadOnly}
            onSave={(val) => onUpdate({ title: val })} 
            className="font-normal text-white text-base md:text-lg h-9 bg-transparent border-none text-center shadow-none flex-1 tracking-tight placeholder:text-white/40" 
            placeholder={t('ENTER_TITLE')}
          />
          <div className="w-8" />
        </div>

        {/* Rotation Table Grid */}
        <div className="overflow-x-auto w-full no-scrollbar">
          <table className="w-full table-fixed min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-stone-50/70 dark:bg-white/[0.02] border-b border-stone-200/80 dark:border-white/10">
                <th className="w-[110px] md:w-[140px] p-2 border-r border-stone-200/60 dark:border-white/10">
                  <div className="flex flex-col items-center gap-1 p-1">
                    {isReadOnly ? (
                      <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">{table.day || "Day 1"}</span>
                    ) : (
                      <Select value={table.day || "Day 1"} onValueChange={(val) => onUpdate({ day: val })}>
                        <SelectTrigger className="h-8 rounded-xl font-mono text-xs bg-white dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-foreground px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border border-stone-200/80 dark:border-white/10 shadow-2xl bg-white dark:bg-[#14191C] font-mono text-xs p-1">
                          {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map(day => (
                            <SelectItem key={day} value={day} className="rounded-xl font-normal text-xs cursor-pointer">{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </th>
                {table.stations.map((s, idx) => (
                  <th key={s.id} className="p-2 relative border-r border-stone-200/60 dark:border-white/10 last:border-r-0 group/header">
                    <CellInput 
                      value={s.name} 
                      readOnly={isReadOnly}
                      onSave={(val) => updateStation(idx, { name: val })} 
                      className="font-normal text-xs sm:text-sm text-foreground h-8 bg-transparent" 
                    />
                    {!isReadOnly && table.stations.length > 1 && (
                      <button
                        onClick={() => removeStation(idx)}
                        className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-all shadow-xs z-20 cursor-pointer"
                        title="移除關卡"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="text-xs sm:text-sm divide-y divide-stone-200/60 dark:divide-white/5">
              {[
                { label: t('LOCATION'), key: 'location' as keyof Station, icon: MapPin },
                { label: t('LEAD'), key: 'lead' as keyof Station, icon: User },
                { label: t('ASSISTANT'), key: 'assistant' as keyof Station, icon: UserPlus }
              ].map((row) => (
                <tr key={row.label} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="w-[110px] md:w-[140px] p-2 font-mono text-[11px] text-fg-muted uppercase tracking-wider bg-stone-50/40 dark:bg-white/[0.01] border-r border-stone-200/60 dark:border-white/10">
                    <div className="flex items-center justify-center gap-1.5">
                      <row.icon className="h-3.5 w-3.5 text-stone-400" />
                      <span>{row.label}</span>
                    </div>
                  </td>
                  {table.stations.map((s, idx) => (
                    <td key={s.id} className="p-1 border-r border-stone-200/60 dark:border-white/10 last:border-r-0">
                      <CellInput 
                        value={String(s[row.key] || '')} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateStation(idx, { [row.key]: val })} 
                        className="text-xs sm:text-sm h-8" 
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Station Arrangement Section Divider */}
              <tr className="bg-orange-500/[0.04] border-y border-orange-500/20">
                <td colSpan={table.stations.length + 1} className="py-2.5 px-6">
                  <span className="font-mono text-[11px] text-orange-700 dark:text-orange-400 tracking-wider uppercase font-medium">
                    // {t('STATION_ARRANGEMENT')}
                  </span>
                </td>
              </tr>

              {table.rounds.map((round, rIdx) => (
                <tr key={rIdx} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="w-[110px] md:w-[140px] p-2 text-center font-mono text-[11px] text-fg-muted uppercase tracking-wider bg-stone-50/40 dark:bg-white/[0.01] border-r border-stone-200/60 dark:border-white/10">
                    <span>{t('ROUND_NUMBER', { n: rIdx + 1 })}</span>
                  </td>
                  {table.stations.map((_, sIdx) => (
                    <td key={sIdx} className="p-1 text-center border-r border-stone-200/60 dark:border-white/10 last:border-r-0">
                      <CellInput 
                        value={round.cells[sIdx] || ''} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateRoundCell(rIdx, sIdx, val)} 
                        className="text-xs sm:text-sm text-foreground h-8" 
                      />
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="w-10 p-0 text-center">
                      <button
                        className="h-7 w-7 text-stone-400 hover:text-rose-500 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                        onClick={() => onUpdate({ rounds: table.rounds.filter((_, i) => i !== rIdx) })}
                        title="刪除輪次"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              
              {!isReadOnly && (
                <tr className="no-print">
                  <td colSpan={table.stations.length + 2} className="p-3 text-center bg-transparent">
                    <Button
                      variant="outline"
                      size="sm"
                      className={unifiedAddBtnStyle}
                      onClick={() => onUpdate({ rounds: [...table.rounds, { cells: new Array(table.stations.length).fill('') }] })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> {t('ADD_ROUND')}
                    </Button>
                  </td>
                </tr>
              )}

              {/* Rotation Order Section Divider */}
              <tr className="bg-orange-500/[0.04] border-y border-orange-500/20">
                <td colSpan={table.stations.length + 2} className="py-2.5 px-6">
                  <span className="font-mono text-[11px] text-orange-700 dark:text-orange-400 tracking-wider uppercase font-medium">
                    // {t('ROTATION_ORDER')}
                  </span>
                </td>
              </tr>

              {table.teamOrders.map((team, tIdx) => (
                <tr key={team.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="w-[110px] md:w-[140px] p-2 text-center bg-stone-50/40 dark:bg-white/[0.01] border-r border-stone-200/60 dark:border-white/10">
                    <CellInput 
                      value={team.name} 
                      readOnly={isReadOnly}
                      onSave={(val) => {
                        const newTeams = [...table.teamOrders];
                        newTeams[tIdx] = { ...newTeams[tIdx], name: val };
                        onUpdate({ teamOrders: newTeams });
                      }} 
                      className="font-normal text-xs sm:text-sm text-foreground h-8" 
                    />
                  </td>
                  {table.stations.map((_, oIdx) => (
                    <td key={oIdx} className="p-1 text-center border-r border-stone-200/60 dark:border-white/10 last:border-r-0">
                      <CellInput 
                        value={(team.stations && team.stations[oIdx]) || ''} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateTeamOrder(tIdx, oIdx, val)} 
                        className="font-mono text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium h-8" 
                      />
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="w-10 p-0 text-center">
                      <button
                        className="h-7 w-7 text-stone-400 hover:text-rose-500 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                        onClick={() => onUpdate({ teamOrders: table.teamOrders.filter((_, i) => i !== tIdx) })}
                        title="刪除小隊順序"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              
              {!isReadOnly && (
                <tr className="no-print">
                  <td className="p-3 text-center bg-transparent" colSpan={table.stations.length + 2}>
                    <Button
                      variant="outline"
                      size="sm"
                      className={unifiedAddBtnStyle}
                      onClick={() => onUpdate({ teamOrders: [...table.teamOrders, { id: Math.random().toString(36).substr(2, 9), name: `Team ${table.teamOrders.length + 1}`, stations: new Array(table.stations.length).fill('') }] })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> {t('ADD_TEAM')}
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isReadOnly && (
          <div className="bg-stone-50/50 dark:bg-white/[0.02] p-3 md:p-4 flex justify-end border-t border-stone-200/80 dark:border-white/10">
            <Button
              variant="ghost"
              size="sm"
              className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 font-mono text-xs uppercase tracking-wider transition-all rounded-xl h-9 px-4 gap-1.5"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('DELETE_TABLE')}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
