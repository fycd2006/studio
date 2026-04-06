const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'plans', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Search UI z-index
content = content.replace(
  /<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">/,
  '<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">'
);

// 2. Extract a Badge color helper to be used in Grid, List, and Board views
const badgeHelperPos = content.indexOf('const getPlanGroup =');
if (badgeHelperPos !== -1 && !content.includes('getBadgeColorClass')) {
    const badgeColorHelper = `
  const getBadgeColorClass = (plan: typeof plans[number]) => {
    const group = getPlanGroup(plan);
    const slug = group ? normalizeKey(group.slug) : normalizeKey(plan.category);
    if (slug.includes("activity") || slug.includes("活動")) return "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20";
    if (slug.includes("teaching") || slug.includes("教學")) return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20";
    if (slug.includes("admin") || slug.includes("行政")) return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-500/20";
    if (slug.includes("creative") || slug.includes("美宣") || slug.includes("script") || slug.includes("劇本")) return "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm shadow-violet-500/20";
    return "bg-gradient-to-r from-stone-400 to-stone-500 text-white shadow-sm shadow-stone-400/20";
  };
  `;
    const insertPos = content.indexOf('useEffect(() => {', badgeHelperPos);
    content = content.slice(0, insertPos) + badgeColorHelper + content.slice(insertPos);
}

// 3. Fix Badge logic in Grid View
const gridBadgeRegex = /<Badge\s+className=\{cn\(\s*"px-2\.5 py-1 text-\[10px\] font-extrabold uppercase tracking-widest border-none text-white shadow-sm",\s*plan\.category === "activity"[^]*?: "bg-gradient-to-r from-emerald-[^]*?"\s*\)\}\s*>\s*\{\(\(\) => \{[^]*?\}\)\(\)\}\s*<\/Badge>/;
const newGridBadge = `<Badge className={cn("px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest border-none transition-all duration-300 group-hover:shadow-md", getBadgeColorClass(plan))}>
                            {(() => {
                              const group = getPlanGroup(plan);
                              return group ? (language === "zh" ? group.nameZh : group.nameEn) : language === "zh" ? "未分類" : "Unknown";
                            })()}
                          </Badge>`;
content = content.replace(gridBadgeRegex, newGridBadge);


// 4. Board View Enhancements
// Need to find the board view inner content rendering.
const boardViewInnerRegex = /<div key=\{plan\.id\} onClick=\{\(\) => handleOpenPlan\(plan\.id\)\} className="bg-white dark:bg-slate-800\/90 border border-stone-100[^]*?<\/div>\s*<\/div>/g;

const newBoardViewInner = `<motion.div 
                                key={plan.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => handleOpenPlan(plan.id)} 
                                className="bg-white dark:bg-slate-800/90 border border-stone-100 dark:border-slate-700/50 rounded-[20px] p-5 cursor-pointer hover:border-orange-200/50 hover:shadow-[0_12px_32px_rgba(234,88,12,0.12)] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50/50 to-transparent dark:from-amber-900/10 rounded-bl-[80px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                                    <div className="flex flex-col items-start gap-2">
                                        <Badge className={cn("px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest border-none rounded-md", getBadgeColorClass(plan))}>
                                            {(() => {
                                                const group = getPlanGroup(plan);
                                                return group ? (language === "zh" ? group.nameZh : group.nameEn) : "未分類";
                                            })()}
                                        </Badge>
                                        <h4 className="font-bold text-[14px] text-[#2C2A28] dark:text-slate-100 line-clamp-2 leading-relaxed group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{getPlanDisplayName(plan)}</h4>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {renderPlanActions(plan)}
                                    </div>
                                </div>
                                <p className="text-[11px] text-stone-500 dark:text-slate-400 font-semibold mb-4">{getPlanDisplayCategory(plan)}</p>
                                <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-slate-500 font-black tracking-widest uppercase border-t border-stone-100/80 dark:border-slate-700/50 pt-3 mt-auto">
                                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> <span>{getPlanDisplayMembers(plan) || "—"}</span></div>
                                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span></div>
                                </div>
                            </motion.div>`;
content = content.replace(boardViewInnerRegex, newBoardViewInner);

// 5. List View Enhancements
const listTableRegex = /<table className="w-full text-sm text-left">[^]*?<\/table>/;
const newListTable = `<div className="w-full overflow-hidden">
        <table className="w-full text-sm text-left border-separate border-spacing-y-2">
          <thead className="bg-transparent dark:bg-transparent">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              <th className="px-6 py-3 font-medium whitespace-nowrap">檔案名稱</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap hidden sm:table-cell">類型</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap hidden md:table-cell">分類</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap hidden xl:table-cell">協作者</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap hidden lg:table-cell">最後修改</th>
              <th className="px-6 py-3 font-medium text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="">
            {filteredPlans.map((plan) => (
              <tr 
                key={plan.id} 
                onClick={() => handleOpenPlan(plan.id)} 
                className="bg-white dark:bg-slate-800/80 hover:bg-orange-50/50 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer group rounded-xl hover:shadow-[0_8px_20px_rgba(234,88,12,0.06)] dark:hover:shadow-none"
              >
                <td className="px-6 py-4 rounded-l-xl border-y border-l border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 transition-colors relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-bold text-[14px] text-[#2C2A28] dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">{getPlanDisplayName(plan)}</div>
                  <div className="text-[10px] text-stone-400 font-bold mt-1 sm:hidden">
                    {(() => {
                      const group = getPlanGroup(plan);
                      return group ? (language === "zh" ? group.nameZh : group.nameEn) : "未分類";
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4 border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 hidden sm:table-cell">
                  <Badge className={cn("px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider border-none", getBadgeColorClass(plan))}>
                    {(() => {
                      const group = getPlanGroup(plan);
                      return group ? (language === 'zh' ? group.nameZh : group.nameEn) : (language === 'zh' ? '未分類' : 'Unknown');
                    })()}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-semibold text-xs border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 hidden md:table-cell">{getPlanDisplayCategory(plan) || "—"}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-semibold text-xs border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 hidden xl:table-cell">
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/>{getPlanDisplayMembers(plan) || "—"}</div>
                </td>
                <td className="px-6 py-4 text-stone-400 dark:text-slate-500 font-bold text-xs border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600 hidden lg:table-cell tracking-wider">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/>{plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}</div>
                </td>
                <td className="px-6 py-4 rounded-r-xl border-y border-r border-transparent group-hover:border-orange-100 dark:group-hover:border-slate-600" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end pr-2">{renderPlanActions(plan)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>`;
content = content.replace(listTableRegex, newListTable);

fs.writeFileSync(file, content);


// Fix ActionBar.tsx
const actionBarFile = path.join(__dirname, 'src', 'components', 'ActionBar.tsx');
let actionBarContent = fs.readFileSync(actionBarFile, 'utf8');

actionBarContent = actionBarContent.replace(
  /"bg-white\/80 dark:bg-slate-900\/80 backdrop-blur-xl border-b border-stone-200\/50 dark:border-slate-800\/50 shadow-sm dark:shadow-none py-3",/,
  `"bg-[#FBF9F6]/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-stone-200/40 dark:border-slate-800/50 py-3",`
);
fs.writeFileSync(actionBarFile, actionBarContent);

console.log('Follow up update complete');
