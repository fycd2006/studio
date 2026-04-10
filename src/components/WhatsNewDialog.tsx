"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VERSION_HISTORY, VersionHistoryEntry } from "@/data/version-history";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Rocket, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function WhatsNewDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [missedVersions, setMissedVersions] = useState<VersionHistoryEntry[]>([]);

  useEffect(() => {
    // Only run on client
    const checkVersion = () => {
      try {
        const lastSeen = window.localStorage.getItem("lastSeenReleaseId");
        const latest = VERSION_HISTORY[0];
        
        if (!latest) return;

        // If no record exists, or it's an old record
        if (lastSeen !== latest.id) {
          // Find all versions since last seen
          let missed: VersionHistoryEntry[] = [];
          if (!lastSeen) {
            // First time, just show the latest 3
            missed = VERSION_HISTORY.slice(0, 3);
          } else {
            // Find index of last seen
            const index = VERSION_HISTORY.findIndex((v) => v.id === lastSeen);
            if (index === -1) {
              // Last seen not found (maybe very old), show latest 3
              missed = VERSION_HISTORY.slice(0, 3);
            } else if (index > 0) {
              // Show all versions up to the last seen
              missed = VERSION_HISTORY.slice(0, index);
            }
          }

          if (missed.length > 0) {
            setMissedVersions(missed);
            setIsOpen(true);
          } else {
            // Edge case: maybe they have a completely new id but we found no missed versions.
            window.localStorage.setItem("lastSeenReleaseId", latest.id);
          }
        }
      } catch (e) {
        console.error("Failed to check version history", e);
      }
    };

    checkVersion();
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    if (VERSION_HISTORY[0]) {
      window.localStorage.setItem("lastSeenReleaseId", VERSION_HISTORY[0].id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[32px] shadow-2xl overflow-hidden border border-white/50 dark:border-white/10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="relative pt-10 pb-6 px-8 text-center bg-gradient-to-br from-orange-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-t-[32px]">
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-stone-400 hover:bg-stone-200/50 dark:hover:bg-white/10 transition-colors"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6 rotate-3">
                <Rocket className="w-8 h-8 text-white -rotate-3" />
              </div>
              <h2 className="text-2xl font-black text-[#2C2A28] dark:text-white tracking-tight mb-2 flex items-center justify-center gap-2">
                最新更新通知
                <Sparkles className="w-5 h-5 text-amber-500" />
              </h2>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                我們帶來了一些新玩意，讓您的體驗更加極致
              </p>
            </div>

            {/* Content List */}
            <ScrollArea className="flex-1 px-8">
              <div className="py-2 pb-8 space-y-8">
                {missedVersions.map((entry) => (
                  <div key={entry.id} className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    <div className="absolute left-[3px] top-4 bottom-[-32px] w-0.5 bg-stone-100 dark:bg-slate-800/50" />
                    
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-[#2C2A28] dark:text-white leading-tight">
                        {entry.title}
                      </h3>
                      <Badge className="bg-orange-100/80 dark:bg-amber-500/10 text-orange-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border-none px-2 py-0.5">
                        v{entry.version}
                      </Badge>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500 mb-3">
                      {entry.date}
                    </p>
                    <ul className="space-y-2.5">
                      {entry.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-stone-600 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 opacity-80" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 pt-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-stone-100/50 dark:border-white/5">
              <Button
                onClick={handleDismiss}
                className="w-full h-12 rounded-2xl bg-[#2C2A28] dark:bg-white text-white dark:text-[#2C2A28] font-bold text-sm shadow-xl shadow-black/10 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                開始體驗 / Let's Go
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
