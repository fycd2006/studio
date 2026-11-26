"use client";

import { useEffect, useState } from "react";
import type { RotationTableData } from "@/types/plan";
import { stripHtml } from "@/lib/utils";
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

  return (
    <section aria-labelledby="team-itinerary-title" className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="team-itinerary-title" className="text-xl font-semibold tracking-tight">小隊行程</h2>
        {options.length > 0 && (
          <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs text-muted-foreground">
            我的小隊
            <select value={selected?.id || ""} onChange={e => {
              const next = options.find(option => option.id === e.target.value);
              if (!next) return;
              setChoice(next);
              try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the selection for this visit. */ }
            }} className="h-11 max-w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" disabled>選擇小隊</option>
              {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        )}
      </div>
      {!selected && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        {!tables.length ? "當天尚無闖關表。" : !options.length ? "當天尚未安排小隊。" : "請選擇小隊，查看當天的闖關行程。"}
      </p>}
      {selected && tables.map(table => {
        const team = findTeam(table.teamOrders, selected);
        if (!team) return null;
        return (
          <article key={table.id} className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
            <h3 className="border-b border-border px-4 py-3 text-base font-semibold tracking-tight">{table.title || "闖關表"}</h3>
            {!table.rounds.length && <p className="p-4 text-sm text-muted-foreground">尚未安排輪次。</p>}
            <ol className="divide-y divide-border">
              {table.rounds.map((_, i) => {
                const { station, label, detail } = rotationStop(table, team, i);
                return (
                  <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-4 px-4 py-4">
                    <span className="font-mono text-xs text-muted-foreground">第 {i + 1} 輪</span>
                    <div className="min-w-0 break-words">
                      <p className="font-medium">{label}</p>
                      {station ? (
                        <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                          {([["地點", station.location], ["主關主", station.lead], ["副關主", station.assistant]] as const).map(([title, value]) => (
                            <div key={title} className="contents"><dt className="text-muted-foreground">{title}</dt><dd className="whitespace-pre-line">{stripHtml(value) || "未填寫"}</dd></div>
                          ))}
                        </dl>
                      ) : detail && <p className="text-sm text-muted-foreground">{detail}</p>}
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
