"use client"

import { usePlans } from "@/hooks/use-plans";
import { useAuth } from "@/lib/auth-context";
import { AdminSection } from "@/components/AdminSection";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
 const { role } = useAuth();
 const { toast } = useToast();
 const {
 plans, tables, camps, activeCampId,
 addTable, updateTable, deleteTable,
 undoTable, redoTable, canUndoTable, canRedoTable,
 updatePlan, updateCamp,
 audioEnabled, timer,
 } = usePlans();

 const isAdmin = role === 'admin';

 /* Crew sees read-only admin section with lock overlay */
 return (
 <div className="min-h-screen relative bg-[#FBF9F6] dark:bg-[hsl(var(--bar-theme))] text-[#2C2A28] dark:text-slate-50 transition-colors font-sans selection:bg-orange-200 dark:selection:bg-amber-500/30">
 <AdminSection
 tables={tables}
 onAddTable={isAdmin ? addTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
 onUpdateTable={isAdmin ? updateTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
 onDeleteTable={isAdmin ? deleteTable : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
 onUndoTable={isAdmin ? undoTable : () => {}}
 onRedoTable={isAdmin ? redoTable : () => {}}
 canUndoTable={isAdmin ? canUndoTable : false}
 canRedoTable={isAdmin ? canRedoTable : false}
 timer={{ ...timer, audioEnabled }}
 plans={plans}
 onUpdatePlan={isAdmin ? updatePlan : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
 camps={camps}
 activeCampId={activeCampId}
 onUpdateCamp={isAdmin ? updateCamp : () => toast({ title: "🔒 唯讀模式", description: "您目前的權限為組員，如需修改請聯繫管理員。" })}
 />
 </div>
 );
}
