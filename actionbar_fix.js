const fs = require('fs');

let content = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

// 1. Add Btn
const addBtnClassOld = 'className={cn("shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28] h-8 md:h-9 px-2 md:px-3.5 font-semibold text-[11px] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm", !isAdmin && "opacity-60")}';
const addBtnClassNew = 'className={cn("shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28] h-9 px-3 md:px-4 font-bold text-xs transition-all cursor-pointer rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0", !isAdmin && "opacity-60")}';
content = content.replace(addBtnClassOld, addBtnClassNew);

// 2. Download Btn
const dlBtnOld = `className={cn(
 "shrink-0 h-8 md:h-9 px-2 md:px-3.5 font-semibold text-[11px] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm",
 "bg-orange-600 hover:bg-orange-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28]",
 (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed"
 )}`;
const dlBtnNew = `className={cn(
 "shrink-0 h-9 px-3 md:px-4 font-bold text-xs transition-all cursor-pointer rounded-xl shadow-[0_2px_10px_rgba(234,88,12,0.2)] hover:shadow-[0_4px_16px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0",
 "bg-orange-600 hover:bg-orange-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28]",
 (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed hover:shadow-none hover:-translate-y-0"
 )}`;
content = content.replace(dlBtnOld, dlBtnNew);

// 3. Wrappers
const viewWrapperOld = `className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-md dark: shrink-0 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]"`;
const wrapperNew = `className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md"`;
content = content.replace(viewWrapperOld, wrapperNew);

const groupWrapperOld = `className="flex items-center bg-stone-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-lg dark: shadow-sm shrink-0 border-none"`;
content = content.replaceAll(groupWrapperOld, wrapperNew);

// 4. Buttons inner parts
content = content.replaceAll('"p-1 md:p-1.5 rounded-sm transition-all cursor-pointer"', '"p-1.5 md:px-2.5 md:py-1.5 rounded-[8px] transition-all cursor-pointer"');
content = content.replaceAll('"bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-sm"', '"bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-stone-900/5 dark:ring-white/10 scale-100"');
content = content.replaceAll('"text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300"', '"text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 scale-95 hover:scale-100"');
content = content.replaceAll('"px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap"', '"px-2.5 md:px-3 py-1.5 rounded-[8px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap"');

fs.writeFileSync('src/app/plans/page.tsx', content, 'utf8');

// The PlanEditor.tsx already has the styles from previous successful run since I only git restored page.tsx
console.log('Safe Replace completed');
