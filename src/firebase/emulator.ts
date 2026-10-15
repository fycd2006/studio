/**
 * Firebase Emulator 連線（僅供本機測試，正式環境永遠關閉）
 *
 * 為什麼存在：Cypress 若直接打正式 / 開發用的 Firebase 專案，所有測試資料
 * 都會堆在同一個 Firestore 裡。那條路已經被別的專案走過，代價是「測試殘留
 * 累積上千筆 → 列表撈到別人的殘留 → 測試隨環境隨機紅，而錯誤訊息指向完全
 * 無關的地方」。所以本專案的 E2E 一律跑在 emulator 上：每支 spec 開始前把
 * 整個 Firestore 清空，資料自己建、自己驗，不跟任何人共用。
 *
 * 開啟方式（三者任一即生效，缺一不可的只有 projectId）：
 *   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1
 *   NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
 *
 * ⚠️ 這支只在 `NODE_ENV !== 'production'` 時會接 —— 正式 build 即使誤帶了
 *    環境變數也不會連到 emulator（下面 isEmulatorEnabled 的第一道判斷）。
 */

const EMULATOR_HOST_DEFAULT = '127.0.0.1';
const FIRESTORE_PORT_DEFAULT = 8080;
const AUTH_PORT_DEFAULT = 9099;

const readPort = (raw: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || EMULATOR_HOST_DEFAULT;
export const emulatorFirestorePort = readPort(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT, FIRESTORE_PORT_DEFAULT);
export const emulatorAuthPort = readPort(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT, AUTH_PORT_DEFAULT);

export const isEmulatorEnabled = (): boolean => {
  if (process.env.NODE_ENV === 'production') return false;
  return (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1' ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST)
  );
};

/** 同一個 instance 重複 connect 會 throw，所以兩邊各記一次。 */
let firestoreConnected = false;
let authConnected = false;

export function connectFirestoreToEmulator(
  firestore: import('firebase/firestore').Firestore,
  connect: typeof import('firebase/firestore').connectFirestoreEmulator,
): void {
  if (firestoreConnected) return;
  connect(firestore, emulatorHost, emulatorFirestorePort);
  firestoreConnected = true;
  console.log(`[Firebase Emulator] Firestore → ${emulatorHost}:${emulatorFirestorePort}`);
}

export function connectAuthToEmulator(
  auth: import('firebase/auth').Auth,
  connect: typeof import('firebase/auth').connectAuthEmulator,
): void {
  if (authConnected) return;
  connect(auth, `http://${emulatorHost}:${emulatorAuthPort}`, { disableWarnings: true });
  authConnected = true;
  console.log(`[Firebase Emulator] Auth → ${emulatorHost}:${emulatorAuthPort}`);
}
