const fs = require('fs');

const path = 'src/app/plans/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const helperCode = `
  const handleUpdatePlanGroup = (planId: string, groupSlug: string) => {
    if (!isAdmin) {
      crewToast();
      return;
    }
    const targetGroup = groups.find((g) => g.slug === groupSlug) || groups[0];
    if (!targetGroup) return;
    const category = targetGroup.slug.includes("teaching") || targetGroup.nameZh.includes("教學") ? "teaching" : "activity";
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
    content = content.replace(/(\s+)return \(/, '\\n' + helperCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed crash.');
} else {
    console.log('Already fixed.');
}
