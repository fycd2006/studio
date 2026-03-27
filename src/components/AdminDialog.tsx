
"use client"

import { useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onConfirm: () => void;
 title: string;
}

export function AdminDialog({ open, onOpenChange, onConfirm, title }: AdminDialogProps) {
 const [deleteText, setDeleteText] = useState("");
 const { toast } = useToast();

 const handleConfirm = () => {
 if (deleteText === "delete") {
 onConfirm();
 onOpenChange(false);
 setDeleteText("");
 } else {
 toast({
 title: "輸入錯誤 / Invalid Input",
 description: "請正確輸入 delete 以確認操作 / Please type exactly 'delete'.",
 variant: "destructive",
 });
 }
 };

 const isDeleteCamp = title.includes("刪除專案");

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-8">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 font-headline font-black text-lg uppercase">
 {isDeleteCamp && <AlertTriangle className="h-5 w-5 text-rose-500" />}
 {title}
 </DialogTitle>
 <DialogDescription asChild>
 <div className="text-[10px] font-bold text-slate-400 leading-relaxed pt-2 uppercase tracking-wide">
 {isDeleteCamp ? (
 <div className="space-y-2">
 <div className="text-rose-500/80">為了資料安全，刪除前系統將自動下載此專案的所有教案備份 (.docx)。</div>
 <div>System will automatically download backups before deletion. Type 'delete' to confirm.</div>
 </div>
 ) : (
 <div>為了確保資料安全，此操作需要確認。<br />Type 'delete' to confirm security action.</div>
 )}
 </div>
 </DialogDescription>
 </DialogHeader>
 <div className="py-4 space-y-4">
 {isDeleteCamp && (
 <div className="p-3 bg-[#FBF9F6]/50 rounded-xl flex items-center gap-3 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]">
 <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
 <Download className="h-4 w-4 text-emerald-500" />
 </div>
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">安全備份 / Secure Backup</span>
 </div>
 )}
 <Input
 type="text"
 placeholder="請輸入 delete 以確認 / Type 'delete' to confirm"
 value={deleteText}
 onChange={(e) => setDeleteText(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
 className="h-11 rounded-xl font-bold"
 autoFocus
 />
 </div>
 <DialogFooter className="gap-2">
 <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-10 uppercase text-[10px]">
 取消 / Cancel
 </Button>
 <Button onClick={handleConfirm} className={cn("rounded-xl font-black h-10 px-8 uppercase text-[10px]", isDeleteCamp && "bg-rose-500 hover:bg-rose-600 text-white")}>
 {isDeleteCamp ? "備份並刪除 / Backup & Delete" : "確認 / Confirm"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
