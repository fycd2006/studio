const fs = require('fs');

let pageContent = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

// Inject unified settings
if (!pageContent.includes('getUnifiedGroupBadgeParams')) {
  pageContent = pageContent.replace('import { cn } from "@/lib/utils";', 'import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";');
}

// 1. Grid View Badge
const gridOldBadge = `className={cn("px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border-none", plan.category === "activity" ? "bg-blue-50 text-blue-600  dark:bg-blue-900/30 dark:text-blue-400 dark:" : "bg-emerald-50 text-emerald-600  dark:bg-emerald-900/30 dark:text-emerald-400 dark:")}`;
const gridNewBadge = `className={cn("px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border-none inline-flex items-center gap-1", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return \`\${params.lightBg} \${params.lightText} drop-shadow-sm ring-1 \${params.ring}\`; })())}`;
pageContent = pageContent.replace(gridOldBadge, gridNewBadge);

// 2. List View Badge
const listOldBadge = `className={cn("px-2 py-0 text-[9px] font-bold uppercase border-none", plan.category === "activity" ? "bg-blue-50 text-blue-600  dark:bg-blue-900/30 dark:text-blue-400 dark:" : "bg-emerald-50 text-emerald-600  dark:bg-emerald-900/30 dark:text-emerald-400 dark:")}`;
const listNewBadge = `className={cn("px-2 py-0 text-[9px] font-bold uppercase border-none inline-flex items-center gap-1", (() => { const g = getPlanGroup(plan); const params = getUnifiedGroupBadgeParams(g?.slug || plan.category, g?.nameZh || ''); return \`\${params.lightBg} \${params.lightText} drop-shadow-sm ring-1 \${params.ring}\`; })())}`;
pageContent = pageContent.replace(listOldBadge, listNewBadge);

// 3. Download btn class (if missed) - note from earlier: it had a slight mismatch in my actionbar_fix
// let's double check if we can fix anything else.

// 4. Board dot replace
const boardDotRegex = /const colorPool = \['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'\];\s*const color = colorPool\[index % colorPool\.length\];/
const newBoardDot = `const color = getUnifiedGroupBadgeParams(group.slug, group.nameZh).bg;`;
pageContent = pageContent.replace(boardDotRegex, newBoardDot);

fs.writeFileSync('src/app/plans/page.tsx', pageContent, 'utf8');

console.log('Update Complete! page.tsx badges restored.');
