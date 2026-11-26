"use client";

import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";

export function FirebaseErrorListener() {
  useEffect(() => {
    // A pending save can be denied while the membership listener signs a disabled user out.
    const handleError = () => {
      toast({ variant: "destructive", title: "無法存取營隊資料", description: "請確認登入狀態與操作權限。" });
    };
    errorEmitter.on("permission-error", handleError);
    return () => { errorEmitter.off("permission-error", handleError); };
  }, []);
  return null;
}
