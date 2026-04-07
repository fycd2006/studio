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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { VERSION_HISTORY } from "@/data/version-history";

export default function SettingsPage() {
 const { role, logout } = useAuth();
 const { camps, activeCampId, setActiveCampId, deleteCamp, updateCamp, addCamp, activityTypes, addActivityType, removeActivityType, groups, addGroup, updateGroup, deleteGroup, plans, tables } = usePlans();
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
 <div className="bg-[#FBF9F6] dark:bg-slate-900 text-[#2C2A28] dark:text-slate-50 transition-colors font-sans selection:bg-orange-200 dark:selection:bg-amber-500/30">
 <div className="max-w-5xl mx-auto pt-28 sm:pt-24 pb-6 sm:pb-12 md:pb-16 px-4 sm:px-6 md:px-8">
 {/* ── PAGE TITLE ──────────────────── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-16 dark: pb-6 sm:pb-8">
 <div className="flex-1">
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A28] dark:text-white mb-1.5 sm:mb-2">
 {t('SETTINGS_TITLE')}
 </h1>
 <p className="text-stone-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs">Configuration // Governance // Security</p>
 </div>
 <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 text-stone-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
 <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
 </Button>
 </div>

 <div className="mb-8 sm:mb-10 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-[0_12px_36px_rgba(140,120,100,0.08)] border-none">
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
 {tabItems.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.key;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
 "group rounded-xl px-3 py-3 text-left transition-all cursor-pointer border-none",
 isActive
 ? "bg-[#F4EFE8] dark:bg-slate-700 shadow-sm"
 : "hover:bg-stone-50 dark:hover:bg-slate-700/60"
 )}
 >
 <div className="flex items-center gap-2.5">
 <span
 className={cn(
 "inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
 isActive
 ? "bg-orange-100 text-orange-700 dark:bg-amber-500/20 dark:text-amber-300"
 : "bg-stone-100 text-stone-500 dark:bg-slate-700 dark:text-slate-300"
 )}
 >
 <Icon className="w-4 h-4" />
 </span>
 <div className="min-w-0">
 <p className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-[#2C2A28] dark:text-white" : "text-stone-500 dark:text-slate-400")}>{tab.label}</p>
 <p className="text-[10px] text-stone-400 dark:text-slate-500 truncate">{t('SETTINGS_PANEL')}</p>
 </div>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-1 gap-12">
 {activeTab === "account" && (
 <>
 {/* ── IDENTITY ──────────────────── */}
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <User className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('IDENTITY_GOVERNANCE')}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
 <div className="space-y-4">
 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">Identity Designation</label>
 <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
 className="w-full bg-[#FBF9F6] dark:bg-slate-900 border-none  dark: rounded-md px-4 py-3 font-semibold focus:ring-1 focus:ring-orange-500 dark:focus:ring-amber-400 focus: dark:focus: outline-none transition-all text-[#2C2A28] dark:text-white" />
 </div>
 <div className="flex items-center gap-6 p-6 bg-[#FBF9F6] dark:bg-slate-900/50 rounded-xl dark: border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-amber-400/10 flex items-center justify-center dark: border-none">
 <ShieldCheck className="w-8 h-8 text-orange-600 dark:text-amber-400" />
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 mb-1">Clearance Level</p>
 <p className="font-bold text-lg text-[#2C2A28] dark:text-white uppercase tracking-tight">{role}</p>
 </div>
 </div>
 </div>
 </div>
 </section>
 </>
 )}

 {activeTab === "workspace" && (
 <>
 {/* ── PROJECT DIRECTORY ──────────── */}
 <section className="space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Layout className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('PROJECT_DIRECTORY')}
 </h2>
 {isAdmin && (
 <Button
 variant="outline"
 size="sm"
 className="h-8 px-4 rounded-lg bg-orange-600 dark:bg-amber-400 text-white dark:text-[#2C2A28] font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 dark:hover:bg-amber-500 transition-all gap-2 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
 onClick={() => {
 setIsAddingProject((prev) => !prev);
 if (isAddingProject) setNewProjectName("");
 }}
 >
 <Plus className="w-3.5 h-3.5" /> {isAddingProject ? t('COLLAPSE') : t('NEW_PROJECT')}
 </Button>
 )}
 </div>

 {isAdmin && isAddingProject && (
 <div className="rounded-xl bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
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
 className="h-10 bg-[#FBF9F6] dark:bg-slate-900 text-[#2C2A28] dark:text-white border-none"
 autoFocus
 />
 <div className="flex items-center gap-2">
 <Button className="h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={handleCreateProject}>
 <Check className="w-4 h-4 mr-1.5" /> {t('CREATE')}
 </Button>
 <Button
 variant="ghost"
 className="h-10 px-4 font-bold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 border-none"
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

 <div className="bg-white dark:bg-slate-800 rounded-xl p-2 overflow-hidden transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="divide-y divide-stone-100 dark:divide-slate-700/50">
 {camps.map((camp) => (
 <div key={camp.id}
 className={cn("p-6 flex items-center justify-between hover:bg-[#FBF9F6] dark:hover:bg-slate-700/50 transition-colors cursor-pointer group", activeCampId === camp.id && "bg-[#FBF9F6] dark:bg-slate-700/30")}
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
 <div className="flex items-center gap-6">
 <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center border-none transition-colors", activeCampId === camp.id ? "bg-orange-50 dark:bg-amber-400/10  dark:" : "bg-[#FBF9F6] dark:bg-slate-900  dark:")}>
 <ShieldCheck className={cn("w-6 h-6", activeCampId === camp.id ? "text-orange-600 dark:text-amber-400" : "text-stone-400 dark:text-slate-500 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors")} />
 </div>
 <div>
 {editingCampId === camp.id ? (
 <Input
 value={editingCampName}
 onChange={(e) => setEditingCampName(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => {
 if (e.key === "Enter") submitRenameCamp(camp.id);
 if (e.key === "Escape") cancelRenameCamp();
 }}
 className="h-9 w-[220px] bg-white dark:bg-slate-900 text-[#2C2A28] dark:text-white border-none"
 autoFocus
 />
 ) : (
 <h4 className="font-bold text-lg text-[#2C2A28] dark:text-white leading-tight">{camp.name}</h4>
 )}
 <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-1">{t('ESTABLISHED')}: {camp.campStartDate || t('CONTINUOUS')}</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 {isAdmin && (
 <>
 {editingCampId === camp.id ? (
 <>
 <Button
 variant="ghost"
 size="icon"
 className="h-9 w-9 rounded-lg text-emerald-600 hover:bg-emerald-500/10 border-none"
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
 className="h-9 w-9 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-700 border-none"
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
 className="h-9 w-9 rounded-lg transition-colors text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-700 border-none"
 onClick={(e) => {
 e.stopPropagation();
 beginRenameCamp(camp.id, camp.name);
 }}
 title={t('EDIT_NAME')}
 >
 <Pencil className="w-4 h-4" />
 </Button>
 )}
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
 title={camp.isLocked ? (language === 'zh' ? '解鎖專案' : 'Unlock Project') : (language === 'zh' ? '鎖定專案' : 'Lock Project')}
 >
 {camp.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
 </Button>
 </>
 )}
 {activeCampId === camp.id && <Badge className="bg-orange-100 dark:bg-amber-400/10 text-orange-700 dark:text-amber-400 dark: font-bold px-3 py-0.5 rounded-sm text-[10px] uppercase tracking-widest">{t('ACTIVE_CORE')}</Badge>}
 <ChevronRight className={cn("w-5 h-5 text-stone-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors", activeCampId === camp.id && "text-orange-500 dark:text-amber-400")} />
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>
 </>
 )}

 {/* ── PREFERENCES ───────────────── */}
 {activeTab === "preferences" && (
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Globe className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('PREFERENCES_TITLE')}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 flex items-center justify-between transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div>
 <h4 className="font-bold text-lg text-[#2C2A28] dark:text-white mb-1">{t('THEME_MODE')}</h4>
 <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Theme Protocol</p>
 </div>
 <div className="flex bg-stone-100 dark:bg-slate-900 p-1 rounded-md dark: border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <button onClick={() => setTheme('light')} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", theme === 'light' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
 <Sun className="w-5 h-5" />
 </button>
 <button onClick={() => setTheme('dark')} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", theme === 'dark' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
 <Moon className="w-5 h-5" />
 </button>
 </div>
 </div>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 flex items-center justify-between transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div>
 <h4 className="font-bold text-lg text-[#2C2A28] dark:text-white mb-1">{t('LANGUAGE_SWITCH')}</h4>
 <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Locale Protocol</p>
 </div>
 <div className="flex bg-stone-100 dark:bg-slate-900 p-1 rounded-md dark: border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <button onClick={() => setLanguage('zh')} className={cn("px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", language === 'zh' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>中文</button>
 <button onClick={() => setLanguage('en')} className={cn("px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", language === 'en' ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>EN</button>
 </div>
 </div>
 </div>
 </section>
 )}

 {/* ── TIMELINE SETUP ─────────────── */}

 {activeTab === "workspace" && isAdmin && activeCamp && (
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Calendar className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {t('TIMELINE_SETUP')}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col space-y-2">
 {timelineFields.map((field) => {
 const Icon = field.icon;
 return (
 <div key={field.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-2 md:px-0 border-b border-stone-100 dark:border-slate-800/50 last:border-0 group">
 <label className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-slate-400 min-w-[140px] transition-colors group-hover:text-stone-700 dark:group-hover:text-slate-300">
 <Icon className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {field.label}
 </label>
 <div className="w-full sm:w-auto sm:min-w-[340px] flex-1 sm:flex-none">
 {field.type === "single" ? (
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="w-full bg-[#FBF9F6] dark:bg-slate-900 border border-transparent hover:border-stone-200 dark:hover:border-slate-700 focus:border-orange-500 dark:focus:border-amber-400 rounded-full px-4 py-2.5 font-bold text-sm outline-none transition-all text-[#2C2A28] dark:text-white shadow-inner [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer text-center"
 />
 ) : (
 <div className="flex items-center w-full bg-[#FBF9F6] dark:bg-slate-900 rounded-full shadow-inner border border-transparent hover:border-stone-200 dark:hover:border-slate-700 focus-within:border-orange-500 dark:focus-within:border-amber-400 transition-all">
 <input
 type="date"
 value={(activeCamp as any)[field.startKey] || ""}
 onChange={(e) => handleUpdate({ [field.startKey]: e.target.value })}
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-l-full px-4 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
 />
 <span className="text-stone-300 dark:text-slate-600 font-black text-sm px-1">➔</span>
 <input
 type="date"
 value={(activeCamp as any)[field.endKey] || ""}
 onChange={(e) => handleUpdate({ [field.endKey]: e.target.value })}
 className="flex-1 w-full min-w-0 bg-transparent border-none rounded-r-full px-4 py-2.5 font-bold text-sm outline-none text-[#2C2A28] dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 text-center cursor-pointer"
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

 {activeTab === "workspace" && isAdmin && (
 <>
 {/* ── ACTIVITY TYPES (ADMIN ONLY) ── */}
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {language === 'zh' ? '組別管理' : 'Group Management'}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col">
 {/* Header - Desktop only */}
 <div className="hidden md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 pb-3 border-b border-stone-100 dark:border-slate-800/50 mb-3 px-2">
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">{language === 'zh' ? '中文名稱' : 'Chinese Name'}</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">{language === 'zh' ? '英文名稱' : 'English Name'}</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase">{language === 'zh' ? '路由/縮寫' : 'Route / Slug'}</div>
 <div className="text-xs font-bold tracking-wider text-stone-400 dark:text-slate-500 uppercase text-center w-10">{language === 'zh' ? '操作' : 'Action'}</div>
 </div>

 {/* Map groups */}
 <div className="space-y-4 md:space-y-1 mb-6">
 {groups.map((group) => {
 const isDefault = group.slug === 'activity' || group.slug === 'teaching';
 return (
 <div key={group.id} className="flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-3 md:gap-4 md:items-center p-3 md:p-2 rounded-lg bg-stone-50/50 md:bg-transparent hover:bg-stone-50/80 dark:hover:bg-slate-800/30 transition-colors group">
 <Input
 placeholder={language === 'zh' ? '中文名稱' : 'Chinese Name'}
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
 placeholder={language === 'zh' ? '路由 (Slug)' : 'Route (Slug)'}
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
 placeholder={language === 'zh' ? '新增中文名稱' : 'New Chinese Name'}
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
 <span className="text-xs text-stone-400 dark:text-slate-500 font-medium italic">{language === 'zh' ? '自動產生 Slug' : 'Slug is auto-generated'}</span>
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
 {language === 'zh' ? '新增' : 'Add'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <List className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {language === 'zh' ? '活動類型設定' : 'Activity Type Settings'}
 </h2>
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none">
 <div className="flex flex-col gap-6">
 <div className="flex flex-wrap gap-2 mb-2">
 {activityTypes?.map((type) => (
 <Badge key={type} className="px-3 py-1.5 flex items-center gap-2 bg-stone-100 dark:bg-slate-900 text-stone-700 dark:text-slate-300 dark: hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors border-none">
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
 placeholder={language === 'zh' ? '新增活動類型 (例如: 晚會活動)' : 'Add activity type (e.g. Evening Event)'}
 value={newActivityType}
 onChange={(e) => setNewActivityType(e.target.value)}
 className="max-w-xs font-bold bg-[#FBF9F6] dark:bg-slate-900  dark: text-[#2C2A28] dark:text-white"
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
 className="bg-stone-900 dark:bg-white text-white dark:text-[#2C2A28] font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
 >
 {language === 'zh' ? '新增' : 'Add'}
 </Button>
 </div>
 </div>
 </div>
 </section>
 </>
 )}

 {activeTab === "versions" && (
 <section className="space-y-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-slate-400 flex items-center gap-3">
 <Clock className="w-4 h-4 text-orange-500 dark:text-amber-400" /> {language === 'zh' ? '版本資訊' : 'Version Info'}
 </h2>

 <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 transition-colors shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">{language === 'zh' ? '當前版本' : 'Current Version'}</p>
 <Badge className="bg-stone-100 dark:bg-slate-900 text-stone-700 dark:text-slate-300 font-black px-3 py-1 text-xs border-none">
 v{currentVersion}
 </Badge>
 </div>
 <Button
 onClick={() => setIsVersionHistoryOpen(true)}
 variant="outline"
 className="h-9 px-4 rounded-lg font-bold text-xs tracking-widest uppercase border-none bg-[#FBF9F6] dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
 >
 {language === 'zh' ? '查看版本歷程' : 'View Version History'}
 </Button>
 </div>
 </section>
 )}

 {/* ── ADMIN DANGER ZONE ──────────── */}
 {activeTab === "danger" && isAdmin && (
 <section className="space-y-6 pt-12 dark:">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-rose-500 flex items-center gap-3">
 <ShieldAlert className="w-4 h-4" /> {t('DANGER_ZONE')}
 </h2>
 <div className="bg-rose-50 dark:bg-rose-500/5 dark: rounded-xl p-8 shadow-sm border-none">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="space-y-2">
 <h4 className="font-bold text-lg text-rose-700 dark:text-rose-400">{language === 'zh' ? '刪除當前專案目錄' : 'Delete Current Project Directory'}</h4>
 <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 max-w-lg">
 {language === 'zh' ? '此操作將永久刪除' : 'This action will permanently delete all plans and data for'} <strong className="font-black">"{activeCamp?.name || (language === 'zh' ? '未知' : 'Unknown')}"</strong>{language === 'zh' ? ' 的所有教案及資料。' : '.'}
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
 className="mt-8 pt-6 dark:"
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
 className="bg-white dark:bg-slate-900  dark: font-mono focus-visible:ring-rose-500 text-[#2C2A28] dark:text-white shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
 />
 <Button
 variant="destructive"
 disabled={deleteInput !== "delete" || isDeleting === "downloading"}
 onClick={async () => {
 if (activeCampId) {
 setIsDeleting("downloading");
 toast({ title: language === 'zh' ? '備份中' : 'Backing up', description: language === 'zh' ? '正在打包所有教案 (Word) 與清單 (Excel) 為 ZIP...' : 'Packaging all plans (Word) and lists (Excel) into a ZIP...' });
 try {
 await exportProjectBackupZip(activeCampId, activeCamp?.name || (language === 'zh' ? '專案' : 'Project'), camps, plans, tables);
 toast({ title: language === 'zh' ? '備份完成' : 'Backup completed', description: language === 'zh' ? 'ZIP 備份已下載，即將刪除專案。' : 'ZIP backup downloaded. Project will now be deleted.' });
 } catch (e) {
 console.error("Backup failed", e);
 toast({ title: language === 'zh' ? '備份失敗' : 'Backup failed', description: language === 'zh' ? '無法產生備份檔案，但仍將繼續刪除。' : 'Could not generate backup, but deletion will continue.', variant: "destructive" });
 }
 deleteCamp(activeCampId);
 setIsDeleting(false);
 setDeleteInput("");
 }
 }}
 className="font-bold gap-2"
 >
 {isDeleting === "downloading" ? "Backup & Deleting..." : "Confirm"}
 </Button>
 <Button variant="ghost" className="text-stone-600 dark:text-slate-400 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => { setIsDeleting(false); setDeleteInput(""); }}>
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

 <AnimatePresence>
 {isVersionHistoryOpen && (
 <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
 <motion.div
 initial={{ opacity: 0, y: 12, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.98 }}
 transition={{ duration: 0.2, ease: "easeOut" }}
 className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl"
 >
 <div className="px-5 py-4 border-b border-stone-100 dark:border-slate-700/70 flex items-center justify-between">
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-slate-400">Release Timeline</p>
 <h3 className="text-lg font-bold text-[#2C2A28] dark:text-white">{language === 'zh' ? '版本歷程' : 'Version History'}</h3>
 </div>
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-700"
 onClick={() => setIsVersionHistoryOpen(false)}
 >
 <X className="w-4 h-4" />
 </Button>
 </div>

 <div className="px-5 py-4 overflow-y-auto max-h-[calc(80vh-76px)] space-y-3">
 {VERSION_HISTORY.map((entry) => (
 <div key={entry.id} className="rounded-xl border border-stone-100 dark:border-slate-700/70 p-4 bg-[#FBF9F6] dark:bg-slate-900/40">
 <div className="flex items-start justify-between gap-3 mb-2">
 <div>
 <p className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-slate-400">{entry.date} • v{entry.version}</p>
 <h4 className="text-sm sm:text-base font-bold text-[#2C2A28] dark:text-white">{entry.title}</h4>
 </div>
 <Badge className="bg-orange-100 dark:bg-amber-500/10 text-orange-700 dark:text-amber-300 border-none font-bold text-[10px]">{entry.label}</Badge>
 </div>
 <ul className="space-y-1.5">
 {entry.highlights.map((item, idx) => (
 <li key={`${entry.id}-${idx}`} className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
 <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 dark:bg-amber-400 shrink-0" />
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
 </div>
 </div>
 );
}
