"use client";

import { useState } from "react";
import { Coffee, Flag, MapPin, User, UserPlus } from "lucide-react";
import type { LessonPlan, RotationTableData } from "@/types/plan";
import { useAuth } from "@/lib/auth-context";
import { rotationStop, REST, teamInCell } from "@/lib/rotation-itinerary";
import { stationAssignees } from "@/lib/rotation-personnel";
import { cn, stripHtml } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function StationRotationView({ tables, plans }: { tables: RotationTableData[]; plans: LessonPlan[] }) {
  const { member, memberNicknames, nicknameIndex, memberDirectoryReady } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const plansById = new Map(plans.map(plan => [plan.id, plan]));
  const schedule = tables.flatMap(table => {
    const stations = table.stations.flatMap((station, column) => {
      const linkedPlan = plansById.get(station.id);
      const lead = stationAssignees(station, "lead", linkedPlan, memberNicknames, nicknameIndex);
      const assistant = stationAssignees(station, "assistant", linkedPlan, memberNicknames, nicknameIndex);
      const isLead = lead.some(entry => entry.uid === member?.uid);
      const isAssistant = assistant.some(entry => entry.uid === member?.uid);
      return showAll || isLead || isAssistant ? [{ station, column, lead, assistant, isLead, isAssistant }] : [];
    });
    return stations.length ? [{ table, stations }] : [];
  });

  return (
    <section aria-labelledby="station-itinerary-title" className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flag className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="station-itinerary-title" className="text-lg font-semibold tracking-tight">關卡行程</h2>
            <p className="text-xs text-muted-foreground">依輪次查看各小隊到站順序</p>
          </div>
        </div>
        <div role="group" aria-label="關卡篩選" className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200/80 dark:border-white/10 bg-muted/50 p-1">
          <button
            type="button"
            aria-pressed={!showAll}
            onClick={() => setShowAll(false)}
            className={cn(
              "min-h-9 rounded-md px-3 text-xs font-medium transition-all cursor-pointer",
              !showAll
                ? "bg-white dark:bg-white/15 text-orange-600 dark:text-orange-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            我的關卡
          </button>
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll(true)}
            className={cn(
              "min-h-9 rounded-md px-3 text-xs font-medium transition-all cursor-pointer",
              showAll
                ? "bg-white dark:bg-white/15 text-orange-600 dark:text-orange-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            全部關卡
          </button>
        </div>
      </div>
      {!schedule.length && (
        <div role="status" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] px-5 py-10 text-center backdrop-blur-md shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-full bg-stone-100 dark:bg-white/5 text-muted-foreground">
            <Flag className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            {!tables.length ? "當天尚無闖關表。" : showAll ? "當天尚未安排關卡。" :
              memberDirectoryReady ? "當天沒有配對到你的關卡。" : "正在載入關主資料…"}
          </p>
          {tables.length > 0 && !showAll && memberDirectoryReady && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAll(true)}>
              切換至全部關卡
            </Button>
          )}
        </div>
      )}
      {schedule.map(({ table, stations }) => (
        <div key={table.id} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{table.title || "闖關表"}</h3>
            <span className="text-xs text-muted-foreground">{stations.length} 個關卡</span>
          </div>
          {stations.map(({ station, column, lead, assistant, isLead, isAssistant }) => (
            <article key={station.id} className={cn(
              "overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-white/[0.03] text-card-foreground backdrop-blur-md shadow-xs",
              (isLead || isAssistant) && "border-t-2 border-t-orange-500/70",
            )}>
              <header className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="break-words text-base font-semibold tracking-tight">{station.name || "未命名關卡"}</h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isLead && (
                      <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-300">
                        你擔任主關主
                      </span>
                    )}
                    {isAssistant && (
                      <span className="rounded-full border border-stone-300/70 bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 dark:border-white/15 dark:bg-white/10 dark:text-stone-300">
                        你擔任副關主
                      </span>
                    )}
                  </div>
                </div>
                <dl className="grid gap-1.5 text-sm sm:grid-cols-3">
                  {([
                    ["地點", stripHtml(station.location), MapPin],
                    ["主關主", lead.map(entry => (entry.uid && memberNicknames.get(entry.uid)) || entry.name).join("、"), User],
                    ["副關主", assistant.map(entry => (entry.uid && memberNicknames.get(entry.uid)) || entry.name).join("、"), UserPlus],
                  ] as const).map(([title, value, Icon]) => (
                    <div key={title} className="flex items-start gap-1.5 rounded-lg bg-stone-50/80 px-2.5 py-1.5 dark:bg-white/[0.03]">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-orange-500/80" aria-hidden="true" />
                      <div className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">{title}</dt>
                        <dd className="whitespace-pre-line break-words font-medium">{value || "未填寫"}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </header>
              {!table.rounds.length && <p className="border-t border-stone-200/60 dark:border-white/10 p-4 text-sm text-muted-foreground">尚未安排輪次。</p>}
              <ol className="divide-y divide-stone-200/60 border-t border-stone-200/60 dark:divide-white/10 dark:border-white/10" hidden={!table.rounds.length}>
                {table.rounds.map((round, index) => {
                  const teams = table.teamOrders.filter(team => rotationStop(table, team, index).station?.id === station.id);
                  const cell = round.cells[column]?.trim() || "";
                  const isRest = [REST, "休息", "輪空"].includes(cell);
                  const knownTeamInCell = !!cell && table.teamOrders.some(team => teamInCell(cell, team));
                  return (
                    <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs font-medium",
                        isRest
                          ? "border-stone-200/80 bg-stone-100 text-muted-foreground dark:border-white/10 dark:bg-white/5"
                          : "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
                      )}>
                        {isRest && <Coffee className="size-3" aria-hidden="true" />}
                        第 {index + 1} 輪
                      </span>
                      {teams.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teams.map(team => (
                            <span key={team.id} className="rounded-md border border-stone-200/80 bg-stone-50 px-2.5 py-0.5 text-sm font-medium text-foreground dark:border-white/10 dark:bg-white/5">
                              {team.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="break-words text-sm text-muted-foreground">
                          {isRest ? "休息" : knownTeamInCell ? "待確認" : cell || "待安排"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
