import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Facebook, Instagram, Loader2, Lock, Mail } from "lucide-react";
import TentMark from "../imports/TentMark";
import { inputClass } from "./ui/primitives";
import type { Role } from "../data/mock";
import { cn } from "./ui/utils";

// Warm placeholder tones stand in for the camp photo wall in the real app.
const TILE_TONES = [
  "from-amber-200 to-orange-300",
  "from-stone-300 to-amber-200",
  "from-orange-200 to-rose-200",
  "from-emerald-200 to-amber-100",
  "from-sky-200 to-stone-200",
  "from-amber-100 to-orange-200",
];

export function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setLit((i) => (i + 5) % 12), 2400);
    return () => window.clearInterval(t);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    window.setTimeout(() => {
      setBusy(false);
      if (user === "admin" || user === "crew") onLogin(user);
      else setError(true);
    }, 700);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4 py-8">
      {/* Production fills these tiles with camp photos, edge to edge and square (src/app/login/page.tsx). */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-6 sm:grid-cols-3 sm:grid-rows-4 md:grid-cols-4 md:grid-rows-3" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="relative h-full w-full overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br transition-opacity duration-1000",
                TILE_TONES[i % TILE_TONES.length],
                i === lit ? "opacity-90" : "opacity-70",
              )}
            />
            <div className="absolute inset-0 bg-slate-900/20" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#f7d87a]/20 via-transparent to-[#86d0ff]/18 mix-blend-soft-light" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#fff5d4]/14 to-transparent mix-blend-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" aria-hidden="true" />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-orange-400 shadow-lg backdrop-blur-md">
            <TentMark className="h-8 w-8" />
          </span>
          <span className="mb-1 font-mono text-[10px] tracking-widest text-white/60 uppercase">// Volunteer identity access //</span>
          <h1 className="font-display text-2xl font-normal tracking-tight text-white">NTUT CHONG DE</h1>
          <p className="mt-0.5 font-mono text-xs tracking-widest text-white/70 uppercase">Camp Management Platform</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-white/60 bg-background/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-7 dark:border-white/10">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="px-1 font-mono text-[10px] tracking-wider text-fg-muted uppercase">帳號 (Username)</span>
              <span className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-fg-muted" strokeWidth={1.5} aria-hidden="true" />
                <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="請輸入帳號" autoComplete="username" className={cn(inputClass, "h-11 py-0 pl-10 text-xs")} />
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="px-1 font-mono text-[10px] tracking-wider text-fg-muted uppercase">密碼 (Password)</span>
              <span className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-fg-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type={reveal ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(inputClass, "h-11 py-0 px-10 text-xs")}
                />
                <button
                  type="button"
                  aria-label={reveal ? "隱藏密碼" : "顯示密碼"}
                  onClick={() => setReveal((r) => !r)}
                  className="absolute right-3 p-1 text-fg-muted transition-colors hover:text-foreground"
                >
                  {reveal ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </span>
            </label>
            {error && (
              <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-center font-mono text-xs text-rose-600 dark:text-rose-400">
                帳號或密碼錯誤，請重新輸入。
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 font-mono text-xs tracking-wider text-white uppercase shadow-xs transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "登入系統 / Sign in"}
            </button>
            <p className="text-center text-xs text-muted-foreground">設計稿示範：帳號輸入 admin 或 crew 即可進入</p>
          </div>
        </form>

        <div className="mt-6 w-full space-y-2">
          <a
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/10 py-2.5 font-mono text-xs text-white backdrop-blur-md transition-colors hover:bg-white/15"
            href="https://www.facebook.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Facebook className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">NTUT Chong De Facebook</span>
          </a>
          <a
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/10 py-2.5 font-mono text-xs text-white backdrop-blur-md transition-colors hover:bg-white/15"
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">NTUT Chong De Instagram</span>
          </a>
        </div>
      </div>
    </div>
  );
}
