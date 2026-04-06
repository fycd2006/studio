const fs = require('fs');

// 1. Update utils.ts
let utilsContent = fs.readFileSync('src/lib/utils.ts', 'utf8');
if (!utilsContent.includes('getUnifiedGroupBadgeParams')) {
  utilsContent += `
export function getUnifiedGroupBadgeParams(slug: string = '', nameZh: string = '') {
  const norm = (slug + nameZh).toLowerCase();
  if (norm.includes('activity') || norm.includes('活動')) {
    return { bg: 'bg-orange-500', gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20', lightBg: 'bg-orange-50 dark:bg-orange-400/10', lightText: 'text-orange-600 dark:text-orange-400', ring: 'border-orange-500/30' };
  }
  if (norm.includes('teaching') || norm.includes('教學')) {
    return { bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', lightBg: 'bg-emerald-50 dark:bg-emerald-400/10', lightText: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-500/30' };
  }
  if (norm.includes('admin') || norm.includes('行政')) {
    return { bg: 'bg-blue-500', gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/20', lightBg: 'bg-blue-50 dark:bg-blue-400/10', lightText: 'text-blue-600 dark:text-blue-400', ring: 'border-blue-500/30' };
  }
  if (norm.includes('creative') || norm.includes('美宣') || norm.includes('script') || norm.includes('劇本')) {
    return { bg: 'bg-violet-500', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/20', lightBg: 'bg-violet-50 dark:bg-violet-400/10', lightText: 'text-violet-600 dark:text-violet-400', ring: 'border-violet-500/30' };
  }
  return { bg: 'bg-stone-500', gradient: 'from-stone-400 to-stone-500', shadow: 'shadow-stone-400/20', lightBg: 'bg-stone-100 dark:bg-stone-400/10', lightText: 'text-stone-600 dark:text-stone-400', ring: 'border-stone-500/30' };
}
`;
  fs.writeFileSync('src/lib/utils.ts', utilsContent, 'utf8');
}

// 2. Fix page.tsx (updatePlan reference + dots + use Unified settings)
let pageContent = fs.readFileSync('src/app/plans/page.tsx', 'utf8');
pageContent = pageContent.replace('const { plans, addPlan, groups, setActivePlanId, activeCampId, camps, deletePlan } = usePlans();', 'const { plans, addPlan, groups, setActivePlanId, activeCampId, camps, deletePlan, updatePlan } = usePlans();');

// Inject import for getUnifiedGroupBadgeParams if not present
if (!pageContent.includes('getUnifiedGroupBadgeParams')) {
  pageContent = pageContent.replace('import { cn } from "@/lib/utils";', 'import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";');
}

const newGetBadgeColorClass = `const getBadgeColorClass = (plan: typeof plans[number]) => {
    const group = getPlanGroup(plan);
    const slug = group ? group.slug : plan.category;
    const nameZh = group ? group.nameZh : '';
    const params = getUnifiedGroupBadgeParams(slug, nameZh);
    return \`bg-gradient-to-r \${params.gradient} text-white shadow-sm \${params.shadow}\`;
  };`;
  
pageContent = pageContent.replace(/const getBadgeColorClass = \(plan: typeof plans\[number\]\) => \{[\s\S]*?\};/, newGetBadgeColorClass);

const boardDotRegex = /const colorPool = \['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'\];\s*const color = colorPool\[index % colorPool\.length\];/
const newBoardDot = `const color = getUnifiedGroupBadgeParams(group.slug, group.nameZh).bg;`;
pageContent = pageContent.replace(boardDotRegex, newBoardDot);

fs.writeFileSync('src/app/plans/page.tsx', pageContent, 'utf8');

// 3. Fix PlanEditor.tsx
let editorContent = fs.readFileSync('src/components/PlanEditor.tsx', 'utf8');
if (!editorContent.includes('getUnifiedGroupBadgeParams')) {
  editorContent = editorContent.replace('import { cn } from "@/lib/utils";', 'import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";');
}

// Replace the hardcoded block in PlanEditor with the unified logic
const badBadgeLogicRegex = /currentPlan\.category === \"activity\"\s*\?\s*\"bg-blue-50 dark:bg-blue-400\/10 text-blue-600 dark:text-blue-400 \"\s*:\s*\"bg-emerald-50 dark:bg-emerald-400\/10 text-emerald-600 dark:text-emerald-400 \"/;
if (badBadgeLogicRegex.test(editorContent)) {
  const replacementBlock = `(() => {
                        const params = getUnifiedGroupBadgeParams(currentGroup?.slug || currentPlan.category, currentGroup?.nameZh || '');
                        return \`\${params.lightBg} \${params.lightText}\`;
                      })()`;
  editorContent = editorContent.replace(badBadgeLogicRegex, replacementBlock);
}

fs.writeFileSync('src/components/PlanEditor.tsx', editorContent, 'utf8');
console.log('Update Complete!');
