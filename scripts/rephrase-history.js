const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let rawEnvKey = null;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
  if (match) rawEnvKey = match[1];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || rawEnvKey;

async function rephraseHistory() {
  const filePath = path.join(__dirname, '../src/data/version-history.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Extract the VERSION_HISTORY array string using regex
  const arrayMatch = content.match(/export const VERSION_HISTORY: VersionHistoryEntry\[\] = (\[[\s\S]*?\n\]);/);
  if (!arrayMatch) {
    console.error("Could not parse VERSION_HISTORY");
    process.exit(1);
  }

  let historyStr = arrayMatch[1];
  
  // To avoid evaluating typescript directly, we can just ask AI to re-write the JS object string
  // OR we can parse it by replacing `id:` with `"id":` etc.
  // Actually, we can just send the raw TS string to Gemini and ask it to return the updated TS string!

  const prompt = `
I have a TypeScript array containing version history records. 
The current titles and highlights are mostly technical git commit messages or exaggerated texts.
I need you to rephrase the \`title\` and \`highlights\` of EVERY entry to be:
1. Concise, objective, and practical.
2. Written for regular camp users (NO technical jargon like "JSX syntax errors", "NTP sync", "refactor").
3. Very short (title < 15 words, highlights < 15 words per item).
4. If it mentions AI integration or auto-changelog, rename it to "優化版本紀錄說明方式".

Please return ONLY the updated TypeScript array code, starting with \`[\` and ending with \`]\`. Maintain the exact same \`id\`, \`version\`, \`label\`, and \`date\` fields. Do NOT output any markdown blocks like \`\`\`typescript, just the raw code.

Here is the array:
${historyStr}
`;

  console.log("Sending to Gemini for rewriting...");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json();
  if (data.error) {
    console.error(data.error);
    return;
  }

  let aiText = data.candidates[0].content.parts[0].text.trim();
  aiText = aiText.replace(/^```(typescript|ts|javascript|js)?\n/i, "").replace(/\n```$/i, "").trim();

  content = content.replace(arrayMatch[1], aiText);

  // Fix the latest commit which we just generated (the one complaining about AI text)
  // Let's explicitly replace the title of "feat: implement WhatsNew..."
  // Oh wait, AI will also rewrite that!
  
  fs.writeFileSync(filePath, content);
  console.log("History successfully rephrased and updated in src/data/version-history.ts!");
}

rephraseHistory();
