"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  AlertCircle,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useAuth } from "@/lib/auth-context";
import type { Member } from "@/lib/member";
import { planPersonalRelationship } from "@/lib/plan-personnel";
import { updateAccount } from "@/lib/update-account";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberPasswordSettings } from "@/components/MemberPasswordSettings";
import { usePlans } from "@/hooks/use-plans";
import { useToast } from "@/hooks/use-toast";

type MemberFilter = "all" | "admin" | "crew" | "disabled" | "no-real-name";

const cardClass =
  "overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-md text-card-foreground shadow-xs";

export function MemberSettings() {
  const { user, firestore } = useFirebase();
  const { member, role, nicknameIndex } = useAuth();
  const { activeCampId, camps, groups, plans } = usePlans();
  const { toast } = useToast();

  const camp = camps.find(entry => entry.id === activeCampId);
  const savedGroups = useMemo(
    () => (activeCampId ? member?.campGroups?.[activeCampId] : undefined),
    [activeCampId, member?.campGroups],
  );
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const selectedGroups = useMemo(
    () => (groupIds ?? savedGroups ?? []).filter(id => groups.some(group => group.id === id)),
    [groupIds, savedGroups, groups],
  );
  const [groupsStatus, setGroupsStatus] = useState<{ state: "idle" | "saving" | "saved" | "error"; text?: string }>({
    state: "idle",
  });
  const groupTimerRef = useRef<number | null>(null);

  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ text: string; error?: boolean }>();
  const realNameInputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [showUpgradeCode, setShowUpgradeCode] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<{ text: string; error?: boolean }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [confirmDisableUid, setConfirmDisableUid] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const confirmTimerRef = useRef<number | null>(null);

  useEffect(() => setNickname(member?.nickname || ""), [member?.nickname]);
  useEffect(() => setRealName(member?.realName || ""), [member?.realName]);
  useEffect(() => {
    setGroupIds(null);
    setGroupsStatus({ state: "idle" });
    if (groupTimerRef.current) {
      window.clearTimeout(groupTimerRef.current);
      groupTimerRef.current = null;
    }
  }, [activeCampId, savedGroups]);

  useEffect(() => {
    return () => {
      if (groupTimerRef.current) window.clearTimeout(groupTimerRef.current);
      if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!profileFeedback || profileFeedback.error) return;
    const timer = window.setTimeout(() => setProfileFeedback(undefined), 3000);
    return () => window.clearTimeout(timer);
  }, [profileFeedback]);

  useEffect(() => {
    if (groupsStatus.state !== "saved") return;
    const timer = window.setTimeout(() => setGroupsStatus({ state: "idle" }), 2500);
    return () => window.clearTimeout(timer);
  }, [groupsStatus.state]);

  useEffect(() => {
    if (role !== "admin") {
      setMembers([]);
      return;
    }
    return onSnapshot(
      query(collection(firestore, "users"), orderBy("createdAt")),
      (snapshot) => {
        setMembers(snapshot.docs.map((doc) => doc.data() as Member));
        setAdminError(null);
      },
      () => {
        setMembers([]);
        setAdminError("無法讀取成員名單");
      },
    );
  }, [firestore, role]);

  const inferredGroups = useMemo(() => {
    if (!camp || !member || selectedGroups.length > 0) return [];
    const matchedIds = new Set<string>();
    for (const plan of plans) {
      if (plan.campId !== camp.id) continue;
      const rel = planPersonalRelationship(plan, member.uid, nicknameIndex);
      if (rel !== "lead" && rel !== "assistant") continue;
      const rawGroup = (plan.groupId || "").trim().toLowerCase();
      const cat = (plan.category || "").trim().toLowerCase();
      const matched =
        groups.find(g => g.id === plan.groupId || g.slug.toLowerCase() === rawGroup) ||
        groups.find(g => g.slug.toLowerCase() === cat);
      if (matched) matchedIds.add(matched.id);
    }
    return groups.filter(g => matchedIds.has(g.id));
  }, [camp, member, selectedGroups.length, plans, nicknameIndex, groups]);

  const commitCampGroups = useCallback(
    async (targetCampId: string, nextIds: string[]) => {
      setGroupsStatus({ state: "saving" });
      try {
        await updateAccount(user, { action: "camp-groups", campId: targetCampId, groupIds: nextIds });
        setGroupsStatus({ state: "saved" });
      } catch (error) {
        setGroupIds(null);
        setGroupsStatus({
          state: "error",
          text: error instanceof Error ? error.message : "無法儲存組別",
        });
      }
    },
    [user],
  );

  function toggleCampGroup(groupId: string, checked: boolean) {
    if (!camp) return;
    const next = checked
      ? [...new Set([...selectedGroups, groupId])]
      : selectedGroups.filter(id => id !== groupId);
    const targetCampId = camp.id;
    setGroupIds(next);
    setGroupsStatus({ state: "saving" });
    if (groupTimerRef.current) window.clearTimeout(groupTimerRef.current);
    groupTimerRef.current = window.setTimeout(() => {
      groupTimerRef.current = null;
      void commitCampGroups(targetCampId, next);
    }, 450);
  }

  function applyInferredGroups() {
    if (!camp || !inferredGroups.length) return;
    const next = inferredGroups.map(g => g.id);
    const targetCampId = camp.id;
    setGroupIds(next);
    if (groupTimerRef.current) {
      window.clearTimeout(groupTimerRef.current);
      groupTimerRef.current = null;
    }
    void commitCampGroups(targetCampId, next);
  }

  async function saveProfile() {
    if (profileBusy) return;
    setProfileBusy(true);
    setProfileFeedback(undefined);
    try {
      await updateAccount(user, { action: "profile", realName, nickname });
      setProfileFeedback({ text: "個人資料已更新" });
      toast({ title: "個人資料已更新" });
    } catch (error) {
      setProfileFeedback({
        text: error instanceof Error ? error.message : "儲存失敗",
        error: true,
      });
    } finally {
      setProfileBusy(false);
    }
  }

  async function submitUpgrade() {
    if (upgradeBusy || !code.trim()) return;
    setUpgradeBusy(true);
    setUpgradeFeedback(undefined);
    try {
      await updateAccount(user, { action: "upgrade", code });
      setCode("");
      setShowUpgradeCode(false);
      setUpgradeFeedback({ text: "已升級為管理員權限" });
      toast({ title: "權限已升級", description: "你現在已擁有管理員權限。" });
    } catch (error) {
      setUpgradeFeedback({
        text: error instanceof Error ? error.message : "通行碼驗證失敗",
        error: true,
      });
    } finally {
      setUpgradeBusy(false);
    }
  }

  async function manageMember(row: Member, update: { role?: string; status?: "active" | "disabled" }) {
    setPendingUid(row.uid);
    setConfirmDisableUid(null);
    setAdminError(null);
    try {
      await updateAccount(user, { action: "manage", uid: row.uid, ...update });
      if (update.role) {
        toast({
          title: "權限已更新",
          description: `已將「${row.nickname}」改為${update.role === "admin" ? "管理員" : "隊輔"}。`,
        });
      } else if (update.status) {
        toast({
          title: update.status === "disabled" ? "成員已停用" : "成員已重新啟用",
          description: `「${row.nickname}」${update.status === "disabled" ? "已停用登入權限" : "已恢復正常使用"}。`,
        });
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "無法更新成員狀態");
    } finally {
      setPendingUid(null);
    }
  }

  function requestDisableConfirmation(uid: string) {
    setConfirmDisableUid(uid);
    if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = window.setTimeout(() => {
      confirmTimerRef.current = null;
      setConfirmDisableUid(null);
    }, 5000);
  }

  const profileDirty =
    realName.trim() !== (member?.realName || "") ||
    nickname.trim() !== (member?.nickname || "");
  const profileValid = Boolean(realName.trim() && nickname.trim());

  const adminCount = members.filter(m => m.role === "admin").length;
  const crewCount = members.filter(m => m.role === "crew").length;
  const disabledCount = members.filter(m => m.status === "disabled").length;
  const missingRealNameCount = members.filter(m => !m.realName?.trim()).length;

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((row) => {
      if (memberFilter === "admin" && row.role !== "admin") return false;
      if (memberFilter === "crew" && row.role !== "crew") return false;
      if (memberFilter === "disabled" && row.status !== "disabled") return false;
      if (memberFilter === "no-real-name" && row.realName?.trim()) return false;
      if (!q) return true;
      return (
        row.nickname.toLowerCase().includes(q) ||
        (row.realName || "").toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      );
    });
  }, [members, memberFilter, memberSearch]);

  const initials = (member?.nickname || member?.realName || member?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className="space-y-5">
      {/* ── CARD 1: 個人檔案與組別 ── */}
      <div className={cn(cardClass, "divide-y divide-stone-200/60 dark:divide-white/5")}>
        {/* Identity Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-lg font-semibold text-white shadow-xs">
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
              <button
                type="button"
                onClick={() => {
                  realNameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  realNameInputRef.current?.focus();
                }}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-300 cursor-pointer"
              >
                補填本名以啟用關主智慧搜尋 →
              </button>
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

        {/* Profile Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
          className="space-y-4 px-4 py-5 sm:px-6"
        >
          <div className="flex items-center gap-2">
            <Pencil className="size-4 text-orange-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">個人資料</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>本名</span>
              <Input
                ref={realNameInputRef}
                id="camp-real-name"
                required
                maxLength={40}
                placeholder="請輸入真實姓名"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
              />
              <p className="text-[11px] font-normal text-muted-foreground">
                僅供關主搜尋配對與管理員識別，不會顯示於教案或匯出檔
              </p>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>營隊綽號</span>
              <Input
                id="camp-nickname"
                required
                maxLength={40}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="text-[11px] font-normal text-muted-foreground">
                顯示於教案、闖關表與協作紀錄，修改後會自動同步
              </p>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              variant={profileDirty && profileValid ? "default" : "outline"}
              className={cn(
                "h-10 gap-1.5",
                profileDirty && profileValid && "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xs hover:from-orange-600 hover:to-orange-700",
              )}
              disabled={profileBusy || !profileDirty || !profileValid}
            >
              {profileBusy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>儲存中…</span>
                </>
              ) : profileDirty ? (
                <span>儲存變更</span>
              ) : (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>已同步</span>
                </>
              )}
            </Button>
            {profileDirty && !profileBusy && (
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-muted-foreground"
                onClick={() => {
                  setRealName(member?.realName || "");
                  setNickname(member?.nickname || "");
                  setProfileFeedback(undefined);
                }}
              >
                還原
              </Button>
            )}
          </div>
          {profileFeedback && (
            <p
              role={profileFeedback.error ? "alert" : "status"}
              className={
                profileFeedback.error
                  ? "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                  : "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              }
            >
              {profileFeedback.error ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{profileFeedback.text}</span>
            </p>
          )}
        </form>

        {/* Camp Groups (Auto-Save + Smart Suggestion) */}
        {camp && (role === "admin" || !camp.isLocked) && (
          <div className="space-y-3 px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-orange-500" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">本營期組別</h3>
              </div>
              {groupsStatus.state === "saving" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  自動儲存中…
                </span>
              )}
              {groupsStatus.state === "saved" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5" aria-hidden="true" />
                  已自動儲存
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {camp.name} · 點選即自動儲存，用於教案總覽的智慧排序
            </p>

            {inferredGroups.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <Sparkles className="size-4 shrink-0 text-orange-500" aria-hidden="true" />
                  <span>
                    偵測到你在「<strong>{inferredGroups.map(g => g.nameZh).join("、")}</strong>」擔任關主，要一鍵套用為本營期組別嗎？
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyInferredGroups}
                  className="h-8 bg-orange-500 text-white hover:bg-orange-600"
                >
                  一鍵套用
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {groups.map(group => {
                const badge = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                const checked = selectedGroups.includes(group.id);
                return (
                  <label
                    key={group.id}
                    className={cn(
                      "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-all",
                      checked
                        ? "border-orange-500/50 bg-orange-500/10 font-medium text-foreground"
                        : "border-stone-200/80 dark:border-white/10 bg-background/70 hover:border-orange-500/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={event => toggleCampGroup(group.id, event.target.checked)}
                    />
                    <span className={cn("size-2 rounded-full shrink-0", badge.colorDot)} aria-hidden="true" />
                    <span>{group.nameZh}</span>
                    {checked && <Check className="size-3.5 text-orange-500" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>

            {groupsStatus.state === "error" && groupsStatus.text && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{groupsStatus.text}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── CARD 2: 登入方式與安全 ── */}
      {user && member && <MemberPasswordSettings key={user.uid} user={user} />}

      {/* ── CARD 2b: 升級管理員權限 (Crew only) ── */}
      {role === "crew" && (
        <form
          className={cn(cardClass, "space-y-3 px-4 py-5 sm:px-6")}
          onSubmit={(e) => {
            e.preventDefault();
            void submitUpgrade();
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-orange-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">升級管理員權限</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            輸入幹部通行碼後，帳號將即時升級為管理員權限。
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-sm">
              <span>幹部通行碼</span>
              <div className="relative">
                <Input
                  type={showUpgradeCode ? "text" : "password"}
                  className="pr-11"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="顯示幹部通行碼"
                  aria-pressed={showUpgradeCode}
                  onClick={() => setShowUpgradeCode(prev => !prev)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {showUpgradeCode ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </label>
            <Button
              type="submit"
              variant="outline"
              className="h-11 gap-1.5 md:h-10"
              aria-label="提交幹部通行碼"
              disabled={upgradeBusy}
            >
              {upgradeBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
              <span>{upgradeBusy ? "驗證中…" : "驗證升級"}</span>
            </Button>
          </div>
          {upgradeFeedback && (
            <p
              role={upgradeFeedback.error ? "alert" : "status"}
              className={
                upgradeFeedback.error
                  ? "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                  : "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              }
            >
              {upgradeFeedback.error ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{upgradeFeedback.text}</span>
            </p>
          )}
        </form>
      )}

      {/* ── CARD 3: 成員管理 (Admin only) ── */}
      {role === "admin" && (
        <section className={cn(cardClass, "space-y-4 px-4 py-5 sm:px-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-orange-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">成員管理</h3>
              <span className="rounded-full bg-stone-100 dark:bg-white/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {members.length} 位成員
              </span>
            </div>
            {members.length > 3 && (
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

          {members.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: `全部 (${members.length})`, show: true },
                  { id: "admin", label: `管理員 (${adminCount})`, show: true },
                  { id: "crew", label: `隊輔 (${crewCount})`, show: true },
                  { id: "disabled", label: `已停用 (${disabledCount})`, show: disabledCount > 0 },
                  { id: "no-real-name", label: `未填本名 (${missingRealNameCount})`, show: missingRealNameCount > 0 },
                ] as const
              )
                .filter(pill => pill.show)
                .map(pill => {
                  const active = memberFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMemberFilter(pill.id)}
                      className={cn(
                        "min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                        active
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                          : "border-stone-200/80 dark:border-white/10 bg-background/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {pill.label}
                    </button>
                  );
                })}
            </div>
          )}

          {adminError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{adminError}</span>
            </p>
          )}

          <ul className="divide-y divide-stone-200/60 dark:divide-white/5">
            {filteredMembers.map((row) => {
              const rowInitial = (row.nickname || row.realName || row.email || "?").trim().slice(0, 1).toUpperCase();
              const isActive = row.status === "active";
              const isRowBusy = pendingUid === row.uid;
              const isConfirmingDisable = confirmDisableUid === row.uid;
              const isSelf = row.uid === user?.uid;

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
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            isActive
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                          )}
                        >
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
                    title={isSelf ? "不可降級當前登入的管理員帳號" : undefined}
                  >
                    {isRowBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
                    <select
                      className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      aria-label={row.nickname + "的權限"}
                      value={row.role}
                      disabled={isRowBusy || isSelf}
                      onChange={(e) => void manageMember(row, { role: e.target.value })}
                    >
                      <option value="crew">隊輔</option>
                      <option value="admin">管理員</option>
                    </select>
                    {isActive ? (
                      isConfirmingDisable ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-10"
                            disabled={isRowBusy || isSelf}
                            onClick={() => void manageMember(row, { status: "disabled" })}
                          >
                            確定停用？
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-10"
                            disabled={isRowBusy}
                            onClick={() => setConfirmDisableUid(null)}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10"
                          disabled={isRowBusy || isSelf}
                          onClick={() => requestDisableConfirmation(row.uid)}
                        >
                          停用
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10"
                        disabled={isRowBusy || isSelf}
                        onClick={() => void manageMember(row, { status: "active" })}
                      >
                        重新啟用
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {members.length > 0 && filteredMembers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              找不到符合條件的成員
            </p>
          )}
        </section>
      )}
    </div>
  );
}
