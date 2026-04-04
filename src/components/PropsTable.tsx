"use client"

import { PropItem } from "@/types/plan";
import { 
 Table, 
 TableBody, 
 TableCell, 
 TableHead, 
 TableHeader, 
 TableRow,
 TableFooter
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";

function AutoExpandingTextarea({ 
 value, 
 onChange, 
 placeholder, 
 className 
}: { 
 value: string; 
 onChange: (val: string) => void; 
 placeholder?: string;
 className?: string;
}) {
 const [localValue, setLocalValue] = useState(value || "");
 const [isFocused, setIsFocused] = useState(false);
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => {
 if (!isFocused) {
 setLocalValue(value || "");
 }
 }, [value, isFocused]);

 const adjustHeight = () => {
 const textarea = textareaRef.current;
 if (textarea) {
 textarea.style.height = 'auto';
 textarea.style.height = `${textarea.scrollHeight}px`;
 }
 };

 useEffect(() => {
 adjustHeight();
 }, [localValue]);

 return (
 <textarea
 ref={textareaRef}
 value={localValue}
 onFocus={() => setIsFocused(true)}
 onBlur={() => {
 setIsFocused(false);
 onChange(localValue);
 }}
 onChange={(e) => setLocalValue(e.target.value)}
 onInput={adjustHeight}
 className={cn("w-full resize-none  shadow-none focus:outline-none bg-transparent py-3 text-[13px] font-bold text-[#2C2A28] dark:text-white placeholder:text-stone-300 dark:placeholder:text-slate-600 min-h-[44px] overflow-hidden leading-relaxed transition-colors", className)}
 />
 );
}

function LocalInput({ 
 value, 
 onChange, 
 placeholder, 
 className 
}: { 
 value: string; 
 onChange: (val: string) => void; 
 placeholder?: string;
 className?: string;
}) {
 const [localValue, setLocalValue] = useState(value || "");
 const [isFocused, setIsFocused] = useState(false);

 useEffect(() => {
 if (!isFocused) {
 setLocalValue(value || "");
 }
 }, [value, isFocused]);

 return (
 <input
 value={localValue}
 onFocus={() => setIsFocused(true)}
 onChange={(e) => setLocalValue(e.target.value)}
 onBlur={() => {
 setIsFocused(false);
 onChange(localValue);
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 (e.target as HTMLInputElement).blur();
 }
 }}
 placeholder={placeholder}
 className={cn("w-full h-12  shadow-none focus:outline-none bg-transparent text-center text-[13px] font-bold text-[#2C2A28] dark:text-white placeholder:text-stone-300 dark:placeholder:text-slate-600 transition-colors", className)}
 />
 );
}

interface PropsTableProps {
 label?: string;
 value: PropItem[];
 onChange: (value: PropItem[]) => void;
 onFocus?: () => void;
 onBlur?: () => void;
}

export function PropsTable({ label, value = [], onChange, onFocus, onBlur }: PropsTableProps) {
 const { t, language } = useTranslation();

 const handleAddRow = () => {
 const newRow: PropItem = {
 id: Math.random().toString(36).substr(2, 9),
 name: "",
 quantity: "",
 unit: "",
 remarks: ""
 };
 onChange([...value, newRow]);
 };

 const handleUpdateRow = (id: string, field: keyof PropItem, val: string) => {
 const newData = value.map(row => row.id === id ? { ...row, [field]: val } : row);
 onChange(newData);
 };

 const handleRemoveRow = (id: string) => {
 onChange(value.filter(row => row.id !== id));
 };

 return (
 <div className="space-y-4">
 {label && (
 <label className="text-[12px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
 {label}
 </label>
 )}

 <div 
    className="w-full rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 shadow-stone-200/20 dark:shadow-none transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none"
    onFocus={onFocus}
    onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        onBlur?.();
      }
    }}
  >
 <div className="w-full overflow-x-auto rounded-xl border border-stone-200 dark:border-slate-800">
 <Table className="w-full min-w-[760px] table-fixed">
 <TableHeader className="bg-[#FBF9F6]/80 dark:bg-slate-900/80 border-b border-stone-200 dark:border-slate-800">
 <TableRow>
 <TableHead className="w-[34%] font-bold text-[#2C2A28] dark:text-slate-400 h-12 text-[12px] uppercase tracking-widest border-r border-stone-200 dark:border-slate-800 px-4 bg-[#FBF9F6]/50 dark:bg-slate-900/50">{t('PROP_NAME')}</TableHead>
 <TableHead className="w-[12%] font-bold text-[#2C2A28] dark:text-slate-400 text-center text-[12px] uppercase tracking-widest border-r border-stone-200 dark:border-slate-800 bg-[#FBF9F6]/50 dark:bg-slate-900/50">Qty</TableHead>
 <TableHead className="w-[12%] font-bold text-[#2C2A28] dark:text-slate-400 text-center text-[12px] uppercase tracking-widest border-r border-stone-200 dark:border-slate-800 bg-[#FBF9F6]/50 dark:bg-slate-900/50">Unit</TableHead>
 <TableHead className="w-[34%] font-bold text-[#2C2A28] dark:text-slate-400 text-[12px] uppercase tracking-widest border-r border-stone-200 dark:border-slate-800 px-4 bg-[#FBF9F6]/50 dark:bg-slate-900/50">{t('OP_REMARKS')}</TableHead>
 <TableHead className="w-[8%] text-center no-print font-bold text-[#2C2A28] dark:text-slate-400 text-[12px] uppercase bg-[#FBF9F6]/50 dark:bg-slate-900/50">{t('DELETE')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {value && value.length > 0 ? (
 value.map((row) => (
 <TableRow key={row.id} className="transition-colors hover:bg-stone-50/50 dark:hover:bg-slate-800/50 border-b border-stone-200 dark:border-slate-800 last:border-0">
 <TableCell className="align-top p-0 border-r border-stone-200 dark:border-slate-800">
 <AutoExpandingTextarea 
 value={row.name} 
 onChange={(val) => handleUpdateRow(row.id, 'name', val)} 
 placeholder={t('PROP_NAME')} 
 className="px-4"
 />
 </TableCell>
 <TableCell className="text-center align-top p-0 border-r border-stone-200 dark:border-slate-800">
 <LocalInput 
 value={row.quantity} 
 onChange={(val) => handleUpdateRow(row.id, 'quantity', val)} 
 placeholder="1" 
 />
 </TableCell>
 <TableCell className="text-center align-top p-0 border-r border-stone-200 dark:border-slate-800">
 <LocalInput 
 value={row.unit} 
 onChange={(val) => handleUpdateRow(row.id, 'unit', val)} 
 placeholder="Unit" 
 />
 </TableCell>
 <TableCell className="align-top p-0 border-r border-stone-200 dark:border-slate-800">
 <AutoExpandingTextarea 
 value={row.remarks || ""} 
 onChange={(val) => handleUpdateRow(row.id, 'remarks', val)} 
 placeholder={t('OP_REMARKS')} 
 className="px-4"
 />
 </TableCell>
 <TableCell className="text-center align-middle p-0">
 <div className="flex justify-center items-center h-full w-full py-2">
 <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400" onClick={() => handleRemoveRow(row.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="text-center py-20 text-stone-400 dark:text-slate-700 font-bold uppercase tracking-widest text-[12px]">
 {t('EMPTY_SLOT')}
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 <TableFooter className="bg-transparent no-print border-t border-stone-200 dark:border-slate-800">
 <TableRow>
 <TableCell colSpan={5} className="p-0">
 <div className="flex justify-center p-3">
 <Button 
 variant="outline" 
 onClick={handleAddRow}
 className="h-10 px-8 rounded-xl text-orange-600 dark:text-amber-400 dark:hover:bg-orange-50 dark:hover:bg-amber-400/5 gap-3 font-bold uppercase tracking-widest text-[12px] transition-all shadow-sm border-none"
 >
 <Plus className="h-4 w-4" />
 {language === 'zh' ? '新增道具' : 'Add Prop'}
 </Button>
 </div>
 </TableCell>
 </TableRow>
 </TableFooter>
 </Table>
 </div>
 </div>
 </div>
 );
}


