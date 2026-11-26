import { useCallback, useMemo, useSyncExternalStore } from "react";

export interface OverviewPreferences {
  viewType: "grid" | "list" | "board";
  searchQuery: string;
  filterGroup: string;
  sortBy: "smart" | "updatedAt" | "name" | "category";
  sortDirection: "asc" | "desc";
}

const defaults: OverviewPreferences = {
  viewType: "list",
  searchQuery: "",
  filterGroup: "all",
  sortBy: "smart",
  sortDirection: "desc",
};

const changed = "studio:plans-overview-changed";
const inMemory = new Map<string, string>();

function readSnapshot(key: string | null) {
  if (!key) return null;
  try {
    return inMemory.get(key) ?? window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function parsePreferences(snapshot: string | null): OverviewPreferences {
  if (!snapshot) return defaults;
  try {
    const value = JSON.parse(snapshot) as Partial<OverviewPreferences> | null;
    if (!value) return defaults;
    return {
      viewType: value.viewType === "grid" || value.viewType === "board" ? value.viewType : "list",
      searchQuery: typeof value.searchQuery === "string" ? value.searchQuery : "",
      filterGroup: typeof value.filterGroup === "string" ? value.filterGroup : "all",
      sortBy: value.sortBy === "name" || value.sortBy === "category" || value.sortBy === "updatedAt"
        ? value.sortBy : "smart",
      sortDirection: value.sortDirection === "asc" ? "asc" : "desc",
    };
  } catch {
    return defaults;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(changed, listener);
  return () => window.removeEventListener(changed, listener);
}

function getServerSnapshot() {
  return null;
}

export function useOverviewPreferences(campId: string | null, uid?: string, role?: string | null) {
  const key = campId && uid ? "studio:plans-overview:member:" + uid + ":" + campId : null;
  const legacyKey = campId && role ? "studio:plans-overview:" + role + ":" + campId : null;
  const snapshot = useSyncExternalStore(subscribe, () => readSnapshot(key), getServerSnapshot);
  const legacySnapshot = useSyncExternalStore(subscribe, () => readSnapshot(legacyKey), getServerSnapshot);
  const preferences = useMemo(() => {
    if (snapshot) return parsePreferences(snapshot);
    const legacy = parsePreferences(legacySnapshot);
    return legacy.sortBy === "updatedAt" && legacy.sortDirection === "desc"
      ? { ...legacy, sortBy: "smart" as const }
      : legacy;
  }, [snapshot, legacySnapshot]);

  const update = useCallback((changes: Partial<OverviewPreferences>) => {
    if (!key) return;
    const previous = readSnapshot(key);
    const next = JSON.stringify({ ...(previous ? parsePreferences(previous) : preferences), ...changes });
    if (next === previous) return;

    inMemory.set(key, next);
    try {
      window.sessionStorage.setItem(key, next);
    } catch {
      // Keep preferences for client-side navigation when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(changed));
  }, [key, preferences]);

  return [preferences, update] as const;
}
