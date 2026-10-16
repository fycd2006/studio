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
): Promise<{ deleted: Record<string, number>; remaining: Record<string, number>; passes: number }> {
  const database = ensureDb(env);
  if (!scenarioId) throw new Error('cleanupCampScenario 需要 scenarioId');

  // ⚠️ 不能只用 scenarioId 當鑰匙。
  // scenarioId 只存在於**這支工具自己建的**文件上；測試透過 UI 建出來的教案
  // （plans-context 的 addPlan）沒有這個欄位，只有 campId。
  // 只比對 scenarioId 的話，cleanup 會回報「清乾淨了」，而 UI 建的那幾筆
  // 一筆都沒刪到 —— 清不到跟清乾淨看起來一模一樣。
  // 這裡改成「先撈出這個 scenario 的 camp id，再用 campId 串刪子表」，
  // campId 是測試改不動的東西，這是它比其他欄位可靠的根本原因。
  const campIds = new Set<string>();
  const planIds = new Set<string>();

  const deleteDocs = async (docs: Array<{ ref: FirebaseFirestore.DocumentReference }>) => {
    // Firestore 一個 batch 上限 500 筆
    for (let i = 0; i < docs.length; i += 400) {
      const batch = database.batch();
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  /** 撈出某個子表裡屬於這個 scenario 的文件（campId / planId / scenarioId 三路並集）。 */
  const collectChildren = async (
    name: string,
    keyField: 'campId' | 'planId',
    keyValues: Set<string>,
  ) => {
    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    const values = Array.from(keyValues);
    for (let i = 0; i < values.length; i += 10) {
      const chunk = values.slice(i, i + 10);
      if (chunk.length === 0) continue;
      const snap = await database.collection(name).where(keyField, 'in', chunk).get();
      snap.docs.forEach((d) => seen.set(d.id, d));
    }
    const tagged = await database.collection(name).where('scenarioId', '==', scenarioId).get();
    tagged.docs.forEach((d) => seen.set(d.id, d));
    return seen;
  };

  /** 刪一輪：camps → lessonPlans / rotationTables → planVersions / planPresence。回傳各表刪掉幾筆。 */
  const runDeletePass = async () => {
    const counts: Record<string, number> = {};

    const campSnap = await database
      .collection('camps')
      .where('scenarioId', '==', scenarioId)
      .get();
    campSnap.docs.forEach((d) => campIds.add(d.id));

    for (const name of ['lessonPlans', 'rotationTables'] as const) {
      const seen = await collectChildren(name, 'campId', campIds);
      if (name === 'lessonPlans') Array.from(seen.keys()).forEach((id) => planIds.add(id));
      counts[name] = seen.size;
      await deleteDocs(Array.from(seen.values()));
    }

    for (const name of ['planVersions', 'planPresence'] as const) {
      const seen = await collectChildren(name, 'planId', planIds);
      counts[name] = seen.size;
      await deleteDocs(Array.from(seen.values()));
    }

    counts.camps = campSnap.size;
    await deleteDocs(campSnap.docs);
    return counts;
  };

  /** 用**同一組條件**重查一次，這才是「真的清到了」的證據。 */
  const countRemaining = async () => {
    const out: Record<string, number> = {
      camps: (await database.collection('camps').where('scenarioId', '==', scenarioId).get()).size,
    };
    for (const name of ['lessonPlans', 'rotationTables'] as const) {
      out[name] = (await collectChildren(name, 'campId', campIds)).size;
    }
    for (const name of ['planVersions', 'planPresence'] as const) {
      out[name] = (await collectChildren(name, 'planId', planIds)).size;
    }
    return out;
  };

  // 刪 → 重查，不乾淨就再刪一輪，最多三輪。
  //
  // 為什麼需要重試（實測 2026-10-15，寫 editor 的 spec 時踩到）：
  // 刪掉 lessonPlans 的那一刻，**還開著的編輯器頁面**會發現教案不見了 →
  // /plans/[id] 切到「找不到教案」分支 → PlanEditor 卸載 → 它的卸載處理器
  // （PlanEditor.tsx:560 附近）呼叫 autoSaveCurrentState() → 用卸載前的閉包
  // 狀態寫出一筆 planVersions。於是「cleanup 前一刻量到 0 筆、cleanup 自己
  // 卻報 remaining 1 筆」，看起來像比對鍵寫錯，其實是 app 在我們刪完之後才寫進來。
  //
  // ⚠️ 重試**不會**弱化自證：比對鍵真的寫錯時，每一輪都撈不到那些文件，
  //    三輪跑完 remaining 照樣不是 0 → 照樣當場紅。它只吸收「一次性的
  //    fire-and-forget 遲到寫入」。
  // 💡 編輯器類的 spec 仍然該在 cleanup 前先離開編輯器頁（見 cypress/README.md），
  //    那是治本：人不在頁上，刪除就不會觸發那個卸載寫入。
  const deleted: Record<string, number> = {};
  let remaining: Record<string, number> = {};
  let passes = 0;

  for (let pass = 1; pass <= 3; pass++) {
    passes = pass;
    const counts = await runDeletePass();
    Object.entries(counts).forEach(([k, n]) => {
      deleted[k] = (deleted[k] ?? 0) + n;
    });
    remaining = await countRemaining();
    if (Object.values(remaining).every((n) => n === 0)) break;
  }

  return { deleted, remaining, passes };
}
