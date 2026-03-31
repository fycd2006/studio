const fs = require('fs');
const content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8');

const t2 = content.split('/* ── TIMELINE SETUP ─────────────── */}')[1];
const targetContent = t2.split('{/* ── ACTIVITY TYPES (ADMIN ONLY) ── */}')[0]; 

// targetContent is: 
/*
 {isAdmin && activeCamp && (
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Calendar className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('TIMELINE_SETUP')}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 ...
 </div>
 </section>
 )}
*/

// I'll rebuild this exact section to be safe

const newTimelineSection = `
 {isAdmin && activeCamp && (
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Calendar className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('TIMELINE_SETUP')}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col space-y-2">
 {timelineFields.map((field) => {
 const Icon = field.icon;
 return (
 <div key={field.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-2 md:px-0 border-b border-stone-100 dark:border-slate-800/50 last:border-0 group">
 <label className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-slate-400 min-w-[140px] transition-colors group-hover:text-stone-700 dark:group-hover:text-slate-300">
 <Icon className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {field.label}
 </label>
 <div className="w-full sm:w-auto sm:min-w-[340px] flex-1 sm:flex-none">
 {field.type === "single" ? (
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="w-full bg-[#FBF9F6] dark:bg-slate-900 border border-transparent hover:border-stone-200 dark:hover:border-slate-700 focus:border-orange-500 dark:focus:border-amber-400 rounded-full px-4 py-2.5 font-bold text-sm outline-none transition-all text-[#2C2A28] dark:text-white shadow-inner [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer text-center"
 />
 ) : (
 <div className="flex items-center w-full bg-[#FBF9F6] dark:bg-slate-900 rounded-full shadow-inner border border-transparent hover:border-stone-200 dark:hover:border-slate-700 focus-within:border-orange-500 dark:focus-within:border-amber-400 transition-all">
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-l-full px-4 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
 />
 <span className="text-stone-300 dark:text-slate-600 font-black text-sm px-1">➔</span>
 <input
 type="date"
 value={(activeCamp as any)[field.endKey] || ""}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-r-full px-4 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
 />
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 )}
`;

const finalContent = content.split('/* ── TIMELINE SETUP ─────────────── */}')[0] + '/* ── TIMELINE SETUP ─────────────── */}\n' + newTimelineSection + '\n {/* ── ACTIVITY TYPES (ADMIN ONLY) ── */}' + content.split('{/* ── ACTIVITY TYPES (ADMIN ONLY) ── */}')[1];

fs.writeFileSync('src/app/settings/page.tsx', finalContent, 'utf-8');
console.log("Replaced perfectly!");
