import { useEffect, useState, type FormEvent } from "react";
import { Eye, Loader2, Lock, Mail } from "lucide-react";
import TentMark from "../imports/TentMark";
import { Button } from "./ui/button";
import { Tag, inputClass } from "./ui/primitives";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-900 px-4 py-12">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-6 gap-2 p-2 sm:grid-cols-3 sm:grid-rows-4 lg:grid-cols-4 lg:grid-rows-3" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl bg-gradient-to-br transition-opacity duration-1000",
              TILE_TONES[i % TILE_TONES.length],
              i === lit ? "opacity-90" : "opacity-45",
            )}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-stone-950/55" aria-hidden="true" />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-orange-300 backdrop-blur">
            <TentMark className="h-8 w-8" />
          </span>
          <span className="tag text-white/70">// Volunteer identity access //</span>
          <h1 className="font-display text-2xl text-white">NTUT CHONG DE</h1>
          <span className="tag text-white/70">Camp Management Platform</span>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-white/30 bg-card/95 p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              帳號 (Username)
              <span className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="請輸入帳號" autoComplete="username" className={cn(inputClass, "pl-10")} />
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              密碼 (Password)
              <span className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type={reveal ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(inputClass, "px-10")}
                />
                <button
                  type="button"
                  aria-label="按住顯示密碼"
                  onPointerDown={() => setReveal(true)}
                  onPointerUp={() => setReveal(false)}
                  onPointerLeave={() => setReveal(false)}
                  className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </span>
            </label>
            {error && <p className="text-[13px] text-danger">帳號或密碼錯誤，請重新輸入。</p>}
            <Button type="submit" variant="primary" size="lg" className="mt-1 w-full justify-center" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              登入系統 / Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">設計稿示範：帳號輸入 admin 或 crew 即可進入</p>
          </div>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-[13px] text-white/80">
          <a className="hover:text-white" href="https://www.facebook.com/" target="_blank" rel="noreferrer">NTUT Chong De Facebook ↗</a>
          <a className="hover:text-white" href="https://www.instagram.com/" target="_blank" rel="noreferrer">NTUT Chong De Instagram ↗</a>
        </div>
        <Tag className="mt-8 block text-center text-white/50">EST. 2006</Tag>
      </div>
    </div>
  );
}
