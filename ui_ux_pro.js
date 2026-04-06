const fs = require('fs');

let pageContent = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

// The button rendering for groups in the action bar:
// {groups.map((group) => (
//  <button key={group.id} onClick={() => { setSwipeDirection(1); setFilterGroup(group.slug); }} className={cn("px-2.5 md:px-3 py-1.5 rounded-[8px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap", filterGroup === group.slug ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-stone-900/5 dark:ring-white/10 scale-100" : "text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 scale-95 hover:scale-100")}>

const oldGroupBtn = `filterGroup === group.slug ? "bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-stone-900/5 dark:ring-white/10 scale-100" : "text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 scale-95 hover:scale-100"`;

const newGroupBtn = `filterGroup === group.slug ? \`\${getUnifiedGroupBadgeParams(group.slug, group.nameZh).bg} text-white shadow-md scale-100 ring-1 \${getUnifiedGroupBadgeParams(group.slug, group.nameZh).ring}\` : "text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 scale-95 hover:scale-100"`;

if (pageContent.includes(oldGroupBtn)) {
  pageContent = pageContent.replace(oldGroupBtn, newGroupBtn);
  fs.writeFileSync('src/app/plans/page.tsx', pageContent, 'utf8');
  console.log("Updated active states for Plans filter.");
} else {
  console.log("Plans active state regex not found.");
}

// Admin Section Updates
let adminContent = fs.readFileSync('src/components/AdminSection.tsx', 'utf8');

const adminTabsOld = `TabsList className="bg-stone-100 dark:bg-slate-800/40 p-1 rounded-xl h-11 w-full sm:w-auto justify-start shadow-inner grid grid-cols-3 md:flex custom-scrollbar gap-1"`;
const adminTabsNew = `TabsList className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md h-11 w-full sm:w-auto overflow-x-auto custom-scrollbar gap-1"`;
adminContent = adminContent.replace(adminTabsOld, adminTabsNew);

const adminTabsTriggerOld1 = `className="rounded-lg font-bold text-[10px] gap-1.5 px-3 md:px-6 tracking-widest uppercase h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-amber-400"`;
const adminTabsTriggerNew1 = `className="rounded-[8px] font-extrabold text-[10px] md:text-[11px] gap-1.5 px-3 md:px-6 tracking-widest uppercase h-9 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.06)] data-[state=active]:ring-1 data-[state=active]:ring-stone-900/5 dark:data-[state=active]:ring-white/10 data-[state=active]:text-orange-600 dark:data-[state=active]:text-amber-400 data-[state=active]:scale-100 scale-95 data-[state=inactive]:text-stone-400 dark:data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-stone-700 dark:data-[state=inactive]:hover:text-slate-200 data-[state=inactive]:hover:scale-100"`;
adminContent = adminContent.replaceAll(adminTabsTriggerOld1, adminTabsTriggerNew1);

adminContent = adminContent.replaceAll('rounded-lg bg-transparent text-[#2C2A28]', 'rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white/50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28]');

fs.writeFileSync('src/components/AdminSection.tsx', adminContent, 'utf8');
console.log("Updated AdminSection.tsx UI");

// Plan Editor updates
let editorContent = fs.readFileSync('src/components/PlanEditor.tsx', 'utf8');

// Give standard look to buttons
editorContent = editorContent.replaceAll('rounded-lg bg-transparent text-[#2C2A28] dark:text-white', 'rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm');

fs.writeFileSync('src/components/PlanEditor.tsx', editorContent, 'utf8');
console.log("Updated PlanEditor.tsx UI");

// Markdown Toolbar Button
let mdContent = fs.readFileSync('src/components/MarkdownToolbar.tsx', 'utf8');

mdContent = mdContent.replaceAll('className="h-8 w-8 rounded-lg', 'className="h-8 w-8 rounded-xl');
mdContent = mdContent.replaceAll('border-none sm:border', 'border-none sm:border rounded-xl shadow-sm');
mdContent = mdContent.replaceAll('shadow-2xl z-[60]"', 'shadow-2xl z-[60] rounded-xl"');

fs.writeFileSync('src/components/MarkdownToolbar.tsx', mdContent, 'utf8');
console.log("Updated MarkdownToolbar.tsx UI");
