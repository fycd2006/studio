"use client";

import { useEffect, useState } from "react";
import { Coffee, Compass, MapPin, User, UserPlus, Users } from "lucide-react";
import type { RotationTableData } from "@/types/plan";
import { cn, stripHtml } from "@/lib/utils";
import { rotationStop, teamKey } from "@/lib/rotation-itinerary";

interface Choice { id: string; name: string; matchByName?: boolean }

function readChoice(key: string): Choice | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return typeof value?.id === "string" && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
}

function findTeam<T extends Choice>(teams: T[], choice: Choice) {
  const sameId = teams.find(team => team.id === choice.id);
  if (sameId) return sameId;
  if (choice.matchByName === false) return undefined;
  const matches = teams.filter(team => team.matchByName !== false && teamKey(team.name) === teamKey(choice.name));
  return matches.length === 1 ? matches[0] : undefined;
}

export function TeamRotationView({ tables, storageKey }: { tables: RotationTableData[]; storageKey: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => setChoice(readChoice(storageKey)), [storageKey]);

  const ambiguousNames = new Set<string>();
  for (const table of tables) {
    const seen = new Set<string>();
    for (const team of table.teamOrders) {
      const key = teamKey(team.name);
      if (seen.has(key)) ambiguousNames.add(key);
      seen.add(key);
    }
  }
  const options: (Choice & { label: string })[] = [];
  for (const table of tables) {
    table.teamOrders.forEach((team, index) => {
      const matchByName = !ambiguousNames.has(teamKey(team.name));
      const candidate = { id: team.id, name: team.name, matchByName };
      if (findTeam(options, candidate)) return;
      const label = matchByName ? team.name : `${team.name}（${table.title} · 第 ${index + 1} 列）`;
      options.push({ ...candidate, label });
    });
  }
  const selected = choice && findTeam(options, choice);

  const selectTeam = (next: Choice) => {
    setChoice(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the selection for this visit. */ }
  };

  return (
    <section aria-labelledby="team-itinerary-title" className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Users className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="team-itinerary-title" className="text-lg font-semibold tracking-tight">小隊行程</h2>
              <p className="text-xs text-muted-foreground">選擇小隊後，系統將在這台裝置記住你的選擇</p>
            </div>
          </div>
          {options.length > 0 && (
            <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span>我的小隊</span>
              <select value={selected?.id || ""} onChange={e => {
                const next = options.find(option => option.id === e.target.value);
                if (next) selectTeam(next);
              }} className="h-10 max-w-full rounded-lg border border-stone-200/90 dark:border-white/15 bg-background px-3 text-sm font-normal text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="" disabled>選擇小隊</option>
                {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
        {options.length > 0 && options.length <= 10 && (
          <div className="flex flex-wrap gap-1.5 border-t border-stone-200/60 pt-3 dark:border-white/10">
            {options.map(option => {
              const active = selected?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectTeam(option)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                    active
                      ? "border-orange-500/40 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xs"
                      : "border-stone-200/80 dark:border-white/10 bg-background/70 text-foreground hover:border-orange-500/40 hover:bg-orange-500/5",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {!selected && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] px-5 py-10 text-center backdrop-blur-md shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-full bg-stone-100 dark:bg-white/5 text-muted-foreground">
            <Compass className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            {!tables.length ? "當天尚無闖關表。" : !options.length ? "當天尚未安排小隊。" : "請選擇小隊，查看當天的闖關行程。"}
          </p>
        </div>
      )}
      {selected && tables.map(table => {
        const team = findTeam(table.teamOrders, selected);
        if (!team) return null;
        return (
          <article key={table.id} className="overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-white/[0.03] text-card-foreground backdrop-blur-md shadow-xs">
            <header className="flex items-center justify-between gap-3 bg-stone-900 px-4 py-3 text-white dark:bg-black/40">
              <h3 className="truncate text-base font-medium tracking-tight">{table.title || "闖關表"}</h3>
              <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] text-white/90">
                共 {table.rounds.length} 輪
              </span>
            </header>
            {!table.rounds.length && <p className="p-4 text-sm text-muted-foreground">尚未安排輪次。</p>}
            <ol className="divide-y divide-stone-200/60 dark:divide-white/10">
              {table.rounds.map((_, i) => {
                const { station, label, detail } = rotationStop(table, team, i);
                const isRest = !station && label === "休息";
                return (
                  <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 px-4 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs font-medium",
                      isRest
                        ? "border-stone-200/80 bg-stone-100 text-muted-foreground dark:border-white/10 dark:bg-white/5"
                        : "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
                    )}>
                      {isRest && <Coffee className="size-3" aria-hidden="true" />}
                      第 {i + 1} 輪
                    </span>
                    <div className="min-w-0 break-words">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-base font-semibold tracking-tight", isRest && "text-muted-foreground font-medium")}>{label}</p>
                        {station && detail && (
                          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                            {detail}
                          </span>
                        )}
                      </div>
                      {station ? (
                        <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-3">
                          {([
                            ["地點", station.location, MapPin],
                            ["主關主", station.lead, User],
                            ["副關主", station.assistant, UserPlus],
                          ] as const).map(([title, value, Icon]) => (
                            <div key={title} className="flex items-start gap-1.5 rounded-lg bg-stone-50/80 px-2.5 py-1.5 dark:bg-white/[0.03]">
                              <Icon className="mt-0.5 size-3.5 shrink-0 text-orange-500/80" aria-hidden="true" />
                              <div className="min-w-0">
                                <dt className="text-[11px] text-muted-foreground">{title}</dt>
                                <dd className="whitespace-pre-line break-words font-medium text-foreground">{stripHtml(value) || "未填寫"}</dd>
                              </div>
                            </div>
                          ))}
                        </dl>
                      ) : detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        );
      })}
    </section>
  );
}
