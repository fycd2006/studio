const fs = require('fs');
const content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('<div className="grid grid-cols-2 gap-4">'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</div>') && lines[i-1].includes('</div>') && lines[i-2].includes('/>'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = ` {field.type === "single" ? (
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
 )}`;
  const newLines = [...lines.slice(0, startIdx), replacement, ...lines.slice(endIdx + 1)];
  fs.writeFileSync('src/app/settings/page.tsx', newLines.join('\n'), 'utf-8');
  console.log('Updated src/app/settings/page.tsx successfully!');
} else {
  console.log('Could not find the target section.');
}
