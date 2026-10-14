import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Megaphone,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Shield,
  Trash2,
  Undo2,
  Unlock,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, Dialog, Field, Segmented, Tag, inputClass } from "./ui/primitives";
import { broadcasts, plans, rotation, type Plan, type Role } from "../data/mock";
import { cn } from "./ui/utils";

export type AdminTab = "timer" | "tables" | "props";

interface Props {
  tab: AdminTab;
  role: Role;
  plansData: Plan[];
  broadcast: string | null;
  setBroadcast: (s: string | null) => void;
  notify: (m: string) => void;
}

export function AdminScreen({ tab, role, plansData, broadcast, setBroadcast, notify }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [day, setDay] = useState("Day 1");
  const [propsTab, setPropsTab] = useState<"activity" | "teaching" | "all">("activity");
  const [wizard, setWizard] = useState(false);
  const isAdmin = role === "admin";
  const editable = isAdmin && unlocked;

  const toggleLock = () => {
    if (!isAdmin) return notify("權限不足：僅管理員能解鎖");
    setUnlocked((u) => !u);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
      {tab !== "timer" && (
        <div role="toolbar" aria-label="操作列" className="glass sticky top-[72px] z-20 flex flex-wrap items-center justify-between gap-2 rounded-3xl p-2 sm:rounded-full">
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="hidden px-3 sm:inline">● 操作列</Tag>
            <Button size="sm" variant={editable ? "inverse" : "secondary"} onClick={toggleLock} aria-pressed={editable}>
              {editable ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {editable ? "可編輯" : "已鎖定"}
            </Button>
            {tab === "tables" ? (
              <>
                <label className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-[13px]">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">日期</span>
                  <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-transparent outline-none">
                    {[1, 2, 3, 4, 5].map((d) => <option key={d}>Day {d}</option>)}
                  </select>
                </label>
                {editable && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => setWizard(true)}><Zap className="h-4 w-4" /> 智能排關</Button>
                    <Button size="sm"><Plus className="h-4 w-4" /> 空白表</Button>
                  </>
                )}
              </>
            ) : (
              <Segmented
                label="道具分類"
                value={propsTab}
                onChange={setPropsTab}
                options={[
                  { value: "activity", label: "活動道具" },
                  { value: "teaching", label: "教學道具" },
                  { value: "all", label: "全營期道具" },
                ]}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {tab === "tables" && (
              <>
                <Button size="icon" variant="ghost" aria-label="復原" className="h-9 w-9"><Undo2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="重做" className="h-9 w-9"><Redo2 className="h-4 w-4" /></Button>
                <span className="tag px-2">100%</span>
              </>
            )}
            <Button size="sm" onClick={() => notify("匯出 Excel（設計稿示範）")}><Download className="h-4 w-4" /> 匯出</Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {tab === "timer" && <TimerTab isAdmin={isAdmin} unlocked={editable} unlock={toggleLock} broadcast={broadcast} setBroadcast={setBroadcast} />}
        {tab === "tables" && <TablesTab editable={editable} day={day} />}
        {tab === "props" && <PropsTab plansData={plansData} kind={propsTab} editable={editable} />}
      </div>

      <Dialog open={wizard} onClose={() => setWizard(false)} label="智能排關" className="sm:max-w-2xl">
        <Wizard onDone={() => { setWizard(false); notify("已生成 Day 1 闖關輪替表"); }} onCancel={() => setWizard(false)} />
      </Dialog>
    </div>
  );
}

/* ---------------- Timer ---------------- */

function TimerTab({
  isAdmin,
  unlocked,
  unlock,
  broadcast,
  setBroadcast,
}: {
  isAdmin: boolean;
  unlocked: boolean;
  unlock: () => void;
  broadcast: string | null;
  setBroadcast: (s: string | null) => void;
}) {
  const [audio, setAudio] = useState(false);
  const [duration, setDuration] = useState({ h: 0, m: 20, s: 0 });
  const total = duration.h * 3600 + duration.m * 60 + duration.s;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [saver, setSaver] = useState(false);
  const [draft, setDraft] = useState("");
  const [round, setRound] = useState(1);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(new Date());
      if (running) setLeft((l) => Math.max(0, l - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const clock = now.toLocaleTimeString("zh-TW", { hour12: false });
  const critical = left <= 60;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border bg-card px-5 py-3">
        {audio ? <Volume2 className="h-5 w-5 text-success" aria-hidden="true" /> : <VolumeX className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
        <span className="font-semibold">{audio ? "音效已解鎖" : "音效未解鎖"}</span>
        <span className="flex-1 text-sm text-muted-foreground">{audio ? "● 語音廣播與警報音效已就緒" : "○ 點擊右側按鈕以解除瀏覽器音訊限制"}</span>
        <Button size="sm" onClick={() => setAudio((a) => !a)}>{audio ? "Disable audio" : "Test & Unlock"}</Button>
      </div>

      {isAdmin && !unlocked && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-5">
          <span className="flex items-center gap-3 text-sm">
            <Shield className="h-5 w-5 text-accent-ink" aria-hidden="true" />
            解鎖後可設定時間、發布公告與控制輪次。
          </span>
          <Button size="sm" variant="primary" onClick={unlock}><Unlock className="h-4 w-4" /> 解鎖行政控制</Button>
        </Card>
      )}

      {unlocked && (
        <>
          <Card className="flex flex-wrap items-end gap-6 p-6">
            <div className="min-w-[180px] flex-1">
              <Tag>行政中心</Tag>
              <p className="mt-1 text-lg font-semibold">狀態：{running ? "運行中" : "待機中"}</p>
              <p className="tag mt-1">Server now · {clock}</p>
            </div>
            <fieldset className="flex flex-1 items-end gap-2">
              <legend className="tag mb-1.5">Duration (H:M:S)</legend>
              {(["h", "m", "s"] as const).map((k) => (
                <label key={k} className="flex-1">
                  <span className="tag">{k.toUpperCase()}</span>
                  <input type="number" min={0} value={duration[k]} onChange={(e) => setDuration({ ...duration, [k]: Number(e.target.value) })} className={cn(inputClass, "mt-1 text-center font-mono")} />
                </label>
              ))}
              <Button onClick={() => { setLeft(total); setRunning(false); }}>套用</Button>
            </fieldset>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? "停止同步" : "啟動同步"}
              </Button>
              <Button onClick={() => { setLeft(total); setRunning(false); }}><RotateCcw className="h-4 w-4" /> Reset</Button>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="flex flex-col gap-4 p-6">
              <h2 className="flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-accent-ink" aria-hidden="true" />值星公告廣播中樞 <Tag>Live broadcast console</Tag></h2>
              <Field label="自訂公告內容">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="輸入即時公告文字...（例如：全體到操場集合！）" className={inputClass} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => { setBroadcast(null); setDraft(""); }}>清除</Button>
                <Button size="sm" variant="primary" disabled={!draft.trim()} onClick={() => setBroadcast(draft.trim())}>發布</Button>
              </div>
              <Tag>常用快捷廣播</Tag>
              <div className="grid grid-cols-2 gap-2">
                {broadcasts.map((b) => <Button key={b} size="sm" className="justify-center" onClick={() => setBroadcast(b)}>{b}</Button>)}
              </div>
              <p className="text-sm text-muted-foreground">當前發布：{broadcast ?? "（無）"}</p>
            </Card>
            <Card className="flex flex-col gap-4 p-6">
              <h2 className="font-semibold">關卡輪次控制器 <Tag>Round sync controller</Tag></h2>
              <p className="text-sm text-muted-foreground">行政輪替表名稱：{rotation.title} · 共 {rotation.rounds.length} 輪</p>
              <div className="flex items-center justify-between rounded-2xl border p-3">
                <Button size="icon" aria-label="上一輪" onClick={() => setRound((r) => Math.max(1, r - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-center"><Tag>當前進度</Tag><span className="block font-display text-2xl">第 {round} 輪</span></span>
                <Button size="icon" aria-label="下一輪" onClick={() => setRound((r) => Math.min(rotation.rounds.length, r + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Tag>當前小隊分佈</Tag>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {rotation.teams.map((t) => (
                  <li key={t.name} className="rounded-xl border px-3 py-2">{t.name} → {t.schedule[round - 1] ?? "休息"}</li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <section aria-label="同步計時器" className="relative overflow-hidden rounded-[2.5rem] bg-timer p-6 text-timer-foreground sm:p-10">
        <div className="flex items-center justify-between">
          <span>
            <span className="tag block text-stone-400">同步中樞</span>
            <span className="text-sm">Status：{running ? "運行中" : "待機中"}</span>
          </span>
          <button type="button" onClick={() => setSaver(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm hover:bg-white/10">
            <Moon className="h-4 w-4" aria-hidden="true" /> 省電模式
          </button>
        </div>
        <p className="tag mt-8 text-center text-stone-400">{left === 0 ? "時間到" : "剩餘時間"}</p>
        <p className={cn("text-center font-mono text-[clamp(88px,18vw,224px)] leading-none tracking-tight tabular-nums", critical && "text-rose-400")} aria-live="off">
          {mm}:{ss}
        </p>
        <p className="tag mt-2 text-center text-stone-400">{clock}</p>
        <div className="mt-8 h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-orange-300 transition-all" style={{ width: `${total ? (left / total) * 100 : 0}%` }} />
        </div>
      </section>

      {saver && (
        <button type="button" onDoubleClick={() => setSaver(false)} aria-label="省電模式，按兩下喚醒" className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black text-stone-300">
          <span className="tag text-stone-500">// Screen saver mode //</span>
          <span className="font-mono text-[22vw] leading-none text-stone-200 tabular-nums">{mm}:{ss}</span>
          <span className="tag text-stone-500">音效：{audio ? "已解鎖" : "未解鎖"} · {clock}</span>
          <span className="mt-6 text-sm text-stone-500">按兩下喚醒</span>
        </button>
      )}
    </div>
  );
}

/* ---------------- Tables ---------------- */

function TablesTab({ editable, day }: { editable: boolean; day: string }) {
  const cell = "border px-3 py-2.5 text-left align-middle";
  const Edit = ({ v }: { v: string }) =>
    editable ? <input defaultValue={v} aria-label="儲存格" className="w-full min-w-0 rounded-md bg-transparent px-1 py-0.5 outline-none focus:bg-muted" /> : <>{v}</>;
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="min-w-0 flex-1">
          <Tag>表格標題 · {day}</Tag>
          <input defaultValue={rotation.title} readOnly={!editable} className="mt-1 block w-full rounded-lg bg-transparent font-display text-2xl outline-none read-only:cursor-default focus:bg-muted" />
        </label>
        {editable && <Button size="sm"><Plus className="h-4 w-4" /> 新增關卡</Button>}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className={cn(cell, "w-36 font-medium")}>{day}</th>
              {rotation.stations.map((s, i) => <th key={s.name} className={cn(cell, "font-semibold")}>關卡{i + 1}：{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {(["venue", "lead", "assistant"] as const).map((k) => (
              <tr key={k}>
                <td className={cn(cell, "text-muted-foreground")}>{k === "venue" ? "地點" : k === "lead" ? "主關主" : "副關主"}</td>
                {rotation.stations.map((s) => <td key={s.name} className={cell}><Edit v={s[k]} /></td>)}
              </tr>
            ))}
            <tr><td colSpan={5} className="tag border bg-muted/60 px-3 py-2">// 闖關隊伍安排</td></tr>
            {rotation.rounds.map((r, i) => (
              <tr key={i}>
                <td className={cell}>第 {i + 1} 回合</td>
                {r.map((v, j) => <td key={j} className={cn(cell, v === "休息" && "text-muted-foreground")}><Edit v={v} /></td>)}
              </tr>
            ))}
            {editable && <tr><td colSpan={5} className="border"><button type="button" className="flex h-10 w-full items-center justify-center gap-1.5 text-muted-foreground hover:bg-muted"><Plus className="h-4 w-4" />新增回合</button></td></tr>}
            <tr><td colSpan={5} className="tag border bg-muted/60 px-3 py-2">// 闖關順序</td></tr>
            {rotation.teams.map((t) => (
              <tr key={t.name}>
                <td className={cell}>{t.name}</td>
                {t.schedule.map((v, j) => <td key={j} className={cell}><Edit v={v} /></td>)}
                <td className={cell}>休息</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="text-danger"><Trash2 className="h-4 w-4" /> 刪除表格</Button>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Props ---------------- */

function PropsTab({ plansData, kind, editable }: { plansData: Plan[]; kind: "activity" | "teaching" | "all"; editable: boolean }) {
  const rows = useMemo(() => plansData.filter((p) => (kind === "all" ? true : p.group === kind)), [plansData, kind]);
  const [state, setState] = useState<Record<string, { packed: boolean; checked: boolean }>>({});
  const key = (pid: string, i: number) => `${pid}-${i}`;
  const cell = "border px-3 py-2.5 text-left align-top";

  return (
    <div className="overflow-x-auto rounded-3xl border bg-card">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {["分類", "教案名稱", "指定人員", "物品名稱", "Qty", "Unit", "備註", "已打包", "已核核"].map((h) => <th key={h} className={cn(cell, "font-medium")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">目前沒有任何道具資料</td></tr>}
          {rows.map((p) =>
            p.props.length === 0 ? (
              <tr key={p.id}>
                <td className={cell}>{p.category}</td><td className={cell}>{p.title}</td><td className={cell}>{p.lead}</td>
                <td colSpan={6} className={cn(cell, "text-muted-foreground")}>無所需物品</td>
              </tr>
            ) : (
              p.props.map((it, i) => {
                const s = state[key(p.id, i)] ?? { packed: !!it.packed, checked: !!it.checked };
                const set = (patch: Partial<typeof s>) => setState({ ...state, [key(p.id, i)]: { ...s, ...patch } });
                return (
                  <tr key={key(p.id, i)}>
                    {i === 0 && (
                      <>
                        <td rowSpan={p.props.length} className={cell}>{p.category}</td>
                        <td rowSpan={p.props.length} className={cn(cell, "font-medium")}>{p.title}</td>
                        <td rowSpan={p.props.length} className={cell}>{p.lead}</td>
                      </>
                    )}
                    <td className={cell}>{it.name}</td>
                    <td className={cn(cell, "font-mono")}>{it.qty}</td>
                    <td className={cell}>{it.unit}</td>
                    <td className={cn(cell, "text-muted-foreground")}>{it.note}</td>
                    <td className={cell}><input type="checkbox" aria-label={`${it.name} 已打包`} disabled={!editable} checked={s.packed} onChange={(e) => set({ packed: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /></td>
                    <td className={cell}><input type="checkbox" aria-label={`${it.name} 已核核`} disabled={!editable} checked={s.checked} onChange={(e) => set({ checked: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /></td>
                  </tr>
                );
              })
            ),
          )}
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={`blank-${i}`} aria-hidden="true">{Array.from({ length: 9 }).map((__, j) => <td key={j} className="h-10 border" />)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Wizard ---------------- */

function Wizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const candidates = plans.filter((p) => p.category === "科學實驗" || p.group === "teaching");
  const [teams, setTeams] = useState(6);
  const [stations, setStations] = useState(4);
  const [rest, setRest] = useState<number[]>([1]);
  const [picked, setPicked] = useState<string[]>(candidates.map((p) => p.id));
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Zap className="h-5 w-5 text-accent-ink" aria-hidden="true" /> 智能排關
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-normal">{stations} 關 · {teams} 隊</span>
        </h2>
        <p className="text-sm text-muted-foreground">自動排定闖關輪轉表</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="天數"><select className={inputClass}>{[1, 2, 3, 4, 5].map((d) => <option key={d}>Day {d}</option>)}</select></Field>
        <Field label="教案類型"><select className={inputClass}><option>全部 ({plans.length})</option><option>科學實驗</option></select></Field>
        <div className="flex flex-col gap-1.5 text-[13px] font-medium">
          小隊數
          <span className="flex h-11 items-center justify-between rounded-xl border border-border-strong px-1">
            <Button size="icon" variant="ghost" aria-label="減少小隊" className="h-9 w-9" onClick={() => setTeams((t) => Math.max(2, t - 1))}><Minus className="h-4 w-4" /></Button>
            <span className="font-mono">{teams}</span>
            <Button size="icon" variant="ghost" aria-label="增加小隊" className="h-9 w-9" onClick={() => setTeams((t) => Math.min(16, t + 1))}><Plus className="h-4 w-4" /></Button>
          </span>
        </div>
        <Field label="關卡數">
          <select value={stations} onChange={(e) => setStations(Number(e.target.value))} className={inputClass}>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} 關</option>)}
          </select>
        </Field>
      </div>
      <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">自動最佳化：① 競爭隊伍不同 ② 零重複闖關 ③ 關主隔關輪休</p>
      <Field label="闖關表標題"><input defaultValue="Day 1 科學闖關輪替表" className={inputClass} /></Field>
      <div className="rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="font-semibold">第一輪輪空關卡</span>
            <span className="block text-xs text-muted-foreground">自由指定第 1 輪休息關卡 · 已選 {rest.length} / 上限 {Math.max(0, stations - Math.floor(teams / 2))} 關</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setRest([])}>清空</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {rotation.stations.slice(0, stations).map((s, i) => {
            const on = rest.includes(i);
            return (
              <button key={s.name} type="button" aria-pressed={on} onClick={() => setRest(on ? rest.filter((r) => r !== i) : [...rest, i])} className={cn("h-10 rounded-full border px-4 text-[13px]", on ? "bg-foreground text-background" : "bg-card")}>
                {i + 1} {s.name} · {on ? "輪空 ✓" : "出賽"}
              </button>
            );
          })}
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="tag mb-2">選擇要排入的關卡</legend>
        {candidates.map((p) => {
          const on = picked.includes(p.id);
          return (
            <div key={p.id} className="rounded-2xl border p-3">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])} className="h-4 w-4 accent-[var(--primary)]" />
                {p.title}
              </label>
              {on && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input aria-label="地點" defaultValue={p.venue} className={cn(inputClass, "h-10")} />
                  <input aria-label="主關主" defaultValue={p.lead} className={cn(inputClass, "h-10")} />
                  <input aria-label="副關主" defaultValue={p.assistant} className={cn(inputClass, "h-10")} />
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>取消</Button>
        <Button variant="primary" disabled={busy || picked.length < 2} onClick={() => { setBusy(true); window.setTimeout(onDone, 700); }}>
          <Zap className="h-4 w-4" /> {busy ? "生成中..." : "生成"}
        </Button>
      </div>
    </div>
  );
}
