import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./utils";
import { groupBySlug } from "../../data/mock";

/** Small rotated square that prefixes every accent eyebrow in the production app. */
export function DiamondMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rotate-45 bg-accent", className)} />;
}

/** `// LABEL //` mono tag used for section eyebrows. */
export function Tag({ children, className, tone = "muted" }: { children: ReactNode; className?: string; tone?: "muted" | "accent" | "danger" }) {
  return (
    <span
      className={cn(
        "tag",
        tone === "accent" && "text-accent-ink",
        tone === "danger" && "text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GroupBadge({ slug, className }: { slug: string; className?: string }) {
  const g = groupBySlug(slug);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", g.tone.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", g.tone.dot)} aria-hidden="true" />
      {g.nameZh}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border bg-card text-card-foreground", className)}>{children}</div>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  tone = "default",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  /** `accent` mirrors the production props sub-tabs: mono label, orange when active. */
  tone?: "default" | "accent";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full border bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 transition whitespace-nowrap",
            tone === "accent" ? "font-mono text-xs tracking-wider" : "text-[13px] font-medium",
            value === o.value
              ? tone === "accent"
                ? "bg-card font-semibold text-accent-ink shadow-sm dark:bg-white/20"
                : "bg-card text-foreground shadow-sm dark:bg-white/12"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-3", className)}>
      {/* Production form labels are mono micro-caps (src/app/settings/page.tsx). */}
      <span className="block font-mono text-xs tracking-wider text-muted-foreground uppercase">{label}</span>
      {children}
      {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border-strong bg-muted/60 px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none transition focus:border-accent";

export function Dialog({
  open,
  onClose,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="關閉" className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "animate-rise relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-8",
          className,
        )}
      >
        <button
          type="button"
          aria-label="關閉"
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div role="status" className="animate-rise glass fixed top-20 left-1/2 z-[60] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium">
      {message}
    </div>
  );
}
