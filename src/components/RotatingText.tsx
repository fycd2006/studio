"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface RotatingTextProps {
 items: string[];
 intervalMs?: number;
 className?: string;
}

export function RotatingText({ items, intervalMs = 5000, className }: RotatingTextProps) {
 const [currentIndex, setCurrentIndex] = useState(0);

 useEffect(() => {
 if (items.length <= 1) return;
 const timer = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % items.length);
 }, intervalMs);
 return () => clearInterval(timer);
 }, [items.length, intervalMs]);

 if (!items || items.length === 0) return null;

 return (
 <div className={`relative ${className}`} style={{ minHeight: '3em' /* Ensure minimum height to prevent layout shift */ }}>
 <AnimatePresence mode="wait">
 <motion.div
 key={currentIndex}
 initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
 animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
 transition={{ duration: 0.8, ease: "easeInOut" }}
 className="absolute inset-0"
 >
 {items[currentIndex]}
 </motion.div>
 </AnimatePresence>
 </div>
 );
}
