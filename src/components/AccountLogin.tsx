"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, ArrowRight, CircleCheck } from "lucide-react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useFirebase } from "@/firebase/provider";
import { useAuth } from "@/lib/auth-context";
import { updateAccount } from "@/lib/update-account";
import { isEmulatorEnabled } from "@/firebase/emulator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountLogin() {
  const { auth, user } = useFirebase();
  const { needsBinding, notice, logout, isLoading } = useAuth();
  const isTestLogin = isEmulatorEnabled();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"form" | "google" | null>(null);
  const [sent, setSent] = useState(false);
  const busy = pending !== null;
  const binding = needsBinding || mode === "register";
  const title = needsBinding
    ? "完成營隊帳號綁定"
    : mode === "reset"
      ? "重設密碼"
      : binding
        ? "註冊營隊帳號"
        : "登入營隊";
  function change(next: typeof mode) {
    setMode(next);
    setShow(false);
    setSent(false);
    setMessage("");
    setPassword("");
    setCode("");
  }
  async function perform(action: () => Promise<void>, source: "form" | "google" = "form") {
    setPending(source);
    setSent(false);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (error instanceof FirebaseError) {
        const messages: Record<string, string> = {
          "auth/email-already-in-use": "這個信箱已註冊，請直接登入。",
          "auth/weak-password": "請使用至少六個字元的密碼。",
          "auth/invalid-email": "請確認 Email 格式。",
          "auth/invalid-credential": "帳號或密碼錯誤，請重新輸入。",
          "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
          "auth/popup-closed-by-user": "已取消 Google 登入。",
          "auth/popup-blocked": "請允許瀏覽器開啟彈出視窗，再試一次。",
          "auth/unauthorized-domain": "這個網域尚未開放 Google 登入，請聯絡管理員。",
          "auth/operation-not-allowed": source === "google"
            ? "Google 登入尚未啟用，請聯絡管理員。"
            : "這項帳號功能尚未啟用，請聯絡管理員。",
        };
        setMessage(
          messages[error.code] || "無法完成操作，請檢查連線或聯絡管理員。",
        );
      } else setMessage(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setPending(null);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const address = email.trim();
      if (needsBinding) {
        await updateAccount(auth.currentUser, {
          action: "join",
          realName,
          nickname,
          code,
        });
        return;
      }
      if (mode === "reset") {
        auth.languageCode = "zh-TW";
        try {
          await sendPasswordResetEmail(auth, address);
        } catch (error) {
          if (
            !(
              error instanceof FirebaseError &&
              error.code === "auth/user-not-found"
            )
          )
            throw error;
        }
        setSent(true);
        setMessage("若此信箱已註冊密碼帳號，請至收件匣查看重設連結。");
        return;
      }
      if (mode === "register") {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          address,
          password,
        );
        await updateAccount(user, { action: "join", realName, nickname, code });
        return;
      }
      if (isTestLogin && !address.includes("@")) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: address, password }),
        });
        if (!res.ok) throw new Error("帳號或密碼錯誤，請重新輸入。");
        await signInWithCustomToken(auth, (await res.json()).token);
      } else await signInWithEmailAndPassword(auth, address, password);
    });
  }
  const login = mode === "login" && !needsBinding;
  const link = "inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-orange-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-orange-300";
  const progress = <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />;
  const workingLabel = binding ? "正在綁定帳號…" : mode === "reset" ? "正在寄送…" : "正在登入…";
  return (
    <form onSubmit={submit} aria-labelledby="account-title" className="space-y-4">
      <h2 id="account-title" className="border-b border-border pb-4 text-2xl font-medium leading-tight tracking-tight">{title}</h2>
      {needsBinding && user?.email && (
        <p className="break-all text-sm text-muted-foreground">
          登入帳號 <span className="font-medium text-foreground">{user.email}</span>
        </p>
      )}
      {login && <>
        <Button type="button" variant="outline" className="h-11 w-full gap-3 bg-card hover:bg-muted hover:text-foreground"
          disabled={busy || isLoading} onClick={() => void perform(async () => {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await signInWithPopup(auth, provider);
          }, "google")}>
          {pending === "google" ? progress : <span aria-hidden className="font-sans text-lg font-bold text-blue-600 dark:text-blue-400">G</span>}
          {pending === "google" ? "等待 Google 登入…" : isTestLogin ? "模擬 Google 登入（本機測試）" : "使用 Google 帳戶登入"}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />或使用 Email<span className="h-px flex-1 bg-border" />
        </div>
      </>}
      {!needsBinding && <div className="space-y-1.5">
        <label htmlFor="account-email" className="text-sm font-medium">電子郵件</label>
        <Input id="account-email" data-testid="login-username-input" required autoComplete="username"
          autoCapitalize="none" spellCheck={false} inputMode="email" placeholder="name@example.com"
          type={isTestLogin && mode === "login" ? "text" : "email"}
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>}
      {!needsBinding && mode !== "reset" && <div>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3">
          <label htmlFor="account-password" className="text-sm font-medium">密碼</label>
          {login && <button type="button" className={link} disabled={busy} onClick={() => change("reset")}>忘記密碼？</button>}
        </div>
        <div className="relative">
          <Input id="account-password" required data-testid="login-password-input" className="pr-12"
            autoComplete={binding ? "new-password" : "current-password"} type={show ? "text" : "password"}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" data-testid="login-password-reveal" aria-label="顯示密碼" aria-pressed={show}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => setShow(!show)}>
            {show ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
        </div>
      </div>}
      {binding && <>
        <label className="block space-y-1.5 text-sm font-medium"><span>本名</span>
          <Input required maxLength={40} placeholder="請輸入真實姓名" value={realName} onChange={(e) => setRealName(e.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium"><span>營隊綽號</span>
          <Input required maxLength={40} placeholder="教案與闖關表將顯示此綽號" value={nickname} onChange={(e) => setNickname(e.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium"><span>營隊通行碼</span>
          <Input required type="password" value={code} onChange={(e) => setCode(e.target.value)} /></label>
      </>}
      {(message || notice) && <div role={sent ? "status" : "alert"} data-testid="login-error"
        className={sent ? "flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-100"}>
        {sent && <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}{message || notice}
      </div>}
      <Button type="submit" data-testid="login-submit" className="h-11 w-full bg-orange-700 text-white hover:bg-orange-800 dark:bg-orange-700 dark:hover:bg-orange-800"
        disabled={busy || isLoading}>
        {pending === "form" ? <>{progress}{workingLabel}</> : <>{mode === "reset" ? "寄送重設信" : title}<ArrowRight aria-hidden size={16} /></>}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-2 border-t border-border pt-1 text-sm">
        {login && <span className="text-muted-foreground">第一次加入？</span>}
        <button type="button" className={link} disabled={busy}
          onClick={() => needsBinding ? void logout() : change(login ? "register" : "login")}>
          {needsBinding ? "切換帳號" : login ? "註冊個人帳號" : "返回登入"}
        </button>
      </div>
    </form>
  );
}
