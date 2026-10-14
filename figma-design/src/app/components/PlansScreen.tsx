import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Columns3,
  Download,
  FileText,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, Dialog, GroupBadge, Segmented, Tag, inputClass } from "./ui/primitives";
import { camp, formatLong, formatShort, groups, type Plan, type Role } from "../data/mock";
import { cn } from "./ui/utils";

type View = "list" | "grid" | "board";
type SortKey = "time" | "name" | "category";

interface Props {
  role: Role;
  plans: Plan[];
  openPlan: (id: string) => void;
  createPlan: (group: string) => void;
  deletePlan: (id: string) => void;
  notify: (msg: string) => void;
}

export function PlansScreen({ role, plans, openPlan, createPlan, deletePlan, notify }: Props) {
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<SortKey>("time");
  const [asc, setAsc] = useState(false);
  const [toDelete, setToDelete] = useState<Plan | null>(null);
  const isAdmin = role === "admin";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = plans.filter(
      (p) =>
        (tab === "all" || p.group === tab) &&
        (!q || [p.title, p.category, p.lead, p.assistant].some((s) => s.toLowerCase().includes(q))),
    );
    const key = (p: Plan) => (sort === "time" ? p.updatedAt : sort === "name" ? p.title : p.category);
    list.sort((a, b) => key(a).localeCompare(key(b), "zh-Hant") * (asc ? 1 : -1));
    return list;
  }, [plans, tab, query, sort, asc]);

  const onCreate = (group: string) => {
    if (!isAdmin) return notify("🔒 唯讀模式：您目前的權限為組員，如需修改請聯繫管理員。");
    createPlan(group);
  };

  const sortBtn = (k: SortKey, label: string) => (
    <Button
      size="sm"
      variant={sort === k ? "inverse" : "ghost"}
      onClick={() => (sort === k ? setAsc((a) => !a) : (setSort(k), setAsc(k !== "time")))}
      aria-label={`依${label}排序`}
    >
      {label}
      {sort === k && (asc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
    </Button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Tag tone="accent">{camp.name} // Curriculum directory</Tag>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            教案總覽 <Tag className="align-middle">Curriculum directory</Tag>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">營隊核心教案架構、即時同步修訂與分工總覽。</p>
        </div>
        <div className="flex gap-2">
          <MenuButton
            label={
              <>
                {isAdmin ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />} 新增檔案
              </>
            }
            variant="primary"
            items={groups.map((g) => ({ label: g.nameZh, onSelect: () => onCreate(g.slug) }))}
            heading="選擇組別 Create plan"
          />
          <MenuButton
            label={
              <>
                <Download className="h-4 w-4" /> 批次匯出
              </>
            }
            heading="全部教案匯出 (All plans)"
            items={[
              { label: "所有 Word (.docx)", onSelect: () => notify("封裝下載中...（設計稿示範）") },
              { label: "所有 PDF (.pdf)", onSelect: () => notify("封裝下載中...（設計稿示範）") },
              { label: "僅限目前篩選 (Word)", onSelect: () => notify("封裝下載中...（設計稿示範）") },
              { label: "僅限目前篩選 (PDF)", onSelect: () => notify("封裝下載中...（設計稿示範）") },
            ]}
          />
        </div>
      </div>

      {/* HUD */}
      <dl className="mt-8 hidden grid-cols-4 gap-6 border-y py-5 md:grid">
        {[
          ["01 / Total plans", String(plans.length), "Records"],
          ["02 / Active camp", camp.name, ""],
          ["03 / Divisions", String(groups.length), "Teams"],
          ["04 / View mode", `[ ${view.toUpperCase()} ]`, ""],
        ].map(([k, v, u]) => (
          <div key={k}>
            <dt className="tag">{k}</dt>
            <dd className="mt-1 font-display text-2xl font-light">
              {v} {u && <span className="tag">{u}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {/* Group tabs */}
      <div role="tablist" aria-label="組別" className="sticky top-16 z-20 -mx-4 mt-6 flex gap-6 overflow-x-auto border-b bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
        {[{ slug: "all", nameZh: "全部 ALL" }, ...groups].map((g) => {
          const count = g.slug === "all" ? plans.length : plans.filter((p) => p.group === g.slug).length;
          const on = tab === g.slug;
          return (
            <button
              key={g.slug}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(g.slug)}
              className={cn(
                "-mb-px h-12 shrink-0 border-b-[3px] text-sm whitespace-nowrap transition",
                on ? "border-accent font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {g.nameZh} ({count})
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">搜尋教案</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="請搜尋教案名稱、類別或人員..." className={cn(inputClass, "pl-10 pr-24")} />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="tag absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 hover:text-foreground">
              <X className="h-3 w-3" aria-hidden="true" /> Clear
            </button>
          )}
        </label>
        <div className="flex gap-1">
          {sortBtn("time", "時間")}
          {sortBtn("name", "名稱")}
          {sortBtn("category", "類別")}
        </div>
        <Segmented<View>
          label="檢視版型"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: <><List className="h-4 w-4" aria-hidden="true" />清單</> },
            { value: "grid", label: <><LayoutGrid className="h-4 w-4" aria-hidden="true" />畫廊</> },
            { value: "board", label: <><Columns3 className="h-4 w-4" aria-hidden="true" />看板</> },
          ]}
        />
      </div>

      {/* Views */}
      <div className="mt-6">
        {visible.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">目前沒有任何教案</h2>
            <p className="max-w-md text-sm text-muted-foreground">請嘗試更改篩選條件、清除搜尋關鍵字，或是點擊上方「新增檔案」建立全新的教案內容。</p>
            {isAdmin && (
              <Button variant="primary" onClick={() => createPlan(tab === "all" ? groups[0].slug : tab)}>
                <Plus className="h-4 w-4" /> 立即新增教案
              </Button>
            )}
          </Card>
        ) : view === "list" ? (
          <>
          <ul className="-mx-4 border-t md:hidden">
            {visible.map((p, i) => (
              <li key={p.id} className="flex items-start gap-2 border-b px-4 py-3">
                <button type="button" onClick={() => openPlan(p.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    <span className="tag">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                    <GroupBadge slug={p.group} />
                  </span>
                  <span className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{p.category} · {p.lead}/{p.assistant}</span>
                    <span className="shrink-0 font-mono">{formatShort(p.updatedAt)}</span>
                  </span>
                </button>
                <RowMenu plan={p} isAdmin={isAdmin} onDelete={() => setToDelete(p)} notify={notify} />
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="tag border-b text-left">
                  <th className="py-3 pr-3 font-normal">#</th>
                  <th className="py-3 pr-3 font-normal">Plan / Activity name</th>
                  <th className="py-3 pr-3 font-normal">Division</th>
                  <th className="py-3 pr-3 font-normal">Collaborators</th>
                  <th className="py-3 pr-3 font-normal">Modified</th>
                  <th className="py-3 font-normal"><span className="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <tr key={p.id} className="group border-b transition hover:bg-card">
                    <td className="tag py-4 pr-3">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-4 pr-3">
                      <button type="button" onClick={() => openPlan(p.id)} className="text-left">
                        <span className="font-semibold group-hover:text-accent-ink">{p.title} →</span>
                        <span className="block text-xs text-muted-foreground">{p.category}</span>
                      </button>
                    </td>
                    <td className="py-4 pr-3"><GroupBadge slug={p.group} /></td>
                    <td className="py-4 pr-3 text-muted-foreground">
                      <Users className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                      {p.lead} / {p.assistant}
                    </td>
                    <td className="py-4 pr-3 font-mono text-xs text-muted-foreground">
                      <Clock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                      {formatShort(p.updatedAt)}
                    </td>
                    <td className="py-4 text-right">
                      <RowMenu plan={p} isAdmin={isAdmin} onDelete={() => setToDelete(p)} notify={notify} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <Card key={p.id} className="flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="tag">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex items-center gap-1">
                    <GroupBadge slug={p.group} />
                    <RowMenu plan={p} isAdmin={isAdmin} onDelete={() => setToDelete(p)} notify={notify} />
                  </span>
                </div>
                <button type="button" onClick={() => openPlan(p.id)} className="text-left">
                  <span className="font-display text-2xl">{p.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{p.category}</span>
                </button>
                <div className="mt-auto flex justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span className="font-mono">{formatLong(p.updatedAt)}</span>
                  <span>{p.lead} / {p.assistant}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {groups.map((g) => {
              const col = visible.filter((p) => p.group === g.slug);
              return (
                <section key={g.slug} aria-label={g.nameZh} className="flex w-[340px] shrink-0 flex-col gap-3 rounded-3xl bg-muted p-3">
                  <h3 className="flex items-center justify-between px-2 pt-1 text-sm font-semibold">
                    <span className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", g.tone.dot)} aria-hidden="true" />{g.nameZh}</span>
                    <span className="tag">{col.length}</span>
                  </h3>
                  {col.length === 0 && <p className="tag px-2 py-6 text-center">No plans</p>}
                  {col.map((p) => (
                    <button key={p.id} type="button" onClick={() => openPlan(p.id)} className="rounded-2xl border bg-card p-4 text-left shadow-sm hover:border-accent">
                      <span className="block font-semibold">{p.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{p.category} · {p.lead}/{p.assistant}</span>
                      <span className="mt-3 block font-mono text-[11px] text-muted-foreground">{formatLong(p.updatedAt)}</span>
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} label="刪除教案檔案">
        {toDelete && <DeleteForm name={toDelete.title} onCancel={() => setToDelete(null)} onConfirm={() => { deletePlan(toDelete.id); setToDelete(null); }} />}
      </Dialog>
    </div>
  );
}

function DeleteForm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <Tag tone="danger">// Deletion warning //</Tag>
      <h2 className="text-xl font-semibold">刪除教案檔案</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">請輸入 delete 以確認永久刪除「{name}」。此動作不可撤銷。</p>
      <label className="text-[13px] font-medium">
        <span className="sr-only">確認碼</span>
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="delete" className={inputClass} />
      </label>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>取消 CANCEL</Button>
        <Button variant="danger" disabled={text !== "delete"} onClick={onConfirm}>
          <Trash2 className="h-4 w-4" /> 確認刪除 DELETE
        </Button>
      </div>
    </div>
  );
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function MenuButton({
  label,
  items,
  heading,
  variant = "secondary",
}: {
  label: ReactNode;
  items: { label: string; onSelect: () => void }[];
  heading: string;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <Button variant={variant} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      {open && (
        <div role="menu" className="animate-rise absolute top-full right-0 z-30 mt-2 w-60 rounded-2xl border bg-card p-1.5 shadow-xl">
          <span className="tag block px-3 pt-2 pb-1">{heading}</span>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { it.onSelect(); setOpen(false); }} className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm hover:bg-muted">
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RowMenu({ plan, isAdmin, onDelete, notify }: { plan: Plan; isAdmin: boolean; onDelete: () => void; notify: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const row = "flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm hover:bg-muted";
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button type="button" aria-label={`${plan.title} 更多操作`} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="animate-rise absolute top-full right-0 z-30 mt-1 w-52 rounded-2xl border bg-card p-1.5 shadow-xl">
          <button type="button" role="menuitem" className={row} onClick={() => { notify("下載 Word（設計稿示範）"); setOpen(false); }}>下載 Word (.docx)</button>
          <button type="button" role="menuitem" className={row} onClick={() => { notify("下載 PDF（設計稿示範）"); setOpen(false); }}>下載 PDF (.pdf)</button>
          {isAdmin && (
            <>
              <div className="my-1 border-t" />
              <button type="button" role="menuitem" className={row} onClick={() => { notify("更換組別（設計稿示範）"); setOpen(false); }}>更換組別 ▸</button>
              <button type="button" role="menuitem" className={cn(row, "text-danger")} onClick={() => { onDelete(); setOpen(false); }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> 刪除教案
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
