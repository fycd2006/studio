const fs = require('fs');

let content = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

// 1. Header Typography
const oldHeader = `className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A28] dark:text-white mb-1.5 sm:mb-2"`;
const newHeader = `className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-stone-900 to-stone-500 dark:from-white dark:to-slate-400 mb-1.5 sm:mb-2 drop-shadow-sm"`;
content = content.replace(oldHeader, newHeader);

// 2. Grid Cards Glass Effect & Animation
const oldGridCard = `className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 text-left w-full group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/50 flex flex-col h-full cursor-pointer shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none"`;
const newGridCard = `className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-5 sm:p-7 text-left w-full group transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(140,120,100,0.08)] dark:hover:shadow-black/60 flex flex-col h-full cursor-pointer shadow-[0_4px_20px_rgba(140,120,100,0.03)] ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-black/[0.06] dark:hover:ring-white/10"`;
content = content.replace(oldGridCard, newGridCard);

// 3. Board Column Containers
const oldBoardCol = `className="flex-1 min-w-[320px] max-w-sm flex flex-col bg-stone-100/50 dark:bg-slate-800/30 rounded-2xl p-4 dark: shadow-sm snap-center border-none"`;
const newBoardCol = `className="flex-1 min-w-[320px] max-w-sm flex flex-col bg-stone-100/40 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl p-4 ring-1 ring-stone-900/5 dark:ring-white/5 shadow-inner snap-center border-none"`;
content = content.replace(oldBoardCol, newBoardCol);

// 4. Board Cards
const oldBoardCard = `className="bg-white dark:bg-slate-800 border-none rounded-xl p-4 cursor-pointer hover: dark:hover: transition-all shadow-[0_8px_30px_rgba(140,120,100,0.05)]"`;
const newBoardCard = `className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-none rounded-xl p-4 cursor-pointer hover:-translate-y-1 transition-all shadow-sm hover:shadow-[0_8px_20px_rgba(140,120,100,0.08)] ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-black/5 dark:hover:ring-white/10"`;
content = content.replace(oldBoardCard, newBoardCard);

// 5. List View Table Floating Rows
// table
const oldTable = `<table className="w-full text-sm text-left">`;
const newTable = `<table className="w-full text-sm text-left border-collapse" style={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>`;
content = content.replace(oldTable, newTable);

// thead
const oldThead = `<thead className="bg-[#FBF9F6] dark:bg-slate-900/50  dark:">`;
const newThead = `<thead className="bg-transparent">`;
content = content.replace(oldThead, newThead);

// tbody
const oldTbody = `<tbody className="divide-y divide-stone-100 dark:divide-slate-700/50">`;
const newTbody = `<tbody>`;
content = content.replace(oldTbody, newTbody);

// tr (List View)
const oldTr = `className="hover:bg-[#FBF9F6] dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"`;
const newTr = `className="bg-white dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/80 transition-all cursor-pointer group shadow-sm hover:shadow-[0_8px_30px_rgba(140,120,100,0.06)] hover:-translate-y-0.5"`;
content = content.replace(oldTr, newTr);

// List View Table border-radius for td (first and last child trick in tailwind: first:rounded-l-xl last:rounded-r-xl)
const oldTd1 = `className="px-6 py-4 font-semibold text-[#2C2A28] dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors"`;
const newTd1 = `className="px-6 py-4 font-semibold text-[#2C2A28] dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors rounded-l-xl border-y border-l border-transparent"`;
content = content.replace(oldTd1, newTd1);

const oldTdLast = `<td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>`;
const newTdLast = `<td className="px-6 py-4 rounded-r-xl border-y border-r border-transparent" onClick={(e) => e.stopPropagation()}>`;
content = content.replace(oldTdLast, newTdLast);

// Strip away the parent bg-white container for the table (it was a shadow wrap, we want the rows to float freely)
const oldTableWrap = `<div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">`;
const newTableWrap = `<div className="w-full">`;
content = content.replace(oldTableWrap, newTableWrap);

fs.writeFileSync('src/app/plans/page.tsx', content, 'utf8');
console.log('UIUXPRO MAX applied to page.tsx');
