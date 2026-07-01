"use client";

import { useEffect, useRef, useCallback } from "react";

// Global time offset (shared across all components)
let globalTimeOffset = 0;
let lastSyncTime = 0;

const SYNC_INTERVAL = 5 * 60 * 1000; // Re-sync every 5 minutes

/**
 * Returns the corrected current time using the NTP-like offset.
 * Can be called from anywhere after the hook has initialized.
 */
export function getCorrectedNow(): number {
  return Date.now() + globalTimeOffset;
}

/**
 * Returns the current client-to-server time offset in milliseconds.
 */
export function getServerTimeOffset(): number {
  return globalTimeOffset;
}

/**
 * Hook that calculates the time offset between the client and the web server.
 * Uses a lightweight HTTP HEAD request to fetch the standard HTTP Date header.
 */
export function useServerTime() {
  const syncingRef = useRef(false);

  const syncTime = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const sendTime = Date.now();
      
      // Use cache: 'no-store' and a timestamp query parameter to bypass cache
      const res = await fetch(`/?_ts=${sendTime}`, { 
        method: "HEAD",
        cache: "no-store"
      });
      
      const receiveTime = Date.now();
      const serverDateStr = res.headers.get("Date");

      if (serverDateStr) {
        const serverTs = new Date(serverDateStr).getTime();
        const latency = (receiveTime - sendTime) / 2;
        globalTimeOffset = (serverTs + latency) - receiveTime;
        lastSyncTime = receiveTime;
        console.log(
          `[ServerTime] HTTP offset: ${globalTimeOffset.toFixed(0)}ms, latency: ${latency.toFixed(0)}ms`
        );
      } else {
        console.warn("[ServerTime] Date header missing from response headers");
      }
    } catch (err) {
      console.warn("[ServerTime] Sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

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
