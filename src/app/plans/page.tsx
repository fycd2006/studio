"use client"

import { usePlans } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { PlanCategory } from "@/types/plan";
import { format } from "date-fns";
import {
  Plus,
  FileText,
  LayoutGrid,
  List,
  Clock,
  ChevronRight,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function PlansOverview() {
  const { role } = useAuth();
  const { plans, addPlan, setActivePlanId, activeCampId, camps, deletePlan } = usePlans();
  const router = useRouter();
  const { toast } = useToast();
  const activeCamp = camps.find(c => c.id === activeCampId);
  const isAdmin = role === 'admin';

  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const crewToast = () => toast({
    title: "🔒 唯讀模式",
    description: "您目前的權限為組員，如需修改請聯繫管理員。",
  });

  const handleCreatePlan = (category: PlanCategory) => {
    if (!isAdmin) { crewToast(); return; }
    const newId = addPlan(category);
    if (newId) router.push(`/plans/${newId}`);
    toast({ title: "已建立", description: "全新教案建立成功" });
  };

  const handleOpenPlan = (id: string) => {
    setActivePlanId(id);
    router.push(`/plans/${id}`);
  };

  const handleDeletePlan = (id: string, name: string) => {
    if (!isAdmin) { crewToast(); return; }
    setDeleteTarget({ id, name });
    setDeleteInput("");
  };

  const confirmDelete = () => {
    if (deleteTarget && deleteInput === "delete") {
      deletePlan(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteInput("");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors selection:bg-orange-200 dark:selection:bg-amber-500/30 font-sans">
      <div className="max-w-6xl mx-auto py-12 md:py-16 px-6 md:px-8">
        {/* ── HEADER ─────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-stone-200 dark:border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400 bg-stone-200/50 dark:bg-slate-800 px-2 py-1 rounded-sm">
                {activeCamp?.name || "All Projects"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
              教案總覽
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-sm mt-2 font-medium">文件與專案管理中心 / Document Repository</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-stone-100 dark:bg-slate-800 p-1 rounded-md border border-stone-200 dark:border-slate-700">
              <button onClick={() => setViewType("grid")} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", viewType === "grid" ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewType("list")} className={cn("p-1.5 rounded-sm transition-all cursor-pointer", viewType === "list" ? "bg-white dark:bg-slate-700 text-stone-900 dark:text-amber-400 shadow-sm" : "text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300")}>
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Button
                onClick={() => isAdmin ? setIsAdding(!isAdding) : crewToast()}
                className={cn("bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 h-10 px-5 font-semibold text-sm transition-colors cursor-pointer rounded-md shadow-sm", !isAdmin && "opacity-60")}
              >
                {!isAdmin && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                <Plus className="w-4 h-4 mr-2" /> 新增檔案
              </Button>

              <AnimatePresence>
                {isAdding && isAdmin && (
                  <motion.div initial={{ opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl p-1.5 w-48 z-50"
                  >
                    <button onClick={() => { handleCreatePlan("teaching"); setIsAdding(false); }} className="w-full px-3 py-2 text-left rounded-md hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
                      <p className="font-semibold text-sm text-stone-900 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400">教學模組</p>
                      <p className="text-[10px] text-stone-400 dark:text-slate-500">Teaching Plan</p>
                    </button>
                    <button onClick={() => { handleCreatePlan("activity"); setIsAdding(false); }} className="w-full px-3 py-2 text-left rounded-md hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
                      <p className="font-semibold text-sm text-stone-900 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400">活動模組</p>
                      <p className="text-[10px] text-stone-400 dark:text-slate-500">Activity Plan</p>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────── */}
        {plans.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-20 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-stone-50 dark:bg-slate-900 flex items-center justify-center mb-4 border border-stone-100 dark:border-slate-800">
              <FileText className="w-6 h-6 text-stone-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-slate-200 mb-1">查無文件</h3>
            <p className="text-stone-500 dark:text-slate-400 max-w-xs mx-auto text-sm">點擊右上角新增按鈕建立第一份教案文件。</p>
          </div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.2 }}>
                <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-6 text-left w-full group transition-all duration-300 hover:border-orange-500/50 dark:hover:border-amber-400/50 hover:shadow-md flex flex-col h-full cursor-pointer" onClick={() => handleOpenPlan(plan.id)}>
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", plan.category === "activity" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800")}>
                      {plan.category === "activity" ? "活動" : "教學"}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-stone-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors" />
                  </div>
                  
                  <h3 className="font-semibold text-base text-stone-900 dark:text-slate-100 mb-1 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{plan.activityName || "未命名文件"}</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mb-4 flex-1">{plan.scheduledName || "無分類"}</p>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-stone-100 dark:border-slate-700/50 mt-auto">
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : "—"}
                    </div>
                    {plan.members && (
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span className="line-clamp-1 max-w-[80px]">{plan.members}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-slate-900/50 border-b border-stone-200 dark:border-slate-700">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">檔案名稱</th>
                  <th className="px-6 py-4 font-medium">類型</th>
                  <th className="px-6 py-4 font-medium">分類</th>
                  <th className="px-6 py-4 font-medium">協作者</th>
                  <th className="px-6 py-4 font-medium">最後修改</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-700/50">
                {plans.map((plan) => (
                  <tr key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-semibold text-stone-900 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-amber-400 transition-colors">{plan.activityName || "未命名文件"}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn("px-2 py-0 text-[9px] font-bold uppercase border", plan.category === "activity" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800")}>
                        {plan.category === "activity" ? "活動" : "教學"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{plan.scheduledName || "—"}</td>
                    <td className="px-6 py-4 text-stone-500 dark:text-slate-400 font-medium">{plan.members || "—"}</td>
                    <td className="px-6 py-4 text-stone-400 dark:text-slate-500 text-xs font-medium">{plan.updatedAt ? format(new Date(plan.updatedAt), "yyyy/MM/dd HH:mm") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DELETE CONFIRMATION ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 p-8 rounded-xl shadow-xl max-w-sm w-full relative space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-stone-900 dark:text-white">刪除文件</h4>
                <p className="text-sm text-stone-500 dark:text-slate-400">請輸入 <span className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded">delete</span> 刪除「{deleteTarget.name}」。此操作不可復原。</p>
              </div>
              <Input
                type="text" value={deleteInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)} placeholder="delete"
                className="w-full bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-700 rounded-md font-mono text-sm focus:ring-rose-500 focus:border-rose-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 font-medium text-stone-600 dark:text-slate-300">取消</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleteInput !== "delete"} className="h-9 font-medium px-6 bg-rose-600 hover:bg-rose-700">
                  刪除
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
