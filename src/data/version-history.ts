export type VersionHistoryEntry = {
  id: string;
  version: string;
  label: string;
  date: string;
  title: string;
  highlights: string[];
};

export const VERSION_HISTORY: VersionHistoryEntry[] = [
  {
    id: "build-uiux-pro",
    version: "1.0.11",
    label: "重大更新",
    date: "2026-04-24",
    title: "UIUX PRO MAX：全站視覺大改版與體驗升級",
    highlights: [
      "【行政中樞：試算表級進化】道具清單全面升級為全滿版無邊界表格，帶來類似 Google Sheets 的專業檢視體驗。",
      "【行政中樞：視野最大化】新增底部無限網格模擬，並在右下角加入「懸浮按鈕收合箭頭」，滑動時頂部導覽列會自動收合，釋放最大閱讀空間。",
      "【教案總覽：玻璃擬物化】全面套用 UIUX PRO MAX 標準，將散落的操作介面整合為高質感的「分段式膠囊按鈕」，統一版面間距。",
      "【教案編輯：無縫操作列】修正工具列的透明度縫隙，實現滿版無縫吸附，並移除少用的字體大小功能，讓介面更純粹。",
      "【行動版：A4 完美縮放】在手機版開啟「電腦模式」時，A4 稿紙會自動等比縮放以適應手機螢幕，徹底解決畫面溢出問題。",
      "【系統優化與說明】修復多處底層 TypeScript 型別錯誤以提升 PWA 效能，並全面將艱澀的系統更新日誌改寫為白話文說明。"
    ],
  },
  {
    id: "build-jzqen3i",
    version: "1.0.10",
    label: "更新項目",
    date: "2026-04-10",
    title: "教案編輯頁工具列置中與滿版顯示",
    highlights: [
      "教案編輯頁的工具列按鈕現在會置中對齊。",
      "工具列背景延伸至螢幕滿版，不再有左右空隙。"
    ],
  },
  {
    id: "build-ni8mhkn",
    version: "1.0.9",
    label: "更新項目",
    date: "2026-04-10",
    title: "修正工具列背景透明問題",
    highlights: [
      "教案編輯頁捲動時，工具列背後不再透出文字內容。",
      "工具列底部新增分隔線，視覺更清晰。"
    ],
  },
  {
    id: "build-tkc3g42",
    version: "1.0.8",
    label: "更新項目",
    date: "2026-04-10",
    title: "修正工具列吸附與滿版問題",
    highlights: [
      "教案編輯頁工具列改為滿版寬度，消除兩側縫隙。",
      "捲動時工具列能正確吸附在頂端。"
    ],
  },
  {
    id: "build-5padcyz",
    version: "1.0.7",
    label: "更新項目",
    date: "2026-04-10",
    title: "電腦版教案編輯預設為可編輯狀態",
    highlights: [
      "電腦版打開教案後可直接編輯，不需再點擊解鎖按鈕。",
      "手機版維持先閱讀、點鉛筆按鈕後才能編輯的操作方式。",
      "修正工具列與導覽列之間的間距問題。"
    ],
  },
  {
    id: "build-nhgkxar",
    version: "1.0.6",
    label: "更新項目",
    date: "2026-04-10",
    title: "新增版本更新通知彈窗",
    highlights: [
      "開啟網頁時，若有錯過的版本更新會自動彈出通知視窗。",
      "設定頁的版本歷程改為時間軸樣式呈現。"
    ],
  },
  {
    id: "build-cd011d2",
    version: "1.0.5",
    label: "更新項目",
    date: "2026-04-06",
    title: "教案列表頁操作列整合",
    highlights: [
      "教案列表頁上方的操作按鈕重新整理分組。",
      "管理員設定區的分類標籤更加清楚。"
    ],
  },
  {
    id: "build-20fde3a",
    version: "1.0.5",
    label: "更新項目",
    date: "2026-04-06",
    title: "修復教案總覽文字與排序",
    highlights: [
      "教案總覽中的文字不再出現異常符號。",
      "教案清單的排序改為依更新時間由新到舊。"
    ],
  },
  {
    id: "build-201c016",
    version: "1.0.4",
    label: "更新項目",
    date: "2026-04-05",
    title: "手機版按鈕放大與字體調整",
    highlights: [
      "手機版各頁面的按鈕更大、更容易點擊。",
      "全站字體大小與標題層次重新調整。",
      "教案編輯頁的浮動工具列視覺更新。"
    ],
  },
  {
    id: "build-5963fda",
    version: "1.0.4",
    label: "更新項目",
    date: "2026-04-05",
    title: "手機版活動選單改為底部彈出",
    highlights: [
      "手機版選擇活動時，選單從畫面底部滑出，方便單手操作。",
      "修復電腦版活動選單偶爾偏移的問題。"
    ],
  },
  {
    id: "build-fff6e84",
    version: "1.0.4",
    label: "更新項目",
    date: "2026-04-05",
    title: "修正文字格式工具的大小切換",
    highlights: [
      "教案編輯頁的粗體、斜體等格式按鈕現在能正確切換文字大小。",
      "新增一鍵清除所有格式的功能。"
    ],
  },
  {
    id: "build-5792e26",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-04",
    title: "版本紀錄保留命名功能",
    highlights: [
      "儲存版本時輸入的名稱會一直保留，直到內容再次被修改。",
      "版本歷程側邊欄可更方便地辨識各個存檔點。"
    ],
  },
  {
    id: "build-429ae4d",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-04",
    title: "修復版本歷程誤觸唯讀問題",
    highlights: [
      "打開版本歷程側欄時，若未選擇任何版本，編輯區不再被鎖定。"
    ],
  },
  {
    id: "build-08f02ab",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-04",
    title: "手機版鍵盤彈起時工具列對齊修正",
    highlights: [
      "手機編輯教案時，螢幕鍵盤彈出後工具列會正確貼齊鍵盤上方。"
    ],
  },
  {
    id: "build-cd6f269",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-04",
    title: "手機版載入速度與主題色修正",
    highlights: [
      "修正手機版瀏覽器顯示的主題顏色。",
      "改善鍵盤相關的操作問題。",
      "頁面載入動畫更加流暢。"
    ],
  },
  {
    id: "build-fdab629",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-04",
    title: "新增教案備註欄位與劇本模式",
    highlights: [
      "教案編輯頁新增「備註」欄位，可紀錄額外提醒事項。",
      "新增劇本排版模式，方便撰寫活動流程腳本。"
    ],
  },
  {
    id: "build-e77f37b",
    version: "1.0.3",
    label: "更新項目",
    date: "2026-04-03",
    title: "改善錯誤提示與資料同步",
    highlights: [
      "操作失敗時會顯示更清楚的錯誤原因說明。",
      "修正部分資料未即時同步的問題。"
    ],
  },
  {
    id: "build-05e9d1e",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-31",
    title: "一般性修正與穩定性提升",
    highlights: [
      "修復數項小問題，提升整體使用穩定度。"
    ],
  },
  {
    id: "build-601cdf1",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-27",
    title: "小組管理改為清單檢視",
    highlights: [
      "設定頁中的小組管理從卡片式改為清單式排列，一目了然。",
      "各小組共用統一的標題列，操作更一致。"
    ],
  },
  {
    id: "build-cc76890",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-27",
    title: "時間軸改為清單排版",
    highlights: [
      "設定頁的時間軸從卡片格狀改為簡潔的清單排列。",
      "修正時間輸入框大小不一致的問題。"
    ],
  },
  {
    id: "build-41eca22",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-27",
    title: "時間輸入框改為膠囊樣式",
    highlights: [
      "設定頁中單一時間與時間範圍的輸入框改為圓角膠囊造型。"
    ],
  },
  {
    id: "build-9a0dee7",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-27",
    title: "設定頁時間軸介面重新設計",
    highlights: [
      "設定頁的營隊時間軸全面翻新為膠囊式輸入框。",
      "文字標籤與說明更正為正確用語。"
    ],
  },
  {
    id: "build-3c44c0d",
    version: "1.0.2",
    label: "更新項目",
    date: "2026-03-27",
    title: "全站視覺升級：移除邊框、改用陰影",
    highlights: [
      "全站各區塊移除多餘邊框線條，改以陰影呈現層次感。",
      "整體畫面更加乾淨簡潔。"
    ],
  },
  {
    id: "build-28f017a",
    version: "1.0.1",
    label: "更新項目",
    date: "2026-03-26",
    title: "修正管理頁手機與電腦版導覽不同步",
    highlights: [
      "管理頁的導覽列在手機版與電腦版之間的切換行為已統一。"
    ],
  },
  {
    id: "build-304a9d8",
    version: "1.0.1",
    label: "更新項目",
    date: "2026-03-26",
    title: "介面微調與匯出功能更新",
    highlights: [
      "多處介面細節調整。",
      "教案匯出功能更新。"
    ],
  },
  {
    id: "build-b4bd8bc",
    version: "1.0.1",
    label: "更新項目",
    date: "2026-03-26",
    title: "修復教案編輯頁的還原按鈕",
    highlights: [
      "修正教案編輯頁中「還原上一步」按鈕無法正常顯示的問題。"
    ],
  },
  {
    id: "build-c2feaeb",
    version: "1.0.1",
    label: "更新項目",
    date: "2026-03-26",
    title: "版本歷程介面全面翻新",
    highlights: [
      "版本歷程側邊欄重新設計，瀏覽更直覺。",
      "可直接在歷程中查看各版本的差異對比。"
    ],
  },
  {
    id: "build-7c0ac51",
    version: "1.0.1",
    label: "更新 #22",
    date: "2026-03-26",
    title: "Styling: Make Plan and Admin page layouts fully responsive on mobile screens (Flex traps, relative sidebars, manual zoom restoration)",
    highlights: [
      "提交代號: 7c0ac51",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-b35178f",
    version: "1.0.1",
    label: "更新 #23",
    date: "2026-03-26",
    title: "Styling: Remove remaining borders and shadows from Navbar and ActionBar containers for seamless integration",
    highlights: [
      "提交代號: b35178f",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-bd780e0",
    version: "1.0.1",
    label: "更新 #24",
    date: "2026-03-26",
    title: "Styling: Make Navbar and ActionBar use solid color on internal pages",
    highlights: [
      "提交代號: bd780e0",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-91a6b4d",
    version: "1.0.1",
    label: "更新 #25",
    date: "2026-03-26",
    title: "Restore scroll handler and fix sticky",
    highlights: [
      "提交代號: 91a6b4d",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-291d9a8",
    version: "1.0.1",
    label: "更新 #26",
    date: "2026-03-26",
    title: "fix scroll clipping by removing fixed-height layout constraints",
    highlights: [
      "提交代號: 291d9a8",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-f9c1783",
    version: "1.0.1",
    label: "更新 #27",
    date: "2026-03-26",
    title: "feat: optimize navbar auto-hide and fix double scrollbars UI/UX",
    highlights: [
      "提交代號: f9c1783",
      "發布日期: 2026-03-26",
    ],
  },
  {
    id: "build-df36654",
    version: "1.0.1",
    label: "更新 #28",
    date: "2026-03-25",
    title: "chore: update admin UI and add utility scripts",
    highlights: [
      "提交代號: df36654",
      "發布日期: 2026-03-25",
    ],
  },
  {
    id: "build-567c5be",
    version: "1.0.1",
    label: "更新 #29",
    date: "2026-03-25",
    title: "fix(layout): adjust ActionBar sticky offset to seamlessly connect with Navbar without visible gaps",
    highlights: [
      "提交代號: 567c5be",
      "發布日期: 2026-03-25",
    ],
  },
  {
    id: "build-367d8b5",
    version: "1.0.1",
    label: "更新 #30",
    date: "2026-03-25",
    title: "style: remove drop shadow and apply mix-blend-difference auto text inversion to Navbar and Action Bar",
    highlights: [
      "提交代號: 367d8b5",
      "發布日期: 2026-03-25",
    ],
  },
  {
    id: "build-8738705",
    version: "1.0.1",
    label: "更新 #31",
    date: "2026-03-25",
    title: "fix(layout): lock h-[100dvh] for Admin & PlanEditor pages to restore native sticky behavior for Action Bar",
    highlights: [
      "提交代號: 8738705",
      "發布日期: 2026-03-25",
    ],
  },
  {
    id: "build-20bdb9d",
    version: "1.0.1",
    label: "更新 #32",
    date: "2026-03-24",
    title: "UI/UX 調整與行動版修正",
    highlights: [
      "提交代號: 20bdb9d",
      "發布日期: 2026-03-24",
    ],
  },
  {
    id: "build-153c69b",
    version: "1.0.1",
    label: "更新 #33",
    date: "2026-03-24",
    title: "Fix JSX syntax errors caused by escaped quote marks",
    highlights: [
      "提交代號: 153c69b",
      "發布日期: 2026-03-24",
    ],
  },
  {
    id: "build-dfed146",
    version: "1.0.1",
    label: "更新 #34",
    date: "2026-03-24",
    title: "Fix mobile responsiveness across all pages - improve touch targets, spacing, and layout",
    highlights: [
      "提交代號: dfed146",
      "發布日期: 2026-03-24",
    ],
  },
  {
    id: "build-d94db2b",
    version: "1.0.1",
    label: "更新 #35",
    date: "2026-03-24",
    title: "Remove image processing from homepage, keep advanced art style for login page only",
    highlights: [
      "提交代號: d94db2b",
      "發布日期: 2026-03-24",
    ],
  },
  {
    id: "build-f23b51c",
    version: "1.0.1",
    label: "更新 #36",
    date: "2026-03-23",
    title: "fix: mobile sidebar toggles and timer audio text",
    highlights: [
      "提交代號: f23b51c",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-bdba765",
    version: "1.0.1",
    label: "更新 #37",
    date: "2026-03-23",
    title: "style: fix mobile sidebar bg-color for proper light/dark mode support",
    highlights: [
      "提交代號: bdba765",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-2980c2e",
    version: "1.0.1",
    label: "更新 #38",
    date: "2026-03-23",
    title: "style: polish sidebar z-index, visibility, and homepage borders",
    highlights: [
      "提交代號: 2980c2e",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-2240682",
    version: "1.0.1",
    label: "更新 #39",
    date: "2026-03-23",
    title: "feat: sidebar refactor, multi-view plan overview, and word export",
    highlights: [
      "提交代號: 2240682",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-4b72913",
    version: "1.0.1",
    label: "更新 #40",
    date: "2026-03-23",
    title: "feat(api): add local json fallback for hero images",
    highlights: [
      "提交代號: 4b72913",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-49f4b58",
    version: "1.0.1",
    label: "更新 #41",
    date: "2026-03-23",
    title: "fix(carousel): add loop conditions and key to swiper",
    highlights: [
      "提交代號: 49f4b58",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-bd9e2fd",
    version: "1.0.1",
    label: "更新 #42",
    date: "2026-03-23",
    title: "feat: add albums_json to restore background photos",
    highlights: [
      "提交代號: bd9e2fd",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-e17f5db",
    version: "1.0.1",
    label: "更新 #43",
    date: "2026-03-23",
    title: "style: remove quotation marks and borders",
    highlights: [
      "提交代號: e17f5db",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-7565f8b",
    version: "1.0.1",
    label: "更新 #44",
    date: "2026-03-23",
    title: "feat: add Google Photos and RotatingText dashboard enhancements",
    highlights: [
      "提交代號: 7565f8b",
      "發布日期: 2026-03-23",
    ],
  },
  {
    id: "build-c3206ca",
    version: "1.0.1",
    label: "更新 #45",
    date: "2026-03-21",
    title: "UI overhaul: Permissions, Navigation, Global FAP, and Version History Sidebar UI",
    highlights: [
      "提交代號: c3206ca",
      "發布日期: 2026-03-21",
    ],
  },
  {
    id: "build-b598455",
    version: "1.0.1",
    label: "更新 #46",
    date: "2026-03-20",
    title: "feat: refine RBAC, Settings dashboard, and project synchronization",
    highlights: [
      "提交代號: b598455",
      "發布日期: 2026-03-20",
    ],
  },
  {
    id: "build-cdd8f40",
    version: "1.0.1",
    label: "更新 #47",
    date: "2026-03-18",
    title: "feat: Full-site visual revamp with Framer Motion, next-themes, and Navigation enhancements",
    highlights: [
      "提交代號: cdd8f40",
      "發布日期: 2026-03-18",
    ],
  },
  {
    id: "build-17330da",
    version: "1.0.1",
    label: "更新 #48",
    date: "2026-03-13",
    title: "feat: version preview with diff comparison, named filter, auto-save on restore",
    highlights: [
      "提交代號: 17330da",
      "發布日期: 2026-03-13",
    ],
  },
  {
    id: "build-00c5b05",
    version: "1.0.1",
    label: "更新 #49",
    date: "2026-03-12",
    title: "fix: undo now skips duplicate history entries to ensure visible state changes",
    highlights: [
      "提交代號: 00c5b05",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-5df20fc",
    version: "1.0.1",
    label: "更新 #50",
    date: "2026-03-12",
    title: "feat: optimize timer with NTP sync, Web Worker, audio warm-up, offline UI, SW caching",
    highlights: [
      "提交代號: 5df20fc",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-237ec48",
    version: "1.0.1",
    label: "更新 #51",
    date: "2026-03-12",
    title: "revert: restore orange theme-color, keep dynamic black only for saver mode",
    highlights: [
      "提交代號: 237ec48",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-0b2ab34",
    version: "1.0.1",
    label: "更新 #52",
    date: "2026-03-12",
    title: "fix: set theme-color to black globally to remove orange statusbar in PWA",
    highlights: [
      "提交代號: 0b2ab34",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-035f010",
    version: "1.0.1",
    label: "更新 #53",
    date: "2026-03-12",
    title: "fix: dynamically change theme-color to black in saver mode to remove orange line",
    highlights: [
      "提交代號: 035f010",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-2c7a435",
    version: "1.0.1",
    label: "更新 #54",
    date: "2026-03-12",
    title: "fix: add viewport-fitcover and safe area padding for PWA fullscreen",
    highlights: [
      "提交代號: 2c7a435",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-69b5e1e",
    version: "1.0.1",
    label: "更新 #55",
    date: "2026-03-12",
    title: "feat: enhance notifications with tags, renotify, and action buttons",
    highlights: [
      "提交代號: 69b5e1e",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-36f702d",
    version: "1.0.1",
    label: "更新 #56",
    date: "2026-03-12",
    title: "feat: add PWA manifest and meta tags for installable app",
    highlights: [
      "提交代號: 36f702d",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-74bc0aa",
    version: "1.0.1",
    label: "更新 #57",
    date: "2026-03-12",
    title: "fix: only trigger 3-min warning when duration exceeds 3 minutes",
    highlights: [
      "提交代號: 74bc0aa",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-e9e54a8",
    version: "1.0.1",
    label: "更新 #58",
    date: "2026-03-12",
    title: "fix: make pre-wake notifications strictly silent",
    highlights: [
      "提交代號: e9e54a8",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-f83cd2b",
    version: "1.0.1",
    label: "更新 #59",
    date: "2026-03-12",
    title: "fix: widen pre-wake notification window to prevent timing drift skips",
    highlights: [
      "提交代號: f83cd2b",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-9e983a8",
    version: "1.0.1",
    label: "更新 #60",
    date: "2026-03-12",
    title: "feat: add pre-wake notifications before timer milestones to wake phone screen",
    highlights: [
      "提交代號: 9e983a8",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-ed32bc4",
    version: "1.0.1",
    label: "更新 #61",
    date: "2026-03-12",
    title: "fix: request wake lock unconditionally instead of only when running",
    highlights: [
      "提交代號: ed32bc4",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-427d16d",
    version: "1.0.1",
    label: "更新 #62",
    date: "2026-03-12",
    title: "feat: display current time on timer broadcast and saver views",
    highlights: [
      "提交代號: 427d16d",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-78a3412",
    version: "1.0.1",
    label: "更新 #63",
    date: "2026-03-12",
    title: "fix: improve sidebar collapsed UI for logo, admin sync, and plan items",
    highlights: [
      "提交代號: 78a3412",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-6457248",
    version: "1.0.1",
    label: "更新 #64",
    date: "2026-03-12",
    title: "chore: update website title to NTUT CD Camp",
    highlights: [
      "提交代號: 6457248",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-752abe8",
    version: "1.0.1",
    label: "更新 #65",
    date: "2026-03-12",
    title: "chore: update files",
    highlights: [
      "提交代號: 752abe8",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-a7454e7",
    version: "1.0.1",
    label: "更新 #66",
    date: "2026-03-12",
    title: "chore: update favicon",
    highlights: [
      "提交代號: a7454e7",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-6225fae",
    version: "1.0.1",
    label: "更新 #67",
    date: "2026-03-12",
    title: "chore: add logo and favicon",
    highlights: [
      "提交代號: 6225fae",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-f8cbb09",
    version: "1.0.1",
    label: "更新 #68",
    date: "2026-03-12",
    title: "chore: update logo image",
    highlights: [
      "提交代號: f8cbb09",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-232fe79",
    version: "1.0.1",
    label: "更新 #69",
    date: "2026-03-12",
    title: "feat: use custom logo image with fallback to icon",
    highlights: [
      "提交代號: 232fe79",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-cb1f881",
    version: "1.0.1",
    label: "更新 #70",
    date: "2026-03-12",
    title: "Merge pull request #1 from fycd2006/trigger-vercel",
    highlights: [
      "提交代號: cb1f881",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-0892711",
    version: "1.0.1",
    label: "更新 #71",
    date: "2026-03-12",
    title: "fix: resolve undo/redo crash by using setDoc with merge and handling deletions",
    highlights: [
      "提交代號: 0892711",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-814e212",
    version: "1.0.1",
    label: "更新 #72",
    date: "2026-03-12",
    title: "trigger: force vercel deploy",
    highlights: [
      "提交代號: 814e212",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-3d7e692",
    version: "1.0.1",
    label: "更新 #73",
    date: "2026-03-12",
    title: "chore: clean up accidental studio subdirectory",
    highlights: [
      "提交代號: 3d7e692",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-d395321",
    version: "1.0.1",
    label: "更新 #74",
    date: "2026-03-12",
    title: "feat(whiteboard): optimize UX, fix object insertion and brush UI",
    highlights: [
      "提交代號: d395321",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-4e6e730",
    version: "1.0.1",
    label: "更新 #75",
    date: "2026-03-12",
    title: "feat: implement zoomable props list and synchronize project structure",
    highlights: [
      "提交代號: 4e6e730",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-30dd24b",
    version: "1.0.1",
    label: "更新 #76",
    date: "2026-03-12",
    title: "feat: version history enhancements, saver mode portal, local beep audio, double-beep alarm pattern",
    highlights: [
      "提交代號: 30dd24b",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-3594961",
    version: "1.0.1",
    label: "更新 #77",
    date: "2026-03-12",
    title: "fix: mount hidden audio tags to ensure reliable iOS playback for alarms and test audio",
    highlights: [
      "提交代號: 3594961",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-c4e8932",
    version: "1.0.1",
    label: "更新 #78",
    date: "2026-03-12",
    title: "fix: ensure test audio plays reliably by using fresh Audio instance",
    highlights: [
      "提交代號: c4e8932",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-18995eb",
    version: "1.0.1",
    label: "更新 #79",
    date: "2026-03-12",
    title: "fix: resolve Next.js 15 Script component undefined error in layout",
    highlights: [
      "提交代號: 18995eb",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-0d9718f",
    version: "1.0.1",
    label: "更新 #80",
    date: "2026-03-12",
    title: "fix: adjust 3-min warning to 3 beeps, keep test audio as 1 beep, 0-min as long alarm",
    highlights: [
      "提交代號: 0d9718f",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-3599271",
    version: "1.0.1",
    label: "更新 #81",
    date: "2026-03-12",
    title: "feat: double-beep x3 rounds using independent Audio instances  single beep test audio",
    highlights: [
      "提交代號: 3599271",
      "發布日期: 2026-03-12",
    ],
  },
  {
    id: "build-77a560d",
    version: "1.0.1",
    label: "更新 #82",
    date: "2026-03-11",
    title: "fix: simplify 3-minute alarm to a single uninterruptable beep for iOS compatibility",
    highlights: [
      "提交代號: 77a560d",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-74dc260",
    version: "1.0.1",
    label: "更新 #83",
    date: "2026-03-11",
    title: "feat: make saver mode full-screen",
    highlights: [
      "提交代號: 74dc260",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-046c57f",
    version: "1.0.1",
    label: "更新 #84",
    date: "2026-03-11",
    title: "feat: change 3-minute alarm to play short double-beeps for 3 rounds",
    highlights: [
      "提交代號: 046c57f",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-beddaff",
    version: "1.0.1",
    label: "更新 #85",
    date: "2026-03-11",
    title: "fix: change 3-minute alarm to use short beeps with wav format for iOS compatibility",
    highlights: [
      "提交代號: beddaff",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-2256ea3",
    version: "1.0.1",
    label: "更新 #86",
    date: "2026-03-11",
    title: "feat: add extreme saver mode to prevent iOS background sleep for timer",
    highlights: [
      "提交代號: 2256ea3",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-1a42e17",
    version: "1.0.1",
    label: "更新 #87",
    date: "2026-03-11",
    title: "feat: disable chat input while the agent is generating or streaming responses.",
    highlights: [
      "提交代號: 1a42e17",
      "發布日期: 2026-03-11",
    ],
  },
  {
    id: "build-810c6de",
    version: "1.0.0",
    label: "首次發布",
    date: "2026-03-10",
    title: "Refactor: improve responsive UI and UX for rotation and props tables",
    highlights: [
      "提交代號: 810c6de",
      "發布日期: 2026-03-10",
    ],
  }
];