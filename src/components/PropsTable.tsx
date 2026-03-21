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
      className={cn("w-full resize-none border-none shadow-none focus:outline-none bg-transparent py-3 text-[13px] font-bold text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-slate-600 min-h-[44px] overflow-hidden leading-relaxed transition-colors", className)}
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
      className={cn("w-full h-12 border-none shadow-none focus:outline-none bg-transparent text-center text-[13px] font-bold text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-slate-600 transition-colors", className)}
    />
  );
}

interface PropsTableProps {
  label?: string;
  value: PropItem[];
  onChange: (value: PropItem[]) => void;
}

export function PropsTable({ label, value = [], onChange }: PropsTableProps) {
  const { t } = useTranslation();

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
        <label className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
          {label}
        </label>
      )}

      <div className="border border-stone-200 dark:border-white/5 rounded-[1.5rem] overflow-hidden bg-white dark:bg-slate-900/50 shadow-xl shadow-stone-200/20 dark:shadow-none transition-colors">
        <Table className="min-w-full md:min-w-[900px] table-auto block md:table">
          <TableHeader className="bg-stone-50/50 dark:bg-slate-900/50 hidden md:table-header-group">
            <TableRow className="border-b border-stone-200 dark:border-white/10">
              <TableHead className="min-w-[250px] font-bold text-stone-900 dark:text-slate-400 border-r border-stone-200 dark:border-white/10 h-12 text-[10px] uppercase tracking-widest">{t('PROP_NAME')}</TableHead>
              <TableHead className="w-[120px] font-bold text-stone-900 dark:text-slate-400 border-r border-stone-200 dark:border-white/10 text-center whitespace-nowrap text-[10px] uppercase tracking-widest">Qty</TableHead>
              <TableHead className="w-[120px] font-bold text-stone-900 dark:text-slate-400 border-r border-stone-200 dark:border-white/10 text-center whitespace-nowrap text-[10px] uppercase tracking-widest">Unit</TableHead>
              <TableHead className="min-w-[350px] font-bold text-stone-900 dark:text-slate-400 border-r border-stone-200 dark:border-white/10 text-[10px] uppercase tracking-widest">{t('OP_REMARKS')}</TableHead>
              <TableHead className="w-[80px] text-center no-print font-bold text-stone-900 dark:text-slate-400 text-[10px] uppercase">{t('DELETE')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block md:table-row-group">
            {value && value.length > 0 ? (
              value.map((row) => (
                <TableRow key={row.id} className="border-b border-stone-200 dark:border-white/5 last:border-0 hover:bg-stone-50/50 dark:hover:bg-white/5 transition-colors block md:table-row p-4 md:p-0 space-y-3 md:space-y-0 relative">
                  <TableCell className="border-none md:border-solid md:border-r border-stone-200 dark:border-white/10 align-top p-0 block md:table-cell">
                    <div className="md:hidden text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase px-4 pt-2">{t('PROP_NAME')}</div>
                    <AutoExpandingTextarea 
                      value={row.name} 
                      onChange={(val) => handleUpdateRow(row.id, 'name', val)} 
                      placeholder={t('PROP_NAME')} 
                      className="px-4"
                    />
                  </TableCell>
                  <TableCell className="border-none md:border-solid md:border-r border-stone-200 dark:border-white/10 text-center align-top p-0 md:whitespace-nowrap flex items-center md:table-cell">
                    <div className="md:hidden text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase px-4 w-1/3 text-left">Qty</div>
                    <LocalInput 
                      value={row.quantity} 
                      onChange={(val) => handleUpdateRow(row.id, 'quantity', val)} 
                      placeholder="1" 
                    />
                  </TableCell>
                  <TableCell className="border-r border-stone-200 dark:border-white/10 text-center align-top p-0 whitespace-nowrap">
                    <LocalInput 
                      value={row.unit} 
                      onChange={(val) => handleUpdateRow(row.id, 'unit', val)} 
                      placeholder="Unit" 
                    />
                  </TableCell>
                  <TableCell className="border-none md:border-solid md:border-r border-stone-200 dark:border-white/10 align-top p-0 block md:table-cell">
                    <div className="md:hidden text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase px-4 pt-2">{t('OP_REMARKS')}</div>
                    <AutoExpandingTextarea 
                      value={row.remarks || ""} 
                      onChange={(val) => handleUpdateRow(row.id, 'remarks', val)} 
                      placeholder={t('OP_REMARKS')} 
                      className="px-4"
                    />
                  </TableCell>
                  <TableCell className="text-center no-print align-top pt-2 block md:table-cell absolute md:static top-2 right-2 md:top-auto md:right-auto">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400" onClick={() => handleRemoveRow(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-stone-400 dark:text-slate-700 font-bold uppercase tracking-widest text-[10px]">
                  {t('EMPTY_SLOT')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter className="bg-transparent no-print block md:table-footer-group">
            <TableRow className="border-t border-stone-200 dark:border-white/10 block md:table-row">
              <TableCell colSpan={5} className="p-0 block md:table-cell">
                <div className="flex justify-center p-5">
                  <Button 
                    variant="outline" 
                    className="h-10 px-8 rounded-xl text-orange-600 dark:text-amber-400 border-stone-200 dark:border-white/10 hover:bg-orange-50 dark:hover:bg-amber-400/5 gap-3 font-bold uppercase tracking-widest text-[10px] transition-all shadow-sm" 
                    onClick={handleAddRow}
                  >
                    <Plus className="h-4 w-4" /> {t('ADD_ITEM')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
