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
你是一位產品經理兼技術人員。我們準備發布一次版本更新，請根據以下的 Git Diff，幫我寫出一段給「終端營隊使用者（非工程師）」看的 Release Note（版本更新日誌）。

請嚴格輸出**有效的 JSON 格式**（不要有任何倒引號或多餘文字），並包含以下欄位：
{
  "title": "一段總結本次更新的標題 (不超過 30 字)",
  "highlights": [
    "第一點重點修正或新功能描述",
    "第二點重點描述...",
    "第三點重點描述..."
  ]
}

- 語氣：客觀、精簡、務實，不要過度誇大或推銷。使用平實且簡潔的短句描述。
- 內容：請直接講述對使用者的實際幫助（如「修復 OOO 無法操作的問題」、「優化版面配置」等）。不要提到底層實作細節，絕對不要提到「導入 AI」或「自動生成版本紀錄」等字眼，使用者不需要知道這些。若有 AI 生成相關的變更，請一律改寫為「優化版本紀錄說明方式」。
- 重點事項：最多提煉出 2 到 3 點最重要的改變即可，每一點的字數盡量少於 15 字，絕不要長篇大論。絕不能出現技術名詞或誇飾語氣。

此為即將儲存的改動：
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
