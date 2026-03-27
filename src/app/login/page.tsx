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
 // 1. 獲取原始圖片 URL
 const res = await fetch("/api/hero-images");
 if (!res.ok) throw new Error("Failed to load hero images");

 const data = await res.json();
 const apiImages = Array.isArray(data?.images)
 ? data.images.filter((v: unknown) => typeof v === "string" && v.length > 0)
 : [];
 const sourcePool = apiImages.length > 0 ? apiImages : FALLBACK_IMAGES;

 // 2. 處理每張圖片 (進階藝術風格轉換)
 const processedImages = await Promise.all(
 sourcePool.map(async (originalUrl: string) => {
 try {
 const res = await fetch("/api/process-hero-image", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ imageUrl: originalUrl }),
 });
 
 if (res.ok) {
 const blob = await res.blob();
 return URL.createObjectURL(blob);
 } else {
 return originalUrl;
 }
 } catch {
 return originalUrl;
 }
 })
 );

 if (!mounted) return;
 setImagePool(processedImages);
 setTiles(Array.from({ length: TILE_COUNT }, (_, i) => processedImages[i % processedImages.length]));
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
 
 const success = login(username, password);
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
 className="relative z-10 mx-auto flex min-h-screen w-[65%] sm:w-full max-w-[25rem] sm:max-w-md md:max-w-[340px] flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8"
 >
 <div className="mb-6 sm:mb-8 flex flex-col items-center">
 <Tent className="h-20 sm:h-24 w-20 sm:w-24 text-white drop-shadow-lg" strokeWidth={1} />
 <h1 className="mt-3 sm:mt-4 text-center text-2xl font-black tracking-[0.14em] text-white">
 NTUT CHONG DE
 </h1>
 <p className="mt-1.5 sm:mt-2 text-center text-xs tracking-[0.2em] text-white/70">
 CAMP SYSTEM LOGIN
 </p>
 </div>

 <div className="w-full rounded-[4px] bg-white shadow-2xl overflow-hidden shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <form onSubmit={handleSubmit} className="space-y-3 pb-3">
 <div className="px-3 sm:px-4 pt-3 sm:pt-3.5">
 <div className="relative flex items-center">
 <Mail className="mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={1.5} />
 <input 
 type="text"
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder="Username"
 className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500"
 required
 />
 </div>
 </div>

 <div className="h-px bg-gray-200" />

 <div className="px-3 sm:px-4 pb-3 sm:pb-3.5">
 <div className="relative flex items-center">
 <Lock className="mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={1.5} />
 <input 
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full bg-transparent pr-8 text-sm text-gray-700 outline-none placeholder:text-gray-500"
 required
 />
 <button
 type="button"
 className="absolute right-0 text-gray-400 transition-colors hover:text-gray-600 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
 onMouseDown={() => setShowPassword(true)}
 onMouseUp={() => setShowPassword(false)}
 onMouseLeave={() => setShowPassword(false)}
 onTouchStart={() => setShowPassword(true)}
 onTouchEnd={() => setShowPassword(false)}
 >
 {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />}
 </button>
 </div>
 </div>

 <AnimatePresence>
 {error && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 className="mx-3 sm:mx-4 rounded-sm bg-rose-50 p-2.5 sm:p-3 text-center text-xs font-semibold text-rose-600 border-none"
 >
 帳號或密碼錯誤，請重新輸入。
 </motion.div>
 )}
 </AnimatePresence>

 <button
 type="submit"
 disabled={isSubmitting}
 className="mx-3 sm:mx-4 flex h-10 sm:h-11 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] items-center justify-center rounded-[4px] bg-[#ff6b00] text-xs sm:text-sm font-semibold tracking-[0.06em] text-white transition-colors hover:bg-[#e66000] disabled:cursor-not-allowed disabled:bg-[#ff6b00]/70 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
 >
 {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
 </button>
 </form>
 </div>

 <div className="mt-6 sm:mt-8 w-full space-y-2.5 sm:space-y-3">
 <a
 href="https://lihi2.cc/3yxOC"
 target="_blank"
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-2.5 sm:gap-3 rounded-[4px] bg-[#3b5998] py-3 sm:py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] text-white transition-colors hover:bg-[#2d4373]"
 >
 <Facebook className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
 <span className="line-clamp-1">NTUT Chong De Facebook</span>
 </a>
 <a
 href="https://www.instagram.com/taipeitech_cd?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
 target="_blank"
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-2.5 sm:gap-3 rounded-[4px] bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] py-3 sm:py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] text-white transition-opacity hover:opacity-90"
 >
 <Instagram className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
 <span className="line-clamp-1">NTUT Chong De Instagram</span>
 </a>
 </div>
 </motion.div>
 </div>
 );
}
