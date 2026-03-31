const fs = require('fs');
const content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8');

const targetStr = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {timelineFields.map((field) => {
 const Icon = field.icon;
 return (
 <div key={field.label} className="p-6 bg-[#FBF9F6]/50 dark:bg-slate-900/50 rounded-xl dark: space-y-4 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500">
 <Icon className="w-3.5 h-3.5 text-orange-500 dark:text-amber-400" /> {field.label}
 </label>
 {field.type === "single" ? (
 <div className="flex w-full mt-4">
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="w-full bg-white dark:bg-slate-800 border-none rounded-full px-4 py-3 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center"
 />
 </div>
 ) : (
 <div className="flex items-center w-full bg-white dark:bg-slate-800 rounded-full px-2 py-1 shadow-[0_8px_30px_rgba(140,120,100,0.05)] group focus-within:ring-1 focus-within:ring-orange-500 dark:focus-within:ring-amber-400 transition-all mt-4">
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="flex-1 bg-transparent border-none rounded-l-full px-2 py-2 font-bold text-xs outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center text-stone-500 dark:text-slate-400 focus:text-[#2C2A28] dark:focus:text-white w-full"
 />
 <span className="text-stone-300 dark:text-slate-600 font-black text-xs mx-1">➔</span>
 <input
 type="date"
 value={(activeCamp as any)[field.endKey] || ""}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className="flex-1 bg-transparent border-none rounded-r-full px-2 py-2 font-bold text-xs outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center text-stone-500 dark:text-slate-400 focus:text-[#2C2A28] dark:focus:text-white w-full"
 />
 </div>
 )}
 </div>
 );
 })}
 </div>`;

const newStr = `<div className="flex flex-col space-y-2">
 {timelineFields.map((field) => {
 const Icon = field.icon;
 return (
 <div key={field.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-2 md:px-0 border-b border-stone-100 dark:border-slate-800/50 last:border-0 group">
 <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-stone-500 dark:text-slate-400 min-w-[140px] transition-colors group-hover:text-stone-700 dark:group-hover:text-slate-300">
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
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-l-full px-3 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
 />
 <span className="text-stone-300 dark:text-slate-600 font-black text-sm px-2">➔</span>
 <input
 type="date"
 value={(activeCamp as any)[field.endKey] || ""}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-r-full px-3 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
 />
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>`;

let newContent = content.replace(targetStr, newStr);

// A fallback if exact string matching fails due to line endings
if (newContent === content) {
    const normalize = s => s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    const normalizedTarget = normalize(targetStr);
    const startIdx = content.indexOf('<div className="grid grid-cols-1');
    const endStr = '</div>\n </div>\n </section>';
    if (startIdx !== -1) {
       console.log("Using slice replacement...");
       const lines = content.split('\n');
       const startIndexStr = lines.findIndex(l => l.includes('<div className="grid grid-cols-1 '));
       const endIndexStr = lines.findIndex((l, i) => i > startIndexStr && l.includes('</section>') && lines[i-1].includes('</div>') && lines[i-2].includes('</div>'));
       
       if (startIndexStr !== -1 && endIndexStr !== -1) {
           const before = lines.slice(0, startIndexStr).join('\n');
           const after = lines.slice(endIndexStr - 2).join('\n');
           newContent = before + '\n' + newStr + '\n' + after;
       }
    }
}

fs.writeFileSync('src/app/settings/page.tsx', newContent, 'utf-8');
console.log("Updated page.tsx layout successfully!");
