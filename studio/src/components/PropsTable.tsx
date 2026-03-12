
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
      placeholder={placeholder}
      rows={1}
      className={cn("w-full resize-none border-none shadow-none focus:outline-none bg-transparent py-3 text-[13px] font-black text-slate-950 min-h-[44px] overflow-hidden leading-relaxed", className)}
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
      className={cn("w-full h-12 border-none shadow-none focus:outline-none bg-transparent text-center text-[13px] font-black text-slate-950", className)}
    />
  );
}

interface PropsTableProps {
  label?: string;
  value: PropItem[];
  onChange: (value: PropItem[]) => void;
}

export function PropsTable({ label, value = [], onChange }: PropsTableProps) {
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
        <label className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] px-1">
          {label}
        </label>
      )}

      <div className="border border-slate-200 rounded-[1.5rem] overflow-x-auto bg-white shadow-xl scrollbar-hide">
        <Table className="min-w-[900px] table-auto">
          <TableHeader className="bg-slate-50">
            <TableRow className="border-b border-slate-200">
              <TableHead className="min-w-[250px] font-black text-slate-950 border-r border-slate-200 h-12 text-[11px] uppercase tracking-wider">項目名稱 / Item Name</TableHead>
              <TableHead className="w-[120px] font-black text-slate-950 border-r border-slate-200 text-center whitespace-nowrap text-[11px] uppercase tracking-wider">數量 / Qty</TableHead>
              <TableHead className="w-[120px] font-black text-slate-950 border-r border-slate-200 text-center whitespace-nowrap text-[11px] uppercase tracking-wider">單位 / Unit</TableHead>
              <TableHead className="min-w-[350px] font-black text-slate-950 border-r border-slate-200 text-[11px] uppercase tracking-wider">備註 / Remarks</TableHead>
              <TableHead className="w-[80px] text-center no-print font-black text-slate-950 text-[11px] uppercase">DEL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value && value.length > 0 ? (
              value.map((row) => (
                <TableRow key={row.id} className="border-b border-slate-200 last:border-0 hover:bg-orange-50/10">
                  <TableCell className="border-r border-slate-200 align-top p-0">
                    <AutoExpandingTextarea 
                      value={row.name} 
                      onChange={(val) => handleUpdateRow(row.id, 'name', val)} 
                      placeholder="道具名稱 / Item..." 
                      className="px-4"
                    />
                  </TableCell>
                  <TableCell className="border-r border-slate-200 text-center align-top p-0 whitespace-nowrap">
                    <LocalInput 
                      value={row.quantity} 
                      onChange={(val) => handleUpdateRow(row.id, 'quantity', val)} 
                      placeholder="1" 
                    />
                  </TableCell>
                  <TableCell className="border-r border-slate-200 text-center align-top p-0 whitespace-nowrap">
                    <LocalInput 
                      value={row.unit} 
                      onChange={(val) => handleUpdateRow(row.id, 'unit', val)} 
                      placeholder="個 / Unit" 
                    />
                  </TableCell>
                  <TableCell className="border-r border-slate-200 align-top p-0">
                    <AutoExpandingTextarea 
                      value={row.remarks || ""} 
                      onChange={(val) => handleUpdateRow(row.id, 'remarks', val)} 
                      placeholder="備註 / Details..." 
                      className="px-4"
                    />
                  </TableCell>
                  <TableCell className="text-center no-print align-top pt-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-600" onClick={() => handleRemoveRow(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                  目前無道具資訊 / No Items Listed
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter className="bg-transparent no-print">
            <TableRow className="border-t border-slate-200">
              <TableCell colSpan={5} className="p-0">
                <div className="flex justify-center p-5">
                  <Button variant="outline" className="h-10 px-8 rounded-xl text-orange-700 border-orange-300 hover:bg-orange-600 hover:text-white gap-3 font-black uppercase tracking-widest text-[10px] transition-all shadow-md" onClick={handleAddRow}>
                    <Plus className="h-4 w-4" /> 新增道具 / Add Item
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
