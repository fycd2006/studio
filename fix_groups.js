const fs = require('fs');
const content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8');

const anchorText = '組別管理';
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('<List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> 組別管理')) - 1;
// Find the closing section tag for this block
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('</section>')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -2 && endIdx !== -1) {
const newSection = ` <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> 組別管理
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col">
 {/* Header - Desktop only */}
 <div className="hidden md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 pb-3 border-b border-stone-100 dark:border-slate-800/50 mb-3 px-2">
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">中文名稱</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">英文名稱 (English)</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">路由/縮寫 (Slug)</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase text-center w-10">操作</div>
 </div>

 {/* Map groups */}
 <div className="space-y-4 md:space-y-1 mb-6">
 {groups.map((group) => {
 const isDefault = group.slug === 'activity' || group.slug === 'teaching';
 return (
 <div key={group.id} className="flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-3 md:gap-4 md:items-center p-3 md:p-2 rounded-lg bg-stone-50/50 md:bg-transparent hover:bg-stone-50/80 dark:hover:bg-slate-800/30 transition-colors group">
 <Input
 placeholder="中文名稱"
 value={group.nameZh}
 onChange={(e) => updateGroup(group.id, { nameZh: e.target.value })}
 className="bg-stone-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-orange-400 dark:focus:ring-amber-400 transition-colors border-none shadow-none px-3 py-2 h-9 w-full outline-none font-medium text-sm text-[#2C2A28] dark:text-white"
 />
 <Input
 placeholder="English Name"
 value={group.nameEn}
 onChange={(e) => updateGroup(group.id, { nameEn: e.target.value })}
 className="bg-stone-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-orange-400 dark:focus:ring-amber-400 transition-colors border-none shadow-none px-3 py-2 h-9 w-full outline-none font-medium text-sm text-[#2C2A28] dark:text-white"
 />
 
 {isDefault ? (
 <div className="flex items-center px-3 py-2 h-9 bg-transparent border-none w-full">
 <Badge className="bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-bold border-none px-3">/{group.slug}</Badge>
 </div>
 ) : (
 <Input
 placeholder="路由 (Slug)"
 value={group.slug}
 onChange={(e) => updateGroup(group.id, { slug: e.target.value })}
 className="bg-stone-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-orange-400 dark:focus:ring-amber-400 transition-colors border-none shadow-none px-3 py-2 h-9 w-full outline-none font-mono text-xs text-[#2C2A28] dark:text-white"
 />
 )}
 
 <div className="flex justify-end w-full md:w-10">
 {!isDefault ? (
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-stone-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border-none transition-colors"
 onClick={() => deleteGroup(group.id)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 ) : (
 <div className="h-8 w-8" />
 )}
 </div>
 </div>
 );
 })}
 </div>

 {/* Add Row */}
 <div className="flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-3 md:gap-4 md:items-center p-3 md:p-2 rounded-lg bg-orange-50/30 dark:bg-amber-900/10 transition-colors mt-2 border-t border-stone-100 dark:border-slate-800/50 md:border-none md:mt-0">
 <Input
 placeholder="新增中文名稱"
 value={newGroupNameZh}
 onChange={(e) => setNewGroupNameZh(e.target.value)}
 className="bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-orange-400 transition-colors border-none shadow-none px-3 py-2 h-9 w-full outline-none font-bold text-sm text-[#2C2A28] dark:text-white"
 />
 <Input
 placeholder="New English Name"
 value={newGroupNameEn}
 onChange={(e) => setNewGroupNameEn(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && newGroupNameZh.trim() && newGroupNameEn.trim()) {
 addGroup({ nameZh: newGroupNameZh.trim(), nameEn: newGroupNameEn.trim() });
 setNewGroupNameZh("");
 setNewGroupNameEn("");
 }
 }}
 className="bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-orange-400 transition-colors border-none shadow-none px-3 py-2 h-9 w-full outline-none font-bold text-sm text-[#2C2A28] dark:text-white"
 />
 
 <div className="flex items-center px-1 py-1 h-9 bg-transparent w-full">
 <span className="text-xs text-stone-400 dark:text-slate-500 font-medium italic">自動產生 Slug / Auto-generated</span>
 </div>
 
 <div className="flex justify-end w-full md:w-auto md:min-w-[40px]">
 <Button
 onClick={() => {
 if (newGroupNameZh.trim() && newGroupNameEn.trim()) {
 addGroup({ nameZh: newGroupNameZh.trim(), nameEn: newGroupNameEn.trim() });
 setNewGroupNameZh("");
 setNewGroupNameEn("");
 }
 }}
 size="sm"
 className="bg-orange-600 dark:bg-amber-500 text-white font-bold hover:bg-orange-700 dark:hover:bg-amber-600 transition-colors cursor-pointer border-none shadow-none w-full md:w-auto whitespace-nowrap h-8"
 >
 新增 / Add
 </Button>
 </div>
 </div>
 </div>
 </div>`;

  const newLines = [...lines.slice(0, startIdx), newSection, ...lines.slice(endIdx)]; // Notice: the newSection does not include <section> tag, we should add it if it was removed in slice. Wait, startIdx is the <h2 line. So `lines.slice(0, startIdx)` leaves the `<section>` intact. Wait, `startIdx` was `-1` from `<List...>`, which points to `<h2...`. So `lines[startIdx-1]` is `<section className="space-y-6">`. This means `<section...>` is preserved! The replacement `newSection` STARTS with `<h2...` and our `endIdx` is the line `</section>`. So `...lines.slice(endIdx)` INCLUDES `</section>`. This is perfect!
  
  fs.writeFileSync('src/app/settings/page.tsx', newLines.join('\n'), 'utf-8');
  console.log("Updated groups map layout to Table/List successfully!");
} else {
  console.log("Failed to find target indices.");
}
