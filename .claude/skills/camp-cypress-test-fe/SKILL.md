---
name: camp-cypress-test-fe
description: Use when planning, writing, reviewing, or debugging Cypress E2E tests for 北科崇德營隊教案平台 (camp-plan-studio, Next.js 15 + Firebase Firestore). Triggered by requests like "寫 cypress test"、"加 E2E"、"測試規劃"、"修測試"、"cypress 紅了"、"補 data-testid"、"測權限"、"驗持久化", or any task touching `cypress/` 底下的檔案、`cypress.config.ts`、`scripts/e2e.sh`、`src/firebase/emulator.ts`。此 skill 記錄本專案 17 個實測踩過的反模式與 emulator fixture 契約，寫測試前必須逐條比對。NOT for 比對線上站與設計稿的人眼驗證（那用 camp-live-mcp-verify）。
---

# Camp Cypress Test FE — 測試規範（17 個反模式 + emulator fixture 契約）

本專案 E2E 的規範手冊。**任何時候規劃、撰寫、修改、debug cypress test，都必須先讀完這一份**。

下面每一條都是在這個 repo 上**實際跑出來**的，不是從別的專案抄的通則。附的檔案與行號可以直接去查。

---

## 核心原則（三句話）

1. **E2E 一律跑在 Firebase emulator 上，資料自己建自己清** — 絕不指向真實 Firebase 專案。
2. **測試紅了先假設抓到 bug，不是測試寫錯** — 已經這樣抓到六個真的（反模式 3、13、14、15、16、17）。
3. **寫新測試前先看 `cypress/support/commands.ts`** — 不要自己重寫登入 / 清資料 / 等寫入落地的邏輯。

---

## 怎麼跑

```bash
npm run e2e                                        # 全部
npm run e2e -- --spec cypress/e2e/feature_test/auth/login.cy.ts   # 單一支
npm run e2e:open                                   # 開 GUI
npm run typecheck                                  # app + cypress 兩份 tsconfig 都檢
```

`scripts/e2e.sh` 會依序做三件事，缺一不可：

1. 起 Firebase emulator（auth + firestore；已經在跑就沿用，不重啟別人的）
2. 起**專用** dev server（port 3100），帶著「指向 emulator」+「測試專用帳密」的環境變數
3. 跑 cypress，結束時把自己起的 server 收掉

⚠️ **不要直接 `npx cypress run`**。一般的 `npm run dev` 讀 `.env.local` → 會連到**真的** Firebase 專案，測試會把垃圾寫進正式資料庫，而且 `cy.resetDb()` 會把那裡清空。

失敗時看這些：
- `cypress/screenshots/` 截圖、`cypress/videos/` 錄影
- `cypress/logs/dev-server.log`（Next.js 編譯錯誤都在這）
- `cypress/logs/emulator.log`（emulator 沒起來、port 被占用）

---

## 目錄分類原則（決定測試放哪個資料夾）

**型別在前，功能在後。** 先決定這支是什麼型別的測試，再放進該型別底下的功能資料夾。
型別層的意義是「規則掛得住」—— 例如「不准 mock」只對 `feature_test/` 成立，
把它跟允許 mock 的測試放在一起，規則就無處可掛。

| 資料夾 | 用途 | 規則 |
|---|---|---|
| `cypress/e2e/feature_test/<功能>/` | UI 整合測試 | **必須**透過畫面操作（click / type）驗證功能；**禁止** mock API 回應；**禁止**只有 `cy.request` |
| `cypress/e2e/api/` | 純 API 測試 | 用 `cy.request()` 直接打，不碰 UI |
| `cypress/e2e/access_page/` | 頁面可及性 / 權限閘門 | 「這個身分進不進得去這一頁」的掃描式測試，不操作功能 |
| `cypress/e2e/edge_cases/` | 邊界與錯誤處理 | 壞輸入、極端值、後端掛掉時的畫面 |
| `cypress/e2e_fixture/` | 允許 mock 的測試 | **只有這裡**可以 `cy.intercept(..., { body })` |

**判斷依據**
- 有 `cy.visit()` + UI 操作 → `feature_test/<功能>/`
- 只有 `cy.request()` → `api/`
- 只驗「進不進得去」、不操作功能 → `access_page/`
- 需要假資料隔離（例如驗後端壞掉時的 UI）→ `e2e_fixture/`

⚠️ `e2e_fixture/` 刻意放在 `e2e/` **外面**，讓「可以 mock」與「不可以 mock」在檔案系統上就分開。
`specPattern` 因此是 `cypress/{e2e,e2e_fixture}/**/*.cy.ts` —— 寫成 `cypress/e2e/**`
會讓整個 `e2e_fixture/` 被**靜默略過**（不會報錯，只是那些測試再也不跑）。

> 本專案沒有 `integration/`（跨應用 E2E）—— 只有一個前端，沒有第二個 app 可以跨。
> 真的要驗「設計稿原型 ↔ 線上站」那種跨來源的事，用 `camp-live-mcp-verify` 那份 skill。

---

## 環境 Fail Fast（跑任何測試之前的三道擋板）

`cypress/support/e2e.ts` 的 `before()` 會先確認三件事，不符就當場停並直接說要改哪裡：

1. **受測網址必須是本機**（`localhost` / `127.0.0.1` / `[::1]`）
2. **`CYPRESS_firestoreEmulatorHost` 必須有值**
3. **前端必須真的接在 emulator 上** —— 不是猜，是攔 `console.log` 看 app 自己有沒有印出
   `[Firebase Emulator] Firestore → host:port`（`src/firebase/index.ts` 的 `getSdks()` 印的）

為什麼這三道比一般專案重要：每支測試的 `beforeEach` 都會 `cy.resetDb()` **清空整個資料庫**。
BASE_URL 被指到線上站、或 dev server 沒帶 emulator 設定就起來了，測試會一邊清 emulator、
一邊對著**真的 Firebase 專案**操作 —— 而且不會有任何錯誤訊息。

兩道都實測過會擋下來（鑑別力驗證）：

```
# 可連得到但不是本機的 hostname
CYPRESS_BASE_URL=http://0.0.0.0:3100 npx cypress run ...
  → ❌ 受測網址不是本機，E2E 拒絕執行！  0 passing

# 本機網址，但 dev server 沒帶 NEXT_PUBLIC_USE_FIREBASE_EMULATOR
CYPRESS_BASE_URL=http://localhost:3200 npx cypress run ...
  → ❌ 前端沒有接到 Firebase emulator！  0 passing
```

**新增擋板時要連鑑別力一起驗** —— 一道永遠不會紅的擋板等於沒有擋板。

---

## How to debug test

依序看這四個，第四個最常被忘記但最有用：

1. `cypress/screenshots/` 截圖、`cypress/videos/` 錄影
2. `cypress/logs/dev-server.log` —— Next.js 的編譯錯誤都在這
3. `cypress/logs/emulator.log` —— emulator 沒起來、port 被占用
4. **API input/output** —— 截圖和錄影都答不出「送了什麼、回了什麼」：

```bash
CYPRESS_ENABLE_API_LOG=true npm run e2e -- --spec cypress/e2e/feature_test/plans/create-delete.cy.ts
# 讀 cypress/reports/<spec>-<測試名>-api-log.json
```

本專案的寫入是 fire-and-forget（反模式 5），更需要這份紀錄：
「畫面沒變」到底是請求沒送出、送錯了、還是後端回了錯，**光看畫面分不出來**。

實作在 `cypress/support/api-log.ts`，預設關閉（全站 intercept 有成本）。
它踩過兩個坑，都寫在檔案註解裡，改它之前先讀：

| 坑 | 症狀 | 正解 |
|---|---|---|
| 用模組層旗標「只註冊一次」intercept | Cypress 每個測試前會清掉所有路由 → 只有該 spec 的**第一個測試**收得到紀錄，其餘默默是空的（實測 3 個測試只產出 1 份 json） | 每個測試都重新註冊，不要加旗標 |
| middleware 處理器裡呼叫 `req.continue()` | 等於結束整個路由鏈 → spec 自己設的 `.as('xxx')` 再也對不到，報「`cy.wait('@xxx')` ... No request ever occurred」，看起來像請求根本沒送出 | 處理器直接 `return`，讓請求繼續往下一個相符的路由走 |

另外它只記 API 類流量並對 response body 設上限 —— 不過濾的話 Next.js dev server 的
JS chunk / HMR / 字型 / 圖片會連完整 body 一起吞進去，**一個測試吐 22MB 的 json**。
報告裡的 `Authorization` / `Cookie` 會被遮成 `[REDACTED]`。

---

## 架構：為什麼是 emulator

| | 做法 | 後果 |
|---|---|---|
| ❌ | cypress 直接打正式 / 共用的 Firebase 專案 | 開發與測試共用同一個 Firestore → 測試殘留累積 → 列表撈到別人的殘留 → **隨環境隨機紅，而錯誤訊息指向完全無關的地方** |
| ✅ | 每支 spec 開始前把整個 emulator 清空，資料自己建 | 世界完全可控、可平行、清不乾淨當場紅 |

相關檔案：

| 檔案 | 作用 |
|---|---|
| `firebase.json` | emulator port（firestore 8080 / auth 9099）。**刻意沒有 `.firebaserc`** —— project id 由 `scripts/e2e.sh` 與 `npm run e2e:emu` 用 `--project` 明確帶，repo 不留「預設 Firebase 專案」，免得有人在根目錄下 `firebase deploy` 時打到測試專案 |
| `src/firebase/emulator.ts` | 判斷要不要接 emulator（`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`）。`NODE_ENV === 'production'` 時**永遠不接** |
| `src/firebase/index.ts` `getSdks()` | 接 emulator 時改用 `getFirestore`（**不開** persistentLocalCache，原因見反模式 6） |
| `cypress/plugins/firestore.ts` | node 端 admin SDK：清空 / 建 scenario / 清 scenario / 讀文件 / 改一筆 / 刪一筆 |
| `cypress.config.ts` | 把上面那些包成 `db:*` task |
| `cypress/support/commands.ts` | 瀏覽器端的 custom commands |

---

## fixture 契約（setup / cleanup）

```ts
beforeEach(() => {
  cy.resetDb();          // 整個 emulator 清空 + 斷言真的清乾淨
  cy.clearCookies();     // 身分同時存在 cookie 與 localStorage，兩邊都要清
  cy.setupCampScenario({ campName: '...', plans: [...] }).then((s) => { scenario = s; });
  cy.loginAs('admin');
});

afterEach(() => {
  cy.cleanupCampScenario(scenario.scenarioId);   // 反向刪整組 + 斷言 remaining 全為 0
});
```

**編輯器類的 spec 多一條規則：`afterEach` 要先離開編輯器頁，再清資料。**

```ts
afterEach(() => {
  cy.visit('/plans');
  cy.location('pathname').should('eq', '/plans');   // 只確認換頁，不等頁面上的元素
  cy.cleanupCampScenario(scenario.scenarioId);
});
```

人還留在 `/plans/<id>` 上時刪掉 `lessonPlans` → 頁面切到「找不到教案」分支 →
`PlanEditor` 卸載 → 它的卸載處理器用**卸載前的閉包狀態**補寫一筆 `planVersions`。
那筆是在 cleanup 第一輪刪完**之後**才長出來的，於是「cleanup 前一刻量到 0 筆、
cleanup 自己報 remaining 1 筆」，看起來像比對鍵寫錯（反模式 11），其實完全無關。

`cleanupCampScenario` 現在會**最多刪三輪**並回傳 `passes`；跑超過一輪時
`cy.cleanupCampScenario` 會印一行警告。⚠️ 重試不會弱化自證：比對鍵真的錯的話，
三輪都撈不到，`remaining` 照樣不是 0。

⚠️ 那一行 `cy.location` 刻意**不等 `/plans` 上的元素**。等元素會把 cleanup 綁上
「app 要載入成功」這個條件 —— 實測遇過 `/plans` 停在載入轉圈超過 20 秒（見下方
「還有兩個症狀沒定案」），結果 `afterEach` 紅掉、同一支 spec 後面的測試全被跳過，
而訊息只說「找不到 plans-search-input」。

**規則**

- 要「某一筆有特定狀態的資料」→ 一律 `setupCampScenario` 自己建。**禁止**撈既有資料的第 0 筆來操作。
- 這支 spec 的所有 case 一共需要什麼，**一次想清楚、一次建齊**。缺一塊就補一個單點工具 → fixture 會散成三四處、每一處都要自己記得清，然後一定漏。
- `setupCampScenario` 的回傳值是 fixture 的 Fail Fast：它會斷言 `campId` 存在、教案筆數等於你要的數量。數量對不上就當場停，不要讓它在下游偽裝成功能壞掉。
- cleanup **一定要自證**。`cy.cleanupCampScenario` 會斷言 `remaining` 每一項都是 0 —— 「有寫 cleanup」跟「cleanup 真的清到」是兩件事，清不到跟清乾淨從回傳值上看起來一模一樣，除非把重查結果一起回傳。

### 可用的 Custom Commands（寫測試前先看這張表）

| Command | 用途 |
|---|---|
| `cy.resetDb()` | 清空 emulator + 自證 |
| `cy.setupCampScenario(options)` | 一次建齊 camp + 教案 + userSettings，回傳所有 id |
| `cy.cleanupCampScenario(scenarioId)` | 反向刪整組 + 斷言 remaining 全 0 |
| `cy.loginAs('admin' \| 'crew')` | 走**真的** `/api/auth/login`（帳密驗證壞掉要讓測試紅），並記下身分 |
| `cy.visitApp(path, { campId })` | 以「已登入 + 已選定營隊」開頁（在 `onBeforeLoad` 寫 localStorage，見反模式 7） |
| `cy.getByTestId(id)` / `.findByTestId(id)` | 後者只找目前元素的後代（見反模式 2） |
| `cy.dbDocs(collection)` | 直接讀 Firestore，驗「畫面操作真的寫進資料庫」 |
| `cy.dbDocsUntil(collection, predicate, opts)` | 同上但會重試，給非同步寫入用（見反模式 5） |
| `cy.toastText()` | 抓 toast **外層容器**的文字（見反模式 10） |
| `cy.selectCamp(campId)` | 已載入的頁面上換營隊 |
| `cy.editorField(field)` | 編輯器某個欄位**可輸入**的那個元素（富文字是 contenteditable、人員是 input） |
| `cy.typeInEditorField(field, text)` | 清空該欄位再輸入，並當場驗字真的進去了 |

需要新的共用邏輯 → **擴充這份 commands，不要在 spec 裡複製第二份**。同一段 setup 出現第 3 次就該收斂成 command。

---

## 反模式（17 條，逐條比對）

### 比對順序：先原則，後條目

Bad Example 是按「情境」寫的，情境對不上就會被打勾放行。**先對每支測試問這 10 題**：

| # | 問題 | 大致對應 |
|---|---|---|
| 1 | 測試結束時，**有沒有斷言真的跑過**？ | 反模式 8 |
| 2 | 有沒有**任一斷言站在使用者視角**（畫面上看得到／看不到什麼）？ | 反模式 9 |
| 3 | 使用者真正要完成的動作，**走完了嗎**？ | 反模式 9 |
| 4 | 測試建的資料**清掉了嗎**？清不掉會不會被發現？ | 反模式 11 |
| 5 | 這支測試**在守什麼業務行為**？講得出來嗎？ | 反模式 12 |
| 6 | 間歇失敗的那一刻，**使用者看到什麼**？（白屏算 bug，不算測試不穩） | 反模式 13 |
| 7 | 使用者**做完就立刻離開**（按返回 / 關分頁）時，這個功能還成立嗎？ | 反模式 14 |
| 8 | 這個 Firestore 訂閱**等匿名登入完成了嗎**？（`useMemoFirebase` 的依賴有沒有 `user`） | 反模式 15 |
| 9 | 成功提示是**等動作真的完成**才跳的嗎？還是按下去就跳？ | 反模式 16 |
| 10 | 這個動作改了資料之後，畫面的本地草稿**也跟著換掉了嗎**？（不然它會寫回來） | 反模式 17 |

任一題答不出來 → 即使 17 條全對不上，也要上報，標「原則層命中、無對應條目」。

---

### 反模式 1：忘了全站的「最新更新通知」會蓋住整個畫面

🔒 實測 2026-10-15，第一次跑 `login.cy.ts` 就踩到。

`WhatsNewDialog`（`src/components/WhatsNewDialog.tsx:15`）在
`localStorage.lastSeenReleaseId !== VERSION_HISTORY[0].id` 時自己跳出來。
而每支測試都從乾淨的 localStorage 開始 → **它每次都跳**。

症狀長這樣，而且完全誤導：

```
cy.type() failed because this element is being covered by another element:
  <div class="py-2 pb-8 space-y-8">...</div>
```

讀起來像「被測的那個輸入框壞了」，實際上跟它一點關係都沒有。

```ts
// ❌ 用 force 繞過
cy.getByTestId('login-password-input').type('pw', { force: true });
//    → 連「真的被別的東西蓋住」（例如對話框該關卻沒關）也一起變綠

// ❌ 塞一個假的 id
win.localStorage.setItem('lastSeenReleaseId', 'whatever');
//    → 會走「找不到這個 id」分支（WhatsNewDialog.tsx:34），對話框照樣跳

// ✅ 已經在 cypress/support/e2e.ts 處理掉了：
//    task `app:latestReleaseId` 從 src/data/version-history.ts 讀出**真正**的
//    最新 id，在 window:before:load 預先寫進 localStorage。
//    一般的測試什麼都不用做。
```

要**故意**測這個對話框時，自己把 key 清掉：

```ts
cy.visit('/', { onBeforeLoad: (win) => win.localStorage.removeItem('lastSeenReleaseId') });
```

**同類風險**：任何「依 localStorage 決定要不要跳出來」的 UI 都有這個問題。本專案目前用到的 key：
`studio_role`、`activeCampId`、`lastSeenReleaseId`、`camp-audio-unlocked`、`camp-user-nickname`、
`app_lang`、`app_history_logs`、`plan-editor-topbar-collapsed`。新增這類 key 時要同步想「測試裡它該是什麼值」。

---

### 反模式 2：忘記 RWD 讓同一個元素在 DOM 裡有兩份

🔒 實測 2026-10-15，`plan-create-delete.cy.ts` 連踩三次。

本專案大量使用「桌機一份 + 手機一份」的寫法（`hidden md:block` / `flex md:hidden`），
**兩份都在 DOM 裡**，只是各自被斷點藏起來。於是：

```ts
// ❌ 1：撈到看不見的那一份
cy.getByTestId('plans-add-trigger').click();
//   → "This element is not visible because its parent has CSS property: display: none"
//     （我第一次把 testid 加在手機版那顆上，桌機跑就永遠點不到）

// ❌ 2：撈到兩個
cy.getByTestId(`plan-actions-${id}`).click();
//   → "cy.click() can only be called on a single element. Your subject contained 2 elements."
//     錯誤訊息講的是「不能對 2 個元素點擊」，完全看不出真正的問題是**找的範圍不對**

// ❌ 3：前綴選擇器把兩份都吃進來
cy.get('[data-testid^="plan-row-"]').should('have.length', 2);
//   → "Too many elements found. Found '4', expected '2'."
//     因為手機列當時叫 plan-row-mobile-${id}，前綴 plan-row- 兩邊都中
```

**規則**

- 桌機與手機的同一個東西要**不同的 testid 命名空間**，而且不能是彼此的前綴：
  `plan-row-${id}`（桌機列）/ `plan-card-mobile-${id}`（手機列）。
- 列內的按鈕 testid 可以同名，但**一定要先鎖定那一列**再往下找：
  ```ts
  cy.getByTestId(`plan-row-${id}`).findByTestId(`plan-actions-${id}`).click();
  ```
- 加新的 testid 之前先 `grep -n 'md:hidden\|hidden md:' <檔案>`，確認自己加在哪一份上。
- 用 `^=` 前綴選擇器之前，先數一下它會命中幾個：
  ```bash
  grep -o 'data-testid[^ ]*' src/app/plans/page.tsx | sort | uniq -c
  ```

---

### 反模式 3：Radix 的 `onSelect` + `preventDefault` 把對話框弄成死的（這條抓到真 bug）

🔒 實測 2026-10-15，**這是真的產品 bug，已修**（`src/app/plans/page.tsx` 刪除教案那一項）。

原本的寫法：

```tsx
// ❌ 原始碼（已修掉）
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();      // ← Radix 因此**不關閉選單**
    e.stopPropagation();
    handleDeletePlan(plan.id, getPlanDisplayName(plan));
  }}
>
```

Radix 的 `onSelect` 一旦 `preventDefault`，選單就不關。選單是 modal layer，
會在 `<body>` 留下 `pointer-events: none`（`data-scroll-locked="1"`），
而刪除確認對話框**不在那個 layer 裡** → 整張對話框吃不到指標事件。

實測證據（不依賴 cypress 的 actionability 判斷）：

```
選單開啟後 body style = pointer-events: none; | scroll-locked=1
[~0ms]    bodyPE=none inputPE=none
[~5000ms] bodyPE=none inputPE=none          ← 五秒後依然沒解除
menu content 數=1, role=menu 且 open=1       ← 選單真的還開著
hit-test 命中：<html>                        ← 點在輸入框正中央，打到的是 <html>
命中的是不是輸入框本人：false
點一下對話框之後：bodyPE=auto 選單還開著=0    ← 第一下點擊被拿去關選單了
點一下之後 hit-test 命中輸入框本人：true      ← 第二下才真的進得去
```

**使用者實際體感**：按「刪除教案」→ 對話框跳出來 → 點輸入框**沒反應** → 再點一次才能打字。

```tsx
// ✅ 修法：不要 preventDefault，讓選單正常關閉
onSelect={(e) => {
  e.stopPropagation();
  handleDeletePlan(plan.id, getPlanDisplayName(plan));
}}
```

**檢查清單**

| 情況 | 動作 |
|---|---|
| 寫任何 `DropdownMenuItem` / `MenubarItem` 的 `onSelect` | 問自己「這個動作會開對話框嗎」。會 → **不可** `preventDefault` |
| 既有的 `onSelect` 有 `preventDefault` | 看它之後做什麼。只是下載 / 改資料 → 選單不關只是體驗怪；會開需要輸入的對話框 → 這條 |
| 測試報 `pointer-events: none ... inherited from <body>` | **不要**加 `{ force: true }`。那是在幫一個壞掉的東西變綠 |
| 想確認是真 bug 還是測試太嚴格 | 用 `document.elementFromPoint(cx, cy)` 問瀏覽器自己的 hit-test，它不經過 cypress 的判斷 |

本專案目前仍帶 `preventDefault` 的選單項（**刻意保留**，它們不開對話框）：
下載 Word / 下載 PDF / 更換組別。改動它們要連同本條一起重新評估。

---

### 反模式 4：Radix 關閉選單時把焦點搶走，後面的按鍵全打到按鈕上

🔒 實測 2026-10-15，修完反模式 3 之後緊接著踩到。

Radix 關閉選單時會執行 `onCloseAutoFocus`，把焦點**還給觸發按鈕**，
而那發生在非同步的下一輪。對話框剛開的瞬間直接打字：

```ts
// ❌
cy.getByTestId('plan-delete-input').type('delet');
cy.getByTestId('plan-delete-confirm').should('not.be.disabled');
//   → AssertionError: expected '<button...>' not to be 'disabled'
```

實測輸入框裡只有 `"d"` —— 第一個字進去了，**後面的字被打到那顆按鈕上**。
而紅的訊息只說「按鈕應該不是 disabled」，完全看不出是焦點被搶走。

```
對話框剛開時焦點在：<DIV testid=plan-action-delete-...>   ← 正在卸載的選單項
選單消失後焦點在：<BUTTON testid=plan-actions-...>        ← Radix 還回去的觸發按鈕
```

```ts
// ✅ 等選單真的消失，再點一下輸入框把焦點拿回來，然後才打字
cy.get('[role="menu"]').should('not.exist');
cy.getByTestId('plan-delete-input').click().type('delet').should('have.value', 'delet');
cy.getByTestId('plan-delete-input').type('e').should('have.value', 'delete');
```

**規則**

- 從選單 / 下拉開出來的對話框，第一次打字前一律：等 `[role="menu"]` 消失 → `.click()` 輸入框 → 才 `.type()`。
- `.type()` 後面**接 `.should('have.value', ...)`**。這一句是這類 flake 唯一的防線：
  字被吃掉時它會直接紅在「值不對」，而不是紅在三行之後某個莫名其妙的按鈕狀態。
- **不要**改用 `cy.wait(500)` 等焦點塵埃落定 —— 它會在別人的機器上不夠久（見反模式 8）。

**附帶發現（未修，另記）**：對話框開啟後焦點停在對話框**後面**那顆 ⋯ 按鈕上，
不在對話框裡。鍵盤使用者要先 Tab 很多次才進得去。要修的話是給這個自製對話框補焦點管理
（它不是 Radix Dialog，所以沒有內建的 focus trap）。

---

### 反模式 5：Firestore 的寫入是 fire-and-forget，「畫面看到了」不等於「資料庫有了」

🔒 實測 2026-10-15，`plan-create-delete.cy.ts` 第二條踩到。

`src/lib/plans-context.tsx` 的寫入全部走 `setDocumentNonBlocking` / `updateDocumentNonBlocking` /
`deleteDocumentNonBlocking` —— 送出去就不等了。而 Firestore client SDK 有**延遲補償**：
本地寫入會立刻反映到 `onSnapshot`，所以**畫面先長出那一列**，伺服器端可能還沒收到。

```ts
// ❌ 按完馬上讀資料庫 → 間歇性撈到舊資料
cy.getByTestId('plans-add-group-activity').click();
cy.toastText().should('include', '已建立');
cy.dbDocs('lessonPlans').then((docs) => {
  const created = docs.find((d) => d.activityName === '新教案');
  expect(created, '應建出新教案').to.exist;     // → expected undefined to exist
});

// ✅ 用會重試的讀取
cy.dbDocsUntil<PlanDoc>(
  'lessonPlans',
  (docs) => docs.some((d) => d.activityName === '新教案'),
  { reason: '資料庫裡應找得到剛建立的「新教案」（寫入是 fire-and-forget，需等它真的落地）' },
).then((docs) => {
  const created = docs.find((d) => d.activityName === '新教案');
  expect(created!.campId, '新教案應掛在目前選定的營隊下').to.eq(scenario.campId);
});
```

`cy.dbDocsUntil` **不是放寬斷言**：條件在時限內沒成立，最後仍會拿不滿足條件的結果讓 expect 紅掉。
它裡面的固定等待是**輪詢間隔**，不是用等待取代斷言。

**不要因此只驗畫面就收工** —— 那會漏掉「畫面長出來了但寫入其實失敗」，而這正是
fire-and-forget + 樂觀更新的典型失敗樣貌（寫入失敗不會讓畫面退回去）。

---

### 反模式 6：在 emulator 模式下還開著離線持久化

`src/firebase/index.ts` 原本一律用
`initializeFirestore(app, { localCache: persistentLocalCache(...) })`。
那會把資料存進 IndexedDB，而 IndexedDB **跨 `cy.visit` 共用同一個瀏覽器 profile**
→ `cy.resetDb()` 清空 emulator 之後，畫面仍可能先畫出上一支測試的舊資料
→ 已經修好的東西看起來還是壞的。

```ts
// ✅ getSdks() 現在這樣分流（已實作）
const useEmulator = isEmulatorEnabled();
if (useEmulator) {
  firestore = getFirestore(firebaseApp);           // 不開 persistentLocalCache
  connectFirestoreToEmulator(firestore, connectFirestoreEmulator);
} else {
  firestore = initializeFirestore(firebaseApp, { localCache: persistentLocalCache(...) });
}
```

⚠️ `initializeFirebase()` 上面標著 **DO NOT MODIFY THIS FUNCTION**，所以 emulator 的接線
全部做在 `getSdks()` 裡。要動 Firebase 初始化時維持這個分界。

---

### 反模式 7：身分與營隊在 `cy.visit` 之後才寫 localStorage

本專案的身分（`studio_role`）與選定營隊（`activeCampId`）都存在 localStorage，
而 app 在**第一個 effect** 就讀它們：

- `src/lib/auth-context.tsx:24` 讀 `studio_role`，沒有就 `router.push('/login')`
- `src/lib/plans-context.tsx:175` 讀 `activeCampId`，Firestore 查詢就是用它建的

```ts
// ❌ 先 visit 再寫 → 已經被導去 /login，或查詢已經用 activeCampId=null 建好了
cy.visit('/plans');
cy.window().then((win) => win.localStorage.setItem('activeCampId', campId));

// ✅ 用 cy.visitApp，它在 onBeforeLoad 寫
cy.loginAs('admin');
cy.visitApp('/plans', { campId: scenario.campId });
```

`cy.loginAs` 會走**真的** `/api/auth/login`（帳密驗證壞掉要讓測試紅，不能被 fixture 繞過），
拿到 role 之後由 `cy.visitApp` 負責在載入前放進 localStorage。

**測試帳密**：`cypress.config.ts` 的 `env` 與 `scripts/e2e.sh` 的 `STUDIO_*` **必須是同一組**。
兩邊不一致時 `cy.loginAs` 會拿到 401，而症狀看起來像「登入功能壞了」。

---

### 反模式 8：用固定等待代替斷言

```ts
// ❌
cy.getByTestId('plans-add-group-activity').click();
cy.wait(1000);                                      // 沒驗 toast、沒驗列表、沒驗資料庫

// ✅ 三層都驗
cy.toastText().should('include', '已建立');                            // 使用者看得到的回饋
cy.contains('[data-testid^="plan-row-"]', '新教案').should('be.visible'); // 列表真的多一列
cy.dbDocsUntil('lessonPlans', (d) => d.some((x) => x.activityName === '新教案')); // 資料庫真的有
cy.reload();                                                           // 持久化：重載還在
cy.contains('[data-testid^="plan-row-"]', '新教案').should('be.visible');
```

**唯一允許的 `cy.wait(N)`**：
1. `cy.dbDocsUntil` 內部的輪詢間隔（已封裝，不要在 spec 裡自己寫一份）
2. 所有斷言都跑完之後、純粹為了錄影看得清楚的末尾停留 2–5 秒，且**必須寫註解說明用途**

---

### 反模式 9：驗到「看得見」就收工

```ts
// ❌ 只證明「畫面渲染到了」
it('刪除對話框應該打得開', () => {
  cy.getByTestId(`plan-row-${id}`).findByTestId(`plan-actions-${id}`).click();
  cy.getByTestId(`plan-action-delete-${id}`).click();
  cy.getByTestId('plan-delete-dialog').should('be.visible');
});
//   沒驗防呆（沒打字時按鈕該鎖著）、沒送出、沒驗列表少一列、沒驗資料庫

// ✅ 走完 動作 → 結果
cy.getByTestId('plan-delete-confirm').should('be.disabled');          // 防呆
cy.getByTestId('plan-delete-input').click().type('delete').should('have.value', 'delete');
cy.getByTestId('plan-delete-confirm').should('not.be.disabled').click();
cy.toastText().should('include', '已刪除');
cy.getByTestId(`plan-row-${id}`).should('not.exist');                  // 使用者視角
cy.dbDocsUntil('lessonPlans', (d) => !d.some((x) => x.id === id));     // 資料庫
cy.reload();
cy.getByTestId(`plan-row-${id}`).should('not.exist');                  // 持久化
```

**判定**：把這支測試的**最後一個斷言**單獨拿出來看 —— 它證明的是「畫面渲染到了」還是
「使用者完成了任務」？全部斷言都是 `should('be.visible')` / `should('have.length.gte', N)`、
全程沒有 click / type → 違反。

**篩選 / 查詢類的「使用者視角」長相不是持久化**，是「同一筆、兩種條件、相反結果」：

```ts
// ✅ 搜尋真的在做事
cy.getByTestId('plans-search-input').type(target.activityName);
cy.getByTestId(`plan-row-${target.id}`).should('be.visible');
cy.getByTestId(`plan-row-${other.id}`).should('not.exist');     // ← 這一句才是重點
```

---

### 反模式 10：toast 抓錯層級，把功能正常的東西誤報成「畫面什麼都沒說」

本專案的提示是 Radix toast（`src/components/ui/toaster.tsx`），**渲染在 portal、幾秒後自己消失**。

```ts
// ❌ 找某段文字 / 抓單一則 toast → 抓不到，或剛好在消失之後才跑
cy.contains('已建立').should('be.visible');

// ✅ 抓外層容器再看它的文字（cy.toastText 已封裝）
cy.toastText().should('include', '已建立');
```

兩條以上的斷言要放在**同一個 `should` 回呼**裡：提示會消失，拆成兩句的話第二句很可能在
容器已經空了之後才跑，`not.include` 一定會過 —— 那是一句永遠不會紅的填充物。

```ts
cy.toastText().should((text) => {
  expect(text).to.include('唯讀模式');
  expect(text).to.not.include('已建立');
});
```

---

### 反模式 11：cleanup 用「測試建的資料沒有的欄位」當比對鍵

🔒 實測 2026-10-15，寫 `plan-create-delete.cy.ts` 時發現。

`scenarioId` 只存在於**fixture 自己建的**文件上。測試透過 UI 建出來的教案
（`plans-context.tsx:449` 的 `addPlan`）**沒有這個欄位**，只有 `campId`。

只比對 `scenarioId` 的話，cleanup 會回報「清乾淨了」，而 UI 建的那幾筆一筆都沒刪到 ——
**清不到跟清乾淨看起來一模一樣**。

```ts
// ✅ cleanupCampScenario 現在這樣做（cypress/plugins/firestore.ts）
//    1. 先用 scenarioId 撈出這個 scenario 的 camp id
//    2. 再用 campId 串刪 lessonPlans / rotationTables（含 UI 建的）
//    3. planVersions / planPresence 掛在 planId 上 → 用剛刪的 planIds 串
//    4. 最後用**同一組條件**重查一次當 remaining 回傳
```

**規則**

- cleanup 的鑰匙要用「測試改不動的東西」：id、campId。**不要**用名稱 / email / 標題 ——
  測試很可能改掉它們，改掉就清不到。
- 禁止同一支 cleanup 對不同表用不同欄位比對（兩把鑰匙 → 刪掉一半、留下畸形資料）。
- cleanup 跑完要有斷言。`cy.cleanupCampScenario` 已內建 `remaining` 全 0 的斷言。
- ⚠️ **`remaining: 0` 的已知盲點**：它是用「刪除時的同一組條件」重查的 ——
  **刪不到的東西也不會被算進殘留**。所以每支 spec 的 `beforeEach` 仍然要 `cy.resetDb()`，
  那是最後一道保險。

---

### 反模式 12：測試紅了，在講得出「它要守什麼」之前就動手弄綠

一支測試紅了，**在還沒能一句白話講出「它要守的業務行為是什麼」之前就開始改它** = 違反。
即使你只改 setup / 換 selector / 補步驟、沒碰斷言，也可能修錯方向、或把該紅的弄成假綠。

**本次的正反兩例，差別就在這裡：**

| 紅掉的現象 | 錯的反應 | 實際根因 |
|---|---|---|
| `pointer-events: none ... from <body>` | 加 `{ force: true }` → 綠 | **真的產品 bug**（反模式 3）。force 會把它藏起來 |
| `expected button not to be 'disabled'` | 把斷言改成 `should('exist')` → 綠 | 焦點被 Radix 搶走（反模式 4），斷言本來是對的 |
| `expected undefined to exist`（讀資料庫） | 刪掉資料庫那層斷言 → 綠 | 寫入還沒落地（反模式 5），該補重試而不是砍斷言 |

**必做流程**

1. 先確立目的：從測試名 + 斷言在驗什麼 + `git log -p` 看它原本怎麼寫、被誰改過。
2. 分類：真壞（抓到 bug → 別動斷言、回報）／ setup 漂移（場景被改壞 → 修 setup 回原意）／
   測試過時（產品已移除該流程 → 重寫或刪，需使用者背書）。
3. 目的不確定 → 問使用者，而且要附上**檔案路徑**與**你認為的測試目的（白話）**。
4. **鑑別力驗證**：修綠之後，把「真正該讓它紅的實作」改壞 → 測試必須變紅。
   本次反模式 3 就是這樣驗的：把 `e.preventDefault()` 加回去，那條測試立刻紅回原來的訊息。

---

### 反模式 13：把間歇失敗當成「測試寫壞了」（這條抓到真 bug）

整套 27 支一開始在本機有 ~1/3 的間歇失敗率，而且**紅的位置會換**。很容易直接
當成測試不穩、然後用 `retries` 或調大 timeout 收尾 —— 那會把一個**使用者會遇到
的白屏 bug** 永久埋掉。

**實際結果：症狀 1 是產品 bug。**

| | |
| :--- | :--- |
| 症狀 | `route-guard` 的 `/lesson-plans/activity`：pathname 一直停在原地，沒走到 `/login` |
| 真因 | `src/app/lesson-plans/[slug]/page.tsx` 用 `next/navigation` 的 `redirect()`。那在**初次文件請求**回的是 **HTTP 200 + RSC payload**（夾一段 `NEXT_REDIRECT;replace;/plans?group=activity;307;`），**沒有 Location header** —— 跳轉是**客戶端 router** 做的 |
| 使用者看到什麼 | 連跑 12 次，**6 次**客戶端沒執行跳轉，使用者被留在 `/lesson-plans/<組別>` 看**完全空白**的頁面：`document.body.innerText` 長度 **0**、沒有錯誤、沒有 overlay。因為那個 page 只負責 redirect、不 render 任何東西，跳轉沒發生就是白屏 |
| 修法 | 改用 `next.config.ts` 的 `redirects()` —— 請求進到 React 之前就發真 307。`curl -D -` 實測有 `Location: /plans?group=activity` |

**這個查錯過程裡被推翻的三個假設**（別再走一遍）：

| 假設 | 怎麼排除的 |
| :--- | :--- |
| `next dev` 的逐路由編譯吃掉 timeout | 在 `scripts/e2e.sh` 加全路由預熱，實測三輪**每個路由都 <3s 已編譯完**，照樣 2/3 紅 |
| 冷快取（剛跑過 `npm run build`） | `rm -rf .next` 之後跑兩輪都全綠 |
| `FirebaseErrorListener` 把 client tree 炸掉 | 加了「記錄但不吞」的 uncaught exception 收集器，route-guard 單獨跑六輪（2 輪紅）**uncaught 全部是 0** |

**方法論**：間歇失敗要先回答「**卡住的時候使用者看到什麼**」。寫一支一次性
probe，重複同一個動作 10+ 次，**不斷言**、只記錄 pathname + `body.innerText`
長度 + title。這一步直接把「測試不穩」翻成「6/12 白屏」，後面才有東西可修。

### 反模式 14：只驗「停在頁面上會不會存」，沒驗「馬上離開會不會掉」（這條抓到真 bug）

🔒 實測 2026-10-15，寫 `editor/field-persistence.cy.ts` 時抓到，**已修**。

| | |
| :--- | :--- |
| 症狀 | 在教案編輯器的任何富文字欄位打字，**立刻**按「返回」離開 → 打的字永遠不會進資料庫。等 10 秒再讀也沒有 |
| 使用者看到什麼 | 字在畫面上好好的，右上角寫著「已儲存至雲端」。回到總覽再點進來，字不見了 |
| 為什麼測不到 | 一般的測試會打完字、斷言、再做下一件事 —— 那個「再做下一件事」的空檔就足夠讓 debounce 跑完。**只有在打完立刻離開時才會掉** |

根因是兩層 debounce 中間斷掉了：

```
打字 → O2RichEditor debounce 350ms → onChange
     → PlanEditor debounce 400ms → onUpdate → Firestore
```

`O2RichEditor` 的卸載清理函式原本只做 `clearTimeout` —— 等於把還沒送出的內容
**丟掉**，父層 `PlanEditor` 的卸載 flush 根本收不到（它的 pendingUpdates 是空的）。

修的時候踩到兩個 React 細節，都是實測量出來的（在元件裡印 log、從 spec 用
`onBeforeLoad` 攔 `console.log` 收集）：

| 量到的事實 | 後果 |
| :--- | :--- |
| 卸載時 React **先把 ref 設成 null**，才執行 effect 的清理函式（log：`timer=true el=false`） | 只靠 `editorRef.current?.innerHTML` 補送的話條件永遠不成立 —— 程式碼看起來有寫，一次都沒跑過。要另外用一個 `latestHtmlRef` 在每次 input 時同步記下內容 |
| **父層的清理函式先於子層執行**（log：`PlanEditor 卸載` 在 `O2 卸載` 之前） | 子層補送上來的更新，父層已經 flush 過了 → 再排一個 400ms debounce 等於交給沒人會結算的計時器。父層要在清理函式裡立旗標，`handlePlanUpdate` 看到旗標就直接寫出去 |

修完之後又踩到第三個（自己製造的）：

> `isUnmountingRef` 的旗標在**嚴格模式的 mount → 清理 → 再 mount** 時就被設成 true，
> 而沒有在 effect 重新掛上時重設 → 之後每一次打字都走「立即寫入」→ 父層每個字都
> 重新 render → 受控的 input 把後面的字吃掉。症狀：打「王小明」只存到「小明」。
> **凡是在清理函式裡設旗標，就要在 effect 本體把它重設回來。**

```ts
// ✅ 測試長這樣（不要在中間補等待，那會把這條要守的東西拿掉）
cy.typeInEditorField('purpose', text);
cy.getByTestId('editor-back').click();
cy.location('pathname').should('eq', '/plans');
cy.dbDocsUntil('lessonPlans', (docs) => (find(docs)?.purpose ?? '').includes(text));
```

**同類風險**：任何「打字 debounce → 寫後端」的欄位都要問這一題。
本專案其餘地方查過了，目前**沒有**第二處：
`MarkdownArea.tsx:55` 的 `handleInput` 沒有 debounce（直接 `onChange`），
而且全專案沒有任何檔案 import 它（死碼）；
`settings/page.tsx` 的營隊改名是按下確認才 `updateCamp`，不是邊打邊存。
**新增這類欄位時要自己回來補這一條。**

---

### 反模式 15：全站的訂閱沒等匿名登入就發出去（這條定案了一個間歇失敗）

🔒 實測 2026-10-16 定案，**已修**（`src/lib/timer-context.tsx`）。

這就是先前記在「沒定案」那一欄的 `Missing or insufficient permissions`。
當時記的是「dump 裡 `auth.uid` 有值」—— **那筆記錄是錯的**。
用 `support/e2e.ts` 的 uncaught exception 收集器再抓到一次，dump 其實是：

```
FirebaseError: Missing or insufficient permissions
{ "auth": null, "method": "get", "path": "/databases/(default)/documents/userSettings/global" }
```

`auth` 是 **null**，跟 `firestore.rules` 的 `request.auth != null` 完全一致，沒有矛盾。

| | |
| :--- | :--- |
| 根因 | `TimerProvider`（全站都掛著，連 `/login`）的 `settingsRef` 只看 `db` 就訂閱 `userSettings/global`，**不等 `user`**。匿名登入是非同步的 → 登入完成前那個讀取就發出去了 → 被規則拒絕 |
| 為什麼會炸整頁 | `use-doc.tsx` 收到錯誤 emit `permission-error` → `FirebaseErrorListener` 在 render 裡 `throw` → 整個 client tree 掛掉 |
| 使用者看到什麼 | 空白頁或停在載入中，而錯誤訊息指向「計時器的設定檔」，跟他正在做的事毫無關係 |
| 為什麼間歇 | 競態。本機約 1/10，網路越慢越容易中 |
| 修法 | `if (!db || !user) return null` + 依賴加 `user` —— 跟 `plans-context` 的每個查詢一樣。這是全專案**唯一**漏掉這道閘的地方（`grep "if (!db) return null"` 只剩它） |

**對應測試**：`cypress/e2e_fixture/auth-race.cy.ts`（延遲第一次匿名登入 4 秒）。
寫這支時踩到兩個坑，少一個它就會在 bug 還在的時候照樣綠：

| 坑 | 症狀 |
| :--- | :--- |
| 只攔 `accounts:signUp` | `cy.wait()` 報「No request ever occurred」。Firebase Auth 的身分存在 IndexedDB，Cypress 的 testIsolation **不清 IndexedDB** → 第二個測試起 SDK 走的是 `accounts:lookup`（還原既有 session） |
| 沒清掉 IndexedDB 裡的身分 | 兩條都綠 —— 身分已經在手上，`currentUser` 一開始就有值，競態根本不會發生。要在 `onBeforeLoad` 裡 `win.indexedDB.deleteDatabase('firebaseLocalStorageDb')` |

鑑別力驗證：把 `user` 那道閘拿掉 → 兩條都紅，訊息正是 `"auth": null` 的 permission denied。

**同類風險**：任何新的 `useMemoFirebase(() => ... , [db])`。寫的時候問一句
「登入還沒完成時這個訂閱會發出去嗎」。

---

### 反模式 16：非同步動作沒等它做完就跳成功提示（這條抓到真 bug）

🔒 實測 2026-10-16，寫 `versions/save-restore.cy.ts` 時抓到，**已修**。

```tsx
// ❌ 原始碼（已修掉）—— PlanEditor.tsx 的「還原版本」
const handleRestoreVersion = (versionId: string) => {
  onRestoreVersion?.(versionId);     // ← async，但沒有 await、也沒看回傳值
  setIsHistoryMode(false);
  setSelectedVersion(null);
  toast({ title: "已還原版本" });     // ← 無條件
};
```

而 `restorePlanVersion` 那端，重建不出舊版狀態時原本是**偷偷回傳目前這份教案**：

```ts
// plans-context.tsx:501（已修掉）
if (snapshotIdx === -1) return allPlans.find(p => p.id === activePlanId)!;
```

兩個加起來 = 「還原」把現況原封不動寫回去、畫面跳「已還原版本」、**資料一個字都沒變**。
使用者以為歷史救回來了，然後在舊內容上繼續編輯。

```ts
// ✅ 修法：讓那一端能回報成敗，呼叫端等它、分辨它
restorePlanVersion: (versionId) => Promise<LessonPlan | null>   // 失敗回 null / throw
// 呼叫端
const restored = await onRestoreVersion?.(versionId);
if (!restored) { toast({ title: "還原失敗", variant: "destructive" }); return; }  // 留在原畫面
```

**檢查清單**

| 情況 | 動作 |
|---|---|
| 任何 `onXxx?.(...)` 後面緊接著成功 toast | 問「這個函式是 async 嗎」。是 → 要 await 並依結果決定提示 |
| 某個函式在「做不到」的時候回傳一個看起來正常的值 | 那是在把失敗偽裝成成功。寧可 throw 或回 null |
| 失敗時要不要退出目前的模式 | **不要**。退出去會讓人以為動作生效了 |

⚠️ 改成 throw 之後要把**每一個呼叫點**都看過。本次就因此多修一個地方：
`saveNewVersion` 也會呼叫 `getFullVersionState`，鏈斷掉時那個 throw 變成
unhandled promise rejection → 整頁掛掉。那條路徑改成「重建不出前一版就存一份
完整快照」—— 既不會炸，又順手把鏈接回去。測試是 `edge_cases/version-chain-broken.cy.ts`
抓到的（它在修好之前報的是 uncaught exception，不是斷言失敗）。

---

### 反模式 17：卸載時的「補送」把舊草稿蓋回剛寫進去的新值（這條抓到真 bug）

🔒 實測 2026-10-16，**這是反模式 14 那個修法自己帶出來的後遺症**，已修。

反模式 14 把「卸載時丟掉還在 debounce 的內容」改成「補送出去」。但補送的判斷條件是

```ts
if (!debounceTimer.current) return;   // ← debounce 跑完之後，這個 ref 從來沒有被設回 null
```

而 `handleInput` 的 `setTimeout` 回呼裡**沒有把它清掉**，所以第一次打字之後它**永遠為真** ——
於是每一次卸載都會把 `latestHtmlRef` 再送一遍。寫回同樣的值時看不出來，但只要這期間
有別人寫過這個欄位，補送就會把舊草稿蓋回去。

實際撞到的樣子：按「還原版本」→ 進歷史模式會**卸載**富文字欄位的編輯器 → 補送舊草稿
→ 資料庫先被還原成舊版內容，350ms 後又被草稿改回去。探針紀錄長這樣：

```
[RESTORE] writing nKeys=22 purpose="目標一…"     ← 還原確實寫進去了
[UPDATEPLAN] nKeys=22 purpose="目標一…"
[RESTORE] done
[UPDATEPLAN] nKeys=1  purpose="目標二…"          ← 緊接著被補送蓋回去
```

```ts
// ✅ 修法：送出去了就不再算「還在等著送」
debounceTimer.current = setTimeout(() => {
  debounceTimer.current = null;
  ...
}, 350);
```

**怎麼測得到**：這類多餘寫入不會改變內容，只會改變 `updatedAt`。
對應測試是「**只預覽歷史版本、沒按還原 → `updatedAt` 不能動**」
（`versions/save-restore.cy.ts`）—— 用 `updatedAt` 當探針，是唯一能分辨
「沒寫入」與「寫了同樣的值」的辦法。

**同類風險**：任何「卸載時補做一件事」的邏輯。問兩句：
1. 這個「還沒做完」的旗標，做完之後有沒有被清掉？
2. 如果補送的時候資料已經被**別人**改過，補送會不會把它蓋掉？

---

### ⚠️ 還有一個症狀沒定案

| 紅在哪 | 訊息 |
| :--- | :--- |
| `role-permission` 第一條 | `Expected to find element: [data-testid="plan-row-…"], but never found it`（出現率約 1/10） |

它**很可能就是反模式 15 的另一個外觀**（tree 爆掉 → 列表不出現），但還沒抓到
同時有 uncaught exception 紀錄的那一次，所以不能算定案。下次再遇到，先看
log 裡有沒有「⚠️ app 丟出 uncaught exception」。

**2026-10-15 新增的一筆觀測**（跟上面第一個症狀很可能是同一件事）：
`editor/field-persistence.cy.ts` 的 `afterEach` 在 `/plans` 上等 `plans-search-input`
等了 20 秒沒等到。截圖顯示使用者看到的是**載入轉圈**（不是白屏），網路面板裡
Firestore 的 Listen channel 是開著的，而且**沒有任何 uncaught exception、沒有
permission error**。對應的判斷式是

```ts
// src/lib/plans-context.tsx:654
isLoading: isUserLoading || campsData === null || (!!activeCampId && rawPlansData === null)
```

也就是說 camps 的 snapshot 一直沒到。`useCollection` 的錯誤分支會 `setData(null)`
**並**發出 `permission-error`（`use-collection.tsx:87`）—— 這次沒有，所以不是被規則擋掉，
是訂閱上去了但第一份 snapshot 沒回來。下一步可以從這裡查。

而且要記得事實：`src/components/FirebaseErrorListener.tsx` 收到任何
`permission-error` 就 `throw` 在 render 裡 —— 所以一個短暫的 permission error
會讓整個 client tree 爆掉，外觀是「列表不出現」這種指不到原因的訊息。
`support/e2e.ts` 的 uncaught exception 收集器（記錄但不吞）就是為了把這兩件事對上。

**2026-10-16 新增的一筆觀測 —— 這次拿到了比較具體的方向。**
全套跑 42 條時 `plans/create-delete` 的「選教學組新增」紅了一次（單獨重跑兩次都綠）。
訊息是「資料庫應出現新教案：expected false to equal true」，而**截圖裡畫面上那一列
好好地在**（總覽顯示 2 筆、新教案掛在教學組）。也就是：

> 本地視圖有了、伺服器端沒有 —— 而 `dbDocsUntil` 輪詢 12 秒都還是沒有。

截圖的網路面板裡，Firestore 的 **Write channel**
（`/google.firestore.v1.Firestore/Write/channel`）是紅的；旁邊的 Listen channel 正常 200。
Firestore 的延遲補償會讓本地先畫出來，所以 Write channel 卡住的外觀就是
「畫面有、資料庫沒有」，而且**不會有任何錯誤提示**（寫入是 fire-and-forget，反模式 5）。

這跟上面兩個症狀可以串起來：都是某一條 Firestore channel 偶發沒通
（Listen 沒通 → 列表不出現／一直轉圈；Write 沒通 → 畫面有但資料庫沒有）。
下一步：下次再紅時，從 `cypress/logs/emulator.log` 對時間戳，確認是 emulator 端
把連線切掉還是 client 端重連失敗。**在定案之前，不要用 `retries` 把它蓋掉。**

---

## 瀏覽器副作用必驗清單

API 成功 ≠ 副作用執行。本專案觸發以下副作用的地方，測試必有對應的 stub + 斷言：

| 副作用 | 實作位置 | 驗法 |
|---|---|---|
| 檔案下載（Word / PDF / Excel） | `src/lib/export-utils.ts:115`、`src/lib/export-excel.ts:285`（`createElement('a')` + `a.click()`） | stub `win.HTMLAnchorElement.prototype.click`，斷言 `href` / `download` 檔名；或讓它真的下載到 `cypress/downloads/` 再驗檔案存在 |
| 檔案另存對話框 | `export-utils.ts` 的 `showSaveFilePicker`（支援時優先用） | 測試環境沒有這個 API 會自動走 anchor 分支；要測它就 stub `win.showSaveFilePicker` |
| 頁內跳轉 | `router.push`（`plans/page.tsx:289`、`auth-context.tsx:34`…） | `cy.location('pathname').should('eq', ...)` |
| 提示訊息 | Radix toast | `cy.toastText()`（反模式 10） |
| 整頁重載 | `settings/page.tsx` 換營隊後 `window.location.reload()` | 重載後重新斷言，不要假設狀態還在 |

寫測試時的自我檢查：使用者按下去之後，**眼睛會看到什麼變化**？那個變化是 browser 層還是
server 層？測試有沒有斷言**那個變化**真的發生，而不是只驗「函式被呼到」？

---

## 測試地圖（型別在前，功能在後）

✅ = 已有且綠　⬜ = 還沒寫　P0/P1/P2 = 建議優先序

```
cypress/
├── e2e/
│   ├── feature_test/                    UI 整合測試（禁 mock、禁純 cy.request）
│   │   ├── auth/
│   │   │   ├── login.cy.ts              ✅ 3   表單登入、帳密錯誤、身分持久化
│   │   │   ├── role-permission.cy.ts    ✅ 5   crew 唯讀黑名單 + admin 對照
│   │   │   └── logout.cy.ts             ⬜ P1
│   │   ├── plans/
│   │   │   ├── overview.cy.ts           ✅ 6   列表/搜尋/組別分頁/空狀態
│   │   │   ├── create-delete.cy.ts      ✅ 4   新增與刪除（四層驗證）
│   │   │   ├── group-change.cy.ts       ⬜ P1
│   │   │   ├── sort-and-view.cy.ts      ⬜ P1
│   │   │   ├── batch-export.cy.ts       ⬜ P1
│   │   │   └── reorder.cy.ts            ⬜ P2
│   │   ├── editor/
│   │   │   ├── field-persistence.cy.ts  ✅ 5   欄位落地 / 人員組合 / 劇本模式 / 離開不掉字 / 改名同步
│   │   │   ├── rich-text.cy.ts          ✅ 2   快捷鍵粗體、貼上外部 HTML 的消毒
│   │   │   ├── props-table.cy.ts        ⬜ P1
│   │   │   ├── undo-redo.cy.ts          ⬜ P1
│   │   │   ├── export-single.cy.ts      ⬜ P1
│   │   │   ├── blueprint.cy.ts          ⬜ P2
│   │   │   └── topbar.cy.ts             ⬜ P2
│   │   ├── versions/
│   │   │   ├── save-restore.cy.ts       ✅ 5   存檔/還原/還原鏈/刪基準後仍救得回/預覽不寫入
│   │   │   ├── naming.cy.ts             ⬜ P2
│   │   │   └── diff.cy.ts               ⬜ P2
│   │   ├── admin/
│   │   │   ├── timer.cy.ts              ⬜ P1（接近 P0，見下）
│   │   │   ├── rotation-table.cy.ts     ⬜ P1
│   │   │   ├── rotation-wizard.cy.ts    ⬜ P1
│   │   │   ├── props-inventory.cy.ts    ⬜ P1
│   │   │   └── tab-routing.cy.ts        ⬜ P2
│   │   ├── settings/
│   │   │   ├── camps.cy.ts              ⬜ P1
│   │   │   ├── groups.cy.ts             ⬜ P1
│   │   │   ├── activity-types.cy.ts     ⬜ P2
│   │   │   ├── preferences.cy.ts        ⬜ P2
│   │   │   ├── identity.cy.ts           ⬜ P2
│   │   │   └── danger-zone.cy.ts        ⬜ P2
│   │   ├── navbar/
│   │   │   ├── system-menu.cy.ts        ⬜ P2
│   │   │   ├── broadcast.cy.ts          ⬜ P2
│   │   │   └── mobile-tabbar.cy.ts      ⬜ P2
│   │   └── collaboration/
│   │       ├── presence.cy.ts           ⬜ P2
│   │       └── history-log.cy.ts        ⬜ P2
│   │
│   ├── access_page/                     頁面可及性 / 權限閘門（不操作功能）
│   │   └── route-guard.cy.ts            ✅ 9   每一頁未登入都被導走 + 登入後對照組
│   │
│   ├── api/                             純 API（cy.request，不碰 UI）
│   │   ├── export.cy.ts                 ⬜ P0
│   │   ├── auth.cy.ts                   ⬜ P1
│   │   ├── hero-images.cy.ts            ⬜ P2
│   │   └── version.cy.ts                ⬜ P2
│   │
│   └── edge_cases/                      邊界與錯誤處理
│       ├── version-chain-broken.cy.ts   ✅ 1   基準快照不在時，還原要說實話且不動到現況
│       ├── xss.cy.ts                    ⬜ P0
│       ├── role-escalation.cy.ts        ⬜ P0
│       ├── firestore-rules.cy.ts        ⬜ P1
│       └── breakpoints.cy.ts            ⬜ P2
│
└── e2e_fixture/                         唯一允許 mock 的地方
    ├── auth-race.cy.ts                  ✅ 2   匿名登入慢的時候全站不該炸（抓到反模式 15）
    ├── firestore-offline.cy.ts          ⬜ P1   後端掛掉時畫面不該白屏
    └── api-error-states.cy.ts           ⬜ P2   /api/* 回 500 時的錯誤呈現
```

目前 **42 個測試**（route-guard 9、login 3、role-permission 5、create-delete 4、overview 6、
field-persistence 5、rich-text 2、save-restore 5、version-chain-broken 1、auth-race 2）。

⚠️ 最後一次全套：41/42 —— 紅的那一條是上面那個還沒定案的 Firestore channel 症狀
（`create-delete`「選教學組新增」，單獨重跑兩次都綠）。**不要把它讀成「只是不穩」**。

### 新增 spec 前必做：先查既有的該不該擴充

反射性「新 feature → 新檔」會造成兩個問題：重複的 scenario setup/cleanup boilerplate，
以及功能明明相關卻散在兩支、各自跑一輪 emulator 清空（2x 時間）。

| 寫新 spec 前 | 怎麼檢查 |
|---|---|
| 同功能資料夾裡有沒有已經在測相近流程的 spec？ | `ls cypress/e2e/feature_test/<功能>/` 並讀它的檔頭 docstring |
| 既有 spec 的 scenario 是不是已經建好我要的資料？ | 看它的 `beforeEach`。是 → 加一條 `it` 進去，不要新開檔 |
| 這是「同一條使用者旅程的下一段」嗎？ | 是 → 擴充既有 spec（例如建立→編輯→存版本→還原屬於同一條） |
| 這是「同一個畫面的另一個獨立功能」嗎？ | 是 → 開新檔 |

### P0 —— 六支裡已完成三支（editor 兩支 + versions 一支，各自抓到真 bug）

| spec | 守什麼 | 為什麼是 P0 |
|---|---|---|
| `edge_cases/xss.cy.ts` | 教案欄位塞 `<script>` / `<img onerror>` / `javascript:` → 存檔重載後**不該執行**，也不該出現在 DOM 裡 | `O2RichEditor.tsx:205` 與 `MarkdownArea.tsx:51` 把資料庫內容寫進 `innerHTML`，而 `sanitizeHtml` 只在貼上時跑、而且是黑名單式。這是已知的 stored XSS 風險，沒有回歸測試就不會知道修好了沒 |
| `edge_cases/role-escalation.cy.ts` | 手改 `localStorage.studio_role = 'admin'` 之後，crew 身分**實際上**還能不能寫入 | 權限目前只做在前端（`auth-context`），沒有 middleware、Firestore 規則只檢查 `request.auth != null`。這支會把「目前擋不住」這件事**寫成會紅的斷言**，而不是停留在報告裡。⚠️ `access_page/route-guard.cy.ts` 只驗前端導向，證明不了後端擋得住 |
| `api/export.cy.ts` | `/api/export` 的 docx / pdf / zip 輸出、空 body、超大輸入；以及**不帶任何身分就能呼叫** | 這支 API 沒有驗證也沒有輸入大小限制。先用測試把現況釘住，修的時候才知道有沒有改壞輸出 |
| ~~`feature_test/editor/field-persistence.cy.ts`~~ ✅ | 六個富文字欄位 + 人員欄位落地、`updatedAt` 更新、劇本模式切換、**打完字立刻離開不掉字**、改名與總覽同步 | 已完成（5 條）。寫的過程抓到反模式 14 那個資料遺失的真 bug |
| ~~`feature_test/editor/rich-text.cy.ts`~~ ✅ | Cmd/Ctrl+B 的粗體存成 HTML 且重載還在；貼上外部 HTML 時 `<script>` / `on*` / `javascript:` 被 `sanitizeHtml` 清掉 | 已完成（2 條）。⚠️ 編輯器**沒有顯示工具列**（`hideToolbar` 預設 true），清單 / 連結 / 標題這些只能從工具列進去的功能目前在 UI 上碰不到，所以沒測 |
| ~~`feature_test/versions/save-restore.cy.ts`~~ ✅ | 存版本 → 改內容 → 還原（三層驗證）／還原 patch 型版本要走 jsondiffpatch 鏈／刪掉基準快照後仍救得回／只預覽不該寫入／沒打名稱不產生版本 | 已完成（5 條）＋`edge_cases/version-chain-broken.cy.ts`（1 條）。寫的過程抓到三個真 bug：還原被舊草稿蓋回去（反模式 17）、還原失敗卻報成功（反模式 16）、刪一筆 snapshot 會讓後面所有 patch 永遠還原不回來 |

### P1 —— 接著補

`feature_test/admin/timer.cy.ts` 雖然標 P1 但很接近 P0：它要驗的是 `targetEndTime` 的
**跨分頁同步**（A 分頁按開始，B 分頁要跟著動），那是「狀態存在 Firestore 的計時器」
最容易壞的地方；另含音效解鎖（`camp-audio-unlocked`）。

其餘：`admin/rotation-table`（建表 / 關卡 / 隊伍 / 日期切換 / undo-redo）、
`admin/rotation-wizard`（精靈走完 → 產出的表不衝突）、`admin/props-inventory`、
`settings/camps`（建 / 改名 / 刪 / 切換 / 鎖定，切換會 `window.location.reload()`）、
`settings/groups`（組別增刪改 → 教案分頁與下拉**同步變動**）、
`plans/group-change`、`plans/sort-and-view`、`plans/batch-export`、
`auth/logout`、`editor/props-table`、`editor/undo-redo`、`editor/export-single`、
`api/auth`、`edge_cases/firestore-rules`（直接對 emulator 驗規則，把現況釘住）、
`e2e_fixture/firestore-offline`。

### Bad Example 15：改了欄位必填性，`api/` 要同步改

`cypress/e2e/api/` 是 API 合約的最後防線。feature 新增必填欄位、改變必填條件、
或調整 POST/PATCH body 結構時，`feature_test/` 通常會跟著更新，但 `api/` 常常被遺漏 ——
導致 api test 已無法反映真實合約，甚至在 CI 靜默通過一個「用舊邏輯送出的請求」。

| 改動類型 | 必須同步更新的 `api/` 測試 |
|---|---|
| 新增必填欄位 | 相關 POST/PATCH test 要加入該欄位 + body 驗證 |
| 欄位從選填改必填 | api/ 的表單操作要補上填寫步驟，否則送出會被擋 |
| API 回應新增欄位 | 補 `expect(response.body).to.have.property(...)` |
| 移除欄位或選項 | 移除對應步驟，避免因選項消失而 fail |

**每次實作新功能或改動欄位必填性，都要打開 `cypress/e2e/api/` 對應檔案確認是否需要更新。**

### 不該用 Cypress 測的（要補的話是單元測試，不是 E2E）

| 模組 | 為什麼 |
|---|---|
| `src/lib/rotation-scheduler.ts`（15k） | 純演算法。邊界條件要幾十組輸入，用 E2E 跑等於拿瀏覽器當計算機。E2E 只需一條「精靈走完 → 產出的表不衝突」 |
| `src/lib/text-diff.ts` | 純函式 |
| `src/lib/export-utils.ts` / `export-excel.ts` 的格式化 | 純函式；E2E 只驗「下載真的被觸發 + 檔名對」 |

本專案目前**沒有單元測試環境**（沒有 vitest / jest）。要補上面這些就得先裝一套 ——
那是另一件事，不要混進 Cypress 裡。

---

## 加 `data-testid` 的規範

本專案**原本一個 testid 都沒有**，現有的都是為了測試新加的。加的時候：

- 命名：`<區塊>-<元素>-<用途>`，動態值放最後：`plan-row-${plan.id}`、`plans-group-tab-${group.slug}`。
- **不要用畫面文字當 selector**。`cy.contains('button', '新增檔案')` 在文案改動、i18n 切換
  （本專案有 `app_lang` 中英切換）、按鈕進 loading 換字時都會碎掉，而紅的訊息會說
  「找不到某段文字」，看起來像 UI bug。
- 動態 testid 不要硬編在 spec 裡，從 scenario 回傳的 id 組出來。
- 加完先數一次有沒有撞到（反模式 2）：
  ```bash
  grep -o 'data-testid[^ ]*' src/app/plans/page.tsx | sort | uniq -c
  ```
- 只有 `aria-label` 不夠：它也是文案，而且本專案有中英切換。

---

## Workflow（寫新測試必須依序做）

1. **講出這支要守什麼業務行為**（一句白話）。講不出來就先別寫。
2. 讀 `cypress/support/commands.ts`，確認沒有現成的 command 可用。
3. 設計 **一個** scenario 把這支的所有 case 需要的資料一次建齊；`beforeEach` 建、`afterEach` 清。
4. 需要的 testid 先加進 `src/`，加之前確認桌機／手機哪一份（反模式 2）。
5. 寫斷言：使用者視角 → 資料庫 → 重載（反模式 9）。權限類一定要黑名單 + 白名單成對。
6. `npm run e2e -- --spec <那一支>` 跑到綠。
7. **鑑別力驗證**：把實作改壞，確認它真的會紅。
8. `npm run typecheck`，然後跑一次 `npm run e2e` 全綠才算完成。

## 一律禁止

- ❌ 把測試指向真實 Firebase 專案（只能 emulator）
- ❌ `{ force: true }` 繞過「被蓋住 / pointer-events: none」（那常常是真 bug）
- ❌ `cy.wait(固定秒數)` 代替斷言
- ❌ 只驗畫面、不驗資料庫（寫入是 fire-and-forget）
- ❌ 只驗資料庫、不驗畫面（使用者看不到就等於沒做到）
- ❌ 權限測試只有白名單
- ❌ 為了讓測試通過改斷言
- ❌ 用畫面文字 / `aria-label` 當 selector
- ❌ 建了資料不清，或 cleanup 沒有自證
- ❌ 在 spec 裡複製第二份登入 / 清資料邏輯（擴充 commands）
