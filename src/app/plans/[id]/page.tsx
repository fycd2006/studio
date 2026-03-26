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
      <div className="h-full flex flex-col items-center justify-center bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 hover:text-amber-400 mb-4" />
        <h2 className="text-xl font-bold">載入中或是找不到教案...</h2>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/plans")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> 返回總覽
        </Button>
      </div>
    );
  }

  const handleUpdate = (id: string, updates: any) => {
    updatePlan(id, updates);
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-50 transition-colors">
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
