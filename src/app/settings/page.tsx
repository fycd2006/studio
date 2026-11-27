"use client"

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { withPersonnelNames } from "@/lib/plan-personnel";
import { usePlans } from "@/hooks/use-plans";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n-context";
import {
  Moon,
  Sun,
  User,
  Layout,
  LogOut,
  ShieldAlert,
  Globe,
  Clock,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportProjectBackupZip } from "@/lib/export-excel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { MemberSettings } from "@/components/MemberSettings";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";
import { VersionReleaseNotes } from "@/components/VersionReleaseNotes";
import { VERSION_HISTORY } from "@/data/version-history";

export default function SettingsPage() {
  const { role, logout, memberNicknames, nicknameIndex } = useAuth();
  const {
    camps, activeCampId, deleteCamp,
    plans, tables
  } = usePlans();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();


  const [isDeleting, setIsDeleting] = useState<boolean | "downloading">(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(VERSION_HISTORY[0]?.version || "dev");
  const [activeTab, setActiveTab] = useState<"account" | "workspace" | "preferences" | "versions" | "danger">("account");

  const activeCamp = camps.find(c => c.id === activeCampId);
  const isAdmin = role === 'admin';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'account' || tab === 'workspace' || tab === 'preferences' || tab === 'versions' || (tab === 'danger' && isAdmin)) {
      setActiveTab(tab);
    }
    if (searchParams.get('createProject') === '1' && isAdmin) {
      setActiveTab("workspace");
      setIsAddingProject(true);
    }
  }, [searchParams, isAdmin]);

  useEffect(() => {
    const readCurrentVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const contentLength = res.headers.get('content-length');
        if (contentLength === '0') return;
        const data = await res.json();
        const version = String(data?.version || '').trim();
        if (version) setCurrentVersion(version);
      } catch {
        // Keep env fallback when version endpoint is unavailable.
      }
    };

    readCurrentVersion();
  }, []);

  const tabItems = [
    { key: "account" as const, label: t('TAB_ACCOUNT'), icon: User },
    { key: "workspace" as const, label: t('TAB_WORKSPACE'), icon: Layout },
    { key: "preferences" as const, label: t('TAB_PREFERENCES'), icon: Globe },
    { key: "versions" as const, label: t('TAB_VERSIONS'), icon: Clock },
    ...(isAdmin ? [{ key: "danger" as const, label: t('TAB_DANGER'), icon: ShieldAlert }] : []),
  ];

  return (
    <div className="bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground transition-colors font-sans selection:bg-orange-500/20 min-h-screen">
      <div className="max-w-5xl mx-auto pt-24 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 md:px-8">
        
        {/* ── PAGE TITLE ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12 pb-6 border-b border-stone-200/80 dark:border-white/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="architectural-tag">
                // SYSTEM GOVERNANCE //
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              {t('SETTINGS_TITLE')}
            </h1>
            <p className="text-xs font-mono text-fg-muted uppercase tracking-widest mt-1">
              Configuration // Workspace // Protocol Security
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="self-start sm:self-center h-10 px-4 rounded-lg text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-stone-200/80 dark:border-white/10 hover:border-rose-500/30 transition-all font-mono text-xs gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>登出系統</span>
          </Button>
        </div>

        {/* ── SEGMENTED TAB SELECTOR ─────── */}
        <div className="mb-10 p-1.5 rounded-xl bg-white/70 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              return (
                <button
                  key={tab.key}
                  data-testid={`settings-tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer border text-xs font-mono",
                    isActive
                      ? isDanger
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium shadow-xs"
                        : "bg-white dark:bg-white/10 border-stone-200/90 dark:border-white/20 text-orange-600 dark:text-orange-400 font-medium shadow-xs"
                      : "bg-transparent border-transparent text-fg-muted hover:text-foreground hover:bg-stone-100/60 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? (isDanger ? "text-rose-500" : "text-orange-500") : "text-stone-400 dark:text-stone-500")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENTS ───────────────── */}
        <div className="space-y-10">
          
          {/* TAB: ACCOUNT */}
          {activeTab === "account" && (
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="architectural-tag">01</span>
                <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  {t('IDENTITY_GOVERNANCE')}
                </h2>
              </div>
              <MemberSettings />
            </section>
          )}

          {/* TAB: WORKSPACE */}
          {activeTab === "workspace" && (
            <WorkspaceSettings
              initialAddingProject={isAddingProject}
              onAddingProjectHandled={() => setIsAddingProject(false)}
            />
          )}

          {/* TAB: PREFERENCES */}
          {activeTab === "preferences" && (
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="architectural-tag">01</span>
                <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  {t('PREFERENCES_TITLE')}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme Switcher */}
                <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-xl p-6 sm:p-8 flex items-center justify-between">
                  <div>
                    <h4 className="font-normal text-base text-foreground mb-1">{t('THEME_MODE')}</h4>
                    <p className="text-xs font-mono text-fg-muted">Appearance / Visual Scheme</p>
                  </div>
                  <div className="flex bg-stone-100 dark:bg-white/5 p-1 rounded-xl border border-stone-200/60 dark:border-white/5">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "p-2 rounded-lg transition-all cursor-pointer",
                        theme === 'light'
                          ? "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-xs"
                          : "text-stone-400 hover:text-foreground"
                      )}
                      title="Light Mode"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "p-2 rounded-lg transition-all cursor-pointer",
                        theme === 'dark'
                          ? "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-xs"
                          : "text-stone-400 hover:text-foreground"
                      )}
                      title="Dark Mode"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-xl p-6 sm:p-8 flex items-center justify-between">
                  <div>
                    <h4 className="font-normal text-base text-foreground mb-1">{t('LANGUAGE_SWITCH')}</h4>
                    <p className="text-xs font-mono text-fg-muted">Locale / Internationalization</p>
                  </div>
                  <div className="flex bg-stone-100 dark:bg-white/5 p-1 rounded-xl border border-stone-200/60 dark:border-white/5 font-mono text-xs">
                    <button
                      onClick={() => setLanguage('zh')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg transition-all cursor-pointer",
                        language === 'zh'
                          ? "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-xs font-medium"
                          : "text-stone-400 hover:text-foreground"
                      )}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg transition-all cursor-pointer",
                        language === 'en'
                          ? "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-xs font-medium"
                          : "text-stone-400 hover:text-foreground"
                      )}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB: VERSIONS */}
          {activeTab === "versions" && (
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="architectural-tag">01</span>
                <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  {language === 'zh' ? '版本規格資訊' : 'Version Specification'}
                </h2>
              </div>
              <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-fg-muted mb-1.5">
                    {language === 'zh' ? '目前執行版本' : 'Active Deployment Version'}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl sm:text-2xl text-foreground font-normal">
                      v{currentVersion}
                    </span>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      LIVE PRODUCTION
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setIsVersionHistoryOpen(true)}
                  variant="outline"
                  className="h-10 px-6 rounded-md font-mono text-xs uppercase tracking-wider border-stone-200/80 dark:border-white/10 hover:border-orange-500/40 text-foreground transition-all"
                >
                  {language === 'zh' ? '檢視版本歷程時間軸' : 'View Release Timeline'}
                </Button>
              </div>
            </section>
          )}

          {/* TAB: DANGER ZONE */}
          {activeTab === "danger" && isAdmin && (
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="architectural-tag border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">CAUTION</span>
                <h2 className="text-sm font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {t('DANGER_ZONE')}
                </h2>
              </div>
              <div className="bg-rose-500/[0.04] border border-rose-500/25 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <h4 className="font-normal text-lg text-rose-700 dark:text-rose-400">
                      {language === 'zh' ? '刪除當前專案目錄' : 'Delete Current Project Directory'}
                    </h4>
                    <p className="text-xs font-mono text-rose-600/80 dark:text-rose-400/80 leading-relaxed">
                      {language === 'zh' ? '此操作將永久刪除「' : 'This action will permanently delete all data for "'}
                      <span className="font-bold underline">{activeCamp?.name || '當前專案'}</span>
                      {language === 'zh' ? '」的所有教案、表格及活動資料。刪除前系統將自動下載完整備份。' : '". Backups will be auto-generated before removal.'}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleting(true)}
                    className="font-mono text-xs uppercase tracking-wider h-11 px-6 rounded-lg bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/25 shrink-0"
                  >
                    Delete Project
                  </Button>
                </div>

                <AnimatePresence>
                  {isDeleting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 pt-6 border-t border-rose-500/20"
                    >
                      <div className="space-y-4 max-w-md">
                        <label className="block text-xs font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Type <span className="font-bold underline">delete</span> to confirm
                        </label>
                        <div className="flex gap-3">
                          <Input
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="delete"
                            className="bg-white dark:bg-black/30 border-rose-500/40 font-mono text-xs rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            disabled={deleteInput !== "delete" || isDeleting === "downloading"}
                            onClick={async () => {
                              if (activeCampId) {
                                setIsDeleting("downloading");
                                toast({ title: language === 'zh' ? '備份中' : 'Backing up', description: language === 'zh' ? '正在打包所有教案 (Word) 與清單 (Excel) 為 ZIP...' : 'Packaging files...' });
                                try {
                                  await exportProjectBackupZip(activeCampId, activeCamp?.name || 'Project', camps, plans.map(plan => withPersonnelNames(plan, memberNicknames, nicknameIndex)), tables);
                                  toast({ title: language === 'zh' ? '備份完成' : 'Backup completed', description: language === 'zh' ? 'ZIP 備份已下載，即將刪除專案。' : 'ZIP downloaded. Deleting...' });
                                } catch (e) {
                                  console.error("Backup failed", e);
                                }
                                deleteCamp(activeCampId);
                                setIsDeleting(false);
                                setDeleteInput("");
                              }
                            }}
                            className="font-mono text-xs rounded-lg shrink-0"
                          >
                            {isDeleting === "downloading" ? "Archiving..." : "Confirm"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="font-mono text-xs rounded-lg"
                            onClick={() => { setIsDeleting(false); setDeleteInput(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ── VERSION HISTORY MODAL ───────── */}
      <AnimatePresence>
        {isVersionHistoryOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsVersionHistoryOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden rounded-xl bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl"
            >
              <div className="px-8 py-6 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="architectural-tag mb-1.5 inline-block">
                    // RELEASE CHRONOLOGY //
                  </span>
                  <h3 className="text-xl font-normal text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    {language === 'zh' ? '版本歷程時間軸' : 'Version History'}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md text-stone-400 hover:text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                  onClick={() => setIsVersionHistoryOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6">
                {VERSION_HISTORY.map(entry => <VersionReleaseNotes key={entry.id} entry={entry} />)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
