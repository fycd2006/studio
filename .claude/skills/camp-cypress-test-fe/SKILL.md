---
name: camp-cypress-test-fe
description: Use when planning, writing, reviewing, or debugging Cypress E2E tests for 北科崇德營隊教案平台 (camp-plan-studio, Next.js 15 + Firebase Firestore). Triggered by requests like "寫 cypress test"、"加 E2E"、"測試規劃"、"修測試"、"cypress 紅了"、"補 data-testid"、"測權限"、"驗持久化", or any task touching `cypress/` 底下的檔案、`cypress.config.ts`、`scripts/e2e.sh`、`src/firebase/emulator.ts`。此 skill 記錄本專案 12 個實測踩過的反模式與 emulator fixture 契約，寫測試前必須逐條比對。NOT for 比對線上站與設計稿的人眼驗證（那用 camp-live-mcp-verify）。
---

# Camp Cypress Test FE — 測試規範（12 個反模式 + emulator fixture 契約）

本專案 E2E 的規範手冊。**任何時候規劃、撰寫、修改、debug cypress test，都必須先讀完這一份**。

下面每一條都是在這個 repo 上**實際跑出來**的，不是從別的專案抄的通則。附的檔案與行號可以直接去查。

---

## 核心原則（三句話）

1. **E2E 一律跑在 Firebase emulator 上，資料自己建自己清** — 絕不指向真實 Firebase 專案。
2. **測試紅了先假設抓到 bug，不是測試寫錯** — 已經這樣抓到一個真的（反模式 3）。
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
| `firebase.json` / `.firebaserc` | emulator port（firestore 8080 / auth 9099）與 project id `camp-plan-studio-test` |
| `src/firebase/emulator.ts` | 判斷要不要接 emulator（`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`）。`NODE_ENV === 'production'` 時**永遠不接** |
| `src/firebase/index.ts` `getSdks()` | 接 emulator 時改用 `getFirestore`（**不開** persistentLocalCache，原因見反模式 6） |
| `cypress/plugins/firestore.ts` | node 端 admin SDK：清空 / 建 scenario / 清 scenario / 讀文件 |
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

需要新的共用邏輯 → **擴充這份 commands，不要在 spec 裡複製第二份**。同一段 setup 出現第 3 次就該收斂成 command。

---

## 反模式（12 條，逐條比對）

### 比對順序：先原則，後條目

Bad Example 是按「情境」寫的，情境對不上就會被打勾放行。**先對每支測試問這 5 題**：

| # | 問題 | 大致對應 |
|---|---|---|
| 1 | 測試結束時，**有沒有斷言真的跑過**？ | 反模式 8 |
| 2 | 有沒有**任一斷言站在使用者視角**（畫面上看得到／看不到什麼）？ | 反模式 9 |
| 3 | 使用者真正要完成的動作，**走完了嗎**？ | 反模式 9 |
| 4 | 測試建的資料**清掉了嗎**？清不掉會不會被發現？ | 反模式 11 |
| 5 | 這支測試**在守什麼業務行為**？講得出來嗎？ | 反模式 12 |

任一題答不出來 → 即使 12 條全對不上，也要上報，標「原則層命中、無對應條目」。

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
│   │   │   ├── field-persistence.cy.ts  ⬜ P0
│   │   │   ├── rich-text.cy.ts          ⬜ P0
│   │   │   ├── props-table.cy.ts        ⬜ P1
│   │   │   ├── undo-redo.cy.ts          ⬜ P1
│   │   │   ├── export-single.cy.ts      ⬜ P1
│   │   │   ├── blueprint.cy.ts          ⬜ P2
│   │   │   └── topbar.cy.ts             ⬜ P2
│   │   ├── versions/
│   │   │   ├── save-restore.cy.ts       ⬜ P0
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
│       ├── xss.cy.ts                    ⬜ P0
│       ├── role-escalation.cy.ts        ⬜ P0
│       ├── firestore-rules.cy.ts        ⬜ P1
│       └── breakpoints.cy.ts            ⬜ P2
│
└── e2e_fixture/                         唯一允許 mock 的地方
    ├── firestore-offline.cy.ts          ⬜ P1   後端掛掉時畫面不該白屏
    └── api-error-states.cy.ts           ⬜ P2   /api/* 回 500 時的錯誤呈現
```

目前 **27 個測試全綠**（route-guard 9、login 3、role-permission 5、create-delete 4、overview 6）。

### 新增 spec 前必做：先查既有的該不該擴充

反射性「新 feature → 新檔」會造成兩個問題：重複的 scenario setup/cleanup boilerplate，
以及功能明明相關卻散在兩支、各自跑一輪 emulator 清空（2x 時間）。

| 寫新 spec 前 | 怎麼檢查 |
|---|---|
| 同功能資料夾裡有沒有已經在測相近流程的 spec？ | `ls cypress/e2e/feature_test/<功能>/` 並讀它的檔頭 docstring |
| 既有 spec 的 scenario 是不是已經建好我要的資料？ | 看它的 `beforeEach`。是 → 加一條 `it` 進去，不要新開檔 |
| 這是「同一條使用者旅程的下一段」嗎？ | 是 → 擴充既有 spec（例如建立→編輯→存版本→還原屬於同一條） |
| 這是「同一個畫面的另一個獨立功能」嗎？ | 是 → 開新檔 |

### P0 —— 先補這六支（風險最高 / 完全沒覆蓋）

| spec | 守什麼 | 為什麼是 P0 |
|---|---|---|
| `edge_cases/xss.cy.ts` | 教案欄位塞 `<script>` / `<img onerror>` / `javascript:` → 存檔重載後**不該執行**，也不該出現在 DOM 裡 | `O2RichEditor.tsx:205` 與 `MarkdownArea.tsx:51` 把資料庫內容寫進 `innerHTML`，而 `sanitizeHtml` 只在貼上時跑、而且是黑名單式。這是已知的 stored XSS 風險，沒有回歸測試就不會知道修好了沒 |
| `edge_cases/role-escalation.cy.ts` | 手改 `localStorage.studio_role = 'admin'` 之後，crew 身分**實際上**還能不能寫入 | 權限目前只做在前端（`auth-context`），沒有 middleware、Firestore 規則只檢查 `request.auth != null`。這支會把「目前擋不住」這件事**寫成會紅的斷言**，而不是停留在報告裡。⚠️ `access_page/route-guard.cy.ts` 只驗前端導向，證明不了後端擋得住 |
| `api/export.cy.ts` | `/api/export` 的 docx / pdf / zip 輸出、空 body、超大輸入；以及**不帶任何身分就能呼叫** | 這支 API 沒有驗證也沒有輸入大小限制。先用測試把現況釘住，修的時候才知道有沒有改壞輸出 |
| `feature_test/editor/field-persistence.cy.ts` | 每個欄位打字 → Firestore 真的存 → 重載還在；`updatedAt` 有更新 | 編輯器是這個產品的核心，目前**一行測試都沒有**。而且寫入是 fire-and-forget（反模式 5），正是最容易無聲失敗的地方 |
| `feature_test/editor/rich-text.cy.ts` | 粗體 / 斜體 / 清單 / 連結 / 貼上外部 HTML → 存回去的內容正確 | `O2RichEditor` 1528 行、`MarkdownToolbar` 672 行，全靠手測 |
| `feature_test/versions/save-restore.cy.ts` | 存版本 → 改內容 → 還原 → 欄位回到舊值、Firestore 同步、`planVersions` 筆數對 | `restorePlanVersion` 牽涉 snapshot / patch 兩種型別與 jsondiffpatch 還原鏈，壞掉等於使用者的歷史版本救不回來 |

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
