const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'plans', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. replace header
const headerRegex = /\{\/\*\s*──\s*HEADER\s*───────────────\s*\*\/\}[^]*?<div className="flex flex-col sm:flex-row[^]*?\{activeCamp\?\.name[^]*?<\/div>[\s]*<\/div>/;
const newHeader = `{/* ── HEADER ─────────────── */}
        <div className="relative mb-8 sm:mb-[4.5rem] pb-6 sm:pb-8">
          <div className="absolute inset-x-0 -top-10 h-32 bg-gradient-to-b from-orange-50/50 to-transparent dark:from-amber-900/10 z-0 pointer-events-none blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-amber-600 dark:from-white dark:to-orange-400 mb-2 drop-shadow-sm">
                教案總覽
              </h1>
              <p className="text-stone-500 dark:text-slate-400 font-semibold uppercase tracking-[0.25em] text-[10px] sm:text-xs">
                文件與專案管理中心 / Document Repository
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-stone-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-stone-200/50 dark:border-slate-700/50 w-fit">
                {activeCamp?.name || "All Projects"}
              </div>
            </div>
          </div>
        </div>`;
content = content.replace(headerRegex, newHeader);

// 2. replace ActionBar class
content = content.replace(/<ActionBar title="Plans Actions" className="!flex-nowrap !justify-start md:!justify-center overflow-x-auto scrollbar-hide gap-1 md:gap-2">/, '<ActionBar title="Plans Actions" className="gap-1 md:gap-2">');

// 3. change Search UI
const searchRegex = /\{\/\*\s*──\s*TOOLBAR \(Filter & Search\)\s*───────────\s*\*\/\}\s*<div className="flex flex-col gap-4 mb-8">\s*<div className="relative w-full">[^]*?<\/div>\s*<\/div>/;
const newSearch = `{/* ── TOOLBAR (Filter & Search) ─────────── */}
        <div className="flex flex-col gap-4 mb-8 group">
          <div className="relative w-full max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-stone-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋教案、負責人..."
              className="pl-12 h-12 w-full bg-white dark:bg-slate-800/80 backdrop-blur-sm border-stone-200 dark:border-slate-700/50 focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all rounded-2xl font-medium text-sm shadow-[0_8px_30px_rgba(140,120,100,0.04)] hover:shadow-[0_8px_30px_rgba(140,120,100,0.08)] dark:shadow-none"
            />
          </div>
        </div>`;
content = content.replace(searchRegex, newSearch);

// 4. replace the grid cards block
const gridViewRegex = /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">[^]*?<motion\.div key=\{plan\.id\} initial=\{\{ opacity: 0, y: 10 \}\} animate=\{\{ opacity: 1, y: 0 \}\} transition=\{\{ delay: i \* 0\.03, duration: 0\.2 \}\} className="h-full">[^]*?<\/motion\.div>\s*\)\)\}\s*<\/div>/;
const newGridView = `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {filteredPlans.map((plan, i) => (
    <motion.div
      key={plan.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ delay: i * 0.02, duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <div
        className="bg-white dark:bg-slate-800/90 rounded-[24px] p-5 sm:p-6 text-left w-full group transition-all duration-300 flex flex-col h-full cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(234,88,12,0.1)] dark:hover:shadow-[0_12px_40px_rgba(251,191,36,0.05)] border border-stone-100 hover:border-orange-200/50 dark:border-slate-700/50 dark:hover:border-amber-500/30 overflow-hidden relative"
        onClick={() => handleOpenPlan(plan.id)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/50 to-transparent dark:from-amber-900/20 rounded-bl-[100px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <Badge
            className={cn(
              "px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest border-none text-white shadow-sm",
              plan.category === "activity"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600"
            )}
          >
            {(() => {
              const group = getPlanGroup(plan);
              return group ? (language === "zh" ? group.nameZh : group.nameEn) : language === "zh" ? "未分類" : "Unknown";
            })()}
          </Badge>
          <div className="flex items-center gap-1">
            {renderPlanActions(plan)}
            <div className="w-7 h-7 flex items-center justify-center bg-stone-50 group-hover:bg-orange-50 dark:bg-slate-700/50 dark:group-hover:bg-amber-900/30 rounded-full transition-colors ml-1">
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors" />
            </div>
          </div>
        </div>

        <h3 className="font-bold text-base sm:text-lg text-[#2C2A28] dark:text-slate-100 mb-1.5 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">
          {getPlanDisplayName(plan)}
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400 font-semibold mb-4 sm:mb-6 flex-1">
          {getPlanDisplayCategory(plan)}
        </p>

        <div className="flex items-center gap-4 pt-4 mt-auto border-t border-stone-100/80 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-500 dark:text-slate-400 font-medium bg-stone-50 dark:bg-slate-900/50 px-2 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5" />
            {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
          </div>
          {getPlanDisplayMembers(plan) && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-500 dark:text-slate-400 font-medium bg-stone-50 dark:bg-slate-900/50 px-2 py-1 rounded-md">
              <Users className="w-3.5 h-3.5" />
              <span className="line-clamp-1 max-w-[80px]">{getPlanDisplayMembers(plan)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  ))}
</div>`;
content = content.replace(gridViewRegex, newGridView);

// 5. replace Board view inner card mapping
const boardViewInnerRegex = /<div key=\{plan\.id\} onClick=\{[^]*?\} className="bg-white dark:bg-slate-800 border-none rounded-xl p-4 cursor-pointer hover: dark:hover: transition-all shadow-\[0_8px_30px_rgba\(140,120,100,0\.05\)\]">[^]*?<\/div>[\s]*<\/div>[\s]*<\/div>/g;
const newBoardViewInner = `<div key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="bg-white dark:bg-slate-800/90 border border-stone-100 dark:border-slate-700/50 rounded-2xl p-4 cursor-pointer hover:border-orange-200/50 hover:shadow-[0_8px_24px_rgba(234,88,12,0.1)] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50/50 to-transparent dark:from-amber-900/10 rounded-bl-[80px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                                    <h4 className="font-bold text-[13px] text-[#2C2A28] dark:text-slate-100 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{getPlanDisplayName(plan)}</h4>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {renderPlanActions(plan)}
                                    </div>
                                </div>
                                <p className="text-[10px] text-stone-500 dark:text-slate-400 font-semibold mb-4">{getPlanDisplayCategory(plan)}</p>
                                <div className="flex items-center justify-between text-[9px] text-stone-400 dark:text-slate-500 font-black tracking-widest uppercase border-t border-stone-100 dark:border-slate-700/50 pt-2">
                                    <span>{getPlanDisplayMembers(plan) || "—"}</span>
                                    <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd") : "—"}</span>
                                </div>
                            </div>`;
content = content.replace(boardViewInnerRegex, newBoardViewInner);


fs.writeFileSync(file, content);
console.log('Update complete');
