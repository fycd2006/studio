"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, ShieldCheck, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const { login } = useAuth();
  
  // 🛡️ Fix Hydration Mismatch: Ensure initial render matches server
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);
    
    // Professional handshaking delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const success = login(username, password);
    if (!success) {
      setError(true);
      setIsSubmitting(false);
    }
  };

  // Prevent rendering on server to avoid hydration mismatch with dynamic styles
  if (!mounted) {
    return <div className="min-h-screen bg-brand-navy" />;
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Ambience Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-gold rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-gold rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex w-20 h-20 bg-brand-gold items-center justify-center rounded-2xl shadow-gold-glow mb-8">
            <ShieldCheck className="w-10 h-10 text-brand-navy stroke-[2.5px]" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-white tracking-tight uppercase mb-2">
            Secure Terminal <span className="text-brand-gold">Access</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase opacity-60">
            NTUT CD CAMP // ELITE GOVERNANCE
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-saas-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Identifier</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="USERNAME"
                  className="w-full h-12 bg-slate-50 dark:bg-brand-navy border border-slate-200 dark:border-white/5 rounded-lg pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Encrypted Key</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 bg-slate-50 dark:bg-brand-navy border border-slate-200 dark:border-white/5 rounded-lg pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-lg text-xs font-bold text-center"
                >
                  CRITICAL_ERROR: UNAUTHORIZED_ACCESS_DETECTED
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 gold-btn text-sm uppercase tracking-widest font-bold shadow-saas-md flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Establish Handshake <ArrowRight className="w-4 h-4 stroke-[3px]" /></>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] opacity-40">
          All connection attempts are logged and monitored.
        </p>
      </motion.div>
    </div>
  );
}
