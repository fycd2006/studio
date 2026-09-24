"use client"

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { usePlans } from "@/hooks/use-plans";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n-context";
import {
  Moon,
  Sun,
  User,
  Layout,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Globe,
  Calendar,
  Clock,
  MapPin,
  Tent,
  Lock,
  Unlock,
  Pencil,
  Check,
  Plus,
  List,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportProjectBackupZip } from "@/lib/export-excel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { VERSION_HISTORY } from "@/data/version-history";

export default function SettingsPage() {
  const { role, logout } = useAuth();
  const {
    camps, activeCampId, setActiveCampId, deleteCamp, updateCamp, addCamp,
    activityTypes, addActivityType, removeActivityType,
    groups, addGroup, updateGroup, deleteGroup,
    plans, tables
  } = usePlans();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [profileName, setProfileName] = useState(role === 'admin' ? "STUDIO_ADMIN" : "CREW_MEMBER");
  const [isDeleting, setIsDeleting] = useState<boolean | "downloading">(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [editingCampName, setEditingCampName] = useState("");
  const [deleteInput, setDeleteInput] = useState("");

  const [newActivityType, setNewActivityType] = useState("");
  const [newGroupNameZh, setNewGroupNameZh] = useState("");
  const [newGroupNameEn, setNewGroupNameEn] = useState("");
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(process.env.NEXT_PUBLIC_APP_VERSION || "dev");
  const [activeTab, setActiveTab] = useState<"account" | "workspace" | "preferences" | "versions" | "danger">("account");

  const activeCamp = camps.find(c => c.id === activeCampId);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (searchParams.get('createProject') === '1' && isAdmin) {
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

  const timelineFields = [
    { startKey: "meeting1StartDate" as const, endKey: "meeting1EndDate" as const, label: "一收", icon: Clock, type: "single" },
    { startKey: "meeting2StartDate" as const, endKey: "meeting2EndDate" as const, label: "二收", icon: Clock, type: "single" },
    { startKey: "meeting3StartDate" as const, endKey: "meeting3EndDate" as const, label: "三收", icon: Clock, type: "single" },
    { startKey: "trainingStartDate" as const, endKey: "trainingEndDate" as const, label: "營隊集訓", icon: Clock, type: "range" },
    { startKey: "siteStartDate" as const, endKey: "siteEndDate" as const, label: "駐站", icon: MapPin, type: "single" },
    { startKey: "campStartDate" as const, endKey: "campEndDate" as const, label: "營期", icon: Tent, type: "range" },
  ];

  const handleUpdate = (updates: Partial<typeof activeCamp>) => {
    if (!activeCampId) return;
    updateCamp(activeCampId, updates as any);
  };

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) {
      toast({ title: t('ENTER_PROJECT_NAME_REQUIRED'), description: t('PROJECT_NAME_REQUIRED_DESC'), variant: "destructive" });
      return;
    }
    addCamp(name);
    setNewProjectName("");
    setIsAddingProject(false);
    toast({ title: t('PROJECT_CREATED'), description: t('PROJECT_CREATED_DESC', { name }) });
  };

  const beginRenameCamp = (id: string, currentName: string) => {
    setEditingCampId(id);
    setEditingCampName(currentName);
  };

  const cancelRenameCamp = () => {
    setEditingCampId(null);
    setEditingCampName("");
  };

  const submitRenameCamp = (id: string) => {
    const name = editingCampName.trim();
    if (!name) {
      toast({ title: t('NAME_CANNOT_BE_EMPTY'), description: t('ENTER_NEW_PROJECT_NAME'), variant: "destructive" });
      return;
    }
    updateCamp(id, { name });
    setEditingCampId(null);
    setEditingCampName("");
    toast({ title: t('PROJECT_RENAMED'), description: t('PROJECT_RENAMED_DESC', { name }) });
  };

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
            className="self-start sm:self-center h-10 px-4 rounded-xl text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-stone-200/80 dark:border-white/10 hover:border-rose-500/30 transition-all font-mono text-xs gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>登出系統</span>
          </Button>
        </div>

        {/* ── SEGMENTED TAB SELECTOR ─────── */}
        <div className="mb-10 p-1.5 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border text-xs font-mono",
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
              <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-3">
                    <label className="block text-xs font-mono tracking-wider text-fg-muted uppercase">
                      Identity Designation
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 rounded-xl px-4 py-3 font-normal text-foreground focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none transition-all text-sm"
                    />
                    <p className="text-[11px] font-mono text-fg-muted">
                      當前會話顯示名稱，用於記錄變更與修訂者辨識。
                    </p>
                  </div>
                  <div className="flex items-center gap-5 p-6 bg-stone-50/60 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 rounded-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">Clearance Level</p>
                      <p className="text-xl font-normal text-foreground uppercase tracking-tight mt-0.5">{role}</p>
                      <span className="inline-block mt-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        {role === 'admin' ? '● 擁有完整系統編輯權限' : '○ 唯讀瀏覽權限'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB: WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="space-y-12">
              
              {/* 1. PROJECT DIRECTORY */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="architectural-tag">01</span>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                      <Layout className="w-4 h-4 text-orange-500" />
                      {t('PROJECT_DIRECTORY')}
                    </h2>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-full font-mono text-xs uppercase tracking-wider border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-all gap-1.5"
                      onClick={() => {
                        setIsAddingProject((prev) => !prev);
                        if (isAddingProject) setNewProjectName("");
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAddingProject ? t('COLLAPSE') : t('NEW_PROJECT')}
                    </Button>
                  )}
                </div>

                {isAdmin && isAddingProject && (
                  <div className="rounded-2xl bg-white/90 dark:bg-white/[0.04] p-5 border border-orange-500/30 shadow-lg backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <Input
                        placeholder={t('CREATE_PROJECT_PLACEHOLDER')}
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateProject();
                          if (e.key === "Escape") {
                            setIsAddingProject(false);
                            setNewProjectName("");
                          }
                        }}
                        className="h-10 bg-stone-50 dark:bg-white/5 text-foreground border-stone-200/80 dark:border-white/10 rounded-xl"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <Button className="h-10 px-5 font-mono text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs" onClick={handleCreateProject}>
                          <Check className="w-4 h-4 mr-1.5" /> {t('CREATE')}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-10 px-4 font-mono text-xs text-fg-muted hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl"
                          onClick={() => {
                            setIsAddingProject(false);
                            setNewProjectName("");
                          }}
                        >
                          <X className="w-4 h-4 mr-1.5" /> {t('CANCEL')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl overflow-hidden">
                  <div className="divide-y divide-stone-200/60 dark:divide-white/5">
                    {camps.map((camp, idx) => {
                      const isCurrent = activeCampId === camp.id;
                      const idxStr = String(idx + 1).padStart(2, '0');
                      return (
                        <div
                          key={camp.id}
                          className={cn(
                            "p-5 sm:p-6 flex items-center justify-between hover:bg-orange-500/[0.02] dark:hover:bg-orange-500/[0.04] transition-colors cursor-pointer group",
                            isCurrent && "bg-orange-500/[0.03] dark:bg-orange-500/[0.05]"
                          )}
                          onClick={() => {
                            if (editingCampId === camp.id) return;
                            if (activeCampId === camp.id) return;
                            setActiveCampId(camp.id);
                            toast({ title: t('SWITCHING_PROJECT'), description: t('SWITCHING_PROJECT_DESC', { name: camp.name }) });
                            setTimeout(() => {
                              window.location.reload();
                            }, 150);
                          }}
                        >
                          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                            <span className="font-mono text-xs text-fg-muted group-hover:text-orange-500 transition-colors w-6">
                              {idxStr}
                            </span>
                            <div className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                              isCurrent
                                ? "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400"
                                : "bg-stone-100 dark:bg-white/5 border-stone-200/60 dark:border-white/10 text-stone-400 group-hover:text-orange-500"
                            )}>
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              {editingCampId === camp.id ? (
                                <Input
                                  value={editingCampName}
                                  onChange={(e) => setEditingCampName(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") submitRenameCamp(camp.id);
                                    if (e.key === "Escape") cancelRenameCamp();
                                  }}
                                  className="h-9 w-[220px] sm:w-[280px] bg-white dark:bg-white/10 text-foreground border-orange-500 rounded-xl"
                                  autoFocus
                                />
                              ) : (
                                <h4 className="font-normal text-base sm:text-lg text-foreground truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                  {camp.name}
                                </h4>
                              )}
                              <p className="text-xs font-mono text-fg-muted mt-0.5">
                                {t('ESTABLISHED')}: {camp.campStartDate || t('CONTINUOUS')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isAdmin && (
                              <>
                                {editingCampId === camp.id ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        submitRenameCamp(camp.id);
                                      }}
                                      title={t('SAVE_NAME')}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelRenameCamp();
                                      }}
                                      title={t('CANCEL')}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-stone-400 hover:text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      beginRenameCamp(camp.id, camp.name);
                                    }}
                                    title={t('EDIT_NAME')}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 rounded-lg transition-colors",
                                    camp.isLocked
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCamp(camp.id, { isLocked: !camp.isLocked });
                                  }}
                                  title={camp.isLocked ? (language === 'zh' ? '解鎖專案' : 'Unlock Project') : (language === 'zh' ? '鎖定專案' : 'Lock Project')}
                                >
                                  {camp.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            )}
                            {isCurrent && (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">
                                {t('ACTIVE_CORE')}
                              </span>
                            )}
                            <ChevronRight className={cn(
                              "w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all",
                              isCurrent && "text-orange-500"
                            )} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* 2. TIMELINE SCHEDULE */}
              {isAdmin && activeCamp && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="architectural-tag">02</span>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      {t('TIMELINE_SETUP')}
                    </h2>
                  </div>
                  <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="divide-y divide-stone-200/60 dark:divide-white/5">
                      {timelineFields.map((field) => {
                        const Icon = field.icon;
                        return (
                          <div key={field.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 group">
                            <label className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-fg-muted min-w-[140px] group-hover:text-foreground transition-colors">
                              <Icon className="w-4 h-4 text-orange-500" />
                              <span>{field.label}</span>
                            </label>
                            <div className="w-full sm:w-auto sm:min-w-[340px]">
                              {field.type === "single" ? (
                                <input
                                  type="date"
                                  value={(activeCamp as any)[field.startKey] || ""}
                                  onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
                                  className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 hover:border-orange-500/50 focus:border-orange-500 rounded-xl px-4 py-2 font-mono text-xs outline-none transition-all text-foreground text-center cursor-pointer"
                                />
                              ) : (
                                <div className="flex items-center w-full bg-stone-50 dark:bg-white/5 rounded-xl border border-stone-200/80 dark:border-white/10 hover:border-orange-500/50 focus-within:border-orange-500 transition-all">
                                  <input
                                    type="date"
                                    value={(activeCamp as any)[field.startKey] || ""}
                                    onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
                                    className="flex-1 w-full min-w-0 bg-transparent border-none rounded-l-xl px-3 py-2 font-mono text-xs outline-none text-foreground text-center cursor-pointer"
                                  />
                                  <span className="text-stone-300 dark:text-stone-600 font-mono text-xs px-1">➔</span>
                                  <input
                                    type="date"
                                    value={(activeCamp as any)[field.endKey] || ""}
                                    onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
                                    className="flex-1 w-full min-w-0 bg-transparent border-none rounded-r-xl px-3 py-2 font-mono text-xs outline-none text-foreground text-center cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* 3. GROUP MANAGEMENT */}
              {isAdmin && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="architectural-tag">03</span>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                      <List className="w-4 h-4 text-orange-500" />
                      {language === 'zh' ? '組別架構管理' : 'Division Structure Management'}
                    </h2>
                  </div>
                  <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8">
                    {/* Desktop Headers */}
                    <div className="hidden md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 pb-3 border-b border-stone-200/60 dark:border-white/5 mb-3 px-2 text-[10px] font-mono tracking-widest text-fg-muted uppercase">
                      <div>{language === 'zh' ? '中文名稱' : 'Chinese Name'}</div>
                      <div>{language === 'zh' ? '英文名稱' : 'English Name'}</div>
                      <div>{language === 'zh' ? '路由 / 縮寫' : 'Route / Slug'}</div>
                      <div className="text-right w-10">{language === 'zh' ? '操作' : 'Action'}</div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {groups.map((group) => {
                        const isDefault = group.slug === 'activity' || group.slug === 'teaching' || group.slug === 'admin';
                        const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                        return (
                          <div
                            key={group.id}
                            className="flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-3 md:gap-4 md:items-center p-3 rounded-2xl bg-stone-50/50 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-xs", badgeParams.colorDot)} />
                              <Input
                                placeholder={language === 'zh' ? '中文名稱' : 'Chinese Name'}
                                value={group.nameZh}
                                onChange={(e) => updateGroup(group.id, { nameZh: e.target.value })}
                                className="bg-white dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-9 text-xs font-normal"
                              />
                            </div>
                            <Input
                              placeholder="English Name"
                              value={group.nameEn}
                              onChange={(e) => updateGroup(group.id, { nameEn: e.target.value })}
                              className="bg-white dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-9 text-xs font-normal"
                            />
                            {isDefault ? (
                              <div className="flex items-center px-3 py-1.5 h-9">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase border",
                                  badgeParams.softBg,
                                  badgeParams.softText,
                                  badgeParams.softBorder
                                )}>
                                  /{group.slug}
                                </span>
                              </div>
                            ) : (
                              <Input
                                placeholder="Slug"
                                value={group.slug}
                                onChange={(e) => updateGroup(group.id, { slug: e.target.value })}
                                className="bg-white dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-9 font-mono text-xs"
                              />
                            )}
                            <div className="flex justify-end w-full md:w-10">
                              {!isDefault ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-stone-400 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"
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

                    {/* Add Group Row */}
                    <div className="p-4 rounded-2xl bg-orange-500/[0.04] border border-orange-500/20 flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-3 md:gap-4 md:items-center">
                      <Input
                        placeholder={language === 'zh' ? '新增中文名稱' : 'New Chinese Name'}
                        value={newGroupNameZh}
                        onChange={(e) => setNewGroupNameZh(e.target.value)}
                        className="bg-white dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-9 text-xs"
                      />
                      <Input
                        placeholder="New English Name"
                        value={newGroupNameEn}
                        onChange={(e) => setNewGroupNameEn(e.target.value)}
                        className="bg-white dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-9 text-xs"
                      />
                      <div className="flex items-center px-1">
                        <span className="text-[11px] font-mono text-fg-muted italic">
                          {language === 'zh' ? '自動產生 Slug' : 'Auto Slug'}
                        </span>
                      </div>
                      <Button
                        onClick={() => {
                          if (newGroupNameZh.trim() && newGroupNameEn.trim()) {
                            addGroup({ nameZh: newGroupNameZh.trim(), nameEn: newGroupNameEn.trim() });
                            setNewGroupNameZh("");
                            setNewGroupNameEn("");
                          }
                        }}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs rounded-xl h-9 px-4 shadow-xs"
                      >
                        {language === 'zh' ? '新增組別' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* 4. ACTIVITY TYPES */}
              {isAdmin && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="architectural-tag">04</span>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-medium flex items-center gap-2">
                      <List className="w-4 h-4 text-orange-500" />
                      {language === 'zh' ? '活動類別標籤' : 'Activity Category Tags'}
                    </h2>
                  </div>
                  <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex flex-wrap gap-2.5 mb-6">
                      {activityTypes?.map((type) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-xs font-mono text-foreground"
                        >
                          <span>{type}</span>
                          <button
                            onClick={() => removeActivityType(type)}
                            className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 max-w-md">
                      <Input
                        placeholder={language === 'zh' ? '新增活動類型 (例如: 晚會活動)' : 'Add activity type'}
                        value={newActivityType}
                        onChange={(e) => setNewActivityType(e.target.value)}
                        className="bg-stone-50 dark:bg-white/5 border-stone-200/80 dark:border-white/10 rounded-xl h-10 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newActivityType.trim()) {
                            addActivityType(newActivityType.trim());
                            setNewActivityType("");
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (newActivityType.trim()) {
                            addActivityType(newActivityType.trim());
                            setNewActivityType("");
                          }
                        }}
                        className="h-10 px-5 font-mono text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs shrink-0"
                      >
                        {language === 'zh' ? '新增' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
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
                <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 flex items-center justify-between">
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
                <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 flex items-center justify-between">
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
              <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-fg-muted mb-1.5">
                    {language === 'zh' ? '目前執行版本' : 'Active Deployment Version'}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl sm:text-2xl text-foreground font-normal">
                      v{currentVersion}
                    </span>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      LIVE PRODUCTION
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setIsVersionHistoryOpen(true)}
                  variant="outline"
                  className="h-10 px-6 rounded-full font-mono text-xs uppercase tracking-wider border-stone-200/80 dark:border-white/10 hover:border-orange-500/40 text-foreground transition-all"
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
              <div className="bg-rose-500/[0.04] border border-rose-500/25 rounded-3xl p-6 sm:p-8">
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
                    className="font-mono text-xs uppercase tracking-wider h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/25 shrink-0"
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
                            className="bg-white dark:bg-black/30 border-rose-500/40 font-mono text-xs rounded-xl"
                          />
                          <Button
                            variant="destructive"
                            disabled={deleteInput !== "delete" || isDeleting === "downloading"}
                            onClick={async () => {
                              if (activeCampId) {
                                setIsDeleting("downloading");
                                toast({ title: language === 'zh' ? '備份中' : 'Backing up', description: language === 'zh' ? '正在打包所有教案 (Word) 與清單 (Excel) 為 ZIP...' : 'Packaging files...' });
                                try {
                                  await exportProjectBackupZip(activeCampId, activeCamp?.name || 'Project', camps, plans, tables);
                                  toast({ title: language === 'zh' ? '備份完成' : 'Backup completed', description: language === 'zh' ? 'ZIP 備份已下載，即將刪除專案。' : 'ZIP downloaded. Deleting...' });
                                } catch (e) {
                                  console.error("Backup failed", e);
                                }
                                deleteCamp(activeCampId);
                                setIsDeleting(false);
                                setDeleteInput("");
                              }
                            }}
                            className="font-mono text-xs rounded-xl shrink-0"
                          >
                            {isDeleting === "downloading" ? "Archiving..." : "Confirm"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="font-mono text-xs rounded-xl"
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
              className="relative w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-[#14191C] border border-stone-200/80 dark:border-white/10 shadow-2xl"
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
                  className="h-9 w-9 rounded-full text-stone-400 hover:text-foreground hover:bg-stone-100 dark:hover:bg-white/5"
                  onClick={() => setIsVersionHistoryOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="px-8 py-6 overflow-y-auto max-h-[calc(85vh-90px)] space-y-8">
                {VERSION_HISTORY.map((entry) => (
                  <div key={entry.id} className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-orange-500 shadow-xs" />
                    <div className="absolute left-[3px] top-4 bottom-[-32px] w-0.5 bg-stone-200 dark:bg-white/10" />

                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="font-mono text-xs text-fg-muted">{entry.date}</p>
                        <h4 className="text-base font-normal text-foreground mt-0.5">{entry.title}</h4>
                      </div>
                      <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">
                        v{entry.version}
                      </span>
                    </div>

                    <ul className="space-y-2 mt-3">
                      {entry.highlights.map((item, idx) => (
                        <li key={`${entry.id}-${idx}`} className="flex items-start gap-2.5 text-xs text-fg-secondary leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
