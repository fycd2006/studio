"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { LessonPlan, PlanCategory, Camp, RotationTableData, UserSettings, PlanVersion, Group, CampItem } from '@/types/plan';
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
  useAuth as useFirebaseAuth
} from '@/firebase';
import { collection, query, doc, orderBy, where, limit, getDocs } from 'firebase/firestore';
import { getCorrectedNow, getServerTimeOffset } from '@/hooks/use-server-time';
import { format } from 'date-fns';
import * as jsondiffpatch from 'jsondiffpatch';

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => item === undefined ? null : sanitizeForFirestore(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = sanitizeForFirestore(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

const jdp = jsondiffpatch.create({
  propertyFilter: (name: string) => !['updatedAt'].includes(name),
  objectHash: (obj: any) => obj.id || JSON.stringify(obj),
});

const VERSION_GROUPING_WINDOW = 10 * 60 * 1000; // 10 minutes
const SNAPSHOT_INTERVAL = 10; // Save full snapshot every 10 versions

const USER_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

const DEFAULT_GROUPS: Group[] = [
  { id: 'group-activity', slug: 'activity', nameZh: '活動組', nameEn: 'Activity', createdAt: 0 },
  { id: 'group-teaching', slug: 'teaching', nameZh: '教學組', nameEn: 'Teaching', createdAt: 0 },
];

const DEFAULT_CAMP_ITEMS: Omit<CampItem, 'id'>[] = [
  { usage: "睡覺用", name: "巧拼" },
  { usage: "糧食", name: "飲料" },
  { usage: "電力", name: "延長線" },
  { usage: "辨識", name: "名牌" },
  { usage: "流程", name: "流程表" },
  { usage: "回顧", name: "卡片" },
  { usage: "3C", name: "筆電" },
  { usage: "3C", name: "喇叭" },
  { usage: "3C", name: "隨身碟" },
  { usage: "運送", name: "推車" },
  { usage: "紅布條", name: "紅布條" },
  { usage: "丟垃圾", name: "垃圾袋" },
  { usage: "裝道具", name: "塑膠袋" },
  { usage: "未分類", name: "地膠" },
  { usage: "未分類", name: "膠帶" },
  { usage: "未分類", name: "名牌套" },
  { usage: "未分類", name: "點數" },
  { usage: "未分類", name: "卡片" },
  { usage: "未分類", name: "文件平板夾" },
  { usage: "未分類", name: "便利貼" },
  { usage: "未分類", name: "slido(總召要用)" },
  { usage: "未分類", name: "衣架" },
  { usage: "未分類", name: "任務單" }
];

const normalizeSlug = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'group';

const DEFAULT_GROUP_TYPES = ['活動組', '教學組'];

function getAuthorColor(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface PlansContextType {
  isLoading: boolean;
  camps: Camp[];
  activeCampId: string | null;
  setActiveCampId: (id: string | null) => void;
  addCamp: (name: string, fields?: Partial<Camp>) => void;
  updateCamp: (id: string, updates: Partial<Camp>) => void;
  deleteCamp: (id: string) => void;
  toggleCampLock: (campId: string) => void;
  plans: LessonPlan[];
  tables: RotationTableData[];
  activePlan: LessonPlan | null;
  activePlanId: string | null;
  setActivePlanId: (id: string | null) => void;
  updatePlan: (id: string, updates: Partial<LessonPlan>) => void;
  deletePlan: (id: string) => void;
  addPlan: (categoryOrSlug: PlanCategory | string) => string | undefined;
  reorderPlans: (category: PlanCategory, startIndex: number, endIndex: number) => void;
  activePlanVersions: PlanVersion[];
  savePlanVersion: (name: string, isAuto?: boolean) => Promise<void>;
  restorePlanVersion: (versionId: string) => Promise<void>;
  updatePlanVersionName: (versionId: string, versionName: string) => void;
  deletePlanVersion: (versionId: string) => void;
  autoSaveCurrentState: () => void;
  getFullVersionState: (version: PlanVersion) => Promise<LessonPlan>;
  undoPlan: () => void;
  redoPlan: () => void;
  canUndoPlan: boolean;
  canRedoPlan: boolean;
  addTable: (day?: string) => void;
  updateTable: (id: string, u: Partial<RotationTableData>) => void;
  deleteTable: (id: string) => void;
  undoTable: () => void;
  redoTable: () => void;
  canUndoTable: boolean;
  canRedoTable: boolean;
  viewMode: 'editor' | 'admin';
  setViewMode: (mode: 'editor' | 'admin') => void;
  isSaving: boolean;
  audioEnabled: boolean;
  timer: {
    duration: number;
    timeLeft: number;
    targetEndTime: number | undefined;
    isRunning: boolean;
    setIsRunning: (r: boolean) => void;
    setDuration: (d: number) => void;
    reset: () => void;
  };
  activityTypes: string[];
  addActivityType: (newType: string) => void;
  removeActivityType: (typeToRemove: string) => void;
  groups: Group[];
  addGroup: (input: { nameZh: string; nameEn: string; slug?: string }) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  groupTypes: string[];
  addGroupType: (newGroup: string) => void;
  removeGroupType: (groupToRemove: string) => void;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export function PlansProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
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

  const groups = useMemo(() => {
    const savedGroups = settings?.groups || [];
    const bySlug = new Map<string, Group>();

    DEFAULT_GROUPS.forEach(group => bySlug.set(group.slug, group));
    savedGroups.forEach(group => {
      if (!group?.id || !group?.slug) return;
      bySlug.set(group.slug, {
        ...group,
        nameZh: group.nameZh || group.slug,
        nameEn: group.nameEn || group.slug,
      });
    });

    return Array.from(bySlug.values());
  }, [settings?.groups]);

  const [activeCampId, setActiveCampId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeCampId');
    }
    return null;
  });

  useEffect(() => {
    if (activeCampId) {
      localStorage.setItem('activeCampId', activeCampId);
    } else {
      localStorage.removeItem('activeCampId');
    }
  }, [activeCampId]);

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
    setPlanHistory(prev => {
      const snapshot = lastPlanStateRef.current;
      const last = prev.past[prev.past.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
        return prev;
      }
      return {
        past: [...prev.past.slice(-20), snapshot],
        future: []
      };
    });
  }, []);

  const pushTableHistory = useCallback(() => {
    setTableHistory(prev => {
      const snapshot = lastTableStateRef.current;
      const last = prev.past[prev.past.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
        return prev;
      }
      return {
        past: [...prev.past.slice(-20), snapshot],
        future: []
      };
    });
  }, []);

  const undoPlan = useCallback(() => {
    if (planHistory.past.length === 0 || !db) return;
    const current = lastPlanStateRef.current;
    const currentJson = JSON.stringify(current);
    
    let targetIdx = planHistory.past.length - 1;
    while (targetIdx >= 0 && JSON.stringify(planHistory.past[targetIdx]) === currentJson) {
      targetIdx--;
    }
    if (targetIdx < 0) return;
    
    const previous = planHistory.past[targetIdx];
    
    setPlanHistory(prev => ({
      past: prev.past.slice(0, targetIdx),
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
    const current = lastTableStateRef.current;
    const currentJson = JSON.stringify(current);

    let targetIdx = tableHistory.past.length - 1;
    while (targetIdx >= 0 && JSON.stringify(tableHistory.past[targetIdx]) === currentJson) {
      targetIdx--;
    }
    if (targetIdx < 0) return;

    const previous = tableHistory.past[targetIdx];

    setTableHistory(prev => ({
      past: prev.past.slice(0, targetIdx),
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

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!settings) return;
    
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/timer-worker.js');
        workerRef.current.onmessage = (e) => {
          const { type, remaining } = e.data;
          if (type === 'tick') {
            if (settings.isRunning) {
              setLocalTimeLeft(remaining);
              if (remaining === 0) {
                updateDocumentNonBlocking(doc(db!, 'userSettings', 'global'), { 
                  isRunning: false, 
                  timeLeft: 0,
                  updatedAt: Date.now() 
                });
              }
            }
          }
        };
        console.log('[TimerWorker] initialized');
      } catch (err) {
        console.warn('[TimerWorker] Failed to initialize, using fallback:', err);
      }
    }

    if (settings.isRunning && settings.targetEndTime && workerRef.current) {
      workerRef.current.postMessage({
        type: 'start',
        data: { targetEndTime: settings.targetEndTime, timeOffset: getServerTimeOffset() }
      });
    } else if (!settings.isRunning && workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setLocalTimeLeft(settings.timeLeft || 0);
    }

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

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!workerRef.current) {
      tick();
      interval = setInterval(tick, 1000);
    } else {
      tick();
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
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
    if (campsData === null) return;

    if (!camps.length) {
      if (activeCampId !== null) setActiveCampId(null);
      return;
    }

    const hasValidActiveCamp = !!activeCampId && camps.some(c => c.id === activeCampId);
    if (!hasValidActiveCamp) {
      setActiveCampId(camps[0].id);
    }
  }, [campsData, camps, activeCampId]);

  const addCamp = useCallback((name: string, fields?: Partial<Camp>) => {
    if (!db || !user) return;
    const campId = Math.random().toString(36).substr(2, 9);
    
    const initialCampItems: CampItem[] = DEFAULT_CAMP_ITEMS.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      usage: item.usage,
      name: item.name,
      isPacked: false,
      isChecked: false
    }));

    const newCamp: Camp = { 
      id: campId, 
      name, 
      ...fields,
      campItems: initialCampItems,
      ownerId: user.uid, 
      createdAt: Date.now() 
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

  const addPlan = useCallback((categoryOrSlug: PlanCategory | string) => {
    if (!db || !user || !activeCampId) return;
    pushPlanHistory();

    const normalizedInput = String(categoryOrSlug);
    const targetGroup = groups.find(g => g.slug === normalizedInput)
      || (normalizedInput === 'activity' ? groups.find(g => g.slug === 'activity') : undefined)
      || (normalizedInput === 'teaching' ? groups.find(g => g.slug === 'teaching') : undefined)
      || groups[0]
      || DEFAULT_GROUPS[0];

    const category: PlanCategory = targetGroup.slug === 'teaching' ? 'teaching' : 'activity';
    const planId = Math.random().toString(36).substr(2, 9);
    const newPlan: LessonPlan = {
      id: planId, campId: activeCampId, ownerId: user.uid, category, scheduledName: '', activityName: '新教案',
      groupId: targetGroup.id,
      members: '', time: '', location: '', purpose: '', process: '', content: '', divisionOfLabor: '', props: [],
      openingClosingRemarks: '', remarks: '', googleDocUrl: '', order: 0, updatedAt: Date.now(),
    };
    setDocumentNonBlocking(doc(db, 'lessonPlans', planId), newPlan, { merge: true });
    setActivePlanId(planId);
    return planId;
  }, [db, user, activeCampId, pushPlanHistory, groups]);

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

  const getFullVersionState = useCallback(async (version: PlanVersion): Promise<LessonPlan> => {
    if (version.type === 'snapshot' && version.snapshot) return version.snapshot;
    
    const q = query(
      collection(db!, 'planVersions'), 
      where('planId', '==', activePlanId), 
      where('createdAt', '<=', version.createdAt),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const versionsList = snapshot.docs.map(d => d.data() as PlanVersion);
    
    const snapshotIdx = versionsList.findIndex(v => v.type === 'snapshot');
    if (snapshotIdx === -1) return allPlans.find(p => p.id === activePlanId)!;

    let state = JSON.parse(JSON.stringify(versionsList[snapshotIdx].snapshot));
    for (let i = snapshotIdx - 1; i >= 0; i--) {
      if (versionsList[i].type === 'patch' && versionsList[i].delta) {
        try {
          const clonedState = JSON.parse(JSON.stringify(state));
          state = jdp.patch(clonedState, versionsList[i].delta) || state;
        } catch (err) {
          console.error(`Patch failed at version ${versionsList[i].id}:`, err);
          break;
        }
      }
    }
    return state;
  }, [db, activePlanId, allPlans]);

  const saveNewVersion = useCallback(async (currentPlan: LessonPlan, now: number, name: string, isAuto: boolean) => {
    if (!db || !user || !activePlanId) return;
    const latestVersion = activePlanVersions[0];

    let precomputedDelta: any = undefined;

    if (latestVersion) {
      const previousState = await getFullVersionState(latestVersion);
      precomputedDelta = jdp.diff(previousState, currentPlan);
      if (!precomputedDelta) {
        console.log("No changes detected in Auto-Save. Skipping version creation.");
        return;
      }
    }

    const shouldBeSnapshot = activePlanVersions.length === 0 || 
                           activePlanVersions.length % SNAPSHOT_INTERVAL === 0 ||
                           !isAuto;

    const versionId = Math.random().toString(36).substr(2, 9);
    const newVersion: PlanVersion = {
      id: versionId,
      planId: activePlanId,
      name: isAuto ? `Auto Save - ${format(now, "HH:mm")}` : name,
      createdAt: now,
      type: shouldBeSnapshot ? 'snapshot' : 'patch',
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorColor: getAuthorColor(user.uid),
    };

    if (shouldBeSnapshot) {
      newVersion.snapshot = JSON.parse(JSON.stringify(currentPlan));
    } else {
      newVersion.delta = sanitizeForFirestore(precomputedDelta);
    }

    setDocumentNonBlocking(doc(db, 'planVersions', versionId), newVersion, { merge: true });
  }, [db, user, activePlanId, activePlanVersions, getFullVersionState]);

  const savePlanVersion = useCallback(async (name: string, isAuto: boolean = false) => {
    if (!db || !user || !activePlanId) return;
    const currentPlan = allPlans.find(p => p.id === activePlanId);
    if (!currentPlan) return;
    
    const now = Date.now();
    return saveNewVersion(currentPlan, now, name, isAuto);
  }, [db, user, activePlanId, allPlans, saveNewVersion]);

  const autoSaveCurrentState = useCallback(() => {
    savePlanVersion('Auto Save (Exit)', true);
  }, [savePlanVersion]);

  const restorePlanVersion = useCallback(async (versionId: string) => {
    if (!db || !activePlanId) return;
    const versionToRestore = activePlanVersions.find(v => v.id === versionId);
    if (!versionToRestore) return;
    
    const fullState = await getFullVersionState(versionToRestore);
    const { id: _planId, updatedAt, ...snapshotData } = fullState;
    updatePlan(activePlanId, snapshotData);
  }, [db, activePlanId, activePlanVersions, updatePlan, getFullVersionState]);

  const updatePlanVersionName = useCallback((versionId: string, versionName: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'planVersions', versionId), { versionName });
  }, [db]);

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

  const toggleCampLock = useCallback((campId: string) => {
    if (!db) return;
    const camp = camps.find(c => c.id === campId);
    if (!camp) return;
    updateDocumentNonBlocking(doc(db, 'camps', campId), { isLocked: !camp.isLocked });
  }, [db, camps]);

  const value = useMemo(() => ({
    isLoading: isUserLoading || campsData === null || allPlansData === null,
    camps, activeCampId, setActiveCampId, addCamp, updateCamp, deleteCamp, toggleCampLock,
    plans: allPlans.filter(p => p.campId === activeCampId), 
    tables: allTables.filter(t => t.campId === activeCampId), 
    activePlan: allPlans.find(p => p.id === activePlanId) || null,
    activePlanId, setActivePlanId, updatePlan, deletePlan, addPlan, reorderPlans,
    activePlanVersions, savePlanVersion, restorePlanVersion, updatePlanVersionName, deletePlanVersion, autoSaveCurrentState, getFullVersionState,
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
        const nowTime = getCorrectedNow();
        const target = r ? nowTime + (localTimeLeft * 1000) : 0;
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { isRunning: r, timeLeft: localTimeLeft, targetEndTime: target, updatedAt: nowTime }, { merge: true });
      },
      setDuration: (d: number) => {
        if (!db) return;
        setLocalTimeLeft(d);
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { duration: d, timeLeft: d, targetEndTime: 0, isRunning: false, updatedAt: getCorrectedNow() }, { merge: true });
      },
      reset: () => {
        if (!db) return;
        const d = settings?.duration || 40 * 60;
        setLocalTimeLeft(d);
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { isRunning: false, timeLeft: d, targetEndTime: 0, updatedAt: getCorrectedNow() }, { merge: true });
      }
    },
    activityTypes: settings?.activityTypes || ['劇本', '大地遊戲', '科學闖關', '科學實驗', '手作課程', '相見歡', '起床遊戲'],
    addActivityType: (newType: string) => {
      if (!db) return;
      const current = settings?.activityTypes || ['劇本', '大地遊戲', '科學闖關', '科學實驗', '手作課程', '相見歡', '起床遊戲'];
      if (!current.includes(newType)) {
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), { 
          activityTypes: [...current, newType], 
          updatedAt: Date.now() 
        }, { merge: true });
      }
    },
    removeActivityType: (typeToRemove: string) => {
      if (!db) return;
      const current = settings?.activityTypes || [];
      setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
        activityTypes: current.filter(t => t !== typeToRemove),
        updatedAt: Date.now()
      }, { merge: true });
    },
    groups,
    addGroup: (input: { nameZh: string; nameEn: string; slug?: string }) => {
      if (!db) return;
      const nameZh = input.nameZh.trim();
      const nameEn = input.nameEn.trim();
      if (!nameZh || !nameEn) return;

      const baseSlug = input.slug?.trim() ? normalizeSlug(input.slug) : normalizeSlug(nameEn);
      const current = settings?.groups || [];
      const existingSlugs = new Set([...DEFAULT_GROUPS, ...current].map(g => g.slug));

      let finalSlug = baseSlug;
      let i = 2;
      while (existingSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${i}`;
        i += 1;
      }

      const newGroup: Group = {
        id: Math.random().toString(36).substr(2, 9),
        slug: finalSlug,
        nameZh,
        nameEn,
        createdAt: Date.now(),
      };

      setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
        groups: [...current, newGroup],
        updatedAt: Date.now(),
      }, { merge: true });
    },
    updateGroup: (id: string, updates: Partial<Group>) => {
      if (!db) return;
      const current = settings?.groups || [];
      const isDefault = DEFAULT_GROUPS.some(g => g.id === id);
      const mergedCurrent = [...current, ...DEFAULT_GROUPS.filter(g => !current.find(c => c.id === g.id))];

      let candidateSlug = updates.slug ? normalizeSlug(updates.slug) : undefined;
      if (!isDefault && candidateSlug) {
        const occupied = new Set(mergedCurrent.filter(g => g.id !== id).map(g => g.slug));
        const base = candidateSlug;
        let i = 2;
        while (occupied.has(candidateSlug)) {
          candidateSlug = `${base}-${i}`;
          i += 1;
        }
      }

      const next = mergedCurrent.map(group => {
        if (group.id !== id) return group;
        const nextSlug = candidateSlug || group.slug;
        return {
          ...group,
          ...updates,
          slug: isDefault ? group.slug : nextSlug,
          nameZh: updates.nameZh?.trim() || group.nameZh,
          nameEn: updates.nameEn?.trim() || group.nameEn,
        };
      });

      const persisted = next.filter(g => !DEFAULT_GROUPS.some(d => d.id === g.id));
      setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
        groups: persisted,
        updatedAt: Date.now(),
      }, { merge: true });
    },
    deleteGroup: (id: string) => {
      if (!db) return;
      if (DEFAULT_GROUPS.some(g => g.id === id)) return;
      const current = settings?.groups || [];
      setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
        groups: current.filter(g => g.id !== id),
        updatedAt: Date.now(),
      }, { merge: true });
    },
    groupTypes: Array.from(new Set([...(settings?.groupTypes || []), ...DEFAULT_GROUP_TYPES])),
    addGroupType: (newGroup: string) => {
      if (!db) return;
      const normalized = newGroup.trim();
      if (!normalized) return;
      const current = Array.from(new Set([...(settings?.groupTypes || []), ...DEFAULT_GROUP_TYPES]));
      if (!current.includes(normalized)) {
        setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
          groupTypes: [...current, normalized],
          updatedAt: Date.now()
        }, { merge: true });
      }
    },
    removeGroupType: (groupToRemove: string) => {
      if (!db) return;
      if (DEFAULT_GROUP_TYPES.includes(groupToRemove)) return;
      const current = settings?.groupTypes || [];
      setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
        groupTypes: current.filter(g => g !== groupToRemove),
        updatedAt: Date.now()
      }, { merge: true });
    }
  }), [
    isUserLoading, campsData, allPlansData, camps, activeCampId, allPlans, allTables,
    activePlanId, activePlanVersions, planHistory.past.length, planHistory.future.length,
    tableHistory.past.length, tableHistory.future.length, viewMode, settings, localTimeLeft,
    db, groups, addCamp, updateCamp, deleteCamp, toggleCampLock, updatePlan, deletePlan,
    addPlan, reorderPlans, savePlanVersion, restorePlanVersion, updatePlanVersionName,
    deletePlanVersion, autoSaveCurrentState, getFullVersionState, undoPlan, redoPlan,
    addTable, updateTable, deleteTable, undoTable, redoTable
  ]);

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (context === undefined) {
    throw new Error('usePlans must be used within a PlansProvider');
  }
  return context;
}
