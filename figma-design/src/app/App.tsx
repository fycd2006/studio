import { useCallback, useEffect, useState } from "react";
import { Check, Rocket } from "lucide-react";
import { Shell } from "./components/Shell";
import { LoginScreen } from "./components/LoginScreen";
import { HomeScreen } from "./components/HomeScreen";
import { PlansScreen } from "./components/PlansScreen";
import { EditorScreen } from "./components/EditorScreen";
import { AdminScreen } from "./components/AdminScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { Button } from "./components/ui/button";
import { Dialog, Toast } from "./components/ui/primitives";
import { plans as seed, type Plan, type Role, type Route } from "./data/mock";

const ROUTES: Route[] = ["login", "home", "plans", "editor", "timer", "tables", "props", "settings"];

function readHash(): { route: Route; id?: string } {
  // Plain tokens only (#plans, #editor-p1): artifact viewers drop hashes with "/" or "=".
  const [r, id] = window.location.hash.replace(/^#\/?/, "").split(/[-/]/);
  return { route: (ROUTES as string[]).includes(r) ? (r as Route) : "login", id };
}

export default function App() {
  const initial = readHash();
  const [route, setRoute] = useState<Route>(initial.route);
  const [planId, setPlanId] = useState<string | undefined>(initial.id);
  const [role, setRole] = useState<Role | null>(initial.route === "login" ? null : "admin");
  const [dark, setDark] = useState(() => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [plans, setPlans] = useState<Plan[]>(seed);
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [whatsNew, setWhatsNew] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setRoute(h.route);
      setPlanId(h.id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((r: Route, id?: string) => {
    window.location.hash = id ? `${r}-${id}` : r;
    setRoute(r);
    setPlanId(id);
    window.scrollTo({ top: 0 });
  }, []);

  const notify = useCallback((m: string) => setToast(m), []);
  const clearToast = useCallback(() => setToast(null), []);

  const createPlan = (group: string) => {
    if (role !== "admin") return notify("🔒 唯讀模式：您目前的權限為組員，如需修改請聯繫管理員。");
    const p: Plan = {
      id: `p${Date.now()}`,
      group,
      title: "未命名教案",
      category: "",
      lead: "",
      assistant: "",
      duration: "",
      venue: "",
      updatedAt: new Date().toISOString(),
      props: [],
    };
    setPlans((ps) => [p, ...ps]);
    go("editor", p.id);
  };

  if (!role || route === "login") {
    return (
      <LoginScreen
        onLogin={(r) => {
          setRole(r);
          go("home");
          setWhatsNew(true);
        }}
      />
    );
  }

  const current = plans.find((p) => p.id === planId) ?? plans[0];

  return (
    <Shell
      route={route}
      go={go}
      dark={dark}
      toggleDark={() => setDark((d) => !d)}
      broadcast={broadcast}
      clearBroadcast={() => setBroadcast(null)}
      onQuickCreate={createPlan}
      hideChrome={route === "editor"}
    >
      {route === "home" && <HomeScreen go={go} openPlan={(id) => go("editor", id)} />}
      {route === "plans" && (
        <PlansScreen
          role={role}
          plans={plans}
          openPlan={(id) => go("editor", id)}
          createPlan={createPlan}
          deletePlan={(id) => {
            setPlans((ps) => ps.filter((p) => p.id !== id));
            notify("已刪除教案");
          }}
          notify={notify}
        />
      )}
      {route === "editor" && current && (
        <EditorScreen
          key={current.id}
          plan={current}
          back={() => go("plans")}
          updatePlan={(np) => setPlans((ps) => ps.map((p) => (p.id === np.id ? np : p)))}
        />
      )}
      {(route === "timer" || route === "tables" || route === "props") && (
        <AdminScreen tab={route} role={role} plansData={plans} broadcast={broadcast} setBroadcast={setBroadcast} notify={notify} />
      )}
      {route === "settings" && (
        <SettingsScreen
          role={role}
          dark={dark}
          setDark={setDark}
          notify={notify}
          logout={() => {
            setRole(null);
            go("login");
          }}
        />
      )}

      <Toast message={toast} onDone={clearToast} />

      <Dialog open={whatsNew} onClose={() => setWhatsNew(false)} label="最新更新通知">
        <div className="flex flex-col gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <Rocket className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">最新更新通知</h2>
            <p className="text-sm text-muted-foreground">我們帶來了一些新玩意，讓您的體驗更加極致</p>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">編輯器全新工具列</span>
              <span className="tag">v1.0.5 · 2026/10/12</span>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />頂部工具列可收合，專注書寫</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />手機版新增底部編輯工具列</li>
            </ul>
          </div>
          <Button variant="primary" size="lg" className="w-full justify-center" onClick={() => setWhatsNew(false)}>
            開始體驗 / Let's Go
          </Button>
        </div>
      </Dialog>
    </Shell>
  );
}
