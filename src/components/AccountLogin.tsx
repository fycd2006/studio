"use client";
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, LoaderCircle, ArrowRight, CircleCheck } from "lucide-react";
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
import { detectBrowserEnv } from "@/lib/browser-env";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
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
  const [showCode, setShowCode] = useState(false);
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
  const subtitle = needsBinding
    ? "請補填本名、綽號與營隊通行碼以完成綁定"
    : mode === "reset"
      ? "輸入註冊信箱，系統將寄送密碼重設連結"
      : binding
        ? "建立個人帳號後即可跨裝置同步教案與行程"
        : "使用 Google 或個人帳號進入營隊工作台";
  function change(next: typeof mode) {
    setMode(next);
    setShow(false);
    setShowCode(false);
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
          "auth/operation-not-supported-in-this-environment": "目前瀏覽器環境不支援 Google 驗證，請改用 Safari 或 Chrome 開啟。",
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
      <div className="border-b border-border/80 pb-4">
        <h2 id="account-title" className="text-2xl font-medium leading-tight tracking-tight">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <InAppBrowserBanner variant="login" />
      {needsBinding && user?.email && (
        <p className="break-all rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          登入帳號：<span className="font-medium text-foreground">{user.email}</span>
        </p>
      )}
      {login && <>
        <Button type="button" variant="outline" className="h-11 w-full gap-2.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted/80 hover:text-foreground"
          disabled={busy || isLoading} onClick={() => void perform(async () => {
            const env = detectBrowserEnv();
            if (env.isInAppBrowser) {
              throw new Error(`Google 安全性政策禁止於 ${env.inAppName} 內建瀏覽器登入，請點上方「用外部瀏覽器開啟」改用 ${env.isIOS ? "Safari" : "Chrome"}，或直接使用下方 Email 密碼登入。`);
            }
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await signInWithPopup(auth, provider);
          }, "google")}>
          {pending === "google" ? progress : (
            <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
              <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
            </svg>
          )}
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
          <div className="relative">
            <Input required className="pr-12" type={showCode ? "text" : "password"} value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" aria-label="顯示通行碼" aria-pressed={showCode}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setShowCode(!showCode)}>
              {showCode ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
            </button>
          </div>
        </label>
      </>}
      {(message || notice) && <div role={sent ? "status" : "alert"} data-testid="login-error"
        className={sent
          ? "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-50/90 p-3 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
          : "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-50/90 p-3 text-sm text-rose-900 dark:bg-rose-950/60 dark:text-rose-100"}>
        {sent ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
        <span>{message || notice}</span>
      </div>}
      <Button type="submit" data-testid="login-submit" className="h-11 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_4px_16px_rgba(249,115,22,0.28)] hover:from-orange-600 hover:to-orange-700"
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
