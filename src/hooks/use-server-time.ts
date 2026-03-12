"use client";

import { useEffect, useRef, useCallback } from "react";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";

// Global time offset (shared across all components)
let globalTimeOffset = 0;
let lastSyncTime = 0;

const SYNC_INTERVAL = 5 * 60 * 1000; // Re-sync every 5 minutes
const SYNC_DOC_PATH = "_timeSync";

/**
 * Returns the corrected current time using the NTP-like offset.
 * Can be called from anywhere after the hook has initialized.
 */
export function getCorrectedNow(): number {
  return Date.now() + globalTimeOffset;
}

/**
 * Hook that calculates the time offset between the client and Firebase server.
 * Uses a technique similar to NTP:
 *   1. Record `sendTime` (local)
 *   2. Write `serverTimestamp()` to Firestore
 *   3. Read it back and record `receiveTime` (local)
 *   4. Latency = (receiveTime - sendTime) / 2
 *   5. TimeOffset = (serverTime + latency) - receiveTime
 */
export function useServerTime() {
  const db = useFirestore();
  const syncingRef = useRef(false);

  const syncTime = useCallback(async () => {
    if (!db || syncingRef.current) return;
    syncingRef.current = true;

    try {
      const syncDocRef = doc(db, SYNC_DOC_PATH, "ping");
      const sendTime = Date.now();

      // Write server timestamp
      await setDoc(syncDocRef, { ts: serverTimestamp(), client: sendTime });

      // Read it back
      const snap = await getDoc(syncDocRef);
      const receiveTime = Date.now();

      if (snap.exists()) {
        const serverTs = snap.data().ts?.toMillis?.();
        if (serverTs) {
          const latency = (receiveTime - sendTime) / 2;
          globalTimeOffset = (serverTs + latency) - receiveTime;
          lastSyncTime = receiveTime;
          console.log(
            `[ServerTime] offset: ${globalTimeOffset.toFixed(0)}ms, latency: ${latency.toFixed(0)}ms`
          );
        }
      }
    } catch (err) {
      console.warn("[ServerTime] Sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, [db]);

  useEffect(() => {
    // Initial sync
    syncTime();

    // Periodic re-sync
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSyncTime;
      if (elapsed >= SYNC_INTERVAL) {
        syncTime();
      }
    }, SYNC_INTERVAL);

    // Re-sync when page becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastSyncTime;
        if (elapsed >= SYNC_INTERVAL) {
          syncTime();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncTime]);
}
