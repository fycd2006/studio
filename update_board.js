const fs = require('fs');

let content = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

const helperCode = `
  const handleUpdatePlanGroup = (planId: string, groupSlug: string) => {
    if (!isAdmin) {
      crewToast();
      return;
    }
    const targetGroup = groups.find((g) => g.slug === groupSlug) || groups[0];
    if (!targetGroup) return;
    const category = targetGroup.slug.includes("teaching") ? "teaching" : "activity";
    updatePlan(planId, { groupId: targetGroup.id, category });
  };

  const renderGroupBadge = (plan: typeof plans[number]) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div onClick={(e) => e.stopPropagation()} className="cursor-pointer inline-block" title="變更組別">
            <Badge className={cn("px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest border-none transition-all duration-300 group-hover:shadow-md hover:scale-105 active:scale-95 hover:opacity-90", getBadgeColorClass(plan))}>
              {(() => {
                const group = getPlanGroup(plan);
                return group ? (language === "zh" ? group.nameZh : group.nameEn) : language === "zh" ? "未分類" : "Unknown";
              })()}
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="start" className="bg-white dark:bg-slate-800 border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)] min-w-[140px] z-[60]">
          {groups.map(g => (
            <DropdownMenuItem key={g.id} onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlanGroup(plan.id, g.slug); }} className="cursor-pointer font-bold text-xs py-2 outline-none hover:bg-stone-100 dark:hover:bg-slate-700">
              {language === 'zh' ? g.nameZh : g.nameEn}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (`;

if (!content.includes('const handleUpdatePlanGroup')) {
    content = content.replace('  return (', helperCode);
}

// Grid
const gridRegex = /<Badge className=\{cn\("px-2\.5 py-1 text-\[10px\] font-extrabold[^>]+>\s*\{\(\(\) => \{[^}]+\}\)\(\)\}\s*<\/Badge>/mg;
content = content.replace(gridRegex, '{renderGroupBadge(plan)}');

const gridFallback = /<Badge className=\{cn\("px-2 py-0\.5[^>]+>\s*\{\(\(\) => \{[^}]+\}\)\(\)\}\s*<\/Badge>/mg;
content = content.replace(gridFallback, '{renderGroupBadge(plan)}');

// List
const listRegex = /<td className="px-6 py-4 border-y border-transparent[^>]+>\s*<Badge[^>]+>\s*\{\(\(\) => \{[^}]+\}\)\(\)\}\s*<\/Badge>\s*<\/td>/mg;
content = content.replace(listRegex, '<td className="px-6 py-4 border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 hidden sm:table-cell">{renderGroupBadge(plan)}</td>');

// Board
const boardStart = content.indexOf(') : viewType === "board" ? (');
const boardEnd = content.indexOf(') : (\n  <div className="bg-white dark:bg-slate-800 rounded-xl');

if (boardStart !== -1 && boardEnd !== -1) {
    const newBoard = `) : viewType === "board" ? (
 <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar h-full min-h-[500px] snap-x">
 {groups.map((group, index) => {
 const items = filteredPlans.filter(p => getPlanGroup(p)?.slug === group.slug);
 const colorPool = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'];
 const color = colorPool[index % colorPool.length];
 return (
 <div 
   key={group.id} 
   className="flex-1 min-w-[320px] max-w-sm flex flex-col bg-stone-100/50 dark:bg-slate-800/30 rounded-2xl p-4 dark: shadow-sm border-none snap-start transition-colors duration-200"
   onDragOver={(e) => {
     e.preventDefault();
     if (isAdmin) {
       e.currentTarget.classList.add('bg-stone-200/80', 'dark:bg-slate-700/80', 'scale-[1.01]');
     }
   }}
   onDragLeave={(e) => {
     e.currentTarget.classList.remove('bg-stone-200/80', 'dark:bg-slate-700/80', 'scale-[1.01]');
   }}
   onDrop={(e) => {
     e.preventDefault();
     e.currentTarget.classList.remove('bg-stone-200/80', 'dark:bg-slate-700/80', 'scale-[1.01]');
     if (!isAdmin) return;
     const planId = e.dataTransfer.getData("text/plain");
     if (planId) handleUpdatePlanGroup(planId, group.slug);
   }}
 >
 <div className="flex items-center justify-between mb-4 px-1 shrink-0">
 <h3 className="font-bold text-sm text-[#2C2A28] dark:text-slate-100 flex items-center gap-2">
 <div className={cn("w-2 h-2 rounded-full", color)}></div>
 {language === 'zh' ? group.nameZh : group.nameEn}
 </h3>
 <span className="text-xs font-bold text-stone-400 dark:text-slate-500">{items.length}</span>
 </div>
 <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar pb-10">
 {items.map(plan => (
 <motion.div 
   key={plan.id} 
   layoutId={plan.id}
   draggable={isAdmin}
   onDragStart={(e) => { 
     // @ts-ignore
     e.dataTransfer.setData("text/plain", plan.id); 
     // @ts-ignore
     e.dataTransfer.effectAllowed = "move"; 
   }}
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   whileHover={{ y: -4, scale: 1.02 }}
   transition={{ duration: 0.2 }}
   onClick={() => handleOpenPlan(plan.id)} 
   className={cn("bg-white dark:bg-slate-800/95 border border-stone-100 dark:border-slate-700/50 rounded-[20px] p-5 hover:border-orange-200/50 hover:shadow-[0_12px_32px_rgba(234,88,12,0.12)] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] group overflow-hidden relative", isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
 >
     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50/50 to-transparent dark:from-amber-900/10 rounded-bl-[80px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
     
     <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
         <div className="flex flex-col items-start gap-2">
             {renderGroupBadge(plan)}
             <h4 className="font-bold text-[14px] text-[#2C2A28] dark:text-slate-100 line-clamp-2 leading-relaxed group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{getPlanDisplayName(plan)}</h4>
         </div>
         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
             {renderPlanActions(plan)}
         </div>
     </div>
     <p className="text-[11px] text-stone-500 dark:text-slate-400 font-semibold mb-4">{getPlanDisplayCategory(plan)}</p>
     <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-slate-500 font-black tracking-widest uppercase border-t border-stone-100/80 dark:border-slate-700/50 pt-3 mt-auto">
         <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> <span className="line-clamp-1 max-w-[80px]">{getPlanDisplayMembers(plan) || "—"}</span></div>
         <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span></div>
     </div>
 </motion.div>
  ))}
 {items.length === 0 && <div className="text-xs text-center text-stone-400 dark:text-slate-500 mt-4 border-2 border-dashed border-stone-200 dark:border-slate-700 rounded-xl p-8 bg-stone-50/50 dark:bg-slate-800/10 transition-colors duration-200">將教案拖曳至此處</div>}
 </div>
 </div>
 )
 })}
 </div>
 `;
    content = content.substring(0, boardStart) + newBoard + content.substring(boardEnd);
}

fs.writeFileSync('src/app/plans/page.tsx', content);
console.log("Success");
