"use client";

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Swiper core styles
import 'swiper/css';
import 'swiper/css/effect-fade';

export function HeroCarousel() {
 const [images, setImages] = useState<string[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState(false);

 useEffect(() => {
 async function fetchImages() {
 try {
 const res = await fetch('/api/hero-images');
 if (!res.ok) throw new Error('API request failed');
 const data = await res.json();
 
 if (data.images && data.images.length > 0) {
 setImages(data.images);
 } else {
 setError(true);
 }
 } catch (err) {
 console.error('Failed to load hero images:', err);
 setError(true);
 } finally {
 setIsLoading(false);
 }
 }
 fetchImages();
 }, []);

 if (isLoading) {
 return (
 <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-stone-100 dark:bg-slate-800/30">
 <Loader2 className="w-8 h-8 animate-spin text-orange-500 dark:text-amber-400" />
 <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500">Loading Memories...</span>
 </div>
 );
 }

 if (error || images.length === 0) {
 return (
 <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-stone-100 dark:bg-slate-800/50">
 <ImageIcon className="w-10 h-10 text-stone-300 dark:text-slate-600" />
 <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500">No Highlights Found</span>
 </div>
 );
 }

 return (
 <div className="w-full h-full relative group">
 <Swiper
 key={images.length}
 modules={[Autoplay, EffectFade]}
 effect="fade"
 loop={images.length > 1}
 autoplay={{ delay: 5000, disableOnInteraction: false }}
 allowTouchMove={true}
 speed={1000}
 className="w-full h-full absolute inset-0"
 >
 {images.map((url, idx) => (
 <SwiperSlide key={idx} className="w-full h-full overflow-hidden bg-stone-200 dark:bg-slate-800">
 <img 
 src={url} 
 alt={`Camp Highlights ${idx + 1}`} 
 loading={idx === 0 ? "eager" : "lazy"}
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover select-none transition-transform duration-[10000ms] ease-linear hover:scale-110"
 />
 </SwiperSlide>
 ))}
 </Swiper>
 {/* Decorative Overlay for contrast */}
 <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-stone-900/10 dark:from-slate-900/50 dark:via-slate-900/10 dark:to-slate-900/30 pointer-events-none z-10" />
 </div>
 );
}
