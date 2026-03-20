import { useState, useEffect, useCallback } from 'react';

export type HistoryAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';

export interface HistoryLog {
  id: string;
  action: HistoryAction;
  target: string;
  userRole: string;
  timestamp: number;
}

export function useHistoryLogs() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);

  const loadLogs = useCallback(() => {
    try {
      const stored = localStorage.getItem('app_history_logs');
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadLogs();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_history_logs') loadLogs();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadLogs]);

  const addLog = useCallback((action: HistoryAction, target: string, userRole: string) => {
    try {
      const stored = localStorage.getItem('app_history_logs');
      const currentLogs: HistoryLog[] = stored ? JSON.parse(stored) : [];
      const newLog: HistoryLog = {
        id: Math.random().toString(36).substring(2, 9),
        action,
        target,
        userRole,
        timestamp: Date.now()
      };
      
      const updatedLogs = [newLog, ...currentLogs].slice(0, 50); // Keep last 50
      localStorage.setItem('app_history_logs', JSON.stringify(updatedLogs));
      setLogs(updatedLogs);
      
      // Manually dispatch storage event for same-tab updates if needed
      window.dispatchEvent(new Event('local-storage-update'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleCustom = () => loadLogs();
    window.addEventListener('local-storage-update', handleCustom);
    return () => window.removeEventListener('local-storage-update', handleCustom);
  }, [loadLogs]);

  return { logs, addLog };
}
