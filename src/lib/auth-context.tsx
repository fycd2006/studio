"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { isEmulatorEnabled } from "@/firebase/emulator";
import type { Member } from "@/lib/member";
import { indexMemberNicknames } from "@/lib/plan-personnel";
import { updateAccount } from "@/lib/update-account";

interface AccountState {
  member: Member | null;
  memberNicknames: ReadonlyMap<string, string>;
  memberRealNames: ReadonlyMap<string, string>;
  nicknameIndex: ReadonlyMap<string, readonly string[]> | undefined;
  accountHints: ReadonlyMap<string, string>;
  memberDirectoryReady: boolean;
  role: Member["role"] | null;
  isLoading: boolean;
  needsBinding: boolean;
  notice: string;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AccountState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const [observed, setObserved] = useState<{
    uid: string;
    member: Member | null;
  } | null>(null);
  const [restoring, setRestoring] = useState(isEmulatorEnabled);
  const [notice, setNotice] = useState("");
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!isEmulatorEnabled()) return;
    let cancelled = false;
    async function restoreTestSession() {
      await auth.authStateReady();
      if (cancelled) return;
      const current = auth.currentUser;
      const testUser = current?.uid === "e2e-admin" || current?.uid === "e2e-crew";
      if (!localStorage.getItem("studio_role")) {
        if (testUser) await signOut(auth);
        return;
      }
      const response = await fetch("/api/auth/login", { cache: "no-store" });
      const { token } = await response.json();
      if (cancelled) return;
      if (token) await signInWithCustomToken(auth, token);
      else if (testUser) await signOut(auth);
    }
    restoreTestSession()
      .catch(() => { if (!cancelled) setNotice("無法還原測試登入"); })
      .finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, [auth]);

  useEffect(() => {
    if (restoring || !user) {
      setObserved(null);
      return;
    }
    if (user.isAnonymous) {
      void signOut(auth);
      return;
    }
    return onSnapshot(
      doc(firestore, "users", user.uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const data = snapshot.exists() ? { ...(snapshot.data() as Member), uid: snapshot.id } : null;
        if (data?.status === "disabled") {
          setNotice("帳號已停用，請聯絡營隊管理員");
          setObserved(null);
          void signOut(auth);
        } else {
          setObserved({ uid: user.uid, member: data });
          setNotice("");
        }
      },
      () => {
        setNotice("無法讀取成員資料，請重新登入");
        void signOut(auth);
      },
    );
  }, [auth, firestore, restoring, user]);

  const ready = !!user && observed?.uid === user.uid;
  const member = ready ? (observed?.member ?? null) : null;
  const memberId = member ? user?.uid : undefined;
  const directoryRef = useMemoFirebase(
    () => memberId ? collection(firestore, "memberNames") : null,
    [firestore, memberId],
  );
  const { data: directory } = useCollection<{ nickname: string; realName?: string; emailHint?: string }>(directoryRef);
  const currentNickname = member?.nickname;
  const currentRealName = member?.realName?.trim();
  const needsNicknameSync = Boolean(
    directory && memberId && currentNickname && !directory.some(
      entry =>
        entry.id === memberId &&
        typeof entry.emailHint === "string" &&
        (!currentRealName || entry.realName === currentRealName),
    ),
  );
  useEffect(() => {
    if (user && needsNicknameSync) {
      void updateAccount(user, { action: "sync-nickname" }).catch(() => {
        console.warn("無法同步營隊綽號");
      });
    }
  }, [user, needsNicknameSync]);

  const memberNicknames = useMemo(() => {
    const names = new Map<string, string>();
    if (memberId) {
      for (const entry of directory ?? []) {
        if (entry.nickname) names.set(entry.id, entry.nickname);
      }
      if (currentNickname) names.set(memberId, currentNickname);
    }
    return names;
  }, [directory, memberId, currentNickname]);
  const memberRealNames = useMemo(() => {
    const names = new Map<string, string>();
    if (memberId) {
      for (const entry of directory ?? []) {
        if (entry.realName) names.set(entry.id, entry.realName);
      }
      if (currentRealName) names.set(memberId, currentRealName);
    }
    return names;
  }, [directory, memberId, currentRealName]);
  const nicknameIndex = useMemo(
    () => directory ? indexMemberNicknames(memberNicknames, memberRealNames) : undefined,
    [directory, memberNicknames, memberRealNames],
  );
  const accountHints = useMemo(() => new Map(
    (directory ?? []).flatMap(entry => entry.emailHint ? [[entry.id, entry.emailHint]] : []),
  ), [directory]);
  const isLoading = isUserLoading || restoring || (!!user && !ready);
  const role = member?.role ?? null;
  useEffect(() => {
    if (isLoading) return;
    if (role) localStorage.setItem("studio_role", role);
    else localStorage.removeItem("studio_role");
    if (!role && path !== "/login") router.replace("/login");
    if (role && path === "/login") {
      sessionStorage.setItem("studio_just_logged_in", "true");
      router.replace("/");
    }
  }, [isLoading, role, path, router]);

  const logout = async () => {
    localStorage.removeItem("studio_role");
    localStorage.removeItem("activeCampId");
    sessionStorage.removeItem("studio_just_logged_in");
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
  };
  return (
    <AuthContext.Provider
      value={{
        member,
        memberNicknames,
        memberRealNames,
        nicknameIndex,
        accountHints,
        memberDirectoryReady: nicknameIndex !== undefined,
        role,
        isLoading,
        needsBinding: ready && !member,
        notice,
        logout,
      }}
    >
      {path === "/login" || role ? (
        children
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="h-screen w-full flex flex-col gap-4 items-center justify-center bg-[#FAF8F5] dark:bg-[#0B1012] font-sans"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-80" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary/20 animate-pulse" />
          </div>
          <div className="text-primary font-mono font-medium tracking-technical text-xs uppercase flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.15s" }} />
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            正在確認登入狀態…
          </p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
