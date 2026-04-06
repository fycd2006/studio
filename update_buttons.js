const fs = require('fs');

function updatePageTsx() {
  let content = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

  // Unified Primary Actions (Add, Download)
  const addBtnClassesRegex = /className=\{cn\(\"shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-\[#2C2A28\] h-8 md:h-9 px-2 md:px-3\.5 font-semibold text-\[11px\] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm\", !isAdmin && \"opacity-60\"\)\}/g;
  content = content.replace(addBtnClassesRegex, 'className={cn("shrink-0 bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28] h-9 px-3 md:px-4 font-bold text-xs transition-all cursor-pointer rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0", !isAdmin && "opacity-60")}');

  const downloadBtnClassesRegex = /className=\{cn\([\s\S]*?\"shrink-0 h-8 md:h-9 px-2 md:px-3\.5 font-semibold text-\[11px\] md:text-xs transition-colors cursor-pointer rounded-md shadow-sm\",[\s\S]*?\"bg-orange-600 hover:bg-orange-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-\[#2C2A28\]\",[\s\S]*?\)\}/g;
  content = content.replace(downloadBtnClassesRegex, `className={cn(
 "shrink-0 h-9 px-3 md:px-4 font-bold text-xs transition-all cursor-pointer rounded-xl shadow-[0_2px_10px_rgba(234,88,12,0.2)] hover:shadow-[0_4px_16px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0",
 "bg-orange-600 hover:bg-orange-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28]",
 (isBatchDownloading || plans.length === 0) && "opacity-60 cursor-not-allowed hover:shadow-none hover:translate-y-0"
 )}`);

  // Toggles Wrapper (View Type, Groups, Sort)
  const viewToggleWrapperRegex = /className=\"flex items-center bg-stone-100 dark:bg-slate-800 p-0\.5 md:p-1 rounded-md dark: shrink-0 border-none shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] dark:shadow-\[0_8px_30px_rgba\(255,255,255,0\.01\)\]\"/g;
  content = content.replace(viewToggleWrapperRegex, 'className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md"');

  const groupToggleWrapperRegex = /className=\"flex items-center bg-stone-100 dark:bg-slate-800 p-0\.5 md:p-1 rounded-lg dark: shadow-sm shrink-0 border-none\"/g;
  content = content.replace(groupToggleWrapperRegex, 'className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md"');

  // Toggle Buttons inside
  // For views
  content = content.replace(/\"p-1 md:p-1\.5 rounded-sm transition-all cursor-pointer\"/g, '"p-1.5 md:px-2.5 md:py-1.5 rounded-[8px] transition-all cursor-pointer"');
  content = content.replace(/\"bg-white dark:bg-slate-700 text-\[#2C2A28\] dark:text-amber-400 shadow-sm\"/g, '"bg-white dark:bg-slate-700 text-[#2C2A28] dark:text-amber-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-stone-900/5 dark:ring-white/10 scale-100"');
  content = content.replace(/\"text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300\"/g, '"text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 scale-95 hover:scale-100"');

  // For groups and sorts
  content = content.replace(/\"px-2 md:px-3 py-1 md:py-1\.5 rounded-md text-\[10px\] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap/g, '"px-2.5 md:px-3 py-1.5 rounded-[8px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap');

  fs.writeFileSync('src/app/plans/page.tsx', content, 'utf8');
}

function updatePlanEditorTsx() {
  let content = fs.readFileSync('src/components/PlanEditor.tsx', 'utf8');

  // Replace default button styles in actionBar to rounded-xl, 
  const ghostBtnRegex = /\"h-9 w-9 rounded-lg bg-transparent text-\[#2C2A28\] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-\[0_2px_8px_rgba\(0,0,0,0\.04\)\] hover:shadow-md transition-shadow\"/g;
  content = content.replace(ghostBtnRegex, '"h-9 w-9 rounded-xl bg-transparent text-[#2C2A28] dark:text-white hover:opacity-100 opacity-70 hover:bg-stone-200/70 dark:hover:bg-slate-800/70 transition-all border-none hover:shadow-sm"');

  const exportBtnRegex = /\"h-9 px-3 rounded-lg font-bold text-xs bg-transparent text-\[#2C2A28\] dark:text-white hover:opacity-100 opacity-90 transition-opacity border-none shadow-\[0_2px_8px_rgba\(0,0,0,0\.04\)\] hover:shadow-md transition-shadow\"/g;
  content = content.replace(exportBtnRegex, '"h-9 px-4 rounded-xl font-bold text-xs bg-stone-200/50 dark:bg-slate-800/50 text-[#2C2A28] dark:text-white hover:opacity-100 opacity-90 hover:bg-stone-200 dark:hover:bg-slate-700 transition-all border-none shadow-sm hover:shadow-md"');
  
  const historyBtnRegex = /\"h-9 w-9 p-0 flex justify-center items-center rounded-lg font-bold text-xs bg-transparent transition-all\"/g;
  content = content.replace(historyBtnRegex, '"h-9 w-9 p-0 flex justify-center items-center rounded-xl font-bold text-xs bg-stone-200/50 dark:bg-slate-800/50 transition-all shadow-sm hover:shadow-md"');

  fs.writeFileSync('src/components/PlanEditor.tsx', content, 'utf8');
}

updatePageTsx();
updatePlanEditorTsx();
console.log('Action Bar UI Synced!');
