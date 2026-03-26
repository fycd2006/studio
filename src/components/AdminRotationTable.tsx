
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
 "w-full h-full text-center  shadow-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all bg-[#FBF9F6]/50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-md text-[#2C2A28] dark:text-white font-bold text-xs sm:text-sm md:text-base px-1 md:px-2 placeholder:text-stone-300 dark:placeholder:text-slate-600",
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

 const unifiedAddBtnStyle = "rounded-xl font-bold gap-2 h-8 md:h-10 px-4 md:px-6 border-none dark:text-orange-600 dark:text-amber-400 hover:bg-orange-600 dark:hover:bg-amber-400 hover:text-white dark:hover:text-[#2C2A28] transition-all text-[10px] md:text-xs bg-white dark:bg-slate-800 shadow-sm mx-auto tracking-widest uppercase";

 return (
 <Card className="rounded-2xl border-none dark:bg-white dark:bg-slate-900/50 overflow-hidden w-full max-w-4xl mx-auto transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <CardContent className="p-0">
 <div className="bg-gradient-to-r from-stone-800 to-stone-900 dark:from-slate-800 dark:to-slate-950 py-2.5 px-6 flex items-center justify-between  dark:">
 <div className="w-8">
 {!isReadOnly && (
 <button onClick={addStation} className="h-6 w-6 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all flex items-center justify-center shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <Plus className="h-4 w-4" />
 </button>
 )}
 </div>
 <CellInput 
 value={table.title} 
 readOnly={isReadOnly}
 onSave={(val) => onUpdate({ title: val })} 
 className="font-headline font-bold text-white text-base md:text-lg h-9 md:h-12 bg-transparent border-none text-center shadow-none flex-1 tracking-tight hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white transition-all rounded-md placeholder:text-white/40 shadow-[0_8px_30px_rgba(140,120,100,0.05)]" 
 placeholder={t('ENTER_TITLE')}
 />
 <div className="w-8" />
 </div>

 <div className="overflow-x-auto w-full scrollbar-hide">
 <table className="w-full  table-fixed min-w-[800px]">
 <thead>
 <tr className="dark:bg-[#FBF9F6]/50 dark:bg-slate-900/80">
 <th className="w-[100px] md:w-[140px] p-1 dark:bg-stone-100/30 dark:bg-white/5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <div className="flex flex-col items-center gap-1 p-1 md:p-2">
 {isReadOnly ? (
 <span className="font-bold text-[10px] md:text-xs text-stone-500 dark:text-slate-400 uppercase tracking-widest">{table.day || "Day 1"}</span>
 ) : (
 <Select value={table.day || "Day 1"} onValueChange={(val) => onUpdate({ day: val })}>
 <SelectTrigger className="h-7 md:h-8 rounded-lg font-bold text-[10px] text-stone-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-none dark:shadow-none px-2 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map(day => (
 <SelectItem key={day} value={day} className="font-bold text-xs">{day}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 </div>
 </th>
 {table.stations.map((s, idx) => (
 <th key={s.id} className="p-1 md:p-2 dark:group/header relative bg-white/30 dark:bg-slate-800/30 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <CellInput 
 value={s.name} 
 readOnly={isReadOnly}
 onSave={(val) => updateStation(idx, { name: val })} 
 className="font-bold text-xs sm:text-sm md:text-base text-[#2C2A28] dark:text-white h-8 md:h-10 bg-transparent" 
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
 { label: t('LOCATION'), key: 'location' as keyof Station, icon: MapPin },
 { label: t('LEAD'), key: 'lead' as keyof Station, icon: User },
 { label: t('ASSISTANT'), key: 'assistant' as keyof Station, icon: UserPlus }
 ].map((row) => (
 <tr key={row.label} className="dark:hover:bg-[#FBF9F6] dark:hover:bg-white/5 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <td className="w-[100px] md:w-[140px] p-2 dark:text-center font-bold text-[10px] text-stone-500 dark:text-slate-400 tracking-widest bg-[#FBF9F6]/30 dark:bg-white/5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <div className="flex items-center justify-center gap-1.5 md:gap-2">
 <row.icon className="h-3 w-3 md:h-4 md:w-4 text-stone-400 dark:text-slate-500" />
 {row.label}
 </div>
 </td>
 {table.stations.map((s, idx) => (
 <td key={s.id} className="p-1 md:p-2  dark:">
 <CellInput 
 value={String(s[row.key] || '')} 
 readOnly={isReadOnly}
 onSave={(val) => updateStation(idx, { [row.key]: val })} 
 className="font-bold text-xs sm:text-sm md:text-base h-8 md:h-10" 
 />
 </td>
 ))}
 </tr>
 ))}

 <tr className="bg-stone-100/50 dark:bg-white/5 dark:shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <td colSpan={table.stations.length + 1} className="py-2 px-4 md:py-3 md:px-6">
 <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 tracking-widest uppercase">{t('STATION_ARRANGEMENT')}</span>
 </td>
 </tr>

 {table.rounds.map((round, rIdx) => (
 <tr key={rIdx} className="dark:hover:bg-[#FBF9F6] dark:hover:bg-white/5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <td className="w-[100px] md:w-[140px] p-2 dark:text-center bg-[#FBF9F6]/20 dark:bg-white/5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 tracking-widest uppercase">{t('ROUND_NUMBER', { n: rIdx + 1 })}</span>
 </td>
 {table.stations.map((_, sIdx) => (
 <td key={sIdx} className="p-1 md:p-2 dark:text-center">
 <CellInput 
 value={round.cells[sIdx] || ''} 
 readOnly={isReadOnly}
 onSave={(val) => updateRoundCell(rIdx, sIdx, val)} 
 className="font-bold text-xs sm:text-sm md:text-base text-[#2C2A28] dark:text-white h-8 md:h-10" 
 />
 </td>
 ))}
 {!isReadOnly && (
 <td className="w-10 md:w-16 p-0 text-center  dark:">
 <button className="h-8 w-8 md:h-10 md:w-10 text-stone-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center mx-auto transition-colors" onClick={() => onUpdate({ rounds: table.rounds.filter((_, i) => i !== rIdx) })}>
 <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 
 {!isReadOnly && (
 <tr className="no-print  dark:">
 <td colSpan={table.stations.length + 2} className="p-2 md:p-3 text-center bg-transparent">
 <Button variant="outline" size="sm" className={unifiedAddBtnStyle} onClick={() => onUpdate({ rounds: [...table.rounds, { cells: new Array(table.stations.length).fill('') }] })}>
 <Plus className="h-3 w-3 md:h-4 md:w-4" /> {t('ADD_ROUND')}
 </Button>
 </td>
 </tr>
 )}

 <tr className="bg-stone-100/50 dark:bg-white/5 dark:shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <td colSpan={table.stations.length + 2} className="py-2 px-4 md:py-3 md:px-6">
 <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 tracking-widest uppercase">{t('ROTATION_ORDER')}</span>
 </td>
 </tr>

 {table.teamOrders.map((team, tIdx) => (
 <tr key={team.id} className="dark:hover:bg-[#FBF9F6] dark:hover:bg-white/5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <td className="w-[100px] md:w-[140px] p-2 dark:text-center bg-[#FBF9F6]/20">
 <CellInput 
 value={team.name} 
 readOnly={isReadOnly}
 onSave={(val) => {
 const newTeams = [...table.teamOrders];
 newTeams[tIdx] = { ...newTeams[tIdx], name: val };
 onUpdate({ teamOrders: newTeams });
 }} 
 className="font-bold text-xs sm:text-sm md:text-base text-[#2C2A28] dark:text-white h-8 md:h-10" 
 />
 </td>
 {table.stations.map((_, oIdx) => (
 <td key={oIdx} className="p-1 md:p-2 dark:text-center">
 <CellInput 
 value={(team.stations && team.stations[oIdx]) || ''} 
 readOnly={isReadOnly}
 onSave={(val) => updateTeamOrder(tIdx, oIdx, val)} 
 className="font-bold text-xs sm:text-sm md:text-base text-orange-600 dark:text-amber-400 h-8 md:h-10" 
 />
 </td>
 ))}
 {!isReadOnly && (
 <td className="w-10 md:w-16 p-0 text-center  dark:">
 <button className="h-8 w-8 md:h-10 md:w-10 text-stone-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center mx-auto transition-colors" onClick={() => onUpdate({ teamOrders: table.teamOrders.filter((_, i) => i !== tIdx) })}>
 <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 
 {!isReadOnly && (
 <tr className="no-print  dark:">
 <td className="p-2 md:p-3 text-center bg-transparent" colSpan={table.stations.length + 2}>
 <Button variant="outline" size="sm" className={unifiedAddBtnStyle} onClick={() => onUpdate({ teamOrders: [...table.teamOrders, { id: Math.random().toString(36).substr(2, 9), name: `Team ${table.teamOrders.length + 1}`, stations: new Array(table.stations.length).fill('') }] })}>
 <Plus className="h-3 w-3 md:h-4 md:w-4" /> {t('ADD_TEAM')}
 </Button>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {!isReadOnly && (
 <div className="bg-[#FBF9F6]/10 dark:bg-white/5 p-2 md:p-4 flex justify-end dark:no-print shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <Button variant="ghost" size="sm" className="text-stone-400 dark:text-slate-600 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-[10px] sm:text-xs md:text-sm tracking-widest transition-all rounded-lg h-8 md:h-10 px-4" onClick={onDelete}>
 <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-1" /> {t('DELETE_TABLE')}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 );
}


