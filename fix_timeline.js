const fs = require('fs');
const content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8');

const target =  <div className=""grid grid-cols-2 gap-4"">
 <div className=""space-y-2"">
 <span className=""text-[9px] font-bold text-stone-400 uppercase tracking-tighter"">Start</span>
 <input
 type=""date""
 value={(activeCamp as any)[field.startKey] || """"}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className=""w-full bg-white dark:bg-slate-800 border-none rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus: dark:focus: outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)]""
 />
 </div>
 <div className=""space-y-2"">
 <span className=""text-[9px] font-bold text-stone-400 uppercase tracking-tighter"">End</span>
 <input
 type=""date""
 value={(activeCamp as any)[field.endKey] || """"}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className=""w-full bg-white dark:bg-slate-800 border-none rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus: dark:focus: outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)]""
 />
 </div>
 </div>;

const replacement =  {field.type === ""single"" ? (
 <div className=""flex w-full mt-4"">
 <input
 type=""date""
 value={(activeCamp as any)[field.startKey] || """"}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className=""w-full bg-white dark:bg-slate-800 border-none rounded-full px-4 py-3 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center""
 />
 </div>
 ) : (
 <div className=""flex items-center w-full bg-white dark:bg-slate-800 rounded-full px-2 py-1 shadow-[0_8px_30px_rgba(140,120,100,0.05)] group focus-within:ring-1 focus-within:ring-orange-500 dark:focus-within:ring-amber-400 transition-all mt-4"">
 <input
 type=""date""
 value={(activeCamp as any)[field.startKey] || """"}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className=""flex-1 bg-transparent border-none rounded-l-full px-2 py-2 font-bold text-xs outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center text-stone-500 dark:text-slate-400 focus:text-[#2C2A28] dark:focus:text-white""
 />
 <span className=""text-stone-300 dark:text-slate-600 font-black text-xs mx-1"">➔</span>
 <input
 type=""date""
 value={(activeCamp as any)[field.endKey] || """"}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className=""flex-1 bg-transparent border-none rounded-r-full px-2 py-2 font-bold text-xs outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center text-stone-500 dark:text-slate-400 focus:text-[#2C2A28] dark:focus:text-white""
 />
 </div>
 )};

const newContent = content.replace(target, replacement);

if (content === newContent) {
  console.log(""No changes made. Target not found."");
} else {
  fs.writeFileSync('src/app/settings/page.tsx', newContent, 'utf-8');
  console.log(""Updated src/app/settings/page.tsx successfully!"");
}
