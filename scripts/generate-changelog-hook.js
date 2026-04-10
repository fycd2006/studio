/**
 * Git Pre-Commit Hook (AI Auto-Changelog)
 * 
 * 每次在背景執行 git commit 時，它都會檢查暫存區的變更，
 * 生成用戶版更新日誌，然後偷偷地加回到這次提交 (Commit) 的清單裡。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 讀取 .env.local，避免有些環境吃不到全域變數
const envPath = path.join(__dirname, '../.env.local');
let rawEnvKey = null;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
  if (match) rawEnvKey = match[1];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || rawEnvKey;

if (!GEMINI_API_KEY) {
  console.log("⚠️ 找不到 GEMINI_API_KEY，略過 AI 版更日誌。");
  process.exit(0);
}

try {
  // 取得剛剛加到暫存區的程式碼變更 (準備要 Commit 的內容)
  let gitDiff = execSync('git diff --cached').toString();

  // 若沒有內容，或是只有改到 version-history.ts 本身，就不要遞迴觸發
  if (!gitDiff.trim() || !gitDiff.includes("diff --git") || (gitDiff.includes("version-history.ts") && gitDiff.split("diff --git").length <= 2)) {
    process.exit(0);
  }

  // 避免 token 塞爆
  gitDiff = gitDiff.substring(0, 4000);

  const prompt = `
你是一位營隊活動平台的產品經理。請根據以下程式碼變更，為「營隊使用者（非工程師）」撰寫具體的版本更新說明。

重要規則：
1. 必須描述使用者「打開頁面後實際看到什麼不同」，而不是抽象地說「優化體驗」。
2. 每一條要點都要講清楚是「哪個頁面」或「哪個按鈕」發生了什麼改變。
   好的範例：「教案編輯頁的工具列現在會固定在畫面頂端，捲動時不會消失」
   不好的範例：「優化工具列體驗」
3. 絕對不要出現程式碼名詞（如 component、state、props、hook、CSS、sticky 等）。
4. 絕對不要提到 AI、自動化、腳本等技術細節。
5. 標題要一句話講完這次更新最主要改了什麼。

請嚴格輸出有效的 JSON 格式（不要有任何倒引號或多餘文字）：
{
  "title": "一句話描述這次更新改了什麼 (不超過 25 字)",
  "highlights": [
    "具體描述第一個改動：哪個頁面的什麼東西怎麼變了",
    "具體描述第二個改動...",
    "具體描述第三個改動..."
  ]
}

- highlights 最多 3 點，每點 10～25 字之間。
- 語氣平實、具體、客觀。

以下是這次的程式碼變更內容：
${gitDiff}
`;

  async function generateChangelog() {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
          }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      let aiText = data.candidates[0].content.parts[0].text.trim();
      aiText = aiText.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
      const result = JSON.parse(aiText);

      updateVersionHistory(result);

      // 加回 Commit 暫存區，確保它會一起被存入本次 Commit
      execSync('git add src/data/version-history.ts');
      
    } catch (err) {
      console.error("⚠️ AI 產生紀錄失敗，將略過此步驟以避免阻擋上傳：", err.message || err);
      // Let it exit naturally
    }
  }

  function updateVersionHistory(aiResult) {
    const filePath = path.join(__dirname, '../src/data/version-history.ts');
    let content = fs.readFileSync(filePath, 'utf8');

    const versionMatch = content.match(/version: "(1\.0\.\d+)"/);
    let newVersion = "1.0.6";
    if (versionMatch) {
      const parts = versionMatch[1].split(".");
      newVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2]) + 1}`;
    }

    const newHash = Math.random().toString(36).substring(2, 9);
    const today = new Date();
    today.setHours(today.getHours() + 8);
    const dateStr = today.toISOString().split("T")[0];
    const highlightsArrayStr = aiResult.highlights.map(h => `      "${h}"`).join(",\n");

    const newEntryStr = `  {
    id: "build-${newHash}",
    version: "${newVersion}",
    label: "最新發現",
    date: "${dateStr}",
    title: "${aiResult.title}",
    highlights: [
${highlightsArrayStr}
    ],
  },\n`;

    content = content.replace(
      /export const VERSION_HISTORY: VersionHistoryEntry\[\] = \[\n/,
      `export const VERSION_HISTORY: VersionHistoryEntry[] = [\n${newEntryStr}`
    );
    content = content.replace(/label: "最新發現",/g, 'label: "更新項目",'); // Keep previous as general
    
    fs.writeFileSync(filePath, content);
  }

  // NodeJS 直執行會有 await 的問題，所以包裹用 IIFE
  generateChangelog();

} catch (err) {
  // Let it exit naturally
}
