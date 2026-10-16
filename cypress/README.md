# Cypress E2E — 北科崇德營隊教案平台

完整規範見 `.claude/skills/camp-cypress-test-fe/SKILL.md`（寫測試前必讀）。
這裡只放「怎麼跑」與「踩到就會卡住」的事。

## 怎麼跑

```bash
npm run e2e                                                  # 全部
npm run e2e -- --spec cypress/e2e/feature_test/auth/login.cy.ts   # 單一支
npm run e2e:open                                             # GUI
```

**不要直接 `npx cypress run`。** `scripts/e2e.sh` 做的三件事缺一不可：

1. 起 Firebase emulator（firestore 8080 / auth 9099）
2. 起**專用** dev server（port 3100），帶「指向 emulator」+「測試專用帳密」的環境變數
3. 跑 cypress，結束收掉自己起的 server

一般的 `npm run dev` 讀 `.env.local` → 會連到**真的** Firebase 專案，
而每支測試的 `beforeEach` 都會 `cy.resetDb()` 清空整個資料庫。

`support/e2e.ts` 的 `before()` 有三道擋板（受測網址必須是本機、
emulator 位址必須有、前端必須真的接上 emulator），不符就當場停並告訴你改哪裡。

### 為什麼 repo 裡沒有 `.firebaserc`

因為那會讓 `camp-plan-studio-test` 變成整個 repo 的**預設 Firebase 專案**，
之後有人在根目錄下 `firebase deploy --only firestore:rules` 就會打到測試專案。
project id 一律由 `scripts/e2e.sh` 和 `npm run e2e:emu` 用 `--project` 明確帶。

手動起 emulator 時也要自己帶：

```bash
npx firebase emulators:start --only auth,firestore --project camp-plan-studio-test
```

## 測試帳號

只存在於本機 dev server，**不是正式環境那組**。
定義在 `cypress.config.ts` 的 `env` 與 `scripts/e2e.sh` 的 `STUDIO_*`，
**兩邊必須一致** —— 不一致時 `cy.loginAs` 會拿到 401，而症狀看起來像「登入功能壞了」。

| 身分 | 帳號 | 密碼 | 可改 |
| :--- | :--- | :--- | :--- |
| admin | `e2e-admin` | `e2e-admin-pw` | `CYPRESS_adminUsername` / `CYPRESS_adminPassword` |
| crew | `e2e-crew` | `e2e-crew-pw` | `CYPRESS_crewUsername` / `CYPRESS_crewPassword` |

手動打一下看 API 活著：

```bash
curl -X POST http://localhost:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"e2e-admin","password":"e2e-admin-pw"}'
```

## 資料夾怎麼分（型別在前，功能在後）

| 資料夾 | 用途 | 規則 |
| :--- | :--- | :--- |
| `e2e/feature_test/<功能>/` | UI 整合測試 | **必須**透過畫面操作（click / type）驗證；**禁止** mock API 回應；**禁止**只有 `cy.request` |
| `e2e/api/` | 純 API 測試 | 用 `cy.request()` 直接打，不碰 UI |
| `e2e/access_page/` | 頁面可及性 / 權限閘門 | 「這個身分進不進得去這一頁」的掃描式測試 |
| `e2e/edge_cases/` | 邊界與錯誤處理 | 壞輸入、極端值、離線 |
| `e2e_fixture/` | 允許 mock 的測試 | 只有這裡可以 `cy.intercept(..., { body })` |

判斷依據：
- 有 `cy.visit()` + UI 操作 → `feature_test/<功能>/`
- 只有 `cy.request()` → `api/`
- 需要假資料隔離（例如驗後端壞掉時的 UI）→ `e2e_fixture/`

⚠️ `e2e_fixture/` 刻意放在 `e2e/` **外面**，讓「可以 mock」與「不可以 mock」在檔案系統上就分開。
`cypress.config.ts` 的 `specPattern` 因此是 `cypress/{e2e,e2e_fixture}/**/*.cy.ts` ——
寫成 `cypress/e2e/**` 會讓整個 `e2e_fixture/` 被靜默略過。

## 跑測試時的兩個地雷（都會產生看起來很像產品壞掉的失敗）

| 做了什麼 | 會看到什麼 |
|---|---|
| **同時跑兩個 `npm run e2e`** | 第二個的 dev server 起不來（`EADDRINUSE :::3100`），於是它接到**另一個 run 的** server，兩個 Next dev 共用同一份 `.next` → 畫面報 `SyntaxError: Invalid or unexpected token`，看起來像 app 壞了 |
| **測試跑到一半改 `src/` 底下的檔案** | Next 會即時重編譯，那段時間 server 沒有回應 → `cy.request()` 對 `/api/auth/login` 逾時 15 秒、或某頁載入逾時。失敗會落在跟你的改動完全無關的測試上 |

兩個都實測過（2026-10-15）。要改程式碼就先等這一輪跑完。

## 測試紅了怎麼查

1. `cypress/screenshots/` 截圖、`cypress/videos/` 錄影
2. `cypress/logs/dev-server.log` —— Next.js 的編譯錯誤都在這
3. `cypress/logs/emulator.log` —— emulator 沒起來、port 被占用
4. ⚠️ **間歇失敗先問「卡住的時候使用者看到什麼」**，不要直接當成測試不穩。
   本專案就是這樣抓到 `/lesson-plans/<組別>` 的白屏 bug（12 次有 6 次整頁空白）。
   `support/e2e.ts` 會把 app 丟出的 uncaught exception **記錄下來但不吞掉**，
   紅的時候 log 裡會有「⚠️ app 丟出 uncaught exception｜測試=…｜pathname=…」。
   目前還有兩個症狀沒定案，見 skill 反模式 13 —— 動手前先讀，別重走已排除的路。
5. ⚠️ **「做完就立刻離開」是獨立的一題**。打字 → 馬上按返回 / 關分頁，資料還在嗎？
   編輯器就是這樣抓到資料遺失的（打的字永遠不會進資料庫，但畫面寫著「已儲存至雲端」）。
   見 skill 反模式 14。
6. **想知道元件內部的執行順序**（哪個清理函式先跑、ref 還在不在）時，
   在元件裡臨時 `console.log('[PROBE] …')`，並在 spec 的 `cy.visitApp` 用
   `onBeforeLoad` 攔 `win.console.log` 收進 `win.__probeLogs`，測完再 `cy.task('log')` 印出來。
   前端換頁（router.push / back）不會換掉 window，所以換頁後還讀得到。查完記得把 log 拿掉。
7. **API input/output**（截圖與錄影都答不出「送了什麼、回了什麼」）：

```bash
CYPRESS_ENABLE_API_LOG=true npm run e2e -- --spec cypress/e2e/feature_test/plans/create-delete.cy.ts
# 然後讀 cypress/reports/<spec>-<測試名>-api-log.json
```

預設關閉（全站 intercept 有成本）。報告裡的 Authorization / Cookie 會被遮成 `[REDACTED]`。

## 編輯器類的 spec 要注意五件事

1. **`afterEach` 先離開編輯器頁，再 `cleanupCampScenario`。**
   人還留在 `/plans/<id>` 上時刪掉教案 → 頁面切到「找不到教案」→ `PlanEditor` 卸載
   → 卸載處理器補寫一筆 `planVersions` → 那筆在 cleanup 第一輪刪完之後才長出來，
   報成「cleanup 沒清乾淨」。離開時只要 `cy.location('pathname').should('eq', '/plans')`，
   **不要**等 `/plans` 上的元素（那會把 cleanup 綁上「app 載入成功」這個條件）。
2. **打字用 `cy.typeInEditorField(欄位, 文字)`**，不要自己串
   `.click().type('{selectall}{del}').type(text)` —— 清空會讓富文字編輯器重新渲染，
   串起來的第二個 `type` 會拿到已經從 DOM 卸下的元素。
   而且**打字前要先等欄位把舊內容顯示出來**：富文字編輯器會在 `value` 變動時把
   `innerHTML` 整個覆寫回去，內容還沒到就先清空的話，清完之後舊值又被塞回來，
   結果是「舊值＋新值」黏在一起。
3. **要觸發「離開編輯器時的自動存檔」，一定要走應用內的換頁**（按 `editor-back`，
   走 `router.back()`）。用 `cy.visit()` 做整頁導航的話**一筆自動存檔都不會產生** ——
   `saveNewVersion` 要先 `await` 一次 Firestore 讀取才寫得出版本，而整頁導航會在那個
   await 回來之前就把 JS context 拆掉。實測：返回鈕 → +1 筆；`cy.visit` → 0 筆。
   （順帶一提，這代表**使用者直接關分頁或重新整理時，離開前的自動存檔是無效的**。）
4. **剛載入的前幾秒，頂欄按鈕的第一次點擊會被整個吞掉。** 按鈕看得到、點得下去、
   Cypress 沒有任何錯誤，但什麼都不會發生；過幾秒再點就正常。
   連「Firestore 的內容已經長出來了」都不是足夠的就緒訊號（實測過）。
   `versions/save-restore.cy.ts` 的 `openSidebar` 用的是「點了沒開就再點一次」的
   有上限重試，不是 `cy.wait` 猜秒數 —— 要在別的頁面做同樣的事就照抄那個寫法。
5. **dev 模式下，光是進編輯器就會多一筆版本紀錄。** React Strict Mode 在 dev 會把
   effect 跑成 mount → cleanup → mount，而「卸載時自動存檔」就掛在那個 cleanup 上。
   正式環境沒有這一筆。所以**版本相關的斷言不要寫死總筆數**，改用 type／name 去找。

## 寫測試前

先看 `support/commands.ts`。重複寫登入 / 清資料 / 等寫入落地的邏輯會造成行為不一致，
而且會錯過命令裡內建的防護（例如 cleanup 的「清乾淨自證」斷言）。
