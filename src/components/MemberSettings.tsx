"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Lock } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useAuth } from "@/lib/auth-context";
import type { Member } from "@/lib/member";
import { updateAccount } from "@/lib/update-account";
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
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setNickname(member?.nickname || ""), [member?.nickname]);
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
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card px-4 text-card-foreground sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4 sm:py-5">
        <p className="min-w-0 break-all text-sm font-medium">{member?.email}</p>
        <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {role === "admin" ? "管理員" : "隊輔"}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({ action: "nickname", nickname });
        }}
        className="flex flex-wrap items-end gap-3 py-4 sm:py-5"
      >
        <label className="block min-w-0 flex-[1_1_12rem] space-y-1.5 text-sm font-medium sm:max-w-sm">
          <span>營隊綽號</span>
          <Input
            id="camp-nickname"
            required
            maxLength={40}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        <Button type="submit" variant="outline" className="h-11 md:h-10" disabled={busy || nickname.trim() === member?.nickname}>
          儲存綽號
        </Button>
      </form>
      {camp && (role === "admin" || !camp.isLocked) && (
        <form className="space-y-3 py-4 sm:py-5" onSubmit={event => {
          event.preventDefault();
          void save({ action: "camp-groups", campId: camp.id, groupIds: selectedGroups });
        }}>
          <fieldset className="min-w-0 space-y-2" disabled={busy}>
            <legend className="mb-1 text-sm font-medium">本營期組別</legend>
            <p className="text-sm text-muted-foreground">{camp.name} · 用於教案總覽的智慧排序</p>
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <label key={group.id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:border-ring/50 has-[:checked]:border-ring/50 has-[:checked]:bg-primary/5">
                  <input type="checkbox" className="size-4 shrink-0 accent-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" checked={selectedGroups.includes(group.id)}
                    onChange={event => setGroupIds(event.target.checked
                      ? [...selectedGroups, group.id]
                      : selectedGroups.filter(id => id !== group.id))} />
                  {group.nameZh}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" variant="outline" className="h-11 md:h-10" disabled={busy || groupIds === null}>儲存組別</Button>
        </form>
      )}
      {user && member && <MemberPasswordSettings key={user.uid} user={user} />}
      {role === "crew" && (
        <form
          className="flex items-end gap-2 py-4 sm:py-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ action: "upgrade", code });
          }}
        >
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
        </form>
      )}
      {role === "admin" && (
        <section className="py-4 sm:py-5">
          <h3 className="mb-2 text-sm font-medium">成員管理</h3>
          <ul className="divide-y divide-border">
            {members.map((row) => (
              <li
                key={row.uid}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <strong className="text-sm font-medium">{row.nickname}</strong>
                  <p className="break-all text-sm text-muted-foreground">{row.email}</p>
                  <small className="text-xs text-muted-foreground">
                    加入於 {new Date(row.createdAt).toLocaleDateString("zh-TW")}{" "}
                    · {row.status === "active" ? "啟用中" : "已停用"}
                  </small>
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
                    className="h-11 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:h-10"
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
                    disabled={busy || row.uid === user?.uid}
                    onClick={() =>
                      void save({
                        action: "manage",
                        uid: row.uid,
                        status: row.status === "active" ? "disabled" : "active",
                      })
                    }
                  >
                    {row.status === "active" ? "停用" : "重新啟用"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {feedback && (
        <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "py-3 text-sm text-rose-700 dark:text-rose-300" : "py-3 text-sm text-muted-foreground"}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}
