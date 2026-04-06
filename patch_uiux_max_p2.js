const fs = require('fs');

// --- 1. ActionBar.tsx (Height, Line, Colors) ---
let actionBar = fs.readFileSync('src/components/ActionBar.tsx', 'utf8');

const oldClasses = `className={cn(
        "sticky z-[45] md:top-16 transition-all duration-300",
        isNavbarVisible ? "top-[104px]" : "top-0",
        tone === "plain"
          ? "bg-white dark:bg-slate-800 border-b border-stone-200/70 dark:border-slate-700/70"
          : actionBarTheme.shell,
        "py-1.5",
        "-mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 mb-4 md:mb-5"
      )}`;

const newClasses = `className={cn(
        "sticky z-[45] md:top-16 transition-all duration-300",
        isNavbarVisible ? "top-[104px]" : "top-0",
        tone === "plain"
          ? "bg-transparent border-b border-stone-200/30 dark:border-slate-800/50"
          : "bg-transparent border-b border-stone-200/30 dark:border-slate-800/50",
        "py-1 md:py-1.5 mb-2 md:mb-3"
      )}`;

// Note the `max-w-none w-full min-h-[44px]`
actionBar = actionBar.replace('min-h-[44px]', 'min-h-[38px]');

actionBar = actionBar.replace(oldClasses, newClasses);
fs.writeFileSync('src/components/ActionBar.tsx', actionBar);

// --- 2. AdminSection.tsx (Consolidate Toolbar) ---
let admin = fs.readFileSync('src/components/AdminSection.tsx', 'utf8');
// Fix TabsList to match compact capsule
admin = admin.replace(
  'TabsList className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md h-11 w-full sm:w-auto overflow-x-auto custom-scrollbar gap-1"',
  'TabsList className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md h-9 w-full sm:w-auto overflow-x-auto custom-scrollbar"'
);

// Admin Action Buttons capsule grouping
const adminButtons = `
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white/50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28]"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
              強制同步資料
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                backupData(planData);
                toast({ title: "備份成功", description: "已經產生 JSON 下載檔" });
              }}
              className="rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white/50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28]"
            >
              <Download className="w-4 h-4 mr-2" />
              資料備份 (匯出)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white/50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] cursor-pointer"
              asChild
            >
              <label>
                <Upload className="w-4 h-4 mr-2" />
                災難還原 (匯入)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestore}
                />
              </label>
            </Button>
`;

const newAdminButtons = `
            <div className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md">
              <Button variant="ghost" size="sm" onClick={handleSync} disabled={isSyncing} className="rounded-lg h-7 px-3 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-all font-bold text-xs" title="強制同步資料">
                <RefreshCw className={cn("w-3.5 h-3.5 sm:mr-2", isSyncing && "animate-spin")} />
                <span className="hidden sm:inline">強制同步</span>
              </Button>
              <div className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5"></div>
              <Button variant="ghost" size="sm" onClick={() => { backupData(planData); toast({ title: "備份成功", description: "已經產生 JSON 下載檔" }); }} className="rounded-lg h-7 px-3 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-all font-bold text-xs" title="資料備份 (匯出)">
                <Download className="w-3.5 h-3.5 sm:mr-2" />
                <span className="hidden sm:inline">備份</span>
              </Button>
              <div className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5"></div>
              <Button variant="ghost" size="sm" className="rounded-lg h-7 px-3 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-all font-bold text-xs cursor-pointer" title="災難還原 (匯入)" asChild>
                <label>
                  <Upload className="w-3.5 h-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">還原</span>
                  <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                </label>
              </Button>
            </div>
`;
if (admin.includes(adminButtons.trim())) {
  admin = admin.replace(adminButtons, newAdminButtons);
}
fs.writeFileSync('src/components/AdminSection.tsx', admin);

// --- 3. MarkdownToolbar.tsx (Responsive capsule) ---
let mdToolbar = fs.readFileSync('src/components/MarkdownToolbar.tsx', 'utf8');

// Container
mdToolbar = mdToolbar.replace(
  'sticky top-0 z-50 flex flex-wrap items-center gap-1.5 xs:gap-2 sm:gap-3 p-1.5 xs:p-2 sm:p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-sm border border-stone-200/60 dark:border-slate-800/60 mb-2 sm:mb-4 backdrop-blur-md',
  'sticky top-0 z-50 flex items-center overflow-x-auto scrollbar-hide gap-1 p-1 rounded-xl bg-stone-100/90 dark:bg-slate-800/90 shadow-inner border border-stone-200/50 dark:border-slate-700/50 mb-2 backdrop-blur-md'
);

// Buttons in MD toolbar used rounded-xl, change to rounded-lg tight fit
mdToolbar = mdToolbar.replaceAll(
  'h-8 w-8 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm shadow-sm',
  'h-8 w-8 rounded-lg'
);
fs.writeFileSync('src/components/MarkdownToolbar.tsx', mdToolbar);

// --- 4. PlanEditor.tsx (Fusing actions) ---
// This is the most complex one. Needs to find the action bar children and wrap them in groups.
let planEditor = fs.readFileSync('src/components/PlanEditor.tsx', 'utf8');

// Target the Undo/Redo/Zoom section
const oldEditorTools = `
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm"
            title="復原 (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm"
            title="重做 (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm"
            title="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm hidden md:flex"
            title={isFullscreen ? "退出全螢幕" : "全螢幕"}
          >
            <Maximize className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>`;

const newEditorTools = `
          <div className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40" title="復原 (Ctrl+Z)">
              <Undo className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40" title="重做 (Ctrl+Y)">
              <Redo className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5"></div>
            <Button variant="ghost" size="icon" onClick={zoomOut} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700" title="縮小">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 hidden md:flex" title={isFullscreen ? "退出全螢幕" : "全螢幕"}>
              <Maximize className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={zoomIn} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700" title="放大">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>`;

if (planEditor.includes('onClick={undo}')) {
  planEditor = planEditor.replace(oldEditorTools, newEditorTools);
}

// Clean up Export/History
const oldHistory = `<Button
            variant="outline"
            size="icon"
            onClick={() => setIsHistoryOpen(true)}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm relative"
            title="歷史紀錄"
          >
            <History className="w-4 h-4" />
            {hasUnsyncedChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-white dark:border-slate-800"></span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToWord}
            disabled={isExporting}
            className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white/60 dark:bg-slate-800/60 border border-stone-200/50 dark:border-slate-700/50 text-[#2C2A28] dark:text-white backdrop-blur-sm font-bold tracking-widest text-[10px]"
          >
            {isExporting ? <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 md:mr-2 animate-spin" /> : <Download className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 md:mr-2" />}
            匯出
          </Button>`;

const newHistory = `<div className="flex items-center bg-stone-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl shadow-inner border border-stone-200/50 dark:border-slate-700/50 backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="rounded-lg h-7 w-7 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 relative" title="歷史紀錄">
              <History className="w-3.5 h-3.5" />
              {hasUnsyncedChanges && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
            </Button>
            <div className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5"></div>
            <Button variant="ghost" size="sm" onClick={exportToWord} disabled={isExporting} className="rounded-lg h-7 px-3 text-[#2C2A28] dark:text-white hover:bg-white dark:hover:bg-slate-700 font-bold tracking-widest text-[10px]">
              {isExporting ? <Loader2 className="w-3.5 h-3.5 sm:mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:mr-1.5" />}
              <span className="hidden sm:inline">匯出</span>
            </Button>
          </div>`;

planEditor = planEditor.replace(oldHistory, newHistory);

// Remove "bg-white" styling on planEditor main wrapper to allow transparency or exact parents matching.
fs.writeFileSync('src/components/PlanEditor.tsx', planEditor);

console.log('UIUX PRO MAX Phase 2 Patch Applied Successfully');
