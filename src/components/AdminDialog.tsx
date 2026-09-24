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
      <DialogContent className="sm:max-w-md rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#14191C] shadow-2xl p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="architectural-tag">
              // SECURITY CONFIRMATION //
            </span>
          </div>
          <DialogTitle className="flex items-center gap-2 font-normal text-lg sm:text-xl text-foreground tracking-tight">
            {isDeleteCamp && <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs font-mono text-fg-muted leading-relaxed pt-2">
              {isDeleteCamp ? (
                <div className="space-y-1.5">
                  <div className="text-rose-600 dark:text-rose-400">為了資料安全，刪除前系統將自動下載此專案的所有教案備份 (.docx)。</div>
                  <div>System will automatically download backups before deletion. Type 'delete' to confirm.</div>
                </div>
              ) : (
                <div>為了確保資料安全，此操作需要輸入確認碼。<br />Type 'delete' to confirm security action.</div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {isDeleteCamp && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">安全備份 / Secure Backup Included</span>
            </div>
          )}
          <Input
            type="text"
            placeholder="請輸入 delete 以確認 / Type 'delete'"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            className="h-11 rounded-xl font-mono text-xs bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-foreground"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-mono text-xs h-10 border border-stone-200/80 dark:border-white/10"
          >
            取消 / Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              "rounded-xl font-mono text-xs h-10 px-6",
              isDeleteCamp ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {isDeleteCamp ? "備份並刪除 / Backup & Delete" : "確認 / Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
