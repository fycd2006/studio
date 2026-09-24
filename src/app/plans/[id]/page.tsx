"use client"

import { usePlans } from "@/hooks/use-plans";
import { useParams, useRouter } from "next/navigation";
import { PlanEditor } from "@/components/PlanEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function PlanEditorPage() {
 const { id } = useParams() as { id: string };
 const router = useRouter();
 
 const { 
 plans, 
 groups,
 updatePlan, 
 setActivePlanId, 
 undoPlan, 
 redoPlan, 
 canUndoPlan, 
 canRedoPlan,
 activePlanVersions,
 savePlanVersion,
 restorePlanVersion,
 updatePlanVersionName,
 deletePlanVersion,
 autoSaveCurrentState,
 getFullVersionState,
 activityTypes
 } = usePlans();

 const plan = plans.find(p => p.id === id);

 // Sync active plan ID when entering this route directly
 useEffect(() => {
 if (id) {
 setActivePlanId(id);
 }
 }, [id, setActivePlanId]);

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground transition-colors p-6">
        <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/10 flex items-center justify-center mb-6 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
        </div>
        <div className="text-[10px] font-mono tracking-widest text-fg-muted uppercase mb-2">
          // CURRICULUM SPECIFICATION //
        </div>
        <h2 className="text-xl sm:text-2xl font-normal text-foreground tracking-tight mb-2">
          載入中或找不到指定教案
        </h2>
        <p className="text-xs sm:text-sm text-fg-muted max-w-sm text-center mb-6">
          此教案可能已被移除，或正在自雲端資料庫同步中。
        </p>
        <button
          onClick={() => router.push("/plans")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-foreground bg-white/80 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/10 border border-stone-200/90 dark:border-white/15 transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回教案總覽</span>
        </button>
      </div>
    );
  }

  const handleUpdate = (id: string, updates: any) => {
    updatePlan(id, updates);
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground transition-colors">
 <div className="flex-1 min-w-0 flex flex-col">
 <PlanEditor 
 plan={plan} 
 groups={groups}
 onUpdate={handleUpdate} 
 isSaving={false} 
 onUndo={undoPlan}
 onRedo={redoPlan}
 canUndo={canUndoPlan}
 canRedo={canRedoPlan}
 versions={activePlanVersions || []}
 onSaveVersion={savePlanVersion}
 onRestoreVersion={restorePlanVersion}
 onDeleteVersion={deletePlanVersion}
 onUpdateVersionName={updatePlanVersionName}
 onAutoSave={autoSaveCurrentState}
 getFullVersionState={getFullVersionState}
 activityTypes={activityTypes}
 />
 </div>
 </div>
 );
}
