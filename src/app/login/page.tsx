"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Tent, Mail, Lock, Facebook, Instagram, Eye, EyeOff, Loader2 } from "lucide-react";

const FALLBACK_IMAGES = [
 "https://images.unsplash.com/photo-1504280395970-822064719f78?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1496081045225-5315fd8e6332?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1455448972184-de647495d428?auto=format&fit=crop&w=1200&q=80",
 "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80",
];

const TILE_COUNT = 12;

function pickRandom(pool: string[], current?: string) {
 if (pool.length === 0) return "";
 let next = pool[Math.floor(Math.random() * pool.length)];
 let retry = 0;
 while (pool.length > 1 && next === current && retry < 8) {
 next = pool[Math.floor(Math.random() * pool.length)];
 retry += 1;
 }
 return next;
}

const GhibliFilter = () => (
 <svg className="hidden" aria-hidden="true">
 <defs>
 <filter id="ghibli" colorInterpolationFilters="sRGB">
 <feColorMatrix
 type="matrix"
 values="
 1.35 0.08 0.00 0 0.05
 0.03 1.35 0.12 0 0.05
 0.00 0.06 1.45 0 0.12
 0.00 0.00 0.00 1 0.00"
 result="graded"
 />
 <feGaussianBlur in="graded" stdDeviation="1.8" result="soft" />
 <feBlend mode="screen" in="soft" in2="graded" result="bloom" />
 <feComponentTransfer in="bloom" result="tone">
 <feFuncR type="linear" slope="0.88" intercept="0.02" />
 <feFuncG type="linear" slope="0.90" intercept="0.02" />
 <feFuncB type="linear" slope="0.86" intercept="0.03" />
 </feComponentTransfer>
 <feColorMatrix in="tone" type="saturate" values="1.22" />
 </filter>
 </defs>
 </svg>
);

export default function LoginPage() {
 const [username, setUsername] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState(false);
 const [imagePool, setImagePool] = useState<string[]>(FALLBACK_IMAGES);
 const [tiles, setTiles] = useState<string[]>(() => Array.from({ length: TILE_COUNT }, (_, i) => FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]));
 const { login } = useAuth();

 useEffect(() => {
 let mounted = true;

 const fetchWallImages = async () => {
 try {
 const res = await fetch("/api/hero-images");
 if (!res.ok) throw new Error("Failed to load hero images");

 const data = await res.json();
 const apiImages = Array.isArray(data?.images)
 ? data.images.filter((v: unknown) => typeof v === "string" && v.length > 0)
 : [];
 const sourcePool = apiImages.length > 0 ? apiImages : FALLBACK_IMAGES;

 if (!mounted) return;
 setImagePool(sourcePool);
 setTiles(Array.from({ length: TILE_COUNT }, (_, i) => sourcePool[i % sourcePool.length]));
 } catch {
 if (!mounted) return;
 setImagePool(FALLBACK_IMAGES);
 setTiles(Array.from({ length: TILE_COUNT }, (_, i) => FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]));
 }
 };

 fetchWallImages();

 return () => {
 mounted = false;
 };
 }, []);

 useEffect(() => {
 const timer = setInterval(() => {
 setTiles((prev) => {
 const next = [...prev];
 const slot = Math.floor(Math.random() * TILE_COUNT);
 next[slot] = pickRandom(imagePool, prev[slot]);
 return next;
 });
 }, 2400);

 return () => clearInterval(timer);
 }, [imagePool]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 setError(false);
 
 // Professional handshaking delay
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const success = await login(username, password);
 if (!success) {
 setError(true);
 setIsSubmitting(false);
 }
 };

 return (
 <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 font-sans">
 <GhibliFilter />

 <div className="absolute inset-0 grid grid-cols-2 grid-rows-6 sm:grid-cols-3 sm:grid-rows-4 md:grid-cols-4 md:grid-rows-3">
 {tiles.map((src, index) => (
 <button
 key={index}
 type="button"
 onClick={() => {
 setTiles((prev) => {
 const next = [...prev];
 next[index] = pickRandom(imagePool, prev[index]);
 return next;
 });
 }}
 className="group relative h-full w-full overflow-hidden bg-[#87CEEB]"
 aria-label="change background image"
 >
 <AnimatePresence mode="sync" initial={false}>
 <motion.div
 key={src}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 1.1, ease: "easeInOut" }}
 className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
 style={{
 backgroundImage: `url(${src})`,
 filter: "url(#ghibli) contrast(1.14) saturate(1.30) brightness(1.05) hue-rotate(-4deg)",
 }}
 />
 </AnimatePresence>
 <div className="absolute inset-0 bg-slate-900/20" />
 </button>
 ))}
 </div>

 <div className="absolute inset-0 bg-gradient-to-tr from-[#f7d87a]/20 via-transparent to-[#86d0ff]/18 mix-blend-soft-light pointer-events-none" />
 <div className="absolute inset-0 bg-gradient-to-br from-[#fff5d4]/14 to-transparent mix-blend-overlay pointer-events-none" />
 <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 py-8"
      >
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 shadow-lg">
            <Tent className="h-8 w-8 text-orange-400" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-white/60 mb-1">
            // VOLUNTEER IDENTITY ACCESS //
          </span>
          <h1 className="text-center text-2xl font-normal tracking-tight text-white">
            NTUT CHONG DE
          </h1>
          <p className="mt-0.5 text-center text-xs font-mono tracking-widest uppercase text-white/70">
            Camp Management Platform
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white/90 dark:bg-[#0B1012]/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted px-1">帳號 (Username)</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-fg-muted" strokeWidth={1.5} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="請輸入帳號"
                  className="w-full pl-10 pr-4 h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-xs font-normal text-foreground outline-none focus:border-orange-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted px-1">密碼 (Password)</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-fg-muted" strokeWidth={1.5} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 h-11 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-xs font-normal text-foreground outline-none focus:border-orange-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 text-fg-muted hover:text-foreground transition-colors p-1"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-center text-xs font-mono text-rose-600 dark:text-rose-400"
                >
                  帳號或密碼錯誤，請重新輸入。
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs flex items-center justify-center cursor-pointer mt-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "登入系統 / Sign in"}
            </button>
          </form>
        </div>

        <div className="mt-6 w-full space-y-2">
          <a
            href="https://lihi2.cc/3yxOC"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 py-2.5 text-xs font-mono text-white transition-colors"
          >
            <Facebook className="h-4 w-4" strokeWidth={1.5} />
            <span className="truncate">NTUT Chong De Facebook</span>
          </a>
          <a
            href="https://www.instagram.com/taipeitech_cd?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 py-2.5 text-xs font-mono text-white transition-colors"
          >
            <Instagram className="h-4 w-4" strokeWidth={1.5} />
            <span className="truncate">NTUT Chong De Instagram</span>
          </a>
        </div>
      </motion.div>
 </div>
 );
}
