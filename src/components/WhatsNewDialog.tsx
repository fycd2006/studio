"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VERSION_HISTORY, VersionHistoryEntry } from "@/data/version-history";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { VersionReleaseNotes } from "@/components/VersionReleaseNotes";

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
            className="relative w-full max-w-lg bg-white/95 dark:bg-[#14191C]/95 backdrop-blur-3xl rounded-xl shadow-2xl overflow-hidden border border-stone-200/80 dark:border-white/10 flex flex-col max-h-[85vh]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
              <h2 className="text-lg font-semibold text-foreground">最新更新</h2>
              <Button variant="ghost" size="icon" aria-label="關閉更新通知" onClick={handleDismiss}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6">
              {missedVersions.map(entry => <VersionReleaseNotes key={entry.id} entry={entry} />)}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 bg-white/50 dark:bg-[#0B1012]/50 backdrop-blur-md border-t border-stone-200/80 dark:border-white/10">
              <Button
                onClick={handleDismiss}
                className="w-full h-12 rounded-lg bg-foreground text-background font-bold text-sm shadow-xl shadow-black/10 dark:shadow-white/5 hover:opacity-90 active:scale-[0.98] transition-all"
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
