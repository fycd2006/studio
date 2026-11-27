"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CircleCheck, Eye, EyeOff, KeyRound } from "lucide-react";
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
  const [passwordAdded, setPasswordAdded] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const email = user.email;
  const hasPassword = passwordAdded || user.providerData.some(
    provider => provider.providerId === EmailAuthProvider.PROVIDER_ID,
  );
  const google = user.providerData.find(
    provider => provider.providerId === GoogleAuthProvider.PROVIDER_ID,
  );
  if (!email || (!hasPassword && !google)) return null;

  const heading = hasPassword ? "修改密碼" : "設定密碼";

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email || auth.currentUser?.uid !== user.uid) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("current-password") ?? "");
    const newPassword = String(fields.get("new-password") ?? "");
    if (newPassword !== fields.get("confirm-password")) {
      setFeedback({ text: "兩次輸入的新密碼不一致。", error: true });
      return;
    }

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

      form.reset();
      setPasswordAdded(true);
      setFeedback({
        text: hasPassword ? "密碼已修改。" : "密碼已設定，下次也可以用帳號的電子郵件和密碼登入。",
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
    <section aria-labelledby="member-password-title" className="space-y-4 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-orange-500" aria-hidden="true" />
          <h3 id="member-password-title" className="text-sm font-semibold text-foreground">{heading}</h3>
        </div>
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
      {!hasPassword && (
        <p className="text-sm text-muted-foreground">
          驗證 Google 帳戶後，可為目前的營隊帳號加上密碼。
        </p>
      )}
      <form onSubmit={savePassword} aria-labelledby="member-password-title">
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          {hasPassword && (
            <label className="block space-y-1.5 text-sm font-medium sm:max-w-sm">
              <span>目前密碼</span>
              <Input name="current-password" type={showPasswords ? "text" : "password"} autoComplete="current-password" required />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>新密碼</span>
              <Input name="new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={6} required />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>確認新密碼</span>
              <Input name="confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={6} required />
            </label>
          </div>
          <Button type="submit" variant="outline" className="h-11 md:h-10" disabled={busy}>
            {busy ? "處理中…" : hasPassword ? "儲存新密碼" : "驗證 Google 並設定密碼"}
          </Button>
        </fieldset>
      </form>
      {feedback && (
        <p role={feedback.error ? "alert" : "status"} className={feedback.error
          ? "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          : "flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"}>
          {feedback.error ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span>{feedback.text}</span>
        </p>
      )}
    </section>
  );
}
