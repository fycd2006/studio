import { ChevronDown } from "lucide-react";
import { RELEASE_SECTIONS, type VersionHistoryEntry } from "@/data/version-history";

const sectionDot: Record<(typeof RELEASE_SECTIONS)[number][0], string> = {
  added: "bg-emerald-500",
  improved: "bg-orange-500",
  fixed: "bg-sky-500",
};

export function VersionReleaseNotes({ entry, defaultOpen = false }: { entry: VersionHistoryEntry; defaultOpen?: boolean }) {
  const date = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeZone: "Asia/Taipei" }).format(
    new Date(entry.date + "T00:00:00+08:00"),
  );

  return (
    <article className="grid items-start gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:flex-col sm:items-start sm:gap-1.5 sm:pt-3">
        <span className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
          v{entry.version}
        </span>
        <time dateTime={entry.date} className="text-xs text-muted-foreground">{date}</time>
      </div>
      <div className="space-y-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-white/[0.03] px-4 py-3.5 text-card-foreground shadow-2xs">
        <h4 className="text-base font-semibold tracking-tight">{entry.title}</h4>
        {"changes" in entry ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
            <div className="space-y-2">
              {RELEASE_SECTIONS.map(([key, label]) => {
                const items = entry.changes[key];
                if (!items.length) return null;
                return (
                  <details key={key} open={defaultOpen} className="group rounded-lg border border-stone-200/80 dark:border-white/10 bg-stone-50/70 dark:bg-white/[0.02]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span className={`size-2 rounded-full ${sectionDot[key]}`} aria-hidden="true" />
                      {label}
                      <span className="font-mono text-xs text-muted-foreground">({items.length})</span>
                      <ChevronDown aria-hidden="true" className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <ul className="list-disc space-y-1.5 border-t border-stone-200/60 dark:border-white/10 py-3 pl-8 pr-3 text-sm leading-relaxed">
                      {items.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </details>
                );
              })}
            </div>
          </>
        ) : (
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
            {entry.highlights.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}
