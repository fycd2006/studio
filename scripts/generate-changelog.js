/**
 * 自動產生版本紀錄並立即 Commit (AI Auto-Changelog & Committer)
 * 
 * 使用方式：
 * 1. 確保已設定環境變數: GEMINI_API_KEY
 * 2. 完成一段實作後，不用下 git commit，直接下指令：
 *    $env:GEMINI_API_KEY="AIza..."
 *    npm run release "修復了什麼問題標題"
 * 
 * 腳本流程：
 * 1. 將您目前所有變更加到暫存區 (git add .)
 * 2. 獲取這些剛加入的變更內容 (git diff --cached)
 * 3. 送給 AI，請 AI 產生給用戶看的版本紀錄內容
 * 4. 將結果注入 src/data/version-history.ts
 * 5. 將更新後的 version-history.ts 加入暫存區
 * 6. 使用您的參數執行 git commit
 * 7. (可選) 您隨後自行 push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ 錯誤：找不到 GEMINI_API_KEY。請設定環境變數，或使用 `GEMINI_API_KEY=your_key node scripts/generate-changelog.js` 來執行。");
  process.exit(1);
}

// 取得用戶輸入的 Commit 訊息 (若無則預設)
const commitMessage = process.argv[2] || "Update & Polish Features";

try {
  // 1. 把所有變更加入追蹤
  console.log("📦 正在追蹤最新變更...");
  execSync('git add .');

  // 2. 取得剛剛加到暫存區的程式碼變更
  let gitDiff = execSync('git diff --cached').toString();

  if (!gitDiff.trim()) {
    console.log("ℹ️ 目前沒有任何程式碼變更可以記錄。");
    process.exit(0);
  }

  // 避免 diff 過長塞爆 Token
  gitDiff = gitDiff.substring(0, 4000);

  const prompt = `
你是一位產品經理兼技術人員。我們剛發布了一次版本更新，請根據以下的 Git Diff，幫我寫出一段給「終端營隊使用者（非工程師）」看的 Release Note（版本更新日誌）。

請嚴格輸出**有效的 JSON 格式**（不要有任何倒引號或多餘文字），並包含以下欄位：
{
  "title": "一段總結本次更新的標題 (不超過 30 字)",
  "highlights": [
    "第一點重點修正或新功能描述",
    "第二點重點描述...",
    "第三點重點描述..."
  ]
}

- 語氣：具有活力、專業且鼓勵性 (像是 UIUXPRO MAX 的風格)。
- 內容：請從 diff 中的變更推測對使用者的實際幫助（如「版面設計升級」、「修復無法操作的問題」等）。
- 重點事項：最多提煉出 3 到 4 點最重要的改變即可。不能出現任何技術名詞。

此為剛被添加進入準備上傳的更動：
${gitDiff}
`;

  async function generateChangelog() {
    console.log("🚀 正在請 AI 撰寫更新日誌...");
    
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
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      let aiText = data.candidates[0].content.parts[0].text.trim();

      // Remove markdown code blocks if any
      aiText = aiText.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();

      const result = JSON.parse(aiText);
      console.log("✅ AI 生成完成：\n", result);

      updateVersionHistory(result);

      // 最後，一併把 version-history 給加到準備提交的隊伍裡
      console.log("💾 正在包裹成 Commit...");
      execSync('git add src/data/version-history.ts');
      execSync(`git commit -m "${commitMessage}"`);

      console.log(`🎉 成功！剛才的變更與 AI 版本更新記錄已完美收錄進本地端 Commit 中。`);
      console.log(`請確認無誤後，輸入 \`git push\` 將心血發布上網。`);

    } catch (err) {
      console.error("❌ 產生失敗：", err.message || err);
      console.log("已還原 git 暫存區，請檢查 API_KEY 是否正確。");
      execSync('git reset HEAD');
    }
  }

  function updateVersionHistory(aiResult) {
    const filePath = path.join(__dirname, '../src/data/version-history.ts');
    let content = fs.readFileSync(filePath, 'utf8');

    // 取得最新版的版本號 (簡單遞增修訂號)
    const versionMatch = content.match(/version: "(1\.0\.\d+)"/);
    let newVersion = "1.0.6";
    if (versionMatch) {
      const parts = versionMatch[1].split(".");
      newVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2]) + 1}`;
    }

    // 生產一個臨時 ID (因為還沒真正 commit 出 Hash，我們用 date string 代替)
    const newHash = Math.random().toString(36).substring(2, 9);

    const today = new Date();
    today.setHours(today.getHours() + 8);
    const dateStr = today.toISOString().split("T")[0];

    const highlightsArrayStr = aiResult.highlights.map(h => `      "${h}"`).join(",\n");

    const newEntryStr = `  {
    id: "build-${newHash}",
    version: "${newVersion}",
    label: "最新更新",
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

    content = content.replace(/label: "最新穩定版",/g, 'label: "更新項目",');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已將新版本 (v${newVersion}) 寫入版本紀錄。`);
  }

  generateChangelog();

} catch (err) {
  console.error("執行出現錯誤：", err.message);
}
