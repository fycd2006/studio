"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, ChevronDown, CircleCheck, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { FirebaseError } from "firebase/app";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  type User,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const passwordErrors: Record<string, string> = {
  "auth/wrong-password": "目前密碼不正確。",
  "auth/invalid-credential": "驗證失敗，請確認登入帳號與密碼。",
  "auth/user-mismatch": "請選擇目前登入的 Google 帳戶。",
  "auth/weak-password": "新密碼至少需要 6 個字元。",
  "auth/password-does-not-meet-requirements": "新密碼不符合安全規則，請使用較強的密碼。",
  "auth/popup-blocked": "請允許瀏覽器開啟 Google 驗證視窗再試一次。",
  "auth/popup-closed-by-user": "已取消 Google 驗證。",
  "auth/requires-recent-login": "登入驗證已過期，請重新登入後再試。",
  "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
  "auth/provider-already-linked": "這個帳號已設有密碼，請重新整理頁面後使用修改密碼。",
  "auth/credential-already-in-use": "這個電子郵件已用於其他登入帳號，請聯絡管理員。",
  "auth/email-already-in-use": "這個電子郵件已用於其他登入帳號，請聯絡管理員。",
  "auth/operation-not-allowed": "目前尚未啟用電子郵件密碼登入，請聯絡管理員。",
};

export function MemberPasswordSettings({ user }: { user: User }) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [passwordAdded, setPasswordAdded] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();

  useEffect(() => {
    if (!feedback || feedback.error) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const email = user.email;
  const hasPassword = passwordAdded || user.providerData.some(
    provider => provider.providerId === EmailAuthProvider.PROVIDER_ID,
  );
  const google = user.providerData.find(
    provider => provider.providerId === GoogleAuthProvider.PROVIDER_ID,
  );
  if (!email || (!hasPassword && !google)) return null;

  const heading = hasPassword ? "修改密碼" : "設定密碼";
  const lengthOk = newPassword.length >= 6;
  const matchOk = newPassword.length > 0 && newPassword === confirmPassword;
  const currentOk = !hasPassword || currentPassword.length > 0;
  const canSubmit = !busy && lengthOk && matchOk && currentOk;

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !email || auth.currentUser?.uid !== user.uid) return;

    setBusy(true);
    setFeedback(undefined);
    try {
      if (hasPassword) {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, currentPassword));
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account", login_hint: google?.email || email });
        await reauthenticateWithPopup(user, provider);
      }

      if (auth.currentUser?.uid !== user.uid) return;
      // The Auth Emulator's signUp linking endpoint rejects an existing email.
      if (hasPassword || auth.emulatorConfig) {
        await updatePassword(user, newPassword);
      } else {
        await linkWithCredential(user, EmailAuthProvider.credential(email, newPassword));
      }

      const wasPassword = hasPassword;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswords(false);
      setPasswordAdded(true);
      setExpanded(false);
      setFeedback({
        text: wasPassword ? "密碼已修改。" : "密碼已設定，下次也可以用帳號的電子郵件和密碼登入。",
      });
      toast({
        title: wasPassword ? "密碼已修改" : "密碼已設定",
        description: wasPassword ? "下次登入請使用新密碼。" : "之後也可使用 Email 與密碼登入。",
      });
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "";
      setFeedback({
        text: hasPassword && code === "auth/invalid-credential"
          ? "目前密碼不正確。"
          : passwordErrors[code] || "無法儲存密碼，請稍後再試。",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="member-password-title"
      className="overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-md text-card-foreground shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <KeyRound className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 id="member-password-title" className="text-sm font-semibold text-foreground">
              登入方式與安全
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {google && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3" aria-hidden="true" />
                  Google 登入已連結
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  hasPassword
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-stone-200/80 bg-stone-100/80 text-muted-foreground dark:border-white/10 dark:bg-white/5",
                )}
              >
                {hasPassword && <Check className="size-3" aria-hidden="true" />}
                {hasPassword ? "Email 密碼已設定" : "尚未設定密碼"}
              </span>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded(prev => !prev)}
          className="h-9 gap-1.5 rounded-lg"
        >
          <span>{expanded ? "收合" : heading}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")}
          />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-stone-200/60 dark:border-white/5 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {hasPassword
                ? "驗證目前密碼後即可更換新密碼。"
                : "驗證 Google 帳戶後，可為目前的營隊帳號加上密碼，方便跨裝置登入。"}
            </p>
            <button
              type="button"
              onClick={() => setShowPasswords(prev => !prev)}
              aria-pressed={showPasswords}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPasswords ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
              <span>{showPasswords ? "隱藏密碼" : "顯示密碼"}</span>
            </button>
          </div>

          <form onSubmit={savePassword} aria-labelledby="member-password-title">
            <fieldset disabled={busy} className="min-w-0 space-y-3">
              {hasPassword && (
                <label className="block space-y-1.5 text-sm font-medium sm:max-w-sm">
                  <span>目前密碼</span>
                  <Input
                    name="current-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>新密碼</span>
                  <Input
                    name="new-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>確認新密碼</span>
                  <Input
                    name="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                <span className={cn("inline-flex items-center gap-1.5", lengthOk ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                  {lengthOk ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
                  至少 6 個字元
                </span>
                <span className={cn("inline-flex items-center gap-1.5", matchOk ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                  {matchOk ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
                  兩次輸入的新密碼一致
                </span>
              </div>
              <Button
                type="submit"
                variant={canSubmit ? "default" : "outline"}
                className={cn(
                  "h-10 gap-1.5",
                  canSubmit && "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700",
                )}
                disabled={!canSubmit}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                <span>{busy ? "處理中…" : hasPassword ? "儲存新密碼" : "驗證 Google 並設定密碼"}</span>
              </Button>
            </fieldset>
          </form>
        </div>
      )}

      {feedback && (
        <div className="border-t border-stone-200/60 dark:border-white/5 px-4 py-3 sm:px-6">
          <p
            role={feedback.error ? "alert" : "status"}
            className={
              feedback.error
                ? "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                : "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
            }
          >
            {feedback.error ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </p>
        </div>
      )}
    </section>
  );
}
