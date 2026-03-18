
"use client"

import { usePlans } from "@/hooks/use-plans";
import { PlanSidebar } from "@/components/PlanSidebar";
import { PlanEditor } from "@/components/PlanEditor";
import { AdminSection } from "@/components/AdminSection";
import { Dashboard } from "@/components/Dashboard";
import { Toaster } from "@/components/ui/toaster";
import { Package2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Home() {
  const { 
    camps,
    activeCampId,
    setActiveCampId,
    addCamp,
    updateCamp,
    deleteCamp,
    plans,
    tables,
    activePlan, 
    activePlanId, 
    setActivePlanId, 
    addPlan, 
    deletePlan, 
    updatePlan, 
    reorderPlans,
    undoPlan,
    redoPlan,
    canUndoPlan,
    canRedoPlan,
    addTable,
    updateTable,
    deleteTable,
    undoTable,
    redoTable,
    canUndoTable,
    canRedoTable,
    viewMode,
    setViewMode,
    isSaving,
    audioEnabled,
    timer,
    activePlanVersions,
    savePlanVersion,
    restorePlanVersion,
    deletePlanVersion
  } = usePlans();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden font-body transition-colors duration-300">
        <PlanSidebar
          camps={camps}
          activeCampId={activeCampId}
          onCampSelect={setActiveCampId}
          onCampAdd={addCamp}
          onCampUpdate={updateCamp}
          onCampDelete={deleteCamp}
          plans={plans}
          activePlanId={activePlanId}
          onSelect={setActivePlanId}
          onAdd={addPlan}
          onDelete={deletePlan}
          onReorder={reorderPlans}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <main className="flex-1 h-full overflow-hidden relative flex flex-col">
          {viewMode === 'admin' ? (
            <AdminSection 
              tables={tables}
              onAddTable={addTable}
              onUpdateTable={updateTable}
              onDeleteTable={deleteTable}
              onUndoTable={undoTable}
              onRedoTable={redoTable}
              canUndoTable={canUndoTable}
              canRedoTable={canRedoTable}
              timer={{
                ...timer,
                audioEnabled
              }}
              plans={plans}
              onUpdatePlan={updatePlan}
              camps={camps}
              activeCampId={activeCampId}
              onUpdateCamp={updateCamp}
            />
          ) : activePlan ? (
            <PlanEditor 
              plan={activePlan} 
              onUpdate={updatePlan} 
              isSaving={isSaving} 
              onUndo={undoPlan}
              onRedo={redoPlan}
              canUndo={canUndoPlan}
              canRedo={canRedoPlan}
              versions={activePlanVersions}
              onSaveVersion={savePlanVersion}
              onRestoreVersion={restorePlanVersion}
              onDeleteVersion={deletePlanVersion}
            />
          ) : (
            <Dashboard 
              camps={camps}
              activeCampId={activeCampId}
              plans={plans}
              onSelectPlan={setActivePlanId}
              onSetViewMode={setViewMode}
            />
          )}
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
