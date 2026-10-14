---
name: camp-live-mcp-verify
description: Use for browser-MCP (claude-in-chrome) 人眼可見驗證 of 北科崇德營隊教案平台 in two modes — (1) 設計稿 ↔ 線上站 逐畫面視覺比對（figma-design 原型 vs https://ntutcdcamp.vercel.app/），差異列表 → 使用者確認 → 改其中一邊; (2) 已部署線上站的功能走查（改動上線後人眼確認）。Triggered by "MCP 比對設計稿"、"比對線上站"、"設計稿哪邊不一致"、"改設計稿"、"MCP 擷取圖片"、"用瀏覽器看線上站"、"驗證部署"、"vercel 上對不對". NOT for local cypress 邏輯測試（那用 camp-cypress-test-fe）。
---

# Camp Live MCP Verify — 線上站與設計稿的人眼驗證

用 `claude-in-chrome` MCP 在**真的瀏覽器**裡看畫面，驗「使用者眼睛看到的最終結果」。
與 `camp-cypress-test-fe` 的分工：cypress 跑 local emulator、自動化、驗程式邏輯；
這一份跑**已部署的線上站**與**設計稿原型**、半手動、驗視覺與體感。

下面每一條都是在這個專案上實際做過三輪比對（2026-10-14 ~ 10-15）累積的，含踩過的坑。

---

## 這個專案的兩邊是什麼

| | 位址 | 怎麼起 |
|---|---|---|
| 線上站（正式） | https://ntutcdcamp.vercel.app/ | 已部署，直接開 |
| 設計稿原型 | http://localhost:5173 | `cd figma-design && npm run dev`（Vite） |
| 本機正式站 | http://localhost:3000 | `npm run dev`（**需要 `.env.local`**，否則 Firebase 初始化直接 throw） |

- 設計稿原型是**獨立的 Vite + React 18 專案**（`figma-design/`），不在主專案的 tsconfig 裡
  （根 `tsconfig.json` 的 `exclude` 有它），所以改它不會影響正式站的 build。
- 原型開場是**假登入**：畫面上寫著「設計稿示範：帳號輸入 admin 或 crew 即可進入」
  （`figma-design/src/app/components/LoginScreen.tsx:116`），密碼欄隨便填。
  這不是真帳號，**可以自己登入**，不違反「不可代打密碼」（見下方安全分工）。
- 原型已知的刻意簡化：編輯器的富文本用 `textarea` 代替、手繪藍圖是佔位、
  匯出／下載按鈕只跳 toast。這些**不是不一致**，不要列進差異表。

---

## Step 0：開頭先問要比哪些畫面

一進此 skill，**先用 `AskUserQuestion`（`multiSelect: true`）讓使用者勾選這次要比的畫面**，
靠系統自動附的 "Other" 讓他補自訂項。禁止自己假設要比全部、或只挑一個就開跑。

```
question: 這次要比對哪些畫面？（可複選）
header: 比哪些
multiSelect: true
options:
  - label: 首頁（Hero / 時間軸 / 組別）
    description: 標題級距、CTA 樣式、HUD 四欄、時間軸與組別清單
  - label: 教案總覽
    description: 標題區、HUD、分頁籤、搜尋框、列表列
  - label: 行政中心（總表 / 道具 / 計時）
    description: 操作列、道具表頭、計時欄寬與進度條
  - label: 系統設定 + 登入頁
    description: 分頁樣式、卡片結構、登入背景與表單
```

⚠️ 比對很耗時間，而且**差異只有使用者能決定要不要改**。沒問就開始改 = 擅自擴大範圍。

---

## 安全分工（硬規則）

| Claude 可做 | 必須使用者做 |
|---|---|
| 導航、截圖、觀察、讀頁面、跑 `getComputedStyle` | ❌ 在**線上站**輸入密碼登入 |
| 在**設計稿原型**用它自己的示範帳號進去（`admin`／`crew`，無真密碼） | ❌ 建立帳號 |
| 在**本機 dev server**（localhost）用專案自己的測試帳密 | ❌ 任何會寄出 / 發布 / 付款的動作 |
| 讀 localStorage、回報目前狀態 | ❌ 把使用者登出（見坑 4） |

---

## 不可以對線上站做的事

1. **不可以寫入正式資料庫。** 線上站的 Firestore 是真的。要造資料來比對畫面
   → 在 **local + emulator** 造（`npm run e2e:emu` + `npm run dev`），不要在線上站建教案。
2. **不可以把使用者登出。** 線上站是已登入狀態；登出之後要再登入就得請使用者打密碼。
   `/login` 在已登入時會被 `auth-context` 導走 → **這一頁沒辦法在線上站看**，
   改成對 `src/app/login/page.tsx` 原始碼逐條比（上一輪就是這樣做的）。
3. **動到的狀態要還原。** 見坑 4。

---

## 核心工作法

### A. 發現不同就停下來問，不要一次倒一堆然後自己決定要改什麼

- 兩個分頁各自導到**同一個畫面**才比（apples-to-apples）。
- 差異列**表格**（# / 項目 / 設計稿 / 線上站 / 判斷），並逐條分類：
  - 要對齊（結構 / 尺寸 / 字體 / 顏色對不上）
  - 純視覺微調（P2）
  - **資料差異，不是設計不一致**（見坑 1）
  - 刻意簡化（原型已知限制，不算缺陷）
  - 真 bug（線上站壞了 → 另記，不要混在設計差異裡）
- 使用者挑要對齊的 → 出**白話確認清單**（一條一行）→ 確認後才動手。

### B. 🔑 最重要的一條：不要用肉眼看截圖判斷數值，去讀原始碼 + 量 computed style

前兩輪靠「看截圖覺得哪裡怪」，第三輪改成「對每個元素把線上站的 `getComputedStyle` 撈出來、
再回去讀 `src/` 的實際數值」。**第三輪抓到的東西比前兩輪加起來還多，而且前兩輪有兩個誤判。**

```js
// 用 javascript_tool 一次撈一整組，比截圖可靠太多
const el = document.querySelector('h1');
const s = getComputedStyle(el);
JSON.stringify({ fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
                 fontFamily: s.fontFamily.slice(0, 40), color: s.color, fontWeight: s.fontWeight });
```

要查的來源檔（線上站的真實值在這些地方，不在截圖裡）：

| 要查什麼 | 看哪裡 |
|---|---|
| 顏色 / 圓角 / 陰影的 token | `src/app/globals.css`、`tailwind.config.ts` |
| 字距、字體覆寫 | `tailwind.config.ts` 的 `letterSpacing` / `fontFamily`（**本專案覆寫過 `tracking-widest`**） |
| 版面寬度與 padding | 各 `page.tsx` 的 `max-w-*` / `px-*`（本專案用 `max-w-[1720px]`，不是 `max-w-7xl`） |
| navbar 行為 | `src/components/TransparentNavbar.tsx`（`fixed` + 透明 + `pointer-events-none`） |
| 操作列主題 | `src/lib/actionbar-theme.ts` |
| 某個區塊在哪些分頁才渲染 | `src/components/AdminSection.tsx`（例如計時分頁**不渲染**操作列） |

### C. 比對需要資料

線上站的**正式資料庫目前是空的**（0 筆教案、0 筆道具、沒有輪替表）。
所以資料驅動的畫面只能比空狀態，沒辦法逐列比對。要比有資料的畫面：

- 教案列表 / 編輯器 / 道具表 → 在 **local + emulator** 造資料再比（見 `camp-cypress-test-fe` 的
  `cy.setupCampScenario`，或直接用 `scripts/e2e.sh` 起環境後手動操作）。
- 不要為了比畫面而在線上站建教案。

---

## MCP 工具與操作要點

```
1. ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,...navigate,...computer,
   ...read_page,...find,...javascript_tool,...browser_batch,...resize_window,...tabs_create_mcp,...tabs_close_mcp"
   —— 一次載完，不要一個一個載。
2. tabs_context_mcp 先拿分頁清單。使用者已經開好對應分頁且 URL 一致 → 直接用；否則 tabs_create_mcp 開新的。
3. browser_batch 串多步（click → screenshot → scroll → screenshot）比單步快很多。
4. 收尾把自己開的分頁關掉（tabs_close_mcp）。
```

- 填表用 `read_page filter=interactive` 或 `find` 拿 `ref_*` → 比座標可靠。
- 量尺寸 / 讀 token 用 `javascript_tool`，不要用截圖目測。
- 截圖要能比較：兩邊**同一個斷點、同一個捲動位置**，而且主題（深／淺）要一致。
  本專案深淺色都要看一眼，token 改錯常常只有其中一邊看得出來。

---

## 踩過的坑（每一個都真的發生過）

### 坑 1：把「資料差異」當成「設計不一致」上報

第一輪列了 4 條後來證明是誤判，全部都是同一個原因：

| 以為的不一致 | 實際 |
|---|---|
| 線上站右上角顯示「45」，設計稿是「2026 夏令營」 | **45 是那個營隊的名字**（資料），不是倒數數字。`02 / ACTIVE CAMP`、選單的「目前營隊」、hero 徽章全是同一筆資料 |
| 線上站 `04 / COUNTDOWN` 顯示 `—` | 正式資料庫沒資料，空狀態就是這樣 |
| 線上站 `02 / CURRENT STAGE` 是 `STANDBY` | 同上 |
| 搜尋框 placeholder 不一樣 | 兩邊都是 `請搜尋教案名稱、類別或人員...`，看錯了 |

**規則**：列任何一條差異之前，先問「這是**資料**不同還是**實作**不同？」
分不出來就去原始碼查那個字串是寫死的還是從資料來的。

### 坑 2：設計稿原型的截圖整張是模糊的

第一張原型截圖整頁糊掉，花了時間以為是渲染問題。
真正原因：**「最新更新通知」對話框是開著的**，它的 `backdrop-blur-sm` 蓋在整頁上。

找法：

```js
// 找出大面積且帶 filter / backdrop-filter 的元素
[...document.querySelectorAll('*')].filter(el => {
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  return r.width > 500 && r.height > 300 &&
         ((s.backdropFilter && s.backdropFilter !== 'none') || (s.filter && s.filter !== 'none'));
}).map(el => `${el.tagName}.${el.className}`.slice(0, 80));
```

截圖「看起來怪」的時候**先確認畫面上沒有開著的對話框 / 遮罩**，再懷疑渲染。

### 坑 3：以為 hero 沒有照片

0.5 倍截圖太暗，判斷成「線上站 hero 是深色漸層、沒有照片」。
實際上線上站的 `HeroCarousel` 會從 `/api/hero-images` 取**真的照片**。

**規則**：判斷「有沒有某個視覺元素」時用全解析度截圖，或直接查 DOM
（`document.querySelectorAll('img').length`、背景圖的 `background-image`）。

### 坑 4：不小心改掉線上站的狀態

一個用舊座標的點擊落在線上站 admin 頁的「TEST & UNLOCK」上，
把 `localStorage['camp-audio-unlocked'] = "true"` 寫進去了（音效從鎖定變成解鎖）。

處理：`localStorage.removeItem('camp-audio-unlocked')`，收尾再讀一次確認回到 `null`。

**規則**

- 在線上站點任何東西之前，**重新截一張圖確認座標**（視窗大小一變，上一張圖的座標就錯了）。
- 優先用 `ref_*`（`find` / `read_page filter=interactive`）而不是座標。
- 開始比對前先記下線上站的 localStorage 快照；收尾比對一次，動到的還原回去並在回報裡說明。
  本專案會被 UI 寫到的 key：`camp-audio-unlocked`、`camp-user-nickname`、`app_lang`、
  `lastSeenReleaseId`、`activeCampId`、`plan-editor-topbar-collapsed`、`app_history_logs`。

### 坑 5：`browser_batch` 偶發 domain 權限錯

對 vercel 網域跑 `browser_batch` 全解析度截圖時回 `Permission denied for this action on this domain`。
**同一個動作改成單獨呼叫就成功了。** 遇到這個不用換策略，拆開重試一次。

### 坑 6：視窗高度拉不高

`resize_window` 無法讓視窗高度超過螢幕可用高度（實測 viewport 只有 623–854px，
螢幕 availHeight 1055）。**長頁面一律用捲動 + 多張截圖比**，不要嘗試一張拍完。

### 坑 7：線上站的某些頁面根本看不到

- `/login`：已登入會被導走（`auth-context.tsx:35`）→ 只能對原始碼比。
- 教案編輯器：正式資料庫沒有任何教案 → 開不了任何一份。要比就在 local 造資料。

這兩種情況**要在回報裡講清楚是「對原始碼比」還是「沒比到」**，不要讓它看起來像已經比過了。

---

## 修改哪一邊

使用者說「**改設計稿**」= 以**線上站為準**，把 `figma-design/` 改成跟線上站一致。
這條指令會覆蓋掉上一輪基於線框圖審查做的 UX 改良決定 —— 實例：

> 計時分頁那張「解鎖行政控制」的虛線卡片，第二輪是當成 UX 修正**加上去**的；
> 第三輪使用者再次說「改設計稿」，就依線上站 `AdminSection.tsx:851`
> （計時分頁不渲染操作列）**移除**。移除處留了註解記下原因與怎麼復原。

**規則**

- 改之前先確認方向：改設計稿（以線上站為準）還是改線上站（以設計稿為準）。
- 把「為了更好的 UX 而刻意偏離」的決定**寫成程式碼註解**，不要只放在對話裡 ——
  下一輪的人（或下一輪的你）會不知道那是刻意的，然後把它當成不一致又改回去。
- 刻意保留的偏離要在回報裡單獨列一節，講清楚為什麼。
  例：淺色模式的次要文字色保留比線上站深的灰，因為線上站的 `#8E9498` 在淺底只有 3.3:1，
  照抄會讓 10–11px 的小標籤低於 WCAG AA。

---

## 每輪的收尾節奏

```
開兩個分頁 → 同一畫面 → 讀原始碼 + 量 computed style → 差異表 → 使用者確認
  → 改（改完 typecheck + build）→ 回瀏覽器重新截圖比一次 → 下一個畫面
```

- 設計稿改完要跑 `cd figma-design && npx tsc --noEmit && npm run build`。
- 改完**每個畫面都要重新截圖跟線上站再比一次**，深淺兩個主題都看。
- 收尾把自己起的 dev server 關掉、自己開的分頁關掉。

## 回報格式

1. **按畫面分段**，每段先講最關鍵的那幾條（不要照編號平鋪 40 條）。
2. 全域性的問題（token / 字體 / 字距）**單獨開一節放最前面** —— 它們影響每一個畫面。
3. 附截圖：每個畫面「線上站 / 修正後」成對。
4. **沒改的、改不了的、刻意偏離的** 單獨一節，講清楚原因。
5. 動到線上站狀態的話，講清楚動了什麼、怎麼還原、現在是什麼值。
6. 驗證過什麼要寫出來：typecheck / build 的結果、重新截圖比對過哪些畫面、哪些主題。
