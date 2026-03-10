
"use client"

import { usePlans } from "@/hooks/use-plans";
import { PlanSidebar } from "@/components/PlanSidebar";
import { PlanEditor } from "@/components/PlanEditor";
import { AdminSection } from "@/components/AdminSection";
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
    timer
  } = usePlans();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-body">
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
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="absolute top-4 left-4 md:hidden">
                <SidebarTrigger className="h-10 w-10 text-slate-500 bg-white shadow-sm border border-slate-200 rounded-lg" />
              </div>
              <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center text-primary/40 transition-transform hover:scale-105 duration-300">
                <Package2 className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-black text-slate-800 tracking-tight">
                  啟動您的創意規劃 / Start Planning
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed font-bold">
                  請從側邊欄選擇教案或進入行政管理開始使用。<br />
                  Select a plan from the sidebar or enter Admin Mode.
                </p>
              </div>
            </div>
          )}
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
