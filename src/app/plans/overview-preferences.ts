import { useCallback, useSyncExternalStore } from "react";

export interface OverviewPreferences {
  viewType: "grid" | "list" | "board";
  searchQuery: string;
  filterGroup: string;
  sortBy: "updatedAt" | "name" | "category";
  sortDirection: "asc" | "desc";
}

const defaults: OverviewPreferences = {
  viewType: "list",
  searchQuery: "",
  filterGroup: "all",
  sortBy: "updatedAt",
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
      sortBy: value.sortBy === "name" || value.sortBy === "category" ? value.sortBy : "updatedAt",
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

export function useOverviewPreferences(campId: string | null, role: string | null) {
  const key = campId && role ? "studio:plans-overview:" + role + ":" + campId : null;
  const snapshot = useSyncExternalStore(subscribe, () => readSnapshot(key), getServerSnapshot);

  const update = useCallback((changes: Partial<OverviewPreferences>) => {
    if (!key) return;
    const previous = readSnapshot(key);
    const next = JSON.stringify({ ...parsePreferences(previous), ...changes });
    if (next === previous) return;

    inMemory.set(key, next);
    try {
      window.sessionStorage.setItem(key, next);
    } catch {
      // Keep preferences for client-side navigation when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(changed));
  }, [key]);

  return [parsePreferences(snapshot), update] as const;
}
