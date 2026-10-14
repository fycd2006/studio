/**
 * Cypress node 端：Firestore emulator 的建資料 / 清資料 / 自證
 *
 * 為什麼在 node 端做：Cypress 的瀏覽器端只有專案自己的 client SDK（受
 * firestore.rules 限制、而且要先匿名登入）。測試的 fixture 不該跟被測功能
 * 共用同一條路徑 —— setup 壞掉時會長得像功能壞掉。node 端用 admin SDK
 * 直接寫 emulator，繞過規則，只負責「把世界擺成某個狀態」。
 *
 * ⚠️ 這支只對 emulator 說話：initializeApp 沒有任何憑證，
 *    FIRESTORE_EMULATOR_HOST 沒設就會在 ensureDb() 當場擋掉，
 *    不可能連到正式專案。
 */
import { initializeApp, getApps, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** 本專案實際使用的集合（src/lib/plans-context.tsx）。清空與自證都以這份為準。 */
export const COLLECTIONS = [
  'camps',
  'lessonPlans',
  'rotationTables',
  'planVersions',
  'planPresence',
  'userSettings',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export interface FirestoreEnv {
  projectId: string;
  emulatorHost: string;
}

let app: App | null = null;
let db: Firestore | null = null;

function ensureDb(env: FirestoreEnv): Firestore {
  if (!env.emulatorHost) {
    throw new Error(
      'Firestore emulator host 未設定。E2E 一律跑 emulator —— ' +
        '請用 scripts/e2e.sh（或先 npm run e2e:emu）啟動，不要把測試指向真實專案。',
    );
  }
  // admin SDK 認這個環境變數；設在這裡可確保 cypress.config.ts 不必先 export。
  process.env.FIRESTORE_EMULATOR_HOST = env.emulatorHost;

  if (!db) {
    app = getApps()[0] ?? initializeApp({ projectId: env.projectId });
    db = getFirestore(app);
  }
  return db;
}

export async function disposeFirestore(): Promise<void> {
  if (app) {
    await deleteApp(app);
    app = null;
    db = null;
  }
}

/** 整個 emulator 清空（每支 spec 的 beforeEach 都該呼叫）。回傳各集合的殘留筆數。 */
export async function resetFirestore(env: FirestoreEnv): Promise<Record<string, number>> {
  const database = ensureDb(env);
  for (const name of COLLECTIONS) {
    await database.recursiveDelete(database.collection(name));
  }
  return countAll(env);
}

export async function countAll(env: FirestoreEnv): Promise<Record<string, number>> {
  const database = ensureDb(env);
  const out: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const snap = await database.collection(name).get();
    out[name] = snap.size;
  }
  return out;
}

export async function countByScenario(
  env: FirestoreEnv,
  scenarioId: string,
): Promise<Record<string, number>> {
  const database = ensureDb(env);
  const out: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    if (name === 'userSettings') continue; // 單一 global 文件，不帶 scenarioId
    const snap = await database.collection(name).where('scenarioId', '==', scenarioId).get();
    out[name] = snap.size;
  }
  return out;
}

export async function getDocs(
  env: FirestoreEnv,
  collection: CollectionName,
): Promise<Array<Record<string, unknown>>> {
  const database = ensureDb(env);
  const snap = await database.collection(collection).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function patchDoc(
  env: FirestoreEnv,
  args: { collection: CollectionName; id: string; data: Record<string, unknown> },
): Promise<{ ok: true }> {
  const database = ensureDb(env);
  await database.collection(args.collection).doc(args.id).set(args.data, { merge: true });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// scenario：一次把這支 spec 需要的東西全部建齊
//
// 刻意**不提供**「只建一個 camp」「只補一筆 plan」這種單點工具 ——
// 那會讓 fixture 散成三四處拼湊、而且每一處都要自己記得清。
// 要什麼狀態就在這裡加參數，讓 scenario 永遠是一次成形的完整世界。
// ─────────────────────────────────────────────────────────────

export interface PlanSeed {
  /** 不給就自動編號 */
  id?: string;
  scheduledName?: string;
  activityName?: string;
  category?: 'activity' | 'teaching';
  groupId?: string;
  members?: string;
  leadMember?: string;
  assistantMember?: string;
  time?: string;
  location?: string;
  order?: number;
  props?: Array<{ id: string; name: string; quantity: string; unit: string; remarks?: string }>;
  isPropsPacked?: boolean;
}

export interface CampScenarioOptions {
  scenarioId?: string;
  campName?: string;
  isLocked?: boolean;
  activeDay?: string;
  broadcastText?: string;
  /** 要建幾筆教案（給 plans 省略時用）。 */
  planCount?: number;
  /** 精確指定每一筆教案的內容；給了就不看 planCount。 */
  plans?: PlanSeed[];
  /** userSettings/global 的覆寫（計時器狀態、分組、活動類別）。 */
  settings?: Record<string, unknown>;
}

export interface CampScenario {
  scenarioId: string;
  campId: string;
  campName: string;
  planIds: string[];
  plans: Array<{ id: string; scheduledName: string; activityName: string; groupId: string }>;
}

// 只有這兩個 —— 對應 src/lib/plans-context.tsx 的 DEFAULT_GROUPS。
// 寫一個不存在的 slug（例如 logistics）進 seed，畫面會把它歸成「未分類」，
// 於是「切到該組分頁應看得到」永遠不會成立，而紅的訊息只會說「找不到元素」。
const DEFAULT_GROUP_IDS = ['activity', 'teaching'];

export async function setupCampScenario(
  env: FirestoreEnv,
  options: CampScenarioOptions = {},
): Promise<CampScenario> {
  const database = ensureDb(env);
  const scenarioId = options.scenarioId || `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const campId = `camp-${scenarioId}`;
  const campName = options.campName ?? `E2E 營隊 [${scenarioId}]`;
  const ownerId = `seed-${scenarioId}`;

  const planSeeds: PlanSeed[] =
    options.plans ??
    Array.from({ length: options.planCount ?? 0 }, (_, i) => ({
      scheduledName: `E2E 行程 ${i + 1}`,
      activityName: `E2E 活動 ${i + 1}`,
      order: i,
    }));

  const batch = database.batch();

  batch.set(database.collection('camps').doc(campId), {
    scenarioId,
    name: campName,
    ownerId,
    createdAt: Date.now(),
    isLocked: options.isLocked ?? false,
    ...(options.activeDay ? { activeDay: options.activeDay } : {}),
    ...(options.broadcastText
      ? { broadcastText: options.broadcastText, broadcastTime: Date.now() }
      : {}),
    campItems: [],
  });

  const plans: CampScenario['plans'] = [];
  planSeeds.forEach((seed, i) => {
    const id = seed.id ?? `plan-${scenarioId}-${i + 1}`;
    const groupId = seed.groupId ?? DEFAULT_GROUP_IDS[i % DEFAULT_GROUP_IDS.length];
    const doc = {
      scenarioId,
      campId,
      ownerId,
      category: seed.category ?? 'activity',
      groupId,
      scheduledName: seed.scheduledName ?? `E2E 行程 ${i + 1}`,
      activityName: seed.activityName ?? `E2E 活動 ${i + 1}`,
      members: seed.members ?? '',
      leadMember: seed.leadMember ?? '',
      assistantMember: seed.assistantMember ?? '',
      time: seed.time ?? '09:00-10:00',
      location: seed.location ?? 'E2E 教室',
      purpose: '',
      process: '',
      content: '',
      divisionOfLabor: '',
      props: seed.props ?? [],
      remarks: '',
      openingClosingRemarks: '',
      googleDocUrl: '',
      order: seed.order ?? i,
      updatedAt: Date.now(),
      isPropsPacked: seed.isPropsPacked ?? false,
    };
    batch.set(database.collection('lessonPlans').doc(id), doc);
    plans.push({ id, scheduledName: doc.scheduledName, activityName: doc.activityName, groupId });
  });

  batch.set(
    database.collection('userSettings').doc('global'),
    {
      duration: 300,
      timeLeft: 300,
      isRunning: false,
      isReminderSet: false,
      isAlarmSet: false,
      updatedAt: Date.now(),
      ...(options.settings ?? {}),
    },
    { merge: true },
  );

  await batch.commit();

  return {
    scenarioId,
    campId,
    campName,
    planIds: plans.map((p) => p.id),
    plans,
  };
}

/**
 * 依 scenarioId 反向刪整組，並**用同一組條件重查一次**當自證。
 *
 * 為什麼要自證：「有寫 cleanup」跟「cleanup 真的清到」是兩件事。
 * 比對鍵一漂移（例如測試改掉了名稱）就清不到，而清不到跟清乾淨
 * 從回傳值上看起來一模一樣 —— 除非把重查結果一起回傳。
 */
export async function cleanupCampScenario(
  env: FirestoreEnv,
  scenarioId: string,
): Promise<{ deleted: Record<string, number>; remaining: Record<string, number> }> {
  const database = ensureDb(env);
  if (!scenarioId) throw new Error('cleanupCampScenario 需要 scenarioId');

  // ⚠️ 不能只用 scenarioId 當鑰匙。
  // scenarioId 只存在於**這支工具自己建的**文件上；測試透過 UI 建出來的教案
  // （plans-context 的 addPlan）沒有這個欄位，只有 campId。
  // 只比對 scenarioId 的話，cleanup 會回報「清乾淨了」，而 UI 建的那幾筆
  // 一筆都沒刪到 —— 清不到跟清乾淨看起來一模一樣。
  // 這裡改成「先撈出這個 scenario 的 camp id，再用 campId 串刪子表」，
  // campId 是測試改不動的東西，這是它比其他欄位可靠的根本原因。
  const campSnap = await database
    .collection('camps')
    .where('scenarioId', '==', scenarioId)
    .get();
  const campIds = campSnap.docs.map((d) => d.id);

  const deleted: Record<string, number> = {};
  const planIds: string[] = [];

  const deleteDocs = async (docs: Array<{ ref: FirebaseFirestore.DocumentReference }>) => {
    // Firestore 一個 batch 上限 500 筆
    for (let i = 0; i < docs.length; i += 400) {
      const batch = database.batch();
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  // lessonPlans / rotationTables：用 campId 串刪（含 UI 建的），再補 scenarioId 以防漏
  for (const name of ['lessonPlans', 'rotationTables'] as const) {
    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const campId of campIds) {
      const snap = await database.collection(name).where('campId', '==', campId).get();
      snap.docs.forEach((d) => seen.set(d.id, d));
    }
    const tagged = await database.collection(name).where('scenarioId', '==', scenarioId).get();
    tagged.docs.forEach((d) => seen.set(d.id, d));

    if (name === 'lessonPlans') planIds.push(...Array.from(seen.keys()));
    deleted[name] = seen.size;
    await deleteDocs(Array.from(seen.values()));
  }

  // planVersions / planPresence：掛在 planId 上
  for (const name of ['planVersions', 'planPresence'] as const) {
    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (let i = 0; i < planIds.length; i += 10) {
      const chunk = planIds.slice(i, i + 10);
      if (chunk.length === 0) continue;
      const snap = await database.collection(name).where('planId', 'in', chunk).get();
      snap.docs.forEach((d) => seen.set(d.id, d));
    }
    const tagged = await database.collection(name).where('scenarioId', '==', scenarioId).get();
    tagged.docs.forEach((d) => seen.set(d.id, d));
    deleted[name] = seen.size;
    await deleteDocs(Array.from(seen.values()));
  }

  deleted.camps = campSnap.size;
  await deleteDocs(campSnap.docs);

  // 自證：用**同一組條件**重查一次，各項都該是 0。
  // 清不到就在第一次跑當場紅，而不是累積到咬死別支 spec 才被發現。
  const remaining: Record<string, number> = {
    camps: (await database.collection('camps').where('scenarioId', '==', scenarioId).get()).size,
  };
  for (const name of ['lessonPlans', 'rotationTables'] as const) {
    let n = (await database.collection(name).where('scenarioId', '==', scenarioId).get()).size;
    for (const campId of campIds) {
      n += (await database.collection(name).where('campId', '==', campId).get()).size;
    }
    remaining[name] = n;
  }
  for (const name of ['planVersions', 'planPresence'] as const) {
    let n = (await database.collection(name).where('scenarioId', '==', scenarioId).get()).size;
    for (let i = 0; i < planIds.length; i += 10) {
      const chunk = planIds.slice(i, i + 10);
      if (chunk.length === 0) continue;
      n += (await database.collection(name).where('planId', 'in', chunk).get()).size;
    }
    remaining[name] = n;
  }

  return { deleted, remaining };
}
