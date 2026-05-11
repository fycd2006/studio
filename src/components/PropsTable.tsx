"use client"

import { PropItem } from "@/types/plan";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";

/* ─────────────────────────────────────────────
   Auto-expanding textarea — used for Name / Remarks
   ───────────────────────────────────────────── */
function CellTextarea({
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isFocused) setLocalValue(value || "");
  }, [value, isFocused]);

  const resize = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(resize, [localValue, resize]);

  return (
    <textarea
      ref={ref}
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => { setIsFocused(false); onChange(localValue); }}
      onChange={(e) => setLocalValue(e.target.value)}
      onInput={resize}
      readOnly={readOnly}
      disabled={readOnly}
      placeholder={placeholder}
      className={cn(
        "w-full resize-none bg-transparent py-2.5 px-3 text-[13px] text-[#2C2A28] dark:text-slate-100 leading-relaxed",
        "placeholder:text-stone-300 dark:placeholder:text-slate-600",
        "focus:outline-none focus:bg-blue-50/60 dark:focus:bg-blue-500/5",
        "min-h-[40px] overflow-hidden transition-colors",
        className,
      )}
    />
  );
}

/* ─────────────────────────────────────────────
   Inline input — used for Qty / Unit
   ───────────────────────────────────────────── */
function CellInput({
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setLocalValue(value || "");
  }, [value, isFocused]);

  return (
    <input
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { setIsFocused(false); onChange(localValue); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      readOnly={readOnly}
      disabled={readOnly}
      placeholder={placeholder}
      className={cn(
        "w-full h-[40px] bg-transparent text-center text-[13px] text-[#2C2A28] dark:text-slate-100",
        "placeholder:text-stone-300 dark:placeholder:text-slate-600",
        "focus:outline-none focus:bg-blue-50/60 dark:focus:bg-blue-500/5",
        "transition-colors",
        className,
      )}
    />
  );
}

/* ─────────────────────────────────────────────
   Props Table – Google Sheets-style grid
   ───────────────────────────────────────────── */
interface PropsTableProps {
  label?: string;
  value: PropItem[];
  onChange: (value: PropItem[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
}

export function PropsTable({ label, value = [], onChange, onFocus, onBlur, readOnly = false }: PropsTableProps) {
  const { t, language } = useTranslation();

  const handleAddRow = () => {
    if (readOnly) return;
    const newRow: PropItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      quantity: "",
      unit: "",
      remarks: "",
    };
    onChange([...value, newRow]);
  };

  const handleUpdateRow = (id: string, field: keyof PropItem, val: string) => {
    if (readOnly) return;
    onChange(value.map((row) => (row.id === id ? { ...row, [field]: val } : row)));
  };

  const handleRemoveRow = (id: string) => {
    if (readOnly) return;
    onChange(value.filter((row) => row.id !== id));
  };

  /* ── border tokens ── */
  const borderCell = "border-r border-b border-stone-200/80 dark:border-slate-700/60";
  const borderLast = "border-b border-stone-200/80 dark:border-slate-700/60";

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-[12px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
          {label}
        </label>
      )}

      <div
        className={cn(
          "w-full rounded-lg overflow-hidden transition-colors",
          "border border-stone-200/80 dark:border-slate-700/60",
          "bg-white dark:bg-slate-900/40",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none",
          readOnly && "opacity-90",
        )}
        onFocus={onFocus}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) onBlur?.();
        }}
      >
        {/* ── Horizontal scroll wrapper ── */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 460, touchAction: 'manipulation' }}>
            {/* ──────── COLGROUP — controls column proportions ──────── */}
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "10%", minWidth: 56 }} />
              <col style={{ width: "10%", minWidth: 56 }} />
              <col style={{ width: "36%" }} />
              <col className="no-print" style={{ width: "8%", minWidth: 44 }} />
            </colgroup>

            {/* ──────── HEADER ──────── */}
            <thead>
              <tr className="bg-stone-50 dark:bg-slate-800/60">
                <th className={cn("text-left px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-500 dark:text-slate-400", borderCell)}>
                  {t("PROP_NAME")}
                </th>
                <th className={cn("text-center px-1 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-500 dark:text-slate-400", borderCell)}>
                  Qty
                </th>
                <th className={cn("text-center px-1 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-500 dark:text-slate-400", borderCell)}>
                  Unit
                </th>
                <th className={cn("text-left px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-500 dark:text-slate-400", borderCell)}>
                  {t("OP_REMARKS")}
                </th>
                <th className={cn("text-center px-1 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-500 dark:text-slate-400 no-print", borderLast)} />
              </tr>
            </thead>

            {/* ──────── BODY ──────── */}
            <tbody>
              {value && value.length > 0 ? (
                value.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "group transition-colors",
                      "hover:bg-stone-50/60 dark:hover:bg-slate-800/30",
                      idx % 2 === 1 && "bg-stone-25 dark:bg-slate-800/15",
                    )}
                  >
                    {/* Name */}
                    <td className={cn("align-top p-0", borderCell)}>
                      <CellTextarea
                        value={row.name}
                        onChange={(v) => handleUpdateRow(row.id, "name", v)}
                        placeholder={t("PROP_NAME")}
                        readOnly={readOnly}
                      />
                    </td>
                    {/* Qty */}
                    <td className={cn("align-top p-0", borderCell)}>
                      <CellInput
                        value={row.quantity}
                        onChange={(v) => handleUpdateRow(row.id, "quantity", v)}
                        placeholder="—"
                        readOnly={readOnly}
                      />
                    </td>
                    {/* Unit */}
                    <td className={cn("align-top p-0", borderCell)}>
                      <CellInput
                        value={row.unit}
                        onChange={(v) => handleUpdateRow(row.id, "unit", v)}
                        placeholder="—"
                        readOnly={readOnly}
                      />
                    </td>
                    {/* Remarks */}
                    <td className={cn("align-top p-0", borderCell)}>
                      <CellTextarea
                        value={row.remarks || ""}
                        onChange={(v) => handleUpdateRow(row.id, "remarks", v)}
                        placeholder={t("OP_REMARKS")}
                        readOnly={readOnly}
                      />
                    </td>
                    {/* Delete */}
                    <td className={cn("align-middle p-0 text-center no-print", borderLast)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={readOnly}
                        className="h-8 w-8 text-stone-300 dark:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-500 dark:hover:text-rose-400 transition-all"
                        onClick={() => handleRemoveRow(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-stone-300 dark:text-slate-700 text-[12px] font-bold uppercase tracking-widest">
                    {t("EMPTY_SLOT")}
                  </td>
                </tr>
              )}
            </tbody>

            {/* ──────── FOOTER ──────── */}
            {!readOnly && (
              <tfoot className="no-print">
                <tr>
                  <td colSpan={5} className="p-0">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-2.5",
                        "text-[12px] font-bold uppercase tracking-widest",
                        "text-orange-500 dark:text-amber-400",
                        "hover:bg-stone-50 dark:hover:bg-slate-800/40",
                        "transition-colors cursor-pointer border-none bg-transparent",
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {language === "zh" ? "新增道具" : "Add Prop"}
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
