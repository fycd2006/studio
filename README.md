# NTUT CD Camp — Volunteer Studio (北科崇德青年志工營隊教案工作台)

一套專為營隊設計的現代化全功能教案編輯、排程調度與活動管理工作台。支援即時協作、版本歷史比對、Google Docs 風格吸頂排版、手機端鍵盤避讓置底工具列、自動輪站調度演算法，以及 PDF / Word 完整匯出功能。

---

## 🛠️ 技術棧 (Tech Stack)

- **框架**：[Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **語言**：[TypeScript](https://www.typescriptlang.org/)
- **樣式與元件**：[Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + Lucide Icons
- **後端與資料庫**：[Firebase 11](https://firebase.google.com/) (Firestore、Authentication、Storage)
- **動畫與互動**：[Framer Motion](https://www.framer.com/motion/) + [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **編輯器與畫布**：客製化 O2RichEditor + [Fabric.js](http://fabricjs.com/) 手繪藍圖
- **匯出工具**：`docx`、`xlsx`、`file-saver`

---

## 🚀 快速開始 (Quick Start)

### 1. 環境需求
- **Node.js**：`>= 18.18.0`（推薦 Node.js 20+ LTS）
- **套件管理器**：`npm`

### 2. 安裝依賴
```bash
git clone https://github.com/fycd2006/studio.git
cd studio
npm install
```

### 3. 配置環境變數
複製 `.env.example` 為 `.env.local` 並填入對應的 Firebase 與 API 金鑰：
```bash
cp .env.example .env.local
```

> **重要**：請向專案負責人索取開發環境用 `.env.local` 內容，切勿將任何金鑰 commit 至 Git。

### 4. 啟動開發伺服器
```bash
npm run dev
```
瀏覽器開啟 [http://localhost:3000](http://localhost:3000)（或 3001）。

### 5. 常用指令
| 指令 | 說明 |
| :--- | :--- |
| `npm run dev` | 啟動本機開發伺服器 |
| `npm run build` | 執行 Next.js 生產環境打包編譯 |
| `npm run start` | 啟動生產打包後之伺服器 |
| `npm run lint` | 執行 ESLint 程式碼檢查 |
| `npm run typecheck` | 型別檢查（主專案 + cypress 兩份 tsconfig，交接與發 PR 前必備） |
| `npm run e2e` | 跑 Cypress E2E（自動起 Firebase emulator 與專用 dev server） |
| `npm run e2e:open` | 同上，但開 Cypress GUI |
| `npm run release` | 自動產生版更日誌 (Changelog) |

---

## 🧪 E2E 測試 (Cypress)

```bash
npm run e2e                                      # 全部
npm run e2e -- --spec cypress/e2e/login.cy.ts    # 單一支
npm run e2e:open                                 # GUI
```

**E2E 一律跑在 Firebase emulator 上，不會碰到任何真實的 Firebase 專案。**
`scripts/e2e.sh` 會依序起 emulator（firestore 8080 / auth 9099）→ 專用 dev server（port 3100，
帶測試專用帳密與 emulator 連線設定）→ Cypress，結束時自動收掉。

⚠️ 不要直接 `npx cypress run`：一般的 `npm run dev` 讀 `.env.local`，會連到**真的** Firebase 專案，
而測試每支開始前都會清空資料庫。

| 路徑 | 內容 |
| :--- | :--- |
| `cypress/e2e/` | 測試本體（登入與權限閘門、教案總覽、建立與刪除、組員唯讀權限） |
| `cypress/support/commands.ts` | 共用指令（`cy.loginAs` / `cy.setupCampScenario` / `cy.visitApp` …）—— 寫新測試前先看這份 |
| `cypress/plugins/firestore.ts` | node 端 fixture：清空 / 建 scenario / 清 scenario（含清乾淨自證） |
| `src/firebase/emulator.ts` | emulator 連線判斷（正式環境永遠不接） |
| `.claude/skills/camp-cypress-test-fe/` | 測試規範：12 個實測踩過的反模式與 fixture 契約 |

需要 Java（Firestore emulator 是 jar）。`firebase-tools` 已在 devDependencies，不需要全域安裝。

---

## 📁 專案目錄結構 (Directory Structure)

```text
├── src/
│   ├── app/                      # Next.js App Router 路由
│   │   ├── page.tsx              # 首頁 (Landing / Hero)
│   │   ├── plans/                # 教案列表與分類頁面
│   │   │   ├── page.tsx          # 教案總覽清單
│   │   │   └── [id]/page.tsx     # 單一教案編輯頁面
│   │   ├── admin/                # 後台管理 (人員審核、營隊物品、分組設定)
│   │   ├── api/                  # 後端 API Routes
│   │   └── auth/ / login/        # 登入與身分驗證
│   ├── components/               # 核心 UI 與業務元件
│   │   ├── PlanEditor.tsx        # 核心教案編輯器 (Google Docs 樣式)
│   │   ├── MarkdownToolbar.tsx   # 富文本格式工具列 (字型、樣式、顏色、清單、表格)
│   │   ├── O2RichEditor.tsx      # 雙向綁定富文本輸入框
│   │   ├── TransparentNavbar.tsx # 全站透明動態導覽列 (支援手機底導與教案自動避讓)
│   │   ├── PropsTable.tsx        # 道具清單管理表格
│   │   ├── FabricCanvas.tsx      # 手繪視覺藍圖畫布
│   │   └── VersionHistorySidebar.tsx # 歷史版本抽屜
│   ├── lib/                      # 核心業務邏輯與演算法
│   │   ├── plans-context.tsx     # 全域教案狀態機 (Firestore 即時監聽、CRUD、版本比對)
│   │   ├── rotation-scheduler.ts # 跑關輪站調度排程演算法
│   │   ├── export-utils.ts       # PDF 與 Word (.docx) 匯出模組
│   │   └── utils.ts              # 工具函式與樣式合併 (cn, Tailwind)
│   ├── types/                    # TypeScript 型別宣告 (plan.ts 等)
│   └── hooks/                    # 自訂 React Hooks (usePresence, useToast 等)
├── docs/                         # 技術文檔與規格書
│   ├── image-processing/         # OpenCV 藝術風格圖片處理引擎文件
│   └── archive/                  # 歷史規劃與重構記錄
├── firestore.rules               # Firestore 資料庫安全性讀寫規則
├── .env.example                  # 環境變數範本檔
└── package.json                  # 專案依賴與腳本
```

---

## 🧭 核心功能與模組架構地圖

### 1. 教案編輯器 (PlanEditor)
- **檔案**：`src/components/PlanEditor.tsx`、`src/components/MarkdownToolbar.tsx`
- **電腦版 (Desktop)**：
  - 採用 **Google Docs 雙層實色吸頂列**（`sticky top-0`）。
  - **頂部列**：整合上一頁導航、組別徽章、標題即時修改、雲端儲存狀態（`已儲存至雲端` / `儲存中...`）、版本紀錄、Word/PDF 匯出選單。
  - **折疊功能**：點擊右側 `^` / `v` 按鈕可自由收闔頂部列，僅留下排版工具列，極大化寫作畫布。
- **手機版 (Mobile)**：
  - **預設檢視模式**：右下角常駐 Google Docs 風格的**懸浮編輯筆（Pencil FAB）**，滑動頁面不誤觸。
  - **編輯模式**：點擊編輯筆後，格式化工具列**平滑升起置於螢幕最底端**（`fixed bottom-0`）。
  - **鍵盤避讓追蹤**：透過 `window.visualViewport` 動態調整底距，當虛擬鍵盤彈出時自動貼緊鍵盤頂部。

### 2. 全域狀態管理與版本歷史 (PlansContext)
- **檔案**：`src/lib/plans-context.tsx`
- **職責**：
  - 封裝 Firestore 的即時 Collection 監聽與 CRUD。
  - 支援自動定期存檔（Debounced Auto-save）。
  - 版本快照與差異比對（使用 `jsondiffpatch` 呈現修改前後的高亮 diff）。
  - 多人協作在線狀態（Presence 與光標佔用指示）。

### 3. 跑關輪站調度演算法 (Rotation Scheduler)
- **檔案**：`src/lib/rotation-scheduler.ts`
- **職責**：營隊關卡與小隊動線自動排程，支援防撞站、時段分派、小隊分組負載平衡。

### 4. 權限與後台系統 (Admin)
- **檔案**：`src/app/admin/page.tsx`
- **職責**：帳號身分白名單管理（Admin / Volunteer 權限切換）、活動物品總表與分組自訂。

---

## 🤝 協作開發規範 (Git Workflow)

為避免多人協作時產生衝突或覆蓋線上程式碼，請遵守以下規則：

1. **分支管理**：
   - `main` 分支受保護，**請勿直接 push 至 `main`**。
   - 所有開發請從 `main` 切出特性分支：
     - 新功能：`git checkout -b feat/feature-name`
     - 修復錯誤：`git checkout -b fix/issue-name`
2. **Commit 規範**：
   - 採用 Conventional Commits 格式，例如：
     - `feat(editor): add table column resize support`
     - `fix(scheduler): resolve conflict in round 3 timing`
     - `refactor(auth): simplify role verification hook`
3. **提交 PR 前自我檢查**：
   ```bash
   npx tsc --noEmit   # 確認 0 TypeScript 錯誤
   npm run build      # 確認打包建置無報錯
   ```
4. **線上安全性保護**：
   - 請勿在未討論的情況下修改或發布 `firestore.rules`。
   - 請勿在客戶端程式碼硬編碼任何 Service Account 私鑰或憑證。
