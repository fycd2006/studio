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
        onAddTable={isAdmin ? addTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
        onUpdateTable={isAdmin ? updateTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
        onDeleteTable={isAdmin ? deleteTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
        onUndoTable={isAdmin ? undoTable : () => {}}
        onRedoTable={isAdmin ? redoTable : () => {}}
        canUndoTable={isAdmin ? canUndoTable : false}
        canRedoTable={isAdmin ? canRedoTable : false}
        timer={timer}
        plans={plans}
        groups={groups}
        onUpdatePlan={isAdmin ? updatePlan : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
        camps={camps}
        activeCampId={activeCampId}
        onUpdateCamp={isAdmin ? updateCamp : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
      />
    </div>
  );
}
