import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Diamond } from "lucide-react";
import { Button } from "./ui/button";
import { Card, Tag } from "./ui/primitives";
import { camp, currentStageIndex, formatLong, groups, plans, quotes, stages, type Route } from "../data/mock";
import { cn } from "./ui/utils";

export function HomeScreen({ go, openPlan }: { go: (r: Route) => void; openPlan: (id: string) => void }) {
  const [quote, setQuote] = useState(0);
  const [focus, setFocus] = useState(currentStageIndex);

  useEffect(() => {
    const t = window.setInterval(() => setQuote((q) => (q + 1) % quotes.length), 5500);
    return () => window.clearInterval(t);
  }, []);

  const recent = useMemo(() => [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5), []);
  const stage = stages[currentStageIndex];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-[62%] lg:block" aria-hidden="true">
          <div className="h-full w-full bg-gradient-to-br from-amber-200 via-orange-200 to-stone-300 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end gap-7 px-4 pt-10 pb-10 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              <Diamond className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
              {camp.name}
            </span>
            <Tag className="hidden sm:inline">● EST. 2006 • Architectural curriculum</Tag>
          </div>
          <Tag tone="accent">正在為 {camp.name} 創造內容</Tag>
          <h1 className="font-display text-[clamp(64px,11vw,148px)] leading-[0.9] font-normal tracking-[-0.03em]">
            NTUT
            <br />
            CHONG DE
          </h1>
          <p key={quote} className="animate-rise max-w-xl text-lg text-muted-foreground">
            {quotes[quote]}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={() => go("plans")}>
              教案總覽 <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="lg" onClick={() => go("timer")}>
              行政中心 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t pt-6 md:grid-cols-4">
            {[
              ["01 / Total plans", String(plans.length), "Records"],
              ["02 / Current stage", stage.label, "Phase"],
              ["03 / Groups", String(groups.length), "Divisions"],
              ["04 / Countdown", "12", "Days"],
            ].map(([k, v, u]) => (
              <div key={k}>
                <dt className="tag">{k}</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-light sm:text-5xl">{v}</span>
                  <span className="tag">{u}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-7xl border-t px-4 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Tag tone="accent">// 01 Operational timeline • Stages</Tag>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              營隊籌備里程碑演繹 <Tag className="align-middle">Stage exploration</Tag>
            </h2>
          </div>
          <Button size="sm" onClick={() => go("timer")}>
            當前進行：{stage.label} ({stage.code}) <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-6 h-[3px] rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-accent" style={{ width: `${((currentStageIndex + 0.5) / stages.length) * 100}%` }} />
        </div>

        {/* Mobile: pill selector */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {stages.map((s, i) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setFocus(i)}
              className={cn("h-10 shrink-0 rounded-full border px-4 text-[13px]", focus === i ? "bg-foreground text-background" : "bg-card")}
            >
              0{i + 1} {s.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex h-auto flex-col gap-3 md:h-[380px] md:flex-row">
          {stages.map((s, i) => {
            const open = focus === i;
            const passed = i < currentStageIndex;
            const live = i === currentStageIndex;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => setFocus(i)}
                aria-expanded={open}
                className={cn(
                  "group flex flex-col justify-between rounded-3xl border p-5 text-left transition-all duration-500",
                  open ? "flex-[4] bg-card shadow-lg" : "hidden flex-1 bg-card/50 hover:bg-card md:flex",
                  open && "flex",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="tag">{open ? `// 0${i + 1} Stage • ${s.code}` : `0${i + 1}`}</span>
                  {open && live && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> 進行中
                    </span>
                  )}
                  {passed && !open && <Check className="h-4 w-4 text-success" aria-label="已完成" />}
                </span>
                {open ? (
                  <span className="mt-10 flex flex-col gap-2">
                    <span className="font-display text-5xl">{s.label}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {s.start}
                      {s.end ? ` ~ ${s.end}` : ""}
                    </span>
                    {passed && <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-success"><Check className="h-4 w-4" aria-hidden="true" /> 已完成</span>}
                  </span>
                ) : (
                  <span className="flex flex-col gap-1">
                    <span className="text-lg font-semibold">{s.label}</span>
                    <span className="tag">{s.code} · {s.start.slice(5)}</span>
                    <span className="tag mt-3 opacity-0 transition group-hover:opacity-100">點擊聚焦 →</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Divisions + activity */}
      <section className="mx-auto max-w-7xl border-t px-4 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Tag tone="accent">// 02 Division directory</Tag>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              組別教案清冊 <Tag className="align-middle">Featured divisions</Tag>
            </h2>
          </div>
          <button type="button" onClick={() => go("plans")} className="tag hover:text-foreground">Browse all plans →</button>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {groups.map((g, i) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => go("plans")}
                className="group flex w-full items-center gap-5 border-t py-6 text-left last:border-b"
              >
                <span className="tag">0{i + 1}</span>
                <span className={cn("h-2.5 w-2.5 rounded-full", g.tone.dot)} aria-hidden="true" />
                <span className="flex-1">
                  <span className="font-display text-2xl transition group-hover:translate-x-1 sm:text-3xl">{g.nameZh}</span>
                  <span className="tag ml-3">{g.nameEn}</span>
                </span>
                <span className="tag group-hover:text-foreground">{plans.filter((p) => p.group === g.slug).length} plans →</span>
              </button>
            ))}
          </div>
          <Card className="p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="tag text-foreground">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" aria-hidden="true" />即時動態 Activity stream
              </span>
              <span className="tag">Live sync</span>
            </div>
            <ul className="mt-4">
              {recent.map((p, i) => (
                <li key={p.id}>
                  <button type="button" onClick={() => openPlan(p.id)} className="flex w-full items-center justify-between gap-3 border-t py-3.5 text-left hover:text-accent-ink">
                    <span>
                      <span className="tag">{i === 0 ? "Latest" : "Recent"} • {formatLong(p.updatedAt)}</span>
                      <span className="mt-0.5 block font-medium">{p.title}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-dashed pt-4">
              <span className="tag">// Philosophy ticker</span>
              <p className="mt-1 text-sm text-muted-foreground">{quotes[(quote + 1) % quotes.length]}</p>
            </div>
          </Card>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t px-4 py-10 sm:px-8">
        <span>
          <span className="tag block text-foreground">NTUT Chong De Volunteer Studio</span>
          <span className="tag">© 2026 Architectural precision • Crafted with passion</span>
        </span>
        <span className="flex gap-6">
          <button type="button" className="tag hover:text-foreground" onClick={() => go("plans")}>Plans registry</button>
          <button type="button" className="tag hover:text-foreground" onClick={() => go("timer")}>Administration</button>
          <button type="button" className="tag hover:text-foreground" onClick={() => go("settings")}>Settings</button>
        </span>
      </footer>
    </div>
  );
}
