"use client";

import { useState } from "react";
import type { LessonPlan, RotationTableData } from "@/types/plan";
import { useAuth } from "@/lib/auth-context";
import { rotationStop, REST, teamInCell } from "@/lib/rotation-itinerary";
import { stationAssignees } from "@/lib/rotation-personnel";
import { stripHtml } from "@/lib/utils";

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
      return showAll || isLead || isAssistant ? [{ station, column, lead, assistant }] : [];
    });
    return stations.length ? [{ table, stations }] : [];
  });

  return (
    <section aria-labelledby="station-itinerary-title" className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="station-itinerary-title" className="text-xl font-semibold tracking-tight">關卡行程</h2>
        <select aria-label="關卡篩選" value={showAll ? "all" : "mine"} onChange={event => setShowAll(event.target.value === "all")}
          className="h-11 max-w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <option value="mine">我的關卡</option>
          <option value="all">全部關卡</option>
        </select>
      </div>
      {!schedule.length && (
        <p role="status" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          {!tables.length ? "當天尚無闖關表。" : showAll ? "當天尚未安排關卡。" :
            memberDirectoryReady ? "當天沒有配對到你的關卡。可切換「全部關卡」查看。" : "正在載入關主資料…"}
        </p>
      )}
      {schedule.map(({ table, stations }) => (
        <div key={table.id} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{table.title || "闖關表"}</h3>
          {stations.map(({ station, column, lead, assistant }) => (
            <article key={station.id} className="rounded-lg border border-border bg-card text-card-foreground">
              <header className="space-y-2 px-4 py-4">
                <h4 className="break-words text-base font-semibold tracking-tight">{station.name || "未命名關卡"}</h4>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                  {[
                    ["地點", stripHtml(station.location)],
                    ["主關主", lead.map(entry => (entry.uid && memberNicknames.get(entry.uid)) || entry.name).join("、")],
                    ["副關主", assistant.map(entry => (entry.uid && memberNicknames.get(entry.uid)) || entry.name).join("、")],
                  ].map(([title, value]) => (
                    <div key={title} className="contents">
                      <dt className="text-muted-foreground">{title}</dt>
                      <dd className="whitespace-pre-line break-words">{value || "未填寫"}</dd>
                    </div>
                  ))}
                </dl>
              </header>
              {!table.rounds.length && <p className="border-t border-border p-4 text-sm text-muted-foreground">尚未安排輪次。</p>}
              <ol className="divide-y divide-border border-t border-border" hidden={!table.rounds.length}>
                {table.rounds.map((round, index) => {
                  const teams = table.teamOrders.filter(team => rotationStop(table, team, index).station?.id === station.id);
                  const cell = round.cells[column]?.trim() || "";
                  const isRest = [REST, "休息", "輪空"].includes(cell);
                  const knownTeamInCell = !!cell && table.teamOrders.some(team => teamInCell(cell, team));
                  return (
                    <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-4 px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">第 {index + 1} 輪</span>
                      {teams.length ? <span className="break-words text-sm font-medium">{teams.map(team => team.name).join("、")}</span>
                        : <span className="break-words text-sm text-muted-foreground">
                          {isRest ? "休息" : knownTeamInCell ? "待確認" : cell || "待安排"}
                        </span>}
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
