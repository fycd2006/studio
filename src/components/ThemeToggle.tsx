"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
 const { resolvedTheme, setTheme } = useTheme()
 const [mounted, setMounted] = useState(false)

 useEffect(() => setMounted(true), [])

 if (!mounted) {
 return (
 <div className={cn("h-9 w-9 rounded-xl bg-secondary border-none ", className)} />
 )
 }

 const isDark = resolvedTheme === "dark"

 const toggle = () => setTheme(isDark ? "light" : "dark")

 return (
 <motion.button
 onClick={toggle}
 className={cn(
 "relative h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer",
 "bg-secondary hover:bg-primary/10 dark:bg-secondary dark:hover:bg-primary/10",
 "border-none  hover:",
 "transition-colors duration-300 group overflow-hidden",
 className
 )}
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 aria-label={isDark ? "切換為淺色模式" : "切換為深色模式"}
 >
 <AnimatePresence mode="wait" initial={false}>
 {isDark ? (
 <motion.div
 key="moon"
 initial={{ rotate: -90, scale: 0, opacity: 0 }}
 animate={{ rotate: 0, scale: 1, opacity: 1 }}
 exit={{ rotate: 90, scale: 0, opacity: 0 }}
 transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-4 w-4 text-primary"
 >
 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
 </svg>
 </motion.div>
 ) : (
 <motion.div
 key="sun"
 initial={{ rotate: 90, scale: 0, opacity: 0 }}
 animate={{ rotate: 0, scale: 1, opacity: 1 }}
 exit={{ rotate: -90, scale: 0, opacity: 0 }}
 transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-4 w-4 text-primary"
 >
 <circle cx="12" cy="12" r="5" />
 <line x1="12" y1="1" x2="12" y2="3" />
 <line x1="12" y1="21" x2="12" y2="23" />
 <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
 <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
 <line x1="1" y1="12" x2="3" y2="12" />
 <line x1="21" y1="12" x2="23" y2="12" />
 <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
 <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
 </svg>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.button>
 )
}
