"use client"

import React, { useState } from "react";
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
  Plus,
  List,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const { role, logout } = useAuth();
  const { camps, activeCampId, setActiveCampId, deleteCamp, updateCamp, addCamp, activityTypes, addActivityType, removeActivityType, groups, addGroup, updateGroup, deleteGroup } = usePlans();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const [profileName, setProfileName] = useState(role === 'admin' ? "STUDIO_ADMIN" : "CREW_MEMBER");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteInput, setDeleteInput] = useState("");

  const [newActivityType, setNewActivityType] = useState("");
  const [newGroupNameZh, setNewGroupNameZh] = useState("");
  const [newGroupNameEn, setNewGroupNameEn] = useState("");

  const activeCamp = camps.find(c => c.id === activeCampId);
  const isAdmin = role === 'admin';


  const timelineFields = [
    { startKey: "meeting1StartDate" as const, endKey: "meeting1EndDate" as const, label: "一籌", icon: Clock },
    { startKey: "meeting2StartDate" as const, endKey: "meeting2EndDate" as const, label: "二籌", icon: Clock },
    { startKey: "meeting3StartDate" as const, endKey: "meeting3EndDate" as const, label: "三籌", icon: Clock },
    { startKey: "trainingStartDate" as const, endKey: "trainingEndDate" as const, label: "營隊集訓", icon: Clock },
    { startKey: "siteStartDate" as const, endKey: "siteEndDate" as const, label: "駐站", icon: MapPin },
    { startKey: "campStartDate" as const, endKey: "campEndDate" as const, label: "營期", icon: Tent },
  ];

  const handleUpdate = (updates: Partial<typeof activeCamp>) => {
    if (!activeCampId) return;
    updateCamp(activeCampId, updates as any);
  };

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors font-sans selection:bg-orange-200 dark:selection:bg-amber-500/30">
      <div className="max-w-5xl mx-auto pt-24 pb-6 sm:pb-12 md:pb-16 px-4 sm:px-6 md:px-8">
        {/* ── PAGE TITLE ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-16 border-b border-stone-200 dark:border-slate-800 pb-6 sm:pb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-stone-900 dark:text-white mb-1.5 sm:mb-2">
              {t('SETTINGS_TITLE')}
            </h1>
            <p className="text-stone-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs">Configuration // Governance // Security</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 text-stone-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {/* ── IDENTITY ──────────────────── */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
              <User className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('IDENTITY_GOVERNANCE')}
            </h2>
            <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 shadow-sm transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">Identity Designation</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-md px-4 py-3 font-semibold focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus:border-orange-500 dark:focus:border-amber-400 outline-none transition-all text-stone-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-6 p-6 bg-stone-50 dark:bg-slate-900/50 rounded-xl border border-stone-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-amber-400/10 flex items-center justify-center border border-orange-200 dark:border-amber-400/20">
                    <ShieldCheck className="w-8 h-8 text-orange-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 mb-1">Clearance Level</p>
                    <p className="font-bold text-lg text-stone-900 dark:text-white uppercase tracking-tight">{role}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PROJECT DIRECTORY ──────────── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
                <Layout className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('PROJECT_DIRECTORY')}
              </h2>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {isAddingProject ? (
                    <div className="flex items-center gap-2 bg-stone-100 dark:bg-slate-900 rounded-lg p-1 pr-2 animate-in fade-in slide-in-from-right-2 duration-200">
                      <input 
                        className="bg-transparent border-none focus:ring-0 text-[11px] font-bold text-stone-900 dark:text-white w-32 px-2"
                        placeholder="Project Name..."
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newProjectName) {
                            addCamp(newProjectName);
                            setIsAddingProject(false);
                            setNewProjectName("");
                          } else if (e.key === 'Escape') {
                            setIsAddingProject(false);
                            setNewProjectName("");
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 rounded-md hover:bg-rose-500/10 hover:text-rose-500"
                        onClick={() => {
                          setIsAddingProject(false);
                          setNewProjectName("");
                        }}
                      >
                        <LogOut className="w-3 h-3 rotate-180" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500"
                        onClick={() => {
                          if (newProjectName) {
                            addCamp(newProjectName);
                            setIsAddingProject(false);
                            setNewProjectName("");
                          }
                        }}
                      >
                        <ShieldCheck className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-4 rounded-lg bg-orange-600 dark:bg-amber-400 text-white dark:text-slate-900 border-none font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 dark:hover:bg-amber-500 transition-all gap-2"
                      onClick={() => setIsAddingProject(true)}
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('NEW_PROJECT')}
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-2 overflow-hidden shadow-sm transition-colors">
              <div className="divide-y divide-stone-100 dark:divide-slate-700/50">
                {camps.map((camp) => (
                  <div key={camp.id}
                    className={cn("p-6 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group", activeCampId === camp.id && "bg-stone-50 dark:bg-slate-700/30")}
                    onClick={() => {
                      setActiveCampId(camp.id);
                      window.location.reload();
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center border transition-colors", activeCampId === camp.id ? "bg-orange-50 dark:bg-amber-400/10 border-orange-200 dark:border-amber-400/30" : "bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700")}>
                        <ShieldCheck className={cn("w-6 h-6", activeCampId === camp.id ? "text-orange-600 dark:text-amber-400" : "text-stone-400 dark:text-slate-500 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors")} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-stone-900 dark:text-white leading-tight">{camp.name}</h4>
                        <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-1">Established: {camp.campStartDate || "Continuous"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 rounded-lg transition-colors",
                            camp.isLocked ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCamp(camp.id, { isLocked: !camp.isLocked });
                          }}
                          title={camp.isLocked ? "Unlock Project" : "Lock Project"}
                        >
                          {camp.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </Button>
                      )}
                      {activeCampId === camp.id && <Badge className="bg-orange-100 dark:bg-amber-400/10 text-orange-700 dark:text-amber-400 border-orange-200 dark:border-amber-400/20 font-bold px-3 py-0.5 rounded-sm text-[10px] uppercase tracking-widest">Active</Badge>}
                      <ChevronRight className={cn("w-5 h-5 text-stone-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors", activeCampId === camp.id && "text-orange-500 dark:text-amber-400")} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PREFERENCES ───────────────── */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
              <Globe className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('PREFERENCES_TITLE')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 flex items-center justify-between shadow-sm transition-colors">
                <div>
                  <h4 className="font-bold text-lg text-stone-900 dark:text-white mb-1">{t('THEME_MODE')}</h4>
                  <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Theme Protocol</p>
                </div>
                <div className="flex bg-stone-100 dark:bg-slate-900 p-1 rounded-md border border-stone-200 dark:border-slate-700">
                  <button onClick={() => setTheme('light')} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", theme === 'light' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                    <Sun className="w-5 h-5" />
                  </button>
                  <button onClick={() => setTheme('dark')} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", theme === 'dark' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                    <Moon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 flex items-center justify-between shadow-sm transition-colors">
                <div>
                  <h4 className="font-bold text-lg text-stone-900 dark:text-white mb-1">{t('LANGUAGE_SWITCH')}</h4>
                  <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Locale Protocol</p>
                </div>
                <div className="flex bg-stone-100 dark:bg-slate-900 p-1 rounded-md border border-stone-200 dark:border-slate-700">
                  <button onClick={() => setLanguage('zh')} className={cn("px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", language === 'zh' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>中文</button>
                  <button onClick={() => setLanguage('en')} className={cn("px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", language === 'en' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>EN</button>
                </div>
              </div>
            </div>
          </section>

          {/* ── TIMELINE SETUP ─────────────── */}
          {isAdmin && activeCamp && (
            <section className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('TIMELINE_SETUP')}
              </h2>
              <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 shadow-sm transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {timelineFields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.label} className="p-6 bg-stone-50/50 dark:bg-slate-900/50 rounded-xl border border-stone-100 dark:border-slate-800 space-y-4">
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
                              className="w-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus:border-orange-500 dark:focus:border-amber-400 outline-none transition-all text-stone-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">End</span>
                            <input
                              type="date"
                              value={(activeCamp as any)[field.endKey] || ""}
                              onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
                              className="w-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-md px-3 py-2 font-bold text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus:border-orange-500 dark:focus:border-amber-400 outline-none transition-all text-stone-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ── ACTIVITY TYPES (ADMIN ONLY) ── */}
          {isAdmin && (
            <section className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
                <List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> 組別管理
              </h2>
              <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 shadow-sm transition-colors">
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groups.map((group) => {
                      const isDefault = group.slug === 'activity' || group.slug === 'teaching';
                      return (
                        <div key={group.id} className="rounded-xl border border-stone-200 dark:border-slate-700 p-4 bg-stone-50/60 dark:bg-slate-900/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 font-bold">/{group.slug}</Badge>
                            {!isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-stone-400 hover:text-rose-500"
                                onClick={() => deleteGroup(group.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">中文名稱</label>
                            <Input
                              value={group.nameZh}
                              onChange={(e) => updateGroup(group.id, { nameZh: e.target.value })}
                              className="font-bold bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">English Name</label>
                            <Input
                              value={group.nameEn}
                              onChange={(e) => updateGroup(group.id, { nameEn: e.target.value })}
                              className="font-bold bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700"
                            />
                          </div>
                          {!isDefault && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Slug / Route Key</label>
                              <Input
                                value={group.slug}
                                onChange={(e) => updateGroup(group.id, { slug: e.target.value })}
                                className="font-mono bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <Input
                      placeholder="新增組別中文名 (例如: 美宣組)"
                      value={newGroupNameZh}
                      onChange={(e) => setNewGroupNameZh(e.target.value)}
                      className="max-w-xs font-bold bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-900 dark:text-white"
                    />
                    <Input
                      placeholder="English Name (e.g. Design Team)"
                      value={newGroupNameEn}
                      onChange={(e) => setNewGroupNameEn(e.target.value)}
                      className="max-w-xs font-bold bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-900 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGroupNameZh.trim() && newGroupNameEn.trim()) {
                          addGroup({ nameZh: newGroupNameZh.trim(), nameEn: newGroupNameEn.trim() });
                          setNewGroupNameZh("");
                          setNewGroupNameEn("");
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (newGroupNameZh.trim() && newGroupNameEn.trim()) {
                          addGroup({ nameZh: newGroupNameZh.trim(), nameEn: newGroupNameEn.trim() });
                          setNewGroupNameZh("");
                          setNewGroupNameEn("");
                        }
                      }}
                      className="bg-stone-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      新增 / Add
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {isAdmin && (
            <section className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
                <List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> 活動類型設定
              </h2>
              <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-8 shadow-sm transition-colors">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {activityTypes?.map((type) => (
                      <Badge key={type} className="px-3 py-1.5 flex items-center gap-2 bg-stone-100 dark:bg-slate-900 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors">
                        <span className="font-bold">{type}</span>
                        <button 
                          onClick={() => removeActivityType(type)}
                          className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="新增活動類型 (例如: 晚會活動)"
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value)}
                      className="max-w-xs font-bold bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-900 dark:text-white"
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
                      className="bg-stone-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      新增 / Add
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── ADMIN DANGER ZONE ──────────── */}
          {isAdmin && (
            <section className="space-y-6 pt-12 border-t border-stone-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-rose-500 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4" /> {t('DANGER_ZONE')}
              </h2>
              <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 rounded-xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg text-rose-700 dark:text-rose-400">刪除當前專案目錄</h4>
                    <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 max-w-lg">
                      此操作將永久刪除 <strong className="font-black">"{activeCamp?.name || "未知"}"</strong> 所有教案及資料。
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleting(true)}
                    className="whitespace-nowrap font-bold tracking-widest uppercase text-xs h-10 px-6 cursor-pointer rounded-md"
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
                      className="mt-8 pt-6 border-t border-rose-200/50 dark:border-rose-500/20"
                    >
                      <div className="space-y-4 max-w-md">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-500">
                          Type <span className="text-rose-700 dark:text-rose-400 font-mono text-xs">delete</span> to confirm
                        </label>
                        <div className="flex gap-4">
                          <Input
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="delete"
                            className="bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-500/30 font-mono focus-visible:ring-rose-500 text-stone-900 dark:text-white"
                          />
                          <Button
                            variant="destructive"
                            disabled={deleteInput !== "delete"}
                            onClick={() => {
                              if (activeCampId) {
                                deleteCamp(activeCampId);
                                setIsDeleting(false);
                                setDeleteInput("");
                              }
                            }}
                            className="font-bold"
                          >
                            Confirm
                          </Button>
                          <Button variant="ghost" className="text-stone-600 dark:text-slate-400" onClick={() => { setIsDeleting(false); setDeleteInput(""); }}>
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
    </div>
  );
}
