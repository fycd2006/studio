import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BatteryLow,
  BookOpen,
  ChevronDown,
  Home,
  Megaphone,
  Menu,
  Moon,
  Package,
  Plus,
  Settings,
  Sun,
  Table2,
  Timer,
  Volume2,
  X,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { camp, groups, members, type Route } from "../data/mock";
import { cn } from "./ui/utils";

const NAV: { route: Route; label: string; icon: typeof Home }[] = [
  { route: "home", label: "首頁", icon: Home },
  { route: "plans", label: "教案", icon: BookOpen },
  { route: "timer", label: "計時", icon: Timer },
  { route: "tables", label: "總表", icon: Table2 },
  { route: "props", label: "道具", icon: Package },
];

interface ShellProps {
  route: Route;
  go: (r: Route) => void;
  dark: boolean;
  toggleDark: () => void;
  broadcast: string | null;
  clearBroadcast: () => void;
  onQuickCreate: (group: string) => void;
  hideChrome?: boolean;
  children: ReactNode;
}

export function Shell({ route, go, dark, toggleDark, broadcast, clearBroadcast, onQuickCreate, hideChrome, children }: ShellProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {!hideChrome && (
        <header
          className={cn(
            "sticky top-0 z-40 transition",
            scrolled ? "glass border-x-0 border-t-0 shadow-none" : "border-b border-transparent",
          )}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
            <button type="button" onClick={() => go("home")} className="flex items-center gap-2.5 rounded-full text-left">
              <img src={logo} alt="" className="h-8 w-8 rounded-full border bg-card object-cover" />
              <span className="leading-tight">
                <span className="block text-sm font-semibold">北科崇德</span>
                <span className="tag block text-[10px]">NTUT CD CLUB</span>
              </span>
            </button>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-[13px] font-medium text-accent-ink sm:inline-flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {camp.name}
              </span>
              {(route === "editor" || route === "plans") && (
                <span className="hidden -space-x-2 md:flex" aria-label="協作者">
                  {members.map((m) => (
                    <span key={m.initials} className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white", m.color)}>
                      {m.initials}
                    </span>
                  ))}
                </span>
              )}
              <SystemMenu go={go} dark={dark} toggleDark={toggleDark} onQuickCreate={onQuickCreate} />
            </div>
          </div>
          {broadcast && (
            <div className="flex h-9 items-center overflow-hidden bg-primary text-[13px] font-medium text-primary-foreground">
              <div className="flex min-w-0 flex-1 overflow-hidden">
                <div className="animate-marquee flex shrink-0 gap-16 pl-6 whitespace-nowrap">
                  {[0, 1].map((i) => (
                    <span key={i} className="inline-flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />【值星公告】{broadcast}
                      <span className="opacity-60">·</span>【值星公告】{broadcast}
                    </span>
                  ))}
                </div>
              </div>
              <button type="button" aria-label="關閉公告" onClick={clearBroadcast} className="flex h-9 w-11 items-center justify-center hover:bg-black/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>
      )}

      <main key={route} className="animate-rise">
        {children}
      </main>

      <Dock route={route} go={go} dimmed={hideChrome} />
      {!hideChrome && <MobileTabBar route={route} go={go} />}
    </div>
  );
}

function Dock({ route, go, dimmed }: { route: Route; go: (r: Route) => void; dimmed?: boolean }) {
  const [plansOpen, setPlansOpen] = useState(false);
  const active = (r: Route) => route === r || (r === "plans" && route === "editor");
  return (
    <nav aria-label="主選單" className={cn("fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 md:block", dimmed && "opacity-90")}>
      <div className="relative" onMouseLeave={() => setPlansOpen(false)}>
        {plansOpen && (
          <div className="glass animate-rise absolute bottom-full left-1/2 mb-3 grid w-[520px] -translate-x-1/2 grid-cols-3 gap-2 rounded-3xl p-3">
            {groups.map((g) => (
              <button key={g.slug} type="button" onClick={() => go("plans")} className="rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", g.tone.dot)} aria-hidden="true" />
                  <span className="tag text-[10px]">{g.nameEn}</span>
                </span>
                <span className="mt-1 block font-semibold">{g.nameZh}</span>
              </button>
            ))}
          </div>
        )}
        <div className="glass flex items-center gap-1 rounded-full p-1.5">
          {NAV.map(({ route: r, label, icon: Icon }) => (
            <button
              key={r}
              type="button"
              onClick={() => go(r)}
              onMouseEnter={() => setPlansOpen(r === "plans")}
              aria-current={active(r) ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition",
                active(r) ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {r === "plans" && <ChevronDown className="h-3 w-3 rotate-180" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function MobileTabBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  return (
    <nav aria-label="主選單" className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-x-0 border-b-0 pb-[max(env(safe-area-inset-bottom),10px)] md:hidden">
      {NAV.map(({ route: r, label, icon: Icon }) => {
        const on = route === r || (r === "plans" && route === "editor");
        return (
          <button key={r} type="button" onClick={() => go(r)} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-1 pt-2.5 text-[11px] font-medium">
            <span className={cn("flex h-7 w-14 items-center justify-center rounded-full transition", on ? "bg-accent-soft text-accent-ink" : "text-muted-foreground")}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SystemMenu({
  go,
  dark,
  toggleDark,
  onQuickCreate,
}: {
  go: (r: Route) => void;
  dark: boolean;
  toggleDark: () => void;
  onQuickCreate: (group: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(true);
  const [sound, setSound] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-left hover:bg-muted";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="系統選單"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="glass flex h-11 w-11 items-center justify-center rounded-full"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="menu" className="glass animate-rise absolute top-full right-0 mt-2 w-80 rounded-2xl bg-card p-2 shadow-xl">
          <div className="rounded-xl border p-1.5">
            <button type="button" className={item} onClick={() => setQuick((q) => !q)} aria-expanded={quick}>
              <Plus className="h-4 w-4 text-accent-ink" aria-hidden="true" />
              <span className="flex-1 font-medium">快速新增教案</span>
              <ChevronDown className={cn("h-4 w-4 transition", quick && "rotate-180")} aria-hidden="true" />
            </button>
            {quick && (
              <div className="grid grid-cols-2 gap-1.5 p-1.5">
                {groups.map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => {
                      onQuickCreate(g.slug);
                      setOpen(false);
                    }}
                    className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-[13px] hover:border-accent"
                  >
                    <span className={cn("h-2 w-2 rounded-full", g.tone.dot)} aria-hidden="true" />
                    {g.nameZh}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" role="menuitem" className={item} onClick={() => setSound((s) => !s)}>
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">{sound ? "關閉音效" : "音效解鎖"}</span>
            <span className="tag">{sound ? "已開啟" : "已關閉"}</span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { go("timer"); setOpen(false); }}>
            <BatteryLow className="h-4 w-4" aria-hidden="true" />
            進入省電模式
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { go("settings"); setOpen(false); }}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            系統設定
          </button>
          <div className="flex h-11 items-center justify-between px-3 text-sm">
            主題
            <button type="button" aria-label={dark ? "切換為淺色" : "切換為深色"} onClick={toggleDark} className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 border-t px-3 pt-3 pb-2">
            <span className="tag">目前營隊</span>
            <span className="mt-0.5 block text-sm font-semibold">{camp.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
