const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

content = content.replace('{ startKey: "meeting1StartDate" as const, endKey: "meeting1EndDate" as const, label: "一籌", icon: Clock },', '{ startKey: "meeting1StartDate" as const, endKey: "meeting1EndDate" as const, label: "一收", icon: Clock, type: "single" },');
content = content.replace('{ startKey: "meeting2StartDate" as const, endKey: "meeting2EndDate" as const, label: "二籌", icon: Clock },', '{ startKey: "meeting2StartDate" as const, endKey: "meeting2EndDate" as const, label: "二收", icon: Clock, type: "single" },');
content = content.replace('{ startKey: "meeting3StartDate" as const, endKey: "meeting3EndDate" as const, label: "三籌", icon: Clock },', '{ startKey: "meeting3StartDate" as const, endKey: "meeting3EndDate" as const, label: "三收", icon: Clock, type: "single" },');
content = content.replace('{ startKey: "trainingStartDate" as const, endKey: "trainingEndDate" as const, label: "營隊集訓", icon: Clock },', '{ startKey: "trainingStartDate" as const, endKey: "trainingEndDate" as const, label: "營隊集訓", icon: Clock, type: "range" },');
content = content.replace('{ startKey: "siteStartDate" as const, endKey: "siteEndDate" as const, label: "駐站", icon: MapPin },', '{ startKey: "siteStartDate" as const, endKey: "siteEndDate" as const, label: "駐站", icon: MapPin, type: "single" },');
content = content.replace('{ startKey: "campStartDate" as const, endKey: "campEndDate" as const, label: "營期", icon: Tent },', '{ startKey: "campStartDate" as const, endKey: "campEndDate" as const, label: "營期", icon: Tent, type: "range" },');

const oldBlock = `{timelineFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.label} className="p-6 bg-[#FBF9F6]/50 dark:bg-slate-900/50 rounded-xl dark: space-y-4 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500">
                        <Icon className="w-3.5 h-3.5 text-orange-500 dark:text-amber-400" /> {field.label}
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Start</span>
                          <input
                            type="date"
                            value={(activeCamp as any)[field.startKey] || ""}
                            onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border-none rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus: dark:focus: outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">End</span>
                          <input
                            type="date"
                            value={(activeCamp as any)[field.endKey] || ""}
                            onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border-none rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus: dark:focus: outline-none transition-all text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}`;

const newBlock = `{timelineFields.map((field) => {
                  const Icon = field.icon;
                  const isSingle = (field as any).type === "single";
                  
                  return (
                    <div key={field.label} className="p-6 bg-[#FBF9F6]/50 dark:bg-slate-900/50 rounded-xl dark: border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group h-[120px]">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500 mb-4 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors">
                        <Icon className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {field.label}
                      </label>
                      
                      {isSingle ? (
                        <div className="mt-auto bg-white/60 dark:bg-black/40 rounded-full py-2.5 px-4 flex items-center gap-3 w-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-none">
                          <input
                            type="date"
                            value={(activeCamp as any)[field.startKey] || ""}
                            onChange={(e) => handleUpdate({ [field.startKey]: e.target.value, [field.endKey]: e.target.value })}
                            className="bg-transparent border-none outline-none w-full text-center font-bold text-sm text-[#2C2A28] dark:text-white focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="mt-auto bg-white/60 dark:bg-black/40 rounded-full py-2.5 px-4 flex items-center justify-between gap-1 w-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-none">
                          <input
                            type="date"
                            value={(activeCamp as any)[field.startKey] || ""}
                            onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
                            className="bg-transparent border-none outline-none w-full text-center font-bold text-xs text-[#2C2A28] dark:text-white focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          <span className="text-orange-500/40 dark:text-amber-500/40 text-xs font-black px-1">➔</span>
                          <input
                            type="date"
                            value={(activeCamp as any)[field.endKey] || ""}
                            onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
                            className="bg-transparent border-none outline-none w-full text-center font-bold text-xs text-[#2C2A28] dark:text-white focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}`;

fs.writeFileSync('src/app/settings/page.tsx', content.replace(oldBlock, newBlock), 'utf8');
console.log('Update finished');
