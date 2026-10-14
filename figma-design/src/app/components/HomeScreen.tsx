import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Tent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, DiamondMark } from "./ui/primitives";
import { camp, currentStageIndex, formatLong, groups, plans, quotes, stages, type Route, type Stage } from "../data/mock";
import { cn } from "./ui/utils";

/** Same stage → icon mapping the production timeline uses. */
const STAGE_ICONS: Record<Stage["icon"], LucideIcon> = {
  clock: Clock,
  file: FileText,
  users: Users,
  pin: MapPin,
  tent: Tent,
};

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
      {/* Hero — mirrors src/app/page.tsx: full-bleed 1720px frame, fixed navbar overlay,
          100svh with the HUD metrics pinned to the bottom edge. */}
      <section className="relative mx-auto flex min-h-[100svh] w-full max-w-[1720px] flex-col justify-between overflow-hidden px-6 pt-28 pb-12 sm:px-10 sm:pt-36 sm:pb-16 md:px-16 xl:px-24">
        {/* Full-bleed hero backdrop with the production app's asymmetric left mask. */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <div className="h-full w-full bg-gradient-to-br from-amber-200 via-orange-200 to-stone-300 dark:from-stone-600 dark:via-stone-700 dark:to-stone-800" />
          <div className="absolute inset-y-0 left-0 z-10 w-full bg-gradient-to-r from-background via-background/92 to-transparent sm:w-[85%] sm:via-background/85 md:w-[75%] dark:via-background/94 sm:dark:via-background/88" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <div className="absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-background/70 to-transparent" />
        </div>

        {/* Top micro-tag row */}
        <div className="relative z-20 mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-widest text-foreground/80 uppercase">
            <DiamondMark />
            {camp.name}
          </span>
          <div className="hidden items-center gap-6 font-mono text-[11px] tracking-widest text-fg-muted uppercase sm:flex">
            <span className="flex items-center gap-2">
              <DiamondMark className="h-1 w-1" />
              EST. 2006
            </span>
            <span>•</span>
            <span>Architectural curriculum</span>
          </div>
        </div>

        {/* Hero core typography */}
        <div className="relative z-20 my-auto max-w-4xl py-6 sm:py-10">
          <div className="mb-4 flex items-center gap-2.5 sm:mb-6">
            <DiamondMark className="shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            <span className="font-mono text-xs font-medium tracking-widest text-accent-ink uppercase sm:text-sm">
              正在為 {camp.name} 創造內容
            </span>
          </div>
          <h1 className="font-display mb-6 text-4xl leading-[0.96] font-normal tracking-[-0.03em] uppercase sm:mb-8 sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block font-light text-foreground/80">NTUT</span>
            <span className="block bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              CHONG DE
            </span>
          </h1>
          <div className="mb-8 flex min-h-[3.6em] max-w-2xl items-center overflow-hidden text-base leading-relaxed font-light text-muted-foreground sm:mb-12 sm:text-lg">
            <p key={quote} className="animate-rise w-full">
              {quotes[quote]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => go("plans")}
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 font-mono text-xs font-medium tracking-widest text-white uppercase shadow-[0_8px_24px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 hover:shadow-[0_12px_32px_rgba(249,115,22,0.4)] active:translate-y-0 sm:px-10 sm:py-4"
            >
              教案總覽
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go("timer")}
              className="glass inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 font-mono text-xs tracking-widest text-foreground/80 uppercase transition-all duration-300 hover:-translate-y-0.5 hover:text-foreground sm:px-8 sm:py-4"
            >
              行政中心
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Bottom HUD metrics strip */}
        <dl className="relative z-20 grid grid-cols-2 gap-6 border-t pt-8 md:grid-cols-4">
          {[
            ["01 / Total plans", String(plans.length), "Records", false],
            ["02 / Current stage", stage.label, "Phase", true],
            ["03 / Groups", String(groups.length), "Divisions", false],
            ["04 / Countdown", "12", "Days", false],
          ].map(([k, v, u, accent]) => (
            <div key={k as string} className="flex flex-col">
              <dt className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                <DiamondMark className="h-1 w-1" />
                {k}
              </dt>
              <dd className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-2xl tracking-tight sm:text-3xl",
                    accent ? "font-medium text-accent-ink" : "font-light text-foreground",
                  )}
                >
                  {v}
                </span>
                <span className="font-mono text-xs text-fg-muted uppercase">{u}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Timeline */}
      <section className="relative z-20 mx-auto w-full max-w-[1720px] px-6 py-16 sm:px-10 sm:py-24 md:px-16 xl:px-24">
        <SectionHead
          eyebrow="// 01 Operational timeline • Stages"
          title="營隊籌備里程碑演繹"
          echo="Stage exploration"
          className="mb-10 sm:mb-12"
        >
          <button
            type="button"
            onClick={() => go("timer")}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 font-mono text-xs font-medium text-accent-ink transition-colors hover:bg-accent/15"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            當前進行：{stage.label} ({stage.code})
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </SectionHead>
        <div className="mb-6 hidden h-[2.5px] overflow-hidden rounded-full bg-muted md:block" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
            style={{ width: `${((currentStageIndex + 0.5) / stages.length) * 100}%` }}
          />
        </div>

        {/* Mobile: pill selector */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 md:hidden">
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

        <div className="flex h-auto flex-col gap-3 md:h-[380px] md:flex-row">
          {stages.map((s, i) => {
            const open = focus === i;
            const passed = i < currentStageIndex;
            const live = i === currentStageIndex;
            const Icon = STAGE_ICONS[s.icon];
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => setFocus(i)}
                aria-expanded={open}
                className={cn(
                  "group flex flex-col justify-between rounded-3xl border p-5 transition-all duration-500",
                  open
                    ? "relative z-20 flex flex-[4] overflow-hidden border-2 border-accent bg-card text-left shadow-[0_20px_50px_rgba(249,115,22,0.18)] ring-4 ring-accent/10"
                    : "hidden flex-1 items-center bg-card/50 text-center opacity-40 hover:opacity-100 md:flex",
                )}
              >
                {open ? (
                  <>
                    <span
                      className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent blur-3xl"
                      aria-hidden="true"
                    />
                    <span className="relative flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2.5">
                        <span className="tag text-accent-ink">{`// 0${i + 1} Stage • ${s.code}`}</span>
                        {live && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-accent-ink uppercase">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" /> 進行中
                          </span>
                        )}
                      </span>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.45)] lg:h-14 lg:w-14">
                        <Icon className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="my-auto block py-6 font-display text-5xl leading-none lg:text-6xl">{s.label}</span>
                    <span className="flex items-center justify-between gap-3 border-t pt-4 font-mono text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        {s.start}
                        {s.end ? ` ~ ${s.end}` : ""}
                      </span>
                      {passed && (
                        <span className="flex items-center gap-1 text-[10px] tracking-wider text-accent-ink uppercase">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> 已完成
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="tag">0{i + 1}</span>
                    <span className="my-auto flex flex-col items-center gap-2.5 py-4">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full border transition",
                          passed
                            ? "border-accent/25 bg-accent/10 text-accent-ink"
                            : "bg-muted text-muted-foreground group-hover:border-accent/40 group-hover:text-accent",
                        )}
                      >
                        {passed ? (
                          <CheckCircle2 className="h-5 w-5" aria-label="已完成" />
                        ) : (
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="text-base transition group-hover:text-accent-ink">{s.label}</span>
                      <span className="tag">{s.code}</span>
                    </span>
                    <span className="w-full border-t pt-2">
                      <span className="tag block">{s.start.slice(5)}</span>
                      <span className="tag mt-1 hidden text-accent group-hover:block">點擊聚焦 →</span>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Divisions + activity */}
      <section className="relative z-20 mx-auto w-full max-w-[1720px] px-6 py-24 sm:px-10 sm:py-36 md:px-16 xl:px-24">
        <SectionHead
          eyebrow="// 02 Division directory • Architectural list"
          title="組別教案清冊"
          echo="Featured divisions"
          className="mb-16 sm:mb-20"
        >
          <button
            type="button"
            onClick={() => go("plans")}
            className="group inline-flex shrink-0 items-center gap-2 font-mono text-xs font-medium tracking-widest text-accent-ink uppercase transition-colors hover:text-accent"
          >
            Browse all plans
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </SectionHead>
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {groups.map((g, i) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => go("plans")}
                className="group flex w-full items-center gap-4 border-t py-6 text-left transition-all duration-300 last:border-b hover:pl-2"
              >
                <span className="w-6 font-mono text-xs text-fg-muted">0{i + 1}</span>
                <span className={cn("h-2.5 w-2.5 rounded-full", g.tone.dot)} aria-hidden="true" />
                <span className="flex flex-1 items-center gap-3">
                  <span className="font-display text-xl font-normal transition-colors group-hover:text-accent-ink sm:text-2xl">{g.nameZh}</span>
                  <span className="hidden font-mono text-xs tracking-wider text-fg-muted uppercase sm:inline">{g.nameEn}</span>
                </span>
                <span className="flex items-center gap-4 font-mono text-xs text-fg-muted">
                  <span className="rounded-full border px-3 py-1 text-foreground transition-colors group-hover:border-accent/40">
                    {plans.filter((p) => p.group === g.slug).length} PLANS
                  </span>
                  <ArrowRight className="h-4 w-4 transition-all group-hover:translate-x-1.5 group-hover:text-accent" aria-hidden="true" />
                </span>
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

      <footer className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-wrap items-center justify-between gap-8 border-t px-6 py-16 sm:px-10 sm:py-20 md:px-16 xl:px-24">
        <span>
          <span className="tag flex items-center gap-2 text-foreground">
            <DiamondMark className="h-2 w-2 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            NTUT Chong De Volunteer Studio
          </span>
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

/** Production section header: rotated-square eyebrow, uppercase title with a muted English echo. */
function SectionHead({
  eyebrow,
  title,
  echo,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  echo: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-end", className)}>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <DiamondMark />
          <span className="font-mono text-xs font-medium tracking-widest text-accent-ink uppercase">{eyebrow}</span>
        </div>
        <h2 className="font-display text-2xl font-normal tracking-[-0.02em] uppercase sm:text-4xl">
          {title}
          <span className="ml-3 text-lg font-light text-fg-muted sm:text-2xl">{echo}</span>
        </h2>
      </div>
      {children}
    </div>
  );
}
