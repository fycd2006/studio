# 優化教案編輯器：欄位級鎖定與本地防抖儲存機制

本計畫旨在重構 `PlanEditor` 的存檔與編輯機制，從「每次輸入都全域寫入 Firebase」改為**「本地延遲存檔 + 欄位級鎖定與提示 (Presence)」**架構。這將大幅降低 Firebase 讀寫次數、防止協作者互蓋資料，並提供極致流暢的編輯體驗。

## User Review Required

> [!IMPORTANT]
> 此架構會在 Firestore 新增一個即時追蹤狀態的集合：`planPresence`。
> 這會帶來極少量且快速的寫入（每次聚焦欄位時），用來記錄「誰正在編輯哪個欄位」。
> 另外，全域的 Undo/Redo 將被替換為**「只限當前正在編輯教案的 本地 Undo/Redo」**，這代表你的「上一步」再也不會觸發慢吞吞的 Firebase 全教案覆寫，而是秒速回上一動。

## Proposed Changes

---

### Firestore Presence Tracking (新增 Hook)

#### [NEW] src/hooks/use-presence.ts
- 創建一個專門的 Hook，負責監聽並更新 `planPresence/{planId}`。
- 提供 `lockField(fieldName)` 與 `unlockField(fieldName)` 函數。
- 自動判斷欄位是否被「其他人」鎖定（若自己鎖定的不算）。
- 在組件卸載 (Unmount) 或鎖定超過 5 分鐘時，自動釋放鎖定。

---

### 編輯器組件 (Editor)

#### [MODIFY] src/components/PlanEditor.tsx
- **引入 Presence：** 藉由 `usePresence` hook，取得每個欄位的編輯狀態。
- **防止衝突 UI：** 如果 `activeName` 被 User B 鎖定，User A 的畫面上該欄位將會反灰（`disabled=true`），並在旁邊顯示「B 正在編輯...」的 badge。
- **本地 Undo/Redo 實作：** 移除對 `onUndo` / `onRedo` (來自 `use-plans.ts`) 的依賴，改為在 `PlanEditor` 內部使用一套新的 `localHistory` stack。所有的打字與 Undo 操作都只改動 Local State。
- **強制寫入 (Flush) 與歷史版本：** 在點擊「儲存版本/還原版本」之前，強制將 `pendingUpdates` 立刻寫入 Firebase，確保擷取的快照是最新的。

#### [MODIFY] src/components/MarkdownArea.tsx
- 在介面中新增 `onFocus?: () => void` 與 `onBlur?: () => void` props。
- 當使用者點入 Markdown 區域時，向上通知 `PlanEditor` 以鎖定 `process`、`content` 或 `purpose` 欄位。

#### [MODIFY] src/components/PropsTable.tsx
- 加上 `onFocus?: () => void` 與 `onBlur?: () => void` props。
- 將整個 Props Table 視為一個欄位區塊，只要有修改就鎖定 `props`。

---

### 全域教案 Hook

#### [MODIFY] src/hooks/use-plans.ts
- 不再需要因為編輯而在每次都呼叫 `pushPlanHistory`。我們會保留供全域（例如拖曳排序、新增、刪除）使用的紀錄，但在單一表單編輯內部，將交由 `PlanEditor` 自行管理 Undo Stack。

## Open Questions

> [!NOTE]
> 1. Props (道具表) 中包含許多小的 Input 箱，我們目前的設計是「只要聚焦道具表的任何一格，就鎖定整個道具表」，請問這符合你的期望嗎？還是一定要細分到鎖定某一列？（建議鎖定整個表，避免資料結構不同步）
> 2. 準備實施此計畫，請確認是否開始？

## Verification Plan

### Manual Verification
1. 開啟兩個瀏覽器視窗 (A 與 B) 進入同一個教案。
2. 視窗 A 點擊「活動內容」開始打字。
3. 視窗 B 的「活動內容」應立刻變為不可編輯，並顯示「User A 編輯中...」。
4. 視窗 A 停滯超過 2 秒，系統自動將「活動內容」局部更新到 Firebase (Debounce Save)。
5. 視窗 A 點擊外部 (Blur)，視窗 B 的欄位立刻解鎖可編輯。
6. 在視窗 A 按 Undo，僅本地資料復原，且不引發大規模 Firebase 全體寫入。
7. 手動按下「儲存歷史版本」，應能立刻看到最新的文字而不是兩秒前的狀態。
