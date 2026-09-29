"use client"

import { usePlans } from "@/hooks/use-plans";
import { useTimer } from "@/lib/timer-context";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

const AdminSection = dynamic(() => import("@/components/AdminSection").then(mod => ({ default: mod.AdminSection })), {
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground">
      <div className="flex items-center gap-2 mb-3 font-mono text-xs text-orange-600 dark:text-orange-400">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        <span>// INITIALIZING CONTROL CENTER //</span>
      </div>
      <p className="text-xs font-mono text-fg-muted uppercase tracking-widest">載入行政中樞中...</p>
    </div>
  ),
  ssr: false,
});

export default function AdminPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const timer = useTimer();
  const {
    plans, tables, camps, groups, activeCampId,
    addTable, updateTable, deleteTable,
    undoTable, redoTable, canUndoTable, canRedoTable,
    updatePlan, updateCamp,
  } = usePlans();

  const isAdmin = role === 'admin';

  /* Crew sees read-only admin section with lock overlay */
  return (
    <div className="min-h-screen relative bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground transition-colors font-sans selection:bg-orange-500/20">
      <AdminSection
        tables={tables}
        onAddTable={addTable}
        onUpdateTable={updateTable}
        onDeleteTable={deleteTable}
        onUndoTable={undoTable}
        onRedoTable={redoTable}
        canUndoTable={canUndoTable}
        canRedoTable={canRedoTable}
        timer={timer}
        plans={plans}
        groups={groups}
        onUpdatePlan={updatePlan}
        camps={camps}
        activeCampId={activeCampId}
        onUpdateCamp={updateCamp}
      />
    </div>
  );
}
