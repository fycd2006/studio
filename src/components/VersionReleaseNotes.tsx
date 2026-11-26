import { ChevronDown } from "lucide-react";
import { RELEASE_SECTIONS, type VersionHistoryEntry } from "@/data/version-history";

export function VersionReleaseNotes({ entry }: { entry: VersionHistoryEntry }) {
  const date = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeZone: "Asia/Taipei" }).format(
    new Date(entry.date + "T00:00:00+08:00"),
  );

  return (
    <article className="grid items-start gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-start sm:gap-1 sm:pt-3">
        <span className="font-mono text-sm font-semibold text-foreground">v{entry.version}</span>
        <time dateTime={entry.date} className="text-xs text-muted-foreground">{date}</time>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
        <h4 className="text-base font-semibold tracking-tight">{entry.title}</h4>
        {"changes" in entry ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
            <div className="space-y-2">
              {RELEASE_SECTIONS.map(([key, label]) => {
                const items = entry.changes[key];
                if (!items.length) return null;
                return (
                  <details key={key} className="group rounded-md border border-border bg-muted/40">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      {label}
                      <span className="font-mono text-xs text-muted-foreground">({items.length})</span>
                      <ChevronDown aria-hidden="true" className="ml-auto size-4 text-muted-foreground group-open:rotate-180" />
                    </summary>
                    <ul className="list-disc space-y-1.5 border-t border-border py-3 pl-8 pr-3 text-sm leading-relaxed">
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
