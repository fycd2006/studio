import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  ChevronUp,
  Cloud,
  Download,
  History,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Smartphone,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { GroupBadge, Segmented, Tag, inputClass } from "./ui/primitives";
import { activityTypes, members, versions, type Plan, type Prop } from "../data/mock";
import { cn } from "./ui/utils";

interface Props {
  plan: Plan;
  back: () => void;
  updatePlan: (p: Plan) => void;
}

const DEFAULT_TEXT = {
  mission: "透過團隊合作與觀察力訓練，讓學員在探索中建立信任與溝通默契。",
  workflow: "1. 集合說明規則（5 分鐘）\n2. 分隊出發尋找線索（25 分鐘）\n3. 回到起點分享與回饋（10 分鐘）",
  content: "每小隊領取一張藏寶圖，依線索抵達關卡並完成任務取得印章。集滿印章的小隊可解開最終寶箱。",
  remarks: "開場：以「失落的地圖」故事引入。\n結語：請各隊分享最難的一關與怎麼解決的。",
  notes: "雨天改至 1F 中庭，路線縮短為 4 關。",
};

export function EditorScreen({ plan, back, updatePlan }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [drawer, setDrawer] = useState(false);
  const [history, setHistory] = useState<{ name: string; time: string } | null>(null);
  const [mobileEdit, setMobileEdit] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [type, setType] = useState(plan.category);

  const isScript = type === "劇本";
  const readOnly = !!history;

  const touch = (next: Partial<Plan>) => {
    setSaving(true);
    updatePlan({ ...plan, ...next, updatedAt: new Date().toISOString() });
  };
  useEffect(() => {
    if (!saving) return;
    const t = window.setTimeout(() => setSaving(false), 700);
    return () => window.clearTimeout(t);
  }, [saving]);

  const setProp = (i: number, patch: Partial<Prop>) => touch({ props: plan.props.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <div className="min-h-screen bg-muted/60">
      {/* Top dock */}
      <div className="sticky top-0 z-30 border-b bg-card">
        {!collapsed && (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-3 py-2.5 sm:px-6">
            <Button size="sm" variant="ghost" onClick={back}>
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">返回</span>
            </Button>
            <GroupBadge slug={plan.group} className="hidden sm:inline-flex" />
            <label className="min-w-0 flex-1">
              <span className="sr-only">教案正式名稱</span>
              <input
                value={plan.title}
                readOnly={readOnly}
                onChange={(e) => touch({ title: e.target.value })}
                placeholder="輸入教案正式名稱"
                className="w-full truncate rounded-lg bg-transparent px-2 py-1 font-display text-xl outline-none hover:bg-muted focus:bg-muted"
              />
            </label>
            <span className="tag hidden items-center gap-1.5 md:inline-flex" aria-live="polite">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
              {saving ? "儲存中..." : "已儲存至雲端"}
            </span>
            <span className="hidden -space-x-2 lg:flex" aria-label="協作者">
              {members.map((m) => (
                <span key={m.initials} className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-xs font-medium text-white", m.color)}>
                  {m.initials}
                </span>
              ))}
            </span>
            <Button size="sm" onClick={() => setDrawer(true)}>
              <History className="h-4 w-4" /> <span className="hidden sm:inline">版本紀錄</span>
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">匯出</span>
            </Button>
          </div>
        )}
        <Toolbar zoom={zoom} setZoom={setZoom} collapsed={collapsed} toggle={() => setCollapsed((c) => !c)} className="hidden md:flex" />
      </div>

      {history && (
        <div className="sticky top-[57px] z-20 flex flex-wrap items-center justify-between gap-3 bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:px-6">
          <span>
            <b>歷史紀錄 / History View</b> · Showing: {history.name} ({history.time})
          </span>
          <span className="flex gap-2">
            <button type="button" className="h-9 rounded-full border border-current/40 px-4" onClick={() => setHistory(null)}>取消 / Cancel</button>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/15 px-4 font-medium" onClick={() => setHistory(null)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> 還原 / Restore
            </button>
          </span>
        </div>
      )}

      {/* Sheet */}
      <div className="flex justify-center px-3 py-6 sm:px-6 sm:py-10">
        <article
          className="w-full max-w-[816px] origin-top rounded-sm border bg-card px-6 py-10 shadow-sm transition-transform sm:px-16 sm:py-14"
          style={{ transform: zoom === 100 ? undefined : `scale(${zoom / 100})` }}
        >
          <fieldset disabled={readOnly || (!mobileEdit && isPhone())} className="flex flex-col gap-9">
            <Section title="活動類型" tag="Activity type">
              <select value={type} onChange={(e) => { setType(e.target.value); touch({ category: e.target.value }); }} className={inputClass}>
                <option value="">-- 請選擇活動類型 --</option>
                {activityTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
              {isScript && <p className="text-xs text-muted-foreground">「劇本」類型會隱藏 教案名稱、成員、時間/地點、流程、開場與結語。</p>}
            </Section>

            {!isScript && (
              <>
                <Section title="教案名稱" tag="Subject">
                  <input className={inputClass} value={plan.title} onChange={(e) => touch({ title: e.target.value })} />
                </Section>
                <Section title="教案成員" tag="Crew">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-muted-foreground">主關主<input className={cn(inputClass, "mt-1")} value={plan.lead} onChange={(e) => touch({ lead: e.target.value })} /></label>
                    <label className="text-xs text-muted-foreground">副關主<input className={cn(inputClass, "mt-1")} value={plan.assistant} onChange={(e) => touch({ assistant: e.target.value })} /></label>
                  </div>
                </Section>
              </>
            )}

            <Section title="教案目的" tag="Mission" presence="小晴">
              <Rich value={text.mission} onChange={(v) => setText({ ...text, mission: v })} />
            </Section>

            {!isScript && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Section title="時間" tag="Duration">
                  <input className={inputClass} value={plan.duration} onChange={(e) => touch({ duration: e.target.value })} placeholder="20min" />
                </Section>
                <Section title="地點" tag="Venue">
                  <input className={inputClass} value={plan.venue} onChange={(e) => touch({ venue: e.target.value })} placeholder="3F Main Hall" />
                </Section>
              </div>
            )}

            {!isScript && (
              <Section title="流程" tag="Workflow">
                <Rich value={text.workflow} onChange={(v) => setText({ ...text, workflow: v })} rows={4} />
              </Section>
            )}

            <Section
              title="教案內容"
              tag="Visual blueprint"
              action={
                <Segmented
                  label="內容模式"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "text", label: "文字描述" },
                    { value: "draw", label: "手繪藍圖" },
                  ]}
                />
              }
            >
              {mode === "text" ? (
                <Rich value={text.content} onChange={(v) => setText({ ...text, content: v })} rows={5} />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground">
                  <Pencil className="h-6 w-6" aria-hidden="true" />
                  手繪藍圖畫布（Fabric.js）
                </div>
              )}
            </Section>

            <Section title="道具需求" tag="Materials & props">
              <div className="overflow-hidden rounded-2xl border">
                <div className="tag grid grid-cols-[3fr_1fr_1fr_3fr_44px] bg-muted">
                  <span className="px-3 py-2.5">物品名稱</span><span className="px-3 py-2.5">Qty</span><span className="px-3 py-2.5">Unit</span><span className="px-3 py-2.5">備註</span><span />
                </div>
                {plan.props.length === 0 && <p className="border-t px-3 py-6 text-center text-sm text-muted-foreground">尚無項目</p>}
                {plan.props.map((p, i) => (
                  <div key={i} className="grid grid-cols-[3fr_1fr_1fr_3fr_44px] border-t text-sm">
                    <input aria-label="物品名稱" className="min-w-0 bg-transparent px-3 py-2.5 outline-none focus:bg-muted" value={p.name} onChange={(e) => setProp(i, { name: e.target.value })} />
                    <input aria-label="數量" type="number" className="min-w-0 bg-transparent px-3 py-2.5 outline-none focus:bg-muted" value={p.qty} onChange={(e) => setProp(i, { qty: Number(e.target.value) })} />
                    <input aria-label="單位" className="min-w-0 bg-transparent px-3 py-2.5 outline-none focus:bg-muted" value={p.unit} onChange={(e) => setProp(i, { unit: e.target.value })} />
                    <input aria-label="備註" className="min-w-0 bg-transparent px-3 py-2.5 outline-none focus:bg-muted" value={p.note ?? ""} onChange={(e) => setProp(i, { note: e.target.value })} />
                    <button type="button" aria-label={`刪除 ${p.name}`} onClick={() => touch({ props: plan.props.filter((_, j) => j !== i) })} className="flex items-center justify-center text-muted-foreground hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => touch({ props: [...plan.props, { name: "", qty: 1, unit: "個" }] })} className="flex h-11 w-full items-center justify-center gap-1.5 border-t border-dashed text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus className="h-4 w-4" aria-hidden="true" /> 新增道具
                </button>
              </div>
            </Section>

            {!isScript && (
              <Section title="開場與結語" tag="Remarks">
                <Rich value={text.remarks} onChange={(v) => setText({ ...text, remarks: v })} />
              </Section>
            )}
            <Section title="備註" tag="Operational notes">
              <Rich value={text.notes} onChange={(v) => setText({ ...text, notes: v })} rows={2} />
            </Section>
          </fieldset>
        </article>
      </div>

      {/* Mobile: FAB / bottom toolbar */}
      <div className="md:hidden">
        {mobileEdit ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[max(env(safe-area-inset-bottom),10px)]">
            <div className="flex items-center gap-1 px-2 pt-2">
              <Button size="sm" variant="primary" onClick={() => setMobileEdit(false)}>
                <Check className="h-4 w-4" /> 完成
              </Button>
              <IconBtn label="復原"><Undo2 className="h-4 w-4" /></IconBtn>
              <IconBtn label="重做"><Redo2 className="h-4 w-4" /></IconBtn>
              <span className="tag px-2">{zoom}%</span>
              <span className="flex-1" />
              <IconBtn label="切換檢視模式"><Smartphone className="h-4 w-4" /></IconBtn>
            </div>
            <div className="flex gap-1 overflow-x-auto px-2 pt-1">
              <FormatButtons />
            </div>
          </div>
        ) : (
          <button type="button" aria-label="進入編輯模式" onClick={() => setMobileEdit(true)} className="fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl">
            <Pencil className="h-5 w-5" />
          </button>
        )}
      </div>

      <VersionDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        onPick={(v) => {
          setHistory(v);
          setDrawer(false);
        }}
      />
    </div>
  );
}

function isPhone() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function Section({ title, tag, action, presence, children }: { title: string; tag: string; action?: ReactNode; presence?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3 border-b pb-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <Tag>[{tag}]</Tag>
        {action && <span className="ml-auto">{action}</span>}
      </header>
      {presence ? (
        <div className="relative rounded-xl ring-2 ring-blue-600 ring-offset-4 ring-offset-card dark:ring-blue-400">
          <span className="absolute -top-7 right-0 rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white dark:bg-blue-400 dark:text-background">{presence} 編輯中...</span>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Rich({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full resize-y rounded-xl border border-border-strong bg-card px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-accent disabled:border-transparent disabled:px-0"
    />
  );
}

function IconBtn({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-2 text-foreground hover:bg-muted">
      {children}
    </button>
  );
}

function FormatButtons() {
  return (
    <>
      <select aria-label="段落樣式" className="h-10 shrink-0 rounded-lg bg-transparent px-2 text-sm hover:bg-muted">
        <option>段落</option><option>主標題 H1</option><option>次標題 H2</option><option>小標題 H3</option>
      </select>
      <select aria-label="字型" className="h-10 shrink-0 rounded-lg bg-transparent px-2 text-sm hover:bg-muted">
        <option>預設字型</option><option>微軟正黑體</option><option>標楷體</option><option>思源黑體</option>
      </select>
      <IconBtn label="粗體"><Bold className="h-4 w-4" /></IconBtn>
      <IconBtn label="斜體"><Italic className="h-4 w-4" /></IconBtn>
      <IconBtn label="底線"><Underline className="h-4 w-4" /></IconBtn>
      <IconBtn label="刪除線"><Strikethrough className="h-4 w-4" /></IconBtn>
      <IconBtn label="文字顏色 / 螢光筆"><Palette className="h-4 w-4" /></IconBtn>
      <IconBtn label="項目符號"><List className="h-4 w-4" /></IconBtn>
      <IconBtn label="編號清單"><ListOrdered className="h-4 w-4" /></IconBtn>
      <IconBtn label="靠左"><AlignLeft className="h-4 w-4" /></IconBtn>
      <IconBtn label="置中"><AlignCenter className="h-4 w-4" /></IconBtn>
      <IconBtn label="靠右"><AlignRight className="h-4 w-4" /></IconBtn>
      <IconBtn label="插入表格"><Table2 className="h-4 w-4" /></IconBtn>
      <IconBtn label="插入連結"><Link2 className="h-4 w-4" /></IconBtn>
      <IconBtn label="插入圖片"><ImageIcon className="h-4 w-4" /></IconBtn>
    </>
  );
}

function Toolbar({ zoom, setZoom, collapsed, toggle, className }: { zoom: number; setZoom: (z: number) => void; collapsed: boolean; toggle: () => void; className?: string }) {
  return (
    <div role="toolbar" aria-label="格式工具列" className={cn("mx-auto max-w-7xl items-center gap-1 overflow-x-auto border-t px-3 py-1.5 sm:px-6", className)}>
      <Tag className="mr-2 shrink-0">Command</Tag>
      <IconBtn label="復原 (Ctrl+Z)"><Undo2 className="h-4 w-4" /></IconBtn>
      <IconBtn label="重做 (Ctrl+Y)"><Redo2 className="h-4 w-4" /></IconBtn>
      <select aria-label="縮放" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-10 shrink-0 rounded-lg bg-transparent px-2 text-sm hover:bg-muted">
        {[75, 90, 100, 110, 125].map((z) => <option key={z} value={z}>{z}%</option>)}
      </select>
      <span className="mx-1 h-5 w-px shrink-0 bg-border-strong" aria-hidden="true" />
      <FormatButtons />
      <span className="flex-1" />
      <IconBtn label={collapsed ? "展開頂部列" : "收闔頂部列 (只留工具列)"} onClick={toggle}>
        <ChevronUp className={cn("h-4 w-4 transition", collapsed && "rotate-180")} />
      </IconBtn>
    </div>
  );
}

function VersionDrawer({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (v: { name: string; time: string }) => void }) {
  const [named, setNamed] = useState(false);
  const [naming, setNaming] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="關閉" className="absolute inset-0 bg-overlay" onClick={onClose} />
      <aside aria-label="版本紀錄" className="animate-rise absolute inset-y-0 right-0 flex w-full flex-col border-l bg-card shadow-2xl sm:w-96">
        <header className="flex items-center gap-2 border-b px-5 py-4">
          <History className="h-4 w-4" aria-hidden="true" />
          <h2 className="flex-1 font-semibold">版本紀錄 / History</h2>
          <button type="button" aria-label="關閉" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex justify-end px-5 pt-3">
          <Button size="sm" variant="ghost" onClick={() => setNamed((n) => !n)}>{named ? "Show all" : "Named only"}</Button>
        </div>
        <div className="mx-5 mt-2 rounded-2xl border-2 border-accent/40 bg-accent-soft p-4">
          <div className="flex items-center gap-2">
            <Tag tone="accent">● Live</Tag>
            <span className="flex-1 text-sm font-semibold">當前版本 (Current Draft)</span>
            <button type="button" aria-label="命名目前版本" onClick={() => setNaming((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-card"><Pencil className="h-4 w-4" /></button>
          </div>
          {naming && (
            <div className="mt-3 flex gap-2">
              <input autoFocus aria-label="版本名稱" placeholder="儲存當前版本..." className={cn(inputClass, "h-10")} />
              <Button size="icon" variant="primary" aria-label="儲存" onClick={() => setNaming(false)}><Check className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {versions.map((d) => (
            <div key={d.day}>
              <Tag className="block px-2 pt-5 pb-2">{d.day}</Tag>
              {d.items
                .filter((v) => !named || v.name !== "自動儲存")
                .map((v) => (
                  <button key={v.name + v.time} type="button" onClick={() => onPick({ name: v.name, time: `${d.day.slice(5)} ${v.time}` })} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-600 text-xs font-medium text-white">{v.author.slice(-1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{v.name}</span>
                      <span className="text-xs text-muted-foreground">{v.author} • {v.time}</span>
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
