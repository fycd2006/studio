
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
      <div className={cn("flex items-center justify-center h-full text-slate-950 font-black text-xs sm:text-sm md:text-base px-1 md:px-2", className)}>
        {value || "--"}
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
        "w-full h-full text-center border-none shadow-none focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all bg-white hover:bg-orange-50 rounded-md text-slate-950 font-black text-xs sm:text-sm md:text-base px-1 md:px-2",
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
  
  const addStation = () => {
    if (isReadOnly) return;
    const newStationId = Math.random().toString(36).substr(2, 9);
    const newStation: Station = {
      id: newStationId,
      name: `關卡${table.stations.length + 1}`,
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

  const unifiedAddBtnStyle = "rounded-xl font-black gap-2 h-8 md:h-10 px-4 md:px-6 border border-slate-300 text-orange-600 hover:bg-orange-600 hover:text-white transition-all text-xs md:text-sm bg-white shadow-sm mx-auto tracking-widest";

  return (
    <Card className="rounded-2xl border border-slate-200 shadow-md bg-white overflow-hidden w-full max-w-4xl mx-auto">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 px-6 flex items-center justify-between border-b border-orange-200">
          <div className="w-8">
             {!isReadOnly && (
                <button onClick={addStation} className="h-6 w-6 rounded-full bg-white/20 text-white hover:bg-white/40 shadow-sm transition-all flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </button>
             )}
          </div>
          <CellInput 
            value={table.title} 
            readOnly={isReadOnly}
            onSave={(val) => onUpdate({ title: val })} 
            className="font-headline font-black text-white text-base md:text-lg h-9 md:h-12 bg-transparent border border-transparent text-center shadow-none flex-1 tracking-tight hover:bg-orange-600/50 hover:text-white focus:bg-orange-700/50 focus:border-white/50 focus:text-white transition-all rounded-md placeholder:text-white/50" 
            placeholder="輸入闖關表標題"
          />
          <div className="w-8" />
        </div>

        <div className="overflow-x-auto w-full scrollbar-hide">
          <table className="w-full border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="border-b border-orange-200/50 bg-orange-50/80">
                <th className="w-[100px] md:w-[140px] p-1 border-r border-orange-200/50 bg-orange-100/30">
                   <div className="flex flex-col items-center gap-1 p-1 md:p-2">
                    {isReadOnly ? (
                      <span className="font-black text-[10px] md:text-sm text-orange-700 uppercase tracking-widest">{table.day || "Day 1"}</span>
                    ) : (
                      <Select value={table.day || "Day 1"} onValueChange={(val) => onUpdate({ day: val })}>
                        <SelectTrigger className="h-7 md:h-9 rounded-lg font-black text-[10px] md:text-sm text-orange-700 bg-white border border-slate-200 shadow-none px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map(day => (
                            <SelectItem key={day} value={day} className="font-bold text-xs md:text-sm">{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </th>
                {table.stations.map((s, idx) => (
                  <th key={s.id} className="p-1 md:p-2 border-r border-orange-200/50 group/header relative bg-white/50">
                    <CellInput 
                      value={s.name} 
                      readOnly={isReadOnly}
                      onSave={(val) => updateStation(idx, { name: val })} 
                      className="font-black text-xs sm:text-sm md:text-base text-slate-900 h-8 md:h-10 bg-transparent" 
                    />
                    {!isReadOnly && table.stations.length > 1 && (
                      <button onClick={() => removeStation(idx)} className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-all shadow-md z-20">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm md:text-base">
              {[
                { label: '地點', key: 'location' as keyof Station, icon: MapPin },
                { label: '主關主', key: 'lead' as keyof Station, icon: User },
                { label: '副關主', key: 'assistant' as keyof Station, icon: UserPlus }
              ].map((row) => (
                <tr key={row.label} className="border-b border-orange-200/50 hover:bg-orange-50/50 transition-colors">
                  <td className="w-[100px] md:w-[140px] p-2 border-r border-orange-200/50 text-center font-black text-[10px] sm:text-xs md:text-sm text-slate-800 tracking-widest bg-orange-50/20">
                    <div className="flex items-center justify-center gap-1.5 md:gap-2">
                      <row.icon className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                      {row.label}
                    </div>
                  </td>
                  {table.stations.map((s, idx) => (
                    <td key={s.id} className="p-1 md:p-2 border-r border-orange-200/50">
                      <CellInput 
                        value={String(s[row.key] || '')} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateStation(idx, { [row.key]: val })} 
                        className="font-black text-xs sm:text-sm md:text-base h-8 md:h-10" 
                      />
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="bg-amber-100/40 border-b border-orange-200/50">
                <td colSpan={table.stations.length + 1} className="py-2 px-4 md:py-3 md:px-6">
                  <span className="text-[10px] md:text-sm font-black text-amber-900 tracking-widest">闖關隊伍安排</span>
                </td>
              </tr>

              {table.rounds.map((round, rIdx) => (
                <tr key={rIdx} className="border-b border-orange-200/50 hover:bg-orange-50/50">
                  <td className="w-[100px] md:w-[140px] p-2 border-r border-orange-200/50 text-center bg-orange-50/20">
                    <span className="text-[10px] sm:text-xs md:text-sm font-black text-orange-800 tracking-widest">第 {rIdx + 1} 回合</span>
                  </td>
                  {table.stations.map((_, sIdx) => (
                    <td key={sIdx} className="p-1 md:p-2 border-r border-orange-200/50 text-center">
                      <CellInput 
                        value={round.cells[sIdx] || ''} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateRoundCell(rIdx, sIdx, val)} 
                        className="font-black text-xs sm:text-sm md:text-base text-slate-950 h-8 md:h-10" 
                      />
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="w-10 md:w-16 p-0 text-center border-b border-orange-200/50">
                      <button className="h-8 w-8 md:h-10 md:w-10 text-slate-400 hover:text-rose-600 flex items-center justify-center mx-auto transition-colors" onClick={() => onUpdate({ rounds: table.rounds.filter((_, i) => i !== rIdx) })}>
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              
              {!isReadOnly && (
                <tr className="no-print border-b border-orange-200/50">
                  <td colSpan={table.stations.length + 2} className="p-2 md:p-3 text-center bg-orange-50/10">
                    <Button variant="outline" size="sm" className={unifiedAddBtnStyle} onClick={() => onUpdate({ rounds: [...table.rounds, { cells: new Array(table.stations.length).fill('') }] })}>
                      <Plus className="h-3 w-3 md:h-4 md:w-4" /> 新增回合
                    </Button>
                  </td>
                </tr>
              )}

              <tr className="bg-orange-100/40 border-b border-orange-200/50">
                <td colSpan={table.stations.length + 2} className="py-2 px-4 md:py-3 md:px-6">
                  <span className="text-[10px] md:text-sm font-black text-orange-900 tracking-widest">闖關順序</span>
                </td>
              </tr>

              {table.teamOrders.map((team, tIdx) => (
                <tr key={team.id} className="border-b border-orange-200/50 hover:bg-orange-50/50">
                  <td className="w-[100px] md:w-[140px] p-2 border-r border-orange-200/50 text-center bg-orange-50/20">
                    <CellInput 
                      value={team.name} 
                      readOnly={isReadOnly}
                      onSave={(val) => {
                        const newTeams = [...table.teamOrders];
                        newTeams[tIdx] = { ...newTeams[tIdx], name: val };
                        onUpdate({ teamOrders: newTeams });
                      }} 
                      className="font-black text-xs sm:text-sm md:text-base text-slate-950 h-8 md:h-10" 
                    />
                  </td>
                  {table.stations.map((_, oIdx) => (
                    <td key={oIdx} className="p-1 md:p-2 border-r border-orange-200/50 text-center">
                      <CellInput 
                        value={(team.stations && team.stations[oIdx]) || ''} 
                        readOnly={isReadOnly}
                        onSave={(val) => updateTeamOrder(tIdx, oIdx, val)} 
                        className="font-black text-xs sm:text-sm md:text-base text-orange-800 h-8 md:h-10" 
                      />
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="w-10 md:w-16 p-0 text-center border-b border-orange-200/50">
                      <button className="h-8 w-8 md:h-10 md:w-10 text-slate-400 hover:text-rose-600 flex items-center justify-center mx-auto transition-colors" onClick={() => onUpdate({ teamOrders: table.teamOrders.filter((_, i) => i !== tIdx) })}>
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              
              {!isReadOnly && (
                <tr className="no-print border-b border-orange-200/50">
                  <td className="p-2 md:p-3 text-center bg-orange-50/10" colSpan={table.stations.length + 2}>
                    <Button variant="outline" size="sm" className={unifiedAddBtnStyle} onClick={() => onUpdate({ teamOrders: [...table.teamOrders, { id: Math.random().toString(36).substr(2, 9), name: `第${table.teamOrders.length + 1}小隊`, stations: new Array(table.stations.length).fill('') }] })}>
                      <Plus className="h-3 w-3 md:h-4 md:w-4" /> 新增隊伍
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isReadOnly && (
          <div className="bg-orange-50/10 p-2 md:p-4 flex justify-end border-t border-orange-200/50 no-print">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-700 hover:bg-rose-50 font-black text-[10px] sm:text-xs md:text-sm tracking-widest transition-all rounded-lg h-8 md:h-10 px-4" onClick={onDelete}>
              <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-1" /> 刪除表格
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
