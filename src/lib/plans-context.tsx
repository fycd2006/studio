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
import { collection, query, doc, orderBy, where, limit, getDocs, getDoc } from 'firebase/firestore';
import { getCorrectedNow, getServerTimeOffset } from '@/hooks/use-server-time';
import { format } from 'date-fns';
import * as jsondiffpatch from 'jsondiffpatch';
import { useAuth } from '@/lib/auth-context';
import { isCampAccessible, pickFallbackCamp } from '@/lib/camp-access';
import { applyCampItemEdit, type CampItemEdit } from '@/lib/camp-items';

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

/**
 * `updateCamp` 能改的欄位。
 *
 * ⚠️ 刻意排除 `campItems` —— 那是**一份文件裡的一個陣列**，`updateDoc` 整個換掉它，
 *    所以「呼叫端自己 read-modify-write」在同一個 tick 裡呼叫兩次就會互相覆蓋
 *    （GitHub issue #11 ③）。唯一合法的寫入路徑是 `updateCampItems`，
 *    而這個型別就是編譯器用來保證「沒有第二個寫入者」的閘門。
 */
export type CampUpdate = Omit<Partial<Camp>, 'campItems'>;

interface PlansContextType {
  isLoading: boolean;
  camps: Camp[];
  defaultCampId: string | null;
  setDefaultCampId: (campId: string) => void;
  activeCampId: string | null;
  setActiveCampId: (id: string | null) => void;
  addCamp: (name: string, fields?: Partial<Camp>) => void;
  updateCamp: (id: string, updates: CampUpdate) => void;
  deleteCamp: (id: string) => void;
  /** 營期物品的**唯一**寫入路徑。見 `src/lib/camp-items.ts`。 */
  updateCampItems: (campId: string, edit: CampItemEdit) => void;
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
  /** 回傳 true 代表真的建了一筆版本（讓呼叫端能分辨成功與「其實沒存」）。 */
  savePlanVersion: (name: string, isAuto?: boolean) => Promise<boolean>;
  /** 回傳還原後的完整狀態；還原不了就回傳 null（讓呼叫端能分辨成功與失敗）。 */
  restorePlanVersion: (versionId: string) => Promise<LessonPlan | null>;
  updatePlanVersionName: (versionId: string, versionName: string) => void;
  /** 回傳 true 代表真的刪掉了；false 代表沒刪（例如刪了會讓後面的歷史救不回來）。 */
  deletePlanVersion: (versionId: string) => Promise<boolean>;
  autoSaveCurrentState: () => void;
  getFullVersionState: (version: PlanVersion) => Promise<LessonPlan>;
  undoPlan: () => void;
  redoPlan: () => void;
  canUndoPlan: boolean;
  canRedoPlan: boolean;
  addTable: (dayOrData?: string | Partial<RotationTableData>) => void;
  updateTable: (id: string, u: Partial<RotationTableData>) => void;
  deleteTable: (id: string) => void;
  undoTable: () => void;
  redoTable: () => void;
  canUndoTable: boolean;
  canRedoTable: boolean;
  viewMode: 'editor' | 'admin';
  setViewMode: (mode: 'editor' | 'admin') => void;
  isSaving: boolean;
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
  const { role } = useAuth();
  
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

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

  const campsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'camps'), orderBy('createdAt', 'desc'));
  }, [db, user]);
  const { data: campsData } = useCollection<Camp>(campsQuery);
  const camps = campsData || [];

  const plansQuery = useMemoFirebase(() => {
    if (!db || !user || !activeCampId) return null;
    return query(collection(db, 'lessonPlans'), where('campId', '==', activeCampId));
  }, [db, user, activeCampId]);
  const { data: rawPlansData } = useCollection<LessonPlan>(plansQuery);
  const allPlans = useMemo(() => {
    if (!rawPlansData) return [];
    return [...rawPlansData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawPlansData]);

  const tablesQuery = useMemoFirebase(() => {
    if (!db || !user || !activeCampId) return null;
    return query(collection(db, 'rotationTables'), where('campId', '==', activeCampId));
  }, [db, user, activeCampId]);
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

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'admin'>('editor');

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


  const defaultCampId = settings?.defaultCampId || null;

  const setDefaultCampId = useCallback((campId: string) => {
    if (!db) return;
    setDocumentNonBlocking(doc(db, 'userSettings', 'global'), {
      defaultCampId: campId,
      updatedAt: Date.now()
    }, { merge: true });
  }, [db]);

  useEffect(() => {
    if (campsData === null) return;

    if (!camps.length) {
      if (activeCampId !== null) setActiveCampId(null);
      return;
    }

    // Check if user just logged in
    const isJustLoggedIn = typeof window !== 'undefined' && sessionStorage.getItem('studio_just_logged_in') === 'true';
    if (isJustLoggedIn) {
      sessionStorage.removeItem('studio_just_logged_in');
      const preferred = pickFallbackCamp(camps, role, settings?.defaultCampId);
      if (preferred) {
        setActiveCampId(preferred.id);
        return;
      }
    }

    // ⚠️ 「有效」不只是「這筆專案還在」，還要**這個身分真的進得去**。
    //    只檢查存在的話，localStorage 裡那個已經被管理員鎖定的專案會一直
    //    通過檢查、永遠不會被換掉，於是 crew 重整幾次都還在裡面（issue #9）。
    const activeCamp = activeCampId ? camps.find(c => c.id === activeCampId) : null;
    if (isCampAccessible(activeCamp, role)) return;

    // 退路：登入首選專案 →（不可用則）第一個可用的 →（都不可用）null。
    // 這裡刻意**不**退到 camps[0] —— 那一筆同樣可能是鎖定的。
    const fallback = pickFallbackCamp(camps, role, settings?.defaultCampId);
    setActiveCampId(fallback ? fallback.id : null);
  }, [campsData, camps, activeCampId, settings?.defaultCampId, role]);

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

  const updateCamp = useCallback((id: string, updates: CampUpdate) => {
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
    if (snapshotIdx === -1) {
      // 重建不出來就要說出來。
      //
      // 原本這裡是 `return allPlans.find(p => p.id === activePlanId)!` —— 回傳
      // **目前這份教案**。那個值會被 restorePlanVersion 原封不動寫回去，於是
      // 「還原」變成什麼都沒做，而呼叫端照樣跳「已還原版本」：使用者以為歷史
      // 救回來了，其實一個字都沒變。寧可讓呼叫端收到錯誤、老實告訴使用者。
      throw new Error(`版本 ${version.id} 找不到可重建的基準快照（patch 鏈斷了）`);
    }

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

  /** 回傳 true 代表真的建了一筆版本；false 代表沒有（呼叫端要據此決定提示什麼）。 */
  const saveNewVersion = useCallback(async (currentPlan: LessonPlan, now: number, name: string, isAuto: boolean): Promise<boolean> => {
    if (!db || !user || !activePlanId) return false;
    const latestVersion = activePlanVersions[0];

    let precomputedDelta: any = undefined;
    // 前一版重建不出來（版本鏈斷了）時，改存一份完整快照 —— 見下面的 catch
    let mustBeSnapshot = false;

    if (latestVersion) {
      let previousState: LessonPlan | null = null;
      try {
        previousState = await getFullVersionState(latestVersion);
      } catch (err) {
        // getFullVersionState 在找不到基準快照時會 throw（刻意的，見該函式的註解）。
        // 這裡**不能讓它往外跑** —— 這條路徑是「離開編輯器時的自動存檔」，
        // 往外跑會變成 unhandled promise rejection，而 FirebaseErrorListener 之外
        // 沒有人接得住，使用者看到的是整頁掛掉。
        // 而且「鏈斷了」正是最需要存檔的時候：存一份完整快照反而把鏈接回去，
        // 之後的 patch 就有基準可以重建了。
        console.warn('[saveNewVersion] 無法重建前一版，改存完整快照:', err);
        mustBeSnapshot = true;
      }

      if (previousState) {
        precomputedDelta = jdp.diff(previousState, currentPlan);
        if (!precomputedDelta) {
          if (isAuto) {
            // 自動存檔沒變化就不要洗版，這是對的
            console.log("No changes detected in Auto-Save. Skipping version creation.");
            return false;
          }
          // 但**手動存檔不一樣**：使用者是在對目前這份內容下一個書籤，
          // 「跟上一筆自動存檔一模一樣」不是不存的理由 —— 他要的是那個名字。
          // 而且離開編輯器時會自動存一筆，所以「現況等於最後一筆版本」其實是常態：
          // 照原本的寫法，使用者進來看一看就按儲存，十之八九會靜默失敗。
          // 實測 2026-10-16（瀏覽器）：畫面跳「版本已儲存」，planVersions 一筆都沒多。
          mustBeSnapshot = true;
        }
      }
    }

    const shouldBeSnapshot = mustBeSnapshot ||
                           activePlanVersions.length === 0 || 
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
    return true;
  }, [db, user, activePlanId, activePlanVersions, getFullVersionState]);

  const savePlanVersion = useCallback(async (name: string, isAuto: boolean = false): Promise<boolean> => {
    if (!db || !user || !activePlanId) return false;
    const currentPlan = allPlans.find(p => p.id === activePlanId);
    if (!currentPlan) return false;

    const now = Date.now();
    return saveNewVersion(currentPlan, now, name, isAuto);
  }, [db, user, activePlanId, allPlans, saveNewVersion]);

  const autoSaveCurrentState = useCallback(() => {
    savePlanVersion('Auto Save (Exit)', true);
  }, [savePlanVersion]);

  const restorePlanVersion = useCallback(async (versionId: string): Promise<LessonPlan | null> => {
    if (!db || !activePlanId) return null;
    const versionToRestore = activePlanVersions.find(v => v.id === versionId);
    if (!versionToRestore) return null;

    // 重建不出來時 getFullVersionState 會 throw —— 刻意不在這裡吞掉，
    // 呼叫端要能分辨「還原成功」與「還原失敗」才有辦法對使用者說實話。
    const fullState = await getFullVersionState(versionToRestore);
    const { id: _planId, updatedAt, ...snapshotData } = fullState;
    updatePlan(activePlanId, snapshotData);
    return fullState;
  }, [db, activePlanId, activePlanVersions, updatePlan, getFullVersionState]);

  const updatePlanVersionName = useCallback((versionId: string, versionName: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'planVersions', versionId), { versionName });
  }, [db]);

  /**
   * 刪一筆版本紀錄。
   *
   * ⚠️ 不能只刪掉就算了。patch 型的版本只存「跟前一版的差異」，重建時要往回找到
   *    最近的 snapshot 當基準（見 getFullVersionState）。直接刪掉一個 snapshot，
   *    它後面那些 patch 就再也重建不出來 —— 而使用者的意圖只是「清掉一筆紀錄」，
   *    不是「讓後面每一筆都變成還原不回來的廢資料」。
   *
   *    所以刪 snapshot 之前，先把「時間上的下一筆 patch」實體化成 snapshot，
   *    讓鏈接得回去。實體化一定要在刪除**之前**做，因為重建本身要讀到這個 snapshot。
   *
   * ⚠️ 接不回去時會**取消刪除**，而「取消了」一定要回報給呼叫端（回傳 false）。
   *    這個函式第一版只是 `return`，呼叫端（PlanEditor 的 handleDeleteVersion）
   *    照樣跳「已刪除版本」—— 使用者看到成功提示、那一列還在面板上，
   *    只會以為畫面壞了。那正是本專案反模式 16 的樣子，而且是修 bug 時自己種下的。
   */
  const deletePlanVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!db) return false;
    const list = activePlanVersions || [];   // createdAt 由新到舊
    const idx = list.findIndex(v => v.id === versionId);
    const toDelete = idx >= 0 ? list[idx] : undefined;
    const newer = idx > 0 ? list[idx - 1] : undefined;

    if (toDelete?.type === 'snapshot' && newer?.type === 'patch') {
      try {
        const materialized = await getFullVersionState(newer);
        setDocumentNonBlocking(
          doc(db, 'planVersions', newer.id),
          { type: 'snapshot', snapshot: sanitizeForFirestore(JSON.parse(JSON.stringify(materialized))) },
          { merge: true },
        );
      } catch (err) {
        // 接不回去就不要刪 —— 刪了會讓後面整段歷史變成廢資料
        console.error('[deletePlanVersion] 無法把下一筆 patch 實體化，取消刪除:', err);
        return false;
      }
    }

    deleteDocumentNonBlocking(doc(db, 'planVersions', versionId));
    return true;
  }, [db, activePlanVersions, getFullVersionState]);

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

  const addTable = useCallback((dayOrCustom?: string | Partial<RotationTableData>) => {
    if (!db || !user || !activeCampId) return;
    pushTableHistory();
    const tableId = Math.random().toString(36).substr(2, 9);

    if (typeof dayOrCustom === "object" && dayOrCustom !== null) {
      const newTable: RotationTableData = {
        id: tableId,
        campId: activeCampId,
        ownerId: user.uid,
        title: dayOrCustom.title || "大地遊戲闖關表",
        day: dayOrCustom.day || "Day 1",
        stations: dayOrCustom.stations || [],
        rounds: dayOrCustom.rounds || [],
        teamOrders: dayOrCustom.teamOrders || [],
      };
      setDocumentNonBlocking(doc(db, "rotationTables", tableId), newTable, { merge: true });
      return;
    }

    const day = typeof dayOrCustom === "string" ? dayOrCustom : "Day 1";
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

  /**
   * 營期物品的唯一寫入者。形狀與 `toggleCampLock` 相同 —— 自己去 `camps` 拿
   * 當下的那一份、算出完整的新陣列、只寫一次。
   *
   * 呼叫端**不准**自己組 `campItems`（`CampUpdate` 已經把它從 `updateCamp`
   * 排除掉）。那個限制換來的是：「同一個 tick 裡改群組裡的每一筆」這種寫法
   * 在型別上不存在，所以 issue #11 ③ 寫不回來。
   */
  const updateCampItems = useCallback((campId: string, edit: CampItemEdit) => {
    if (!db) return;
    const camp = camps.find(c => c.id === campId);
    if (!camp) return;
    const current = camp.campItems ?? [];
    const next = applyCampItemEdit(current, edit);
    // 沒變就不寫。PropInput 是 onBlur 才送出的，而點進點出不改字是常態。
    if (next === current) return;
    updateDocumentNonBlocking(doc(db, 'camps', campId), { campItems: next });
  }, [db, camps]);

  const value = useMemo(() => ({
    isLoading: isUserLoading || campsData === null || (!!activeCampId && rawPlansData === null),
    camps, defaultCampId, setDefaultCampId, activeCampId, setActiveCampId, addCamp, updateCamp, deleteCamp, updateCampItems, toggleCampLock,
    plans: allPlans, 
    tables: allTables, 
    activePlan: allPlans.find(p => p.id === activePlanId) || null,
    activePlanId, setActivePlanId, updatePlan, deletePlan, addPlan, reorderPlans,
    activePlanVersions, savePlanVersion, restorePlanVersion, updatePlanVersionName, deletePlanVersion, autoSaveCurrentState, getFullVersionState,
    undoPlan, redoPlan, canUndoPlan: planHistory.past.length > 0, canRedoPlan: planHistory.future.length > 0,
    addTable, updateTable, deleteTable,
    undoTable, redoTable, canUndoTable: tableHistory.past.length > 0, canRedoTable: tableHistory.future.length > 0,
    viewMode, setViewMode,
    isSaving: false,
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
    isUserLoading, campsData, rawPlansData, camps, activeCampId, allPlans, allTables,
    activePlanId, activePlanVersions, planHistory.past.length, planHistory.future.length,
    tableHistory.past.length, tableHistory.future.length, viewMode, settings,
    db, groups, addCamp, updateCamp, deleteCamp, updateCampItems, toggleCampLock, updatePlan, deletePlan,
    addPlan, reorderPlans, savePlanVersion, restorePlanVersion, updatePlanVersionName,
    deletePlanVersion, autoSaveCurrentState, getFullVersionState, undoPlan, redoPlan,
    addTable, updateTable, deleteTable, undoTable, redoTable, defaultCampId, setDefaultCampId
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
