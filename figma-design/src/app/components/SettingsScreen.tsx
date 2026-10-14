import { useState } from "react";
import { Check, ChevronRight, Clock, Globe, Layout, Lock, LogOut, Moon, Pencil, Plus, Shield, ShieldAlert, ShieldCheck, Sun, Trash2, Unlock, User, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, Field, Tag, inputClass } from "./ui/primitives";
import { activityTypes, camp, groups, stages, type Role } from "../data/mock";
import { cn } from "./ui/utils";

type Tab = "account" | "workspace" | "prefs" | "version" | "danger";

export function SettingsScreen({ role, dark, setDark, logout, notify }: { role: Role; dark: boolean; setDark: (d: boolean) => void; logout: () => void; notify: (m: string) => void }) {
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<Tab>("account");
  const tabs: { id: Tab; label: string; icon: typeof User; admin?: boolean }[] = [
    { id: "account", label: "帳號", icon: User },
    { id: "workspace", label: "工作區", icon: Layout },
    { id: "prefs", label: "偏好", icon: Globe },
    { id: "version", label: "版本", icon: Clock },
    { id: "danger", label: "風險", icon: ShieldAlert, admin: true },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 sm:pt-28 sm:pb-20 md:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 sm:mb-12 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Tag className="mb-2 block">// System governance //</Tag>
          <h1 className="font-display text-3xl font-normal tracking-tight sm:text-4xl">系統設定</h1>
          <p className="mt-1 font-mono text-xs tracking-widest text-fg-muted uppercase">
            Configuration // Workspace // Protocol security
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border px-4 font-mono text-xs text-muted-foreground transition-all hover:border-danger/30 hover:bg-danger/10 hover:text-danger sm:self-center"
        >
          <LogOut className="h-4 w-4" /> 登出系統
        </button>
      </div>

      <div
        role="tablist"
        aria-label="設定分類"
        className="glass mb-10 grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 sm:grid-cols-3 lg:grid-cols-5"
      >
        {tabs.filter((t) => !t.admin || isAdmin).map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const danger = id === "danger";
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left font-mono text-xs transition-all duration-200",
                active
                  ? danger
                    ? "border-danger/30 bg-danger/15 font-medium text-danger shadow-sm"
                    : "border-border-strong bg-card font-medium text-accent-ink shadow-sm dark:bg-white/10"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? (danger ? "text-danger" : "text-accent") : "text-muted-foreground")} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-10">
        {tab === "account" && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Tag>01</Tag>
              <h2 className="flex items-center gap-2 font-mono text-sm font-medium tracking-widest text-foreground uppercase">
                <User className="h-4 w-4 text-accent" aria-hidden="true" />
                身分識別
              </h2>
            </div>
            <Card className="grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center">
            <Field label="Identity designation" hint="當前會話顯示名稱，用於記錄變更與修訂者辨識。">
              <input defaultValue={isAdmin ? "STUDIO_ADMIN" : "CREW_MEMBER"} className={inputClass} />
            </Field>
            <div className="flex items-center gap-5 rounded-2xl border bg-muted p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
                <ShieldCheck className="h-7 w-7 text-accent-ink" aria-hidden="true" />
              </span>
              <span>
                <Tag>Clearance level</Tag>
                <p className="mt-0.5 text-xl tracking-tight uppercase">{role}</p>
                <span className="mt-1 block font-mono text-[10px] text-success">
                  {isAdmin ? "● 擁有完整系統編輯權限" : "○ 唯讀瀏覽權限"}
                </span>
              </span>
            </div>
            </Card>
          </section>
        )}

        {tab === "workspace" && <Workspace isAdmin={isAdmin} notify={notify} />}

        {tab === "prefs" && (
          <Card className="flex flex-col gap-5 p-6">
            <div><Tag>01</Tag> <span className="font-semibold">外觀與語系</span></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <span><span className="font-medium">深淺色模式</span><Tag className="block">Appearance / Visual scheme</Tag></span>
              <div className="flex gap-2">
                <Button variant={!dark ? "inverse" : "secondary"} onClick={() => setDark(false)}><Sun className="h-4 w-4" /> 淺色</Button>
                <Button variant={dark ? "inverse" : "secondary"} onClick={() => setDark(true)}><Moon className="h-4 w-4" /> 深色</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <span><span className="font-medium">語言切換</span><Tag className="block">Locale</Tag></span>
              <div className="flex gap-2"><Button variant="inverse">中文</Button><Button>EN</Button></div>
            </div>
          </Card>
        )}

        {tab === "version" && (
          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <Tag>01 版本規格資訊 · 目前執行版本</Tag>
              <p className="mt-1 font-display text-5xl">v1.0.5</p>
              <Tag tone="accent">Live production</Tag>
            </div>
            <Button onClick={() => notify("版本歷程時間軸（設計稿示範）")}>檢視版本歷程時間軸</Button>
          </Card>
        )}

        {tab === "danger" && isAdmin && <Danger notify={notify} />}
      </div>
    </div>
  );
}

function Workspace({ isAdmin, notify }: { isAdmin: boolean; notify: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [camps, setCamps] = useState([
    { name: camp.name, created: camp.createdAt, active: true, locked: false },
    { name: "2025 寒假營", created: "2025/10/11", active: false, locked: true },
  ]);
  const [newName, setNewName] = useState("");
  const [types, setTypes] = useState(activityTypes);
  const [newType, setNewType] = useState("");

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span><Tag>01</Tag> <span className="font-semibold">專案目錄</span></span>
          {isAdmin && <Button size="sm" variant={adding ? "secondary" : "primary"} onClick={() => setAdding((a) => !a)}>{adding ? "收合" : <><Plus className="h-4 w-4" /> 新增營隊</>}</Button>}
        </div>
        {adding && (
          <div className="flex flex-wrap gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="新專案名稱" placeholder="輸入新專案名稱，例如：2026 夏令營" className={cn(inputClass, "min-w-[220px] flex-1")} />
            <Button variant="primary" disabled={!newName.trim()} onClick={() => { setCamps([...camps, { name: newName.trim(), created: "2026/10/14", active: false, locked: false }]); setNewName(""); setAdding(false); }}><Check className="h-4 w-4" /> 建立</Button>
            <Button onClick={() => setAdding(false)}><X className="h-4 w-4" /> 取消</Button>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {camps.map((c, i) => (
            <li key={c.name} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-3", c.active && "border-accent/40 bg-accent-soft")}>
              <Tag>0{i + 1}</Tag>
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setCamps(camps.map((x) => ({ ...x, active: x.name === c.name }))); notify(`切換專案中：${c.name}`); }}>
                <span className="block font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground">建立時間：{c.created}</span>
              </button>
              {c.active && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">使用中</span>}
              {isAdmin && (
                <>
                  <Button size="icon" variant="ghost" aria-label={`重新命名 ${c.name}`} className="h-10 w-10"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={c.locked ? `解鎖 ${c.name}` : `鎖定 ${c.name}`} className="h-10 w-10" onClick={() => setCamps(camps.map((x) => (x.name === c.name ? { ...x, locked: !x.locked } : x)))}>
                    {c.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Card>

      {isAdmin && (
        <>
          <Card className="flex flex-col gap-4 p-6">
            <div><Tag>02</Tag> <span className="font-semibold">營隊動態里程碑</span></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stages.map((s) => (
                <Field key={s.code} label={`${s.label}${s.end ? "（起 ➔ 迄）" : ""}`}>
                  <input defaultValue={s.end ? `${s.start} ➔ ${s.end}` : s.start} className={cn(inputClass, "font-mono")} />
                </Field>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <div><Tag>03</Tag> <span className="font-semibold">組別架構管理</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="tag border-b text-left"><th className="py-2 font-normal">中文名稱</th><th className="py-2 font-normal">英文名稱</th><th className="py-2 font-normal">路由 / 縮寫</th><th className="py-2 font-normal">操作</th></tr></thead>
                <tbody>
                  {groups.map((g, i) => (
                    <tr key={g.slug} className="border-b">
                      <td className="py-3 font-medium"><span className={cn("mr-2 inline-block h-2 w-2 rounded-full", g.tone.dot)} aria-hidden="true" />{g.nameZh}</td>
                      <td className="py-3">{g.nameEn}</td>
                      <td className="py-3 font-mono text-muted-foreground">/{g.slug}</td>
                      <td className="py-3">{i < 2 ? <Tag>預設</Tag> : <Button size="icon" variant="ghost" aria-label={`刪除 ${g.nameZh}`} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input aria-label="新增中文名稱" placeholder="新增中文名稱" className={inputClass} />
              <input aria-label="英文名稱" placeholder="New English Name" className={inputClass} />
              <input aria-label="路由" placeholder="自動產生 Slug" className={inputClass} />
              <Button>新增組別</Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <div><Tag>04</Tag> <span className="font-semibold">活動類別標籤</span></div>
            <ul className="flex flex-wrap gap-2">
              {types.map((t) => (
                <li key={t} className="inline-flex h-9 items-center gap-1 rounded-full border bg-muted pr-1 pl-3.5 text-sm">
                  {t}
                  <button type="button" aria-label={`刪除 ${t}`} onClick={() => setTypes(types.filter((x) => x !== t))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-card"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input value={newType} onChange={(e) => setNewType(e.target.value)} aria-label="新增活動類型" placeholder="新增活動類型 (例如: 晚會活動)" className={inputClass} />
              <Button disabled={!newType.trim()} onClick={() => { setTypes([...types, newType.trim()]); setNewType(""); }}>新增</Button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function Danger({ notify }: { notify: (m: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  return (
    <Card className="flex flex-col gap-4 border-danger/40 p-6">
      <Tag tone="danger">Caution</Tag>
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-danger" aria-hidden="true" />危險區域 · 刪除當前專案目錄</h2>
      <p className="text-sm text-muted-foreground">此操作將永久刪除「{camp.name}」的所有教案、表格及活動資料。刪除前系統將自動下載完整備份。</p>
      {!confirming ? (
        <Button variant="danger" className="self-start" onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" /> Delete project</Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label="輸入 delete 確認" placeholder="Type delete to confirm" className={cn(inputClass, "max-w-xs")} />
          <Button variant="danger" disabled={text !== "delete"} onClick={() => { notify("Archiving...（設計稿示範，不會刪除任何資料）"); setConfirming(false); setText(""); }}>Confirm</Button>
          <Button onClick={() => { setConfirming(false); setText(""); }}>Cancel</Button>
        </div>
      )}
    </Card>
  );
}
