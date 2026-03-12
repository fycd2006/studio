
"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { LessonPlan, PlanCategory, Camp, RotationTableData, UserSettings, PlanVersion } from '@/types/plan';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useDoc, 
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn,
  useAuth
} from '@/firebase';
import { collection, query, doc, orderBy, where } from 'firebase/firestore';
import { getCorrectedNow } from '@/hooks/use-server-time';

export function usePlans() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const campsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'camps'), orderBy('createdAt', 'desc'));
  }, [db, user]);
  const { data: campsData } = useCollection<Camp>(campsQuery);
  const camps = campsData || [];

  const plansQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'lessonPlans'), orderBy('order', 'asc'));
  }, [db, user]);
  const { data: allPlansData } = useCollection<LessonPlan>(plansQuery);
  const allPlans = allPlansData || [];

  const tablesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rotationTables'));
  }, [db, user]);
  const { data: allTablesData } = useCollection<RotationTableData>(tablesQuery);
  const allTables = allTablesData || [];

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'userSettings', 'global');
  }, [db, user]);
  const { data: settings } = useDoc<UserSettings>(settingsRef);

  const [activeCampId, setActiveCampId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'admin'>('editor');
  
  const [localTimeLeft, setLocalTimeLeft] = useState(0);

  const versionsQuery = useMemoFirebase(() => {
    if (!db || !user || !activePlanId) return null;
    return query(collection(db, 'planVersions'), where('planId', '==', activePlanId), orderBy('createdAt', 'desc'));
  }, [db, user, activePlanId]);
  const { data: versionsData } = useCollection<PlanVersion>(versionsQuery);
  const activePlanVersions = versionsData || [];

  // History state for plans
  const [planHistory, setPlanHistory] = useState<{ past: LessonPlan[][], future: LessonPlan[][] }>({ past: [], future: [] });
  const lastPlanStateRef = useRef<LessonPlan[]>([]);

  // History state for tables
  const [tableHistory, setTableHistory] = useState<{ past: RotationTableData[][], future: RotationTableData[][] }>({ past: [], future: [] });
  const lastTableStateRef = useRef<RotationTableData[]>([]);

  useEffect(() => {
    if (allPlans.length > 0) {
      lastPlanStateRef.current = allPlans;
    }
  }, [allPlans]);

  useEffect(() => {
    if (allTables.length > 0) {
      lastTableStateRef.current = allTables;
    }
  }, [allTables]);

  const pushPlanHistory = useCallback(() => {
    setPlanHistory(prev => ({
      past: [...prev.past.slice(-20), lastPlanStateRef.current],
      future: []
    }));
  }, []);

  const pushTableHistory = useCallback(() => {
    setTableHistory(prev => ({
      past: [...prev.past.slice(-20), lastTableStateRef.current],
      future: []
    }));
  }, []);

  const undoPlan = useCallback(() => {
    if (planHistory.past.length === 0 || !db) return;
    const previous = planHistory.past[planHistory.past.length - 1];
    const current = lastPlanStateRef.current;
    
    setPlanHistory(prev => ({
      past: prev.past.slice(0, prev.past.length - 1),
      future: [current, ...prev.future]
    }));

    const previousIds = new Set(previous.map(p => p.id));
    current.forEach(p => {
      if (!previousIds.has(p.id)) {
        deleteDocumentNonBlocking(doc(db, 'lessonPlans', p.id));
      }
    });

    previous.forEach(p => {
      setDocumentNonBlocking(doc(db, 'lessonPlans', p.id), { ...p, updatedAt: Date.now() }, { merge: true });
    });
  }, [planHistory, db]);

  const redoPlan = useCallback(() => {
    if (planHistory.future.length === 0 || !db) return;
    const next = planHistory.future[0];
    const current = lastPlanStateRef.current;

    setPlanHistory(prev => ({
      past: [...prev.past, current],
      future: prev.future.slice(1)
    }));

    const nextIds = new Set(next.map(p => p.id));
    current.forEach(p => {
      if (!nextIds.has(p.id)) {
        deleteDocumentNonBlocking(doc(db, 'lessonPlans', p.id));
      }
    });

    next.forEach(p => {
      setDocumentNonBlocking(doc(db, 'lessonPlans', p.id), { ...p, updatedAt: Date.now() }, { merge: true });
    });
  }, [planHistory, db]);

  const undoTable = useCallback(() => {
    if (tableHistory.past.length === 0 || !db) return;
    const previous = tableHistory.past[tableHistory.past.length - 1];
    const current = lastTableStateRef.current;

    setTableHistory(prev => ({
      past: prev.past.slice(0, prev.past.length - 1),
      future: [current, ...prev.future]
    }));

    const previousIds = new Set(previous.map(t => t.id));
    current.forEach(t => {
      if (!previousIds.has(t.id)) {
        deleteDocumentNonBlocking(doc(db, 'rotationTables', t.id));
      }
    });

    previous.forEach(t => {
      setDocumentNonBlocking(doc(db, 'rotationTables', t.id), t, { merge: true });
    });
  }, [tableHistory, db]);

  const redoTable = useCallback(() => {
    if (tableHistory.future.length === 0 || !db) return;
    const next = tableHistory.future[0];
    const current = lastTableStateRef.current;

    setTableHistory(prev => ({
      past: [...prev.past, current],
      future: prev.future.slice(1)
    }));

    const nextIds = new Set(next.map(t => t.id));
    current.forEach(t => {
      if (!nextIds.has(t.id)) {
        deleteDocumentNonBlocking(doc(db, 'rotationTables', t.id));
      }
    });

    next.forEach(t => {
      setDocumentNonBlocking(doc(db, 'rotationTables', t.id), t, { merge: true });
    });
  }, [tableHistory, db]);

  // Web Worker ref for background-resistant timer
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!settings) return;
    
    // Initialize Web Worker if supported
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/timer-worker.js');
        workerRef.current.onmessage = (e) => {
          const { type, remaining } = e.data;
          if (type === 'tick') {
            setLocalTimeLeft(remaining);
            if (remaining === 0 && settings.isRunning) {
              updateDocumentNonBlocking(doc(db!, 'userSettings', 'global'), { 
                isRunning: false, 
                timeLeft: 0,
                updatedAt: Date.now() 
              });
            }
          }
        };
        console.log('[TimerWorker] initialized');
      } catch (err) {
        console.warn('[TimerWorker] Failed to initialize, using fallback:', err);
      }
    }

    // Send state to Web Worker or run fallback
    if (settings.isRunning && settings.targetEndTime && workerRef.current) {
      workerRef.current.postMessage({
        type: 'start',
        data: { targetEndTime: settings.targetEndTime, timeOffset: 0 }
      });
    } else if (!settings.isRunning && workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setLocalTimeLeft(settings.timeLeft || 0);
    }

    // Fallback: setInterval for browsers without Web Worker support
    const tick = () => {
      const currentTime = getCorrectedNow();
      if (settings.isRunning && settings.targetEndTime) {
        const remaining = Math.max(0, Math.floor((settings.targetEndTime - currentTime) / 1000));
        setLocalTimeLeft(remaining);
        
        if (remaining === 0 && settings.isRunning) {
          updateDocumentNonBlocking(doc(db!, 'userSettings', 'global'), { 
            isRunning: false, 
            timeLeft: 0,
            updatedAt: currentTime 
          });
        }
      } else {
        setLocalTimeLeft(settings.timeLeft || 0);
      }
    };

    // If no Worker, use setInterval as fallback
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!workerRef.current) {
      tick();
      interval = setInterval(tick, 1000);
    } else {
      // Even with Worker, do an initial tick to set state immediately
      tick();
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
        // Re-sync Worker when tab becomes visible
        if (workerRef.current && settings.isRunning && settings.targetEndTime) {
          workerRef.current.postMessage({
            type: 'start',
            data: { targetEndTime: settings.targetEndTime, timeOffset: 0 }
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings, db]);

  useEffect(() => {
    if (camps && camps.length > 0 && !activeCampId) {
      setActiveCampId(camps[0].id);
    }
  }, [camps, activeCampId]);

  const addCamp = useCallback((name: string, startDate?: string, endDate?: string) => {
    if (!db || !user) return;
    const campId = Math.random().toString(36).substr(2, 9);
    const newCamp: Camp = { 
      id: campId, name, startDate, endDate, ownerId: user.uid, createdAt: Date.now() 
    };
    setDocumentNonBlocking(doc(db, 'camps', campId), newCamp, { merge: true });
    setActiveCampId(campId);
  }, [db, user]);

  const updateCamp = useCallback((id: string, updates: Partial<Camp>) => {
    if (!db) return;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    updateDocumentNonBlocking(doc(db, 'camps', id), filtered);
  }, [db]);

  const deleteCamp = useCallback((id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'camps', id));
  }, [db]);

  const addPlan = useCallback((category: PlanCategory) => {
    if (!db || !user || !activeCampId) return;
    pushPlanHistory();
    const planId = Math.random().toString(36).substr(2, 9);
    const newPlan: LessonPlan = {
      id: planId, campId: activeCampId, ownerId: user.uid, category, scheduledName: '', activityName: '新教案',
      members: '', time: '', location: '', purpose: '', process: '', content: '', divisionOfLabor: '', props: [],
      openingClosingRemarks: '', remarks: '', googleDocUrl: '', order: 0, updatedAt: Date.now(),
    };
    setDocumentNonBlocking(doc(db, 'lessonPlans', planId), newPlan, { merge: true });
    setActivePlanId(planId);
  }, [db, user, activeCampId, pushPlanHistory]);

  const updatePlan = useCallback((id: string, updates: Partial<LessonPlan>) => {
    if (!db) return;
    pushPlanHistory();
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    updateDocumentNonBlocking(doc(db, 'lessonPlans', id), { ...filteredUpdates, updatedAt: Date.now() });
  }, [db, pushPlanHistory]);

  const deletePlan = useCallback((id: string) => {
    if (!db) return;
    pushPlanHistory();
    deleteDocumentNonBlocking(doc(db, 'lessonPlans', id));
  }, [db, pushPlanHistory]);

  const savePlanVersion = useCallback((name: string) => {
    if (!db || !user || !activePlanId) return;
    const currentPlan = allPlans.find(p => p.id === activePlanId);
    if (!currentPlan) return;
    
    const versionId = Math.random().toString(36).substr(2, 9);
    const newVersion: PlanVersion = {
      id: versionId,
      planId: activePlanId,
      name,
      createdAt: Date.now(),
      snapshot: { ...currentPlan }
    };
    setDocumentNonBlocking(doc(db, 'planVersions', versionId), newVersion, { merge: true });
  }, [db, user, activePlanId, allPlans]);

  const restorePlanVersion = useCallback((versionId: string) => {
    if (!db || !activePlanId) return;
    const versionToRestore = activePlanVersions.find(v => v.id === versionId);
    if (!versionToRestore) return;
    
    // We update the current plan with the snapshot data, except for the plan's ID and updatedAt
    const { id: _planId, updatedAt, ...snapshotData } = versionToRestore.snapshot;
    updatePlan(activePlanId, snapshotData);
  }, [db, activePlanId, activePlanVersions, updatePlan]);

  const deletePlanVersion = useCallback((versionId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'planVersions', versionId));
  }, [db]);

  const reorderPlans = useCallback((category: PlanCategory, startIndex: number, endIndex: number) => {
    if (!db || !activeCampId) return;
    pushPlanHistory();
    const categoryPlans = allPlans
      .filter(p => p.campId === activeCampId && p.category === category)
      .sort((a, b) => a.order - b.order);
    if (!categoryPlans.length) return;
    const [removed] = categoryPlans.splice(startIndex, 1);
    categoryPlans.splice(endIndex, 0, removed);
    categoryPlans.forEach((p, index) => updateDocumentNonBlocking(doc(db, 'lessonPlans', p.id), { order: index }));
  }, [db, activeCampId, allPlans, pushPlanHistory]);

  const addTable = useCallback((day: string = 'Day 1') => {
    if (!db || !user || !activeCampId) return;
    pushTableHistory();
    const tableId = Math.random().toString(36).substr(2, 9);
    const newTable: RotationTableData = {
      id: tableId, campId: activeCampId, ownerId: user.uid, title: '大地遊戲闖關表', day,
      stations: Array.from({ length: 4 }, (_, i) => ({ id: Math.random().toString(36).substr(2, 9), name: `關卡${i + 1}`, location: '', lead: '', assistant: '' })),
      rounds: Array.from({ length: 2 }, () => ({ cells: Array(4).fill('') })), 
      teamOrders: Array.from({ length: 4 }, (_, i) => ({ id: Math.random().toString(36).substr(2, 9), name: `第${i + 1}小隊`, stations: Array(4).fill('') })),
    };
    setDocumentNonBlocking(doc(db, 'rotationTables', tableId), newTable, { merge: true });
  }, [db, user, activeCampId, pushTableHistory]);

  const updateTable = useCallback((id: string, u: Partial<RotationTableData>) => {
    if (!db) return;
    pushTableHistory();
    const filtered = Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined));
    updateDocumentNonBlocking(doc(db, 'rotationTables', id), filtered);
  }, [db, pushTableHistory]);

  const deleteTable = useCallback((id: string) => {
    if (!db) return;
    pushTableHistory();
    deleteDocumentNonBlocking(doc(db, 'rotationTables', id));
  }, [db, pushTableHistory]);

  return {
    camps, activeCampId, setActiveCampId, addCamp, updateCamp, deleteCamp,
    plans: allPlans.filter(p => p.campId === activeCampId), 
    tables: allTables.filter(t => t.campId === activeCampId), 
    activePlan: allPlans.find(p => p.id === activePlanId) || null,
    activePlanId, setActivePlanId, updatePlan, deletePlan, addPlan, reorderPlans,
    activePlanVersions, savePlanVersion, restorePlanVersion, deletePlanVersion,
    undoPlan, redoPlan, canUndoPlan: planHistory.past.length > 0, canRedoPlan: planHistory.future.length > 0,
    addTable, updateTable, deleteTable,
    undoTable, redoTable, canUndoTable: tableHistory.past.length > 0, canRedoTable: tableHistory.future.length > 0,
    viewMode, setViewMode,
    isSaving: false,
    audioEnabled: true, 
    timer: {
      duration: settings?.duration || 40 * 60,
      timeLeft: localTimeLeft,
      targetEndTime: settings?.targetEndTime,
      isRunning: settings?.isRunning || false,
      setIsRunning: (r: boolean) => {
        if (!db) return;
        const target = r ? Date.now() + (localTimeLeft * 1000) : 0;
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { isRunning: r, timeLeft: localTimeLeft, targetEndTime: target, updatedAt: Date.now() }, { merge: true });
      },
      setDuration: (d: number) => {
        if (!db) return;
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { duration: d, timeLeft: d, targetEndTime: 0, isRunning: false, updatedAt: Date.now() }, { merge: true });
      },
      reset: () => {
        if (!db) return;
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { isRunning: false, timeLeft: settings?.duration || 40 * 60, targetEndTime: 0, updatedAt: Date.now() }, { merge: true });
      }
    }
  };
}
