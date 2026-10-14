import { defineConfig } from 'cypress';
import * as fs from 'fs';
import * as path from 'path';
import {
  cleanupCampScenario,
  countAll,
  countByScenario,
  disposeFirestore,
  getDocs,
  patchDoc,
  resetFirestore,
  setupCampScenario,
  type CampScenarioOptions,
  type CollectionName,
  type FirestoreEnv,
} from './cypress/plugins/firestore';

// ── port / host 一律可用環境變數覆寫 ─────────────────────────────────────
// 同一份 repo 可能被 checkout 成多個工作區，路徑長得一模一樣卻得跑在不同 port。
// 下面全是**預設值**：
//   CYPRESS_BASE_URL                 受測畫面（Cypress 原生支援）
//   CYPRESS_firestoreEmulatorHost    Firestore emulator
//   CYPRESS_firebaseProjectId        emulator 的 project id
// 🔒 不要改成靠「資料夾叫什麼名字」判斷 —— 那種寫法只在寫的人自己電腦上成立。
const BASE_URL = process.env.CYPRESS_BASE_URL || 'http://localhost:3100';
const FIRESTORE_EMULATOR_HOST = process.env.CYPRESS_firestoreEmulatorHost || '127.0.0.1:8080';
const FIREBASE_PROJECT_ID = process.env.CYPRESS_firebaseProjectId || 'camp-plan-studio-test';

const firestoreEnv: FirestoreEnv = {
  projectId: FIREBASE_PROJECT_ID,
  emulatorHost: FIRESTORE_EMULATOR_HOST,
};

export default defineConfig({
  e2e: {
    baseUrl: BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    viewportWidth: 1440,
    viewportHeight: 900,

    // Firestore 的即時監聽（onSnapshot）第一次連線要跟 emulator 握手，
    // 本機冷啟動偶爾超過 4 秒的預設值。拉長只影響等待上限，不會讓測試變鬆。
    defaultCommandTimeout: 12000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 60000,

    retries: { runMode: 0, openMode: 0 },

    env: {
      firestoreEmulatorHost: FIRESTORE_EMULATOR_HOST,
      firebaseProjectId: FIREBASE_PROJECT_ID,
      // 登入帳密：對應 src/app/api/auth/login/route.ts 的 STUDIO_* 環境變數。
      // ⚠️ 這裡放的是**本機測試用**的值；scripts/e2e.sh 會用同一組啟動 dev server，
      //    兩邊必須一致，否則 cy.loginAs 會拿到 401 而症狀看起來像「登入壞了」。
      adminUsername: process.env.CYPRESS_adminUsername || 'e2e-admin',
      adminPassword: process.env.CYPRESS_adminPassword || 'e2e-admin-pw',
      crewUsername: process.env.CYPRESS_crewUsername || 'e2e-crew',
      crewPassword: process.env.CYPRESS_crewPassword || 'e2e-crew-pw',
    },

    setupNodeEvents(on) {
      on('task', {
        /** 整個 emulator 清空。回傳各集合殘留筆數（支援呼叫端自證）。 */
        'db:reset': () => resetFirestore(firestoreEnv),

        /** 一次建齊這支 spec 需要的世界，回傳所有 id。 */
        'db:setupCampScenario': (options: CampScenarioOptions = {}) =>
          setupCampScenario(firestoreEnv, options),

        /** 依 scenarioId 反向刪整組 + 重查自證（{ deleted, remaining }）。 */
        'db:cleanupCampScenario': (scenarioId: string) =>
          cleanupCampScenario(firestoreEnv, scenarioId),

        'db:countAll': () => countAll(firestoreEnv),
        'db:countByScenario': (scenarioId: string) => countByScenario(firestoreEnv, scenarioId),

        /** 繞過 UI 直接讀 Firestore —— 只用於驗「畫面上的操作真的寫進資料庫」。 */
        'db:getDocs': (collection: CollectionName) => getDocs(firestoreEnv, collection),

        /** 繞過 UI 改一筆資料 —— 只用於造「UI 做不到的狀態」。 */
        'db:patchDoc': (args: { collection: CollectionName; id: string; data: Record<string, unknown> }) =>
          patchDoc(firestoreEnv, args),

        /**
         * src/data/version-history.ts 的第一筆 id。
         *
         * 為什麼測試需要它：WhatsNewDialog（最新更新通知）只在
         * localStorage.lastSeenReleaseId !== VERSION_HISTORY[0].id 時跳出來，
         * 而測試每支都從乾淨的 localStorage 開始 → 它每次都會跳，
         * 蓋住整個畫面，讓第一個 cy.type() 報「element is being covered by
         * another element」—— 看起來像被測的輸入框壞了。
         * 把真正的最新 id 預先寫進去才是乾淨的做法（寫假值會讓它走
         * 「找不到這個 id」分支、照樣跳出來）。
         */
        'app:latestReleaseId': () => {
          const file = path.join(__dirname, 'src', 'data', 'version-history.ts');
          const src = fs.readFileSync(file, 'utf8');
          const match = src.match(/id:\s*["'`]([^"'`]+)["'`]/);
          if (!match) {
            throw new Error(`在 ${file} 找不到任何 id —— WhatsNewDialog 的抑制會失效`);
          }
          return match[1];
        },

        log: (message: string) => {
          console.log(message);
          return null;
        },
      });

      on('after:run', async () => {
        await disposeFirestore();
      });
    },
  },
});
