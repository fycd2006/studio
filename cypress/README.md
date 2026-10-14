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

## 測試紅了怎麼查

1. `cypress/screenshots/` 截圖、`cypress/videos/` 錄影
2. `cypress/logs/dev-server.log` —— Next.js 的編譯錯誤都在這
3. `cypress/logs/emulator.log` —— emulator 沒起來、port 被占用
4. **API input/output**（截圖與錄影都答不出「送了什麼、回了什麼」）：

```bash
CYPRESS_ENABLE_API_LOG=true npm run e2e -- --spec cypress/e2e/feature_test/plans/create-delete.cy.ts
# 然後讀 cypress/reports/<spec>-<測試名>-api-log.json
```

預設關閉（全站 intercept 有成本）。報告裡的 Authorization / Cookie 會被遮成 `[REDACTED]`。

## 寫測試前

先看 `support/commands.ts`。重複寫登入 / 清資料 / 等寫入落地的邏輯會造成行為不一致，
而且會錯過命令裡內建的防護（例如 cleanup 的「清乾淨自證」斷言）。
