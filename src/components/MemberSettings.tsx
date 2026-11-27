"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AlertCircle, Check, CircleCheck, Lock, Pencil, Search, Shield, ShieldCheck, User, Users } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useAuth } from "@/lib/auth-context";
import type { Member } from "@/lib/member";
import { updateAccount } from "@/lib/update-account";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberPasswordSettings } from "@/components/MemberPasswordSettings";
import { usePlans } from "@/hooks/use-plans";

export function MemberSettings() {
  const { user, firestore } = useFirebase();
  const { member, role } = useAuth();
  const { activeCampId, camps, groups } = usePlans();
  const camp = camps.find(entry => entry.id === activeCampId);
  const savedGroups = activeCampId ? member?.campGroups?.[activeCampId] : undefined;
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const selectedGroups = (groupIds ?? savedGroups ?? []).filter(id => groups.some(group => group.id === id));
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setNickname(member?.nickname || ""), [member?.nickname]);
  useEffect(() => setRealName(member?.realName || ""), [member?.realName]);
  useEffect(() => setGroupIds(null), [activeCampId, savedGroups]);
  useEffect(() => {
    if (role !== "admin") {
      setMembers([]);
      return;
    }
    return onSnapshot(
      query(collection(firestore, "users"), orderBy("createdAt")),
      (snapshot) => {
        setMembers(snapshot.docs.map((doc) => doc.data() as Member));
      },
      () => {
        setMembers([]);
        setFeedback({ text: "無法讀取成員名單", error: true });
      },
    );
  }, [firestore, role]);
  async function save(payload: Record<string, string | string[]>) {
    setBusy(true);
    setFeedback(undefined);
    try {
      await updateAccount(user, payload);
      setCode("");
      setFeedback({ text: "已儲存" });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "儲存失敗", error: true });
    } finally {
      setBusy(false);
    }
  }
  const filteredMembers = memberSearch.trim()
    ? members.filter((row) => {
        const q = memberSearch.trim().toLowerCase();
        return (
          row.nickname.toLowerCase().includes(q) ||
          (row.realName || "").toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q)
        );
      })
    : members;
  const initials = (member?.nickname || member?.realName || member?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className="divide-y divide-stone-200/60 dark:divide-white/5 overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-md text-card-foreground shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-base font-semibold text-white shadow-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="truncate text-base font-semibold text-foreground">
                {member?.nickname || "營隊成員"}
              </p>
              {member?.realName && (
                <span className="truncate text-xs text-muted-foreground">（{member.realName}）</span>
              )}
            </div>
            <p className="min-w-0 break-all text-xs text-muted-foreground">{member?.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!member?.realName && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              尚未填寫本名
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              role === "admin"
                ? "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                : "border-stone-200/80 bg-stone-100/80 text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-300",
            )}
          >
            {role === "admin" ? <ShieldCheck className="size-3.5" aria-hidden="true" /> : <User className="size-3.5" aria-hidden="true" />}
            {role === "admin" ? "管理員" : "隊輔"}
          </span>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({ action: "profile", realName, nickname });
        }}
        className="space-y-4 px-4 py-5 sm:px-6"
      >
        <div className="flex items-center gap-2">
          <Pencil className="size-4 text-orange-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">個人資料</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-[1_1_11rem] space-y-1.5 text-sm font-medium sm:max-w-[14rem]">
            <span>本名</span>
            <Input
              id="camp-real-name"
              required
              maxLength={40}
              placeholder="請輸入真實姓名"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
          </label>
          <label className="block min-w-0 flex-[1_1_11rem] space-y-1.5 text-sm font-medium sm:max-w-[14rem]">
            <span>營隊綽號</span>
            <Input
              id="camp-nickname"
              required
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            variant="outline"
            className="h-11 md:h-10"
            disabled={
              busy ||
              !realName.trim() ||
              !nickname.trim() ||
              (realName.trim() === (member?.realName || "") &&
                nickname.trim() === (member?.nickname || ""))
            }
          >
            儲存個人資料
          </Button>
        </div>
      </form>
      {camp && (role === "admin" || !camp.isLocked) && (
        <form className="space-y-4 px-4 py-5 sm:px-6" onSubmit={event => {
          event.preventDefault();
          void save({ action: "camp-groups", campId: camp.id, groupIds: selectedGroups });
        }}>
          <fieldset className="min-w-0 space-y-2.5" disabled={busy}>
            <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-orange-500" aria-hidden="true" />
              <span>本營期組別</span>
            </legend>
            <p className="text-sm text-muted-foreground">{camp.name} · 用於教案總覽的智慧排序</p>
            <div className="flex flex-wrap gap-2">
              {groups.map(group => {
                const badge = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                return (
                  <label key={group.id} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-stone-200/80 dark:border-white/10 bg-background/70 px-3.5 text-sm transition-all hover:border-orange-500/40 has-[:checked]:border-orange-500/50 has-[:checked]:bg-orange-500/10 has-[:checked]:font-medium has-[:checked]:text-foreground">
                    <input type="checkbox" className="sr-only" checked={selectedGroups.includes(group.id)}
                      onChange={event => setGroupIds(event.target.checked
                        ? [...selectedGroups, group.id]
                        : selectedGroups.filter(id => id !== group.id))} />
                    <span className={cn("size-2 rounded-full shrink-0", badge.colorDot)} aria-hidden="true" />
                    <span>{group.nameZh}</span>
                    {selectedGroups.includes(group.id) && <Check className="size-3.5 text-orange-500" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" variant="outline" className="h-11 md:h-10" disabled={busy || groupIds === null}>儲存組別</Button>
        </form>
      )}
      {user && member && <MemberPasswordSettings key={user.uid} user={user} />}
      {role === "crew" && (
        <form
          className="space-y-3 px-4 py-5 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ action: "upgrade", code });
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-orange-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">升級管理員權限</h3>
          </div>
          <div className="flex items-end gap-2">
            <label className="block min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-sm">
              <span>幹部通行碼</span>
              <Input
                type="password"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <Button type="submit" variant="outline" size="icon"
              className="size-11 md:size-10" aria-label="提交幹部通行碼" disabled={busy}>
              <Lock aria-hidden="true" />
            </Button>
          </div>
        </form>
      )}
      {role === "admin" && (
        <section className="space-y-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-orange-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">成員管理</h3>
              <span className="rounded-full bg-stone-100 dark:bg-white/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {members.length} 位成員
              </span>
            </div>
            {members.length > 5 && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="搜尋綽號、本名或信箱…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            )}
          </div>
          <ul className="divide-y divide-stone-200/60 dark:divide-white/5">
            {filteredMembers.map((row) => {
              const rowInitial = (row.nickname || row.realName || row.email || "?").trim().slice(0, 1).toUpperCase();
              const isActive = row.status === "active";
              return (
                <li
                  key={row.uid}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-white/10 text-xs font-semibold text-foreground">
                      {rowInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="text-sm font-semibold">
                          {row.nickname}
                          {row.realName && (
                            <span className="ml-1.5 font-normal text-muted-foreground">（{row.realName}）</span>
                          )}
                        </strong>
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          isActive
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                        )}>
                          {isActive ? "啟用中" : "已停用"}
                        </span>
                      </div>
                      <p className="break-all text-xs text-muted-foreground">{row.email}</p>
                      <small className="text-[11px] text-muted-foreground">
                        加入於 {new Date(row.createdAt).toLocaleDateString("zh-TW")}
                      </small>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    title={
                      row.uid === user?.uid
                        ? "不可降級當前登入的管理員帳號"
                        : undefined
                    }
                  >
                    <select
                      className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      aria-label={row.nickname + "的權限"}
                      value={row.role}
                      disabled={busy || row.uid === user?.uid}
                      onChange={(e) =>
                        void save({
                          action: "manage",
                          uid: row.uid,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="crew">隊輔</option>
                      <option value="admin">管理員</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      disabled={busy || row.uid === user?.uid}
                      onClick={() =>
                        void save({
                          action: "manage",
                          uid: row.uid,
                          status: isActive ? "disabled" : "active",
                        })
                      }
                    >
                      {isActive ? "停用" : "重新啟用"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {members.length > 0 && filteredMembers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">找不到符合「{memberSearch}」的成員</p>
          )}
        </section>
      )}
      {feedback && (
        <div className="px-4 py-3 sm:px-6">
          <p role={feedback.error ? "alert" : "status"} className={feedback.error
            ? "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            : "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"}>
            {feedback.error ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            <span>{feedback.text}</span>
          </p>
        </div>
      )}
    </div>
  );
}
