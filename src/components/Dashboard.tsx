"use client"

import { useMemo } from "react";
import { 
  Sparkles, 
  Calendar, 
  FileText, 
  Package2, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Layout,
  Flame
} from "lucide-react";
import { Camp, LessonPlan } from "@/types/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardProps {
  camps: Camp[];
  activeCampId: string | null;
  plans: LessonPlan[];
  onSelectPlan: (id: string) => void;
  onSetViewMode: (mode: 'editor' | 'admin') => void;
}

export function Dashboard({ camps, activeCampId, plans, onSelectPlan, onSetViewMode }: DashboardProps) {
  const activeCamp = useMemo(() => camps.find(c => c.id === activeCampId), [camps, activeCampId]);
  
  const stats = useMemo(() => {
    const campPlans = plans.filter(p => p.campId === activeCampId);
    const completedPlans = campPlans.filter(p => (p.content?.length || 0) > 100).length;
    const totalProps = campPlans.reduce((acc, p) => acc + (p.props?.length || 0), 0);
    const packedProps = campPlans.filter(p => p.isPropsPacked).length;
    
    return {
      totalPlans: campPlans.length,
      completionRate: campPlans.length > 0 ? Math.round((completedPlans / campPlans.length) * 100) : 0,
      totalProps,
      propsReadyRate: campPlans.length > 0 ? Math.round((packedProps / campPlans.length) * 100) : 0,
      recentPlans: [...campPlans].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
    };
  }, [plans, activeCampId]);

  const countdowns = useMemo(() => {
    if (!activeCamp) return [];
    const today = new Date();
    
    const calculateDays = (dateStr?: string) => {
      if (!dateStr) return null;
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return differenceInDays(date, today);
    };

    return [
      { label: "一籌 / 1st Meeting", days: calculateDays(activeCamp.meeting1Date), color: "bg-orange-500" },
      { label: "二籌 / 2nd Meeting", days: calculateDays(activeCamp.meeting2Date), color: "bg-amber-500" },
      { label: "三籌 / 3rd Meeting", days: calculateDays(activeCamp.meeting3Date), color: "bg-yellow-500" },
      { label: "營期開始 / Camp Start", days: calculateDays(activeCamp.startDate), color: "bg-primary" }
    ].filter(item => item.days !== null && item.days >= 0)
     .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  }, [activeCamp]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6 md:p-10 space-y-10 scrollbar-hide page-enter transition-colors duration-300">
      {/* ═══════════════════════════════════════════
          HERO SECTION — Landing Page Warmth
          ═══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-[#FF6B00] to-accent p-8 md:p-16 text-white shadow-2xl shadow-primary/20 dark:shadow-primary/10 group">
        {/* Background Pattern */}
        <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />
        {/* Decorative Floating Orbs */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 text-center md:text-left max-w-2xl">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none px-4 py-1.5 rounded-full backdrop-blur-md font-bold tracking-widest text-[10px] uppercase">
              <Flame className="h-3 w-3 mr-1.5" />
              Volunteer Studio
            </Badge>
            <h1 className="font-headline font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              匯聚創意火花 <br />
              <span className="text-white/75">點燃營隊靈感</span>
            </h1>
            <p className="text-base md:text-lg font-medium text-white/75 max-w-lg leading-relaxed font-comic">
              在這裡，將創意化為真實的營隊體驗！追蹤進度、協作教案，為孩子們打造最棒的回憶。
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              <Button 
                onClick={() => onSetViewMode('editor')}
                className="bg-white text-primary hover:bg-white/90 h-14 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/10 group/btn transition-all btn-shimmer btn-press cursor-pointer"
              >
                開始編寫 / Start Planning
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
              <Button 
                onClick={() => onSetViewMode('admin')}
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest backdrop-blur-md btn-press cursor-pointer"
              >
                行政中心 / Admin Center
              </Button>
            </div>
          </div>
          {/* Decorative Visual */}
          <div className="relative hidden lg:block">
            <div className="w-64 h-64 md:w-72 md:h-72 bg-white/10 rounded-[3rem] backdrop-blur-2xl border border-white/20 shadow-2xl animate-float flex items-center justify-center overflow-hidden">
               <Sparkles className="w-24 h-24 text-white/15 absolute -top-6 -right-6" />
               <Layout className="w-28 h-28 text-white/30" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS GRID — Card UI with dark glow
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: FileText, label: "已建立教案 / Total Plans", value: stats.totalPlans, suffix: "份", sub: "涵蓋活動與教學組", color: "text-primary", bg: "bg-primary/10 dark:bg-primary/15" },
          { icon: TrendingUp, label: "內容完成度 / Completion", value: stats.completionRate, suffix: "%", sub: "依據文字量計算", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { icon: Package2, label: "物資準備率 / Props Ready", value: stats.propsReadyRate, suffix: "%", sub: "教案道具裝袋狀態", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { icon: Clock, label: "剩餘天數 / Days left", value: countdowns[0]?.days || 0, suffix: "天", sub: countdowns[0]?.label || "無即時活動", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card glow-card p-6 rounded-[1.5rem] border-none flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 cursor-default gradient-border">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl shadow-sm", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground">SYNCED</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-headline font-bold text-foreground">{stat.value}</span>
                <span className="text-sm font-bold text-muted-foreground">{stat.suffix}</span>
              </div>
              <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mt-2">{stat.label}</h4>
              <p className="text-[10px] font-medium text-muted-foreground mt-1 font-comic">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          MILESTONES + RECENT ACTIVITY
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Countdown Timeline */}
        <Card className="lg:col-span-1 glass-card glow-card p-8 rounded-[2rem] border-none">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-headline font-bold text-lg tracking-tight text-foreground uppercase">營隊里程碑 / Milestones</h3>
          </div>
          <div className="space-y-6 relative">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border rounded-full" />
            {countdowns.length > 0 ? countdowns.map((e, i) => (
              <div key={i} className="relative pl-8 flex items-center justify-between group">
                <div className={cn(
                  "absolute left-0 w-4 h-4 rounded-full border-4 border-card shadow-md z-10 transition-transform group-hover:scale-125",
                  e.color
                )} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">{e.label}</span>
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5 font-comic">進度追蹤中 / Tracking</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-headline font-bold text-foreground">{e.days}</span>
                  <span className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Days</span>
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground font-medium py-10 font-comic">尚未設定營隊日期 / No dates set</p>
            )}
          </div>
        </Card>

        {/* Recently Updated Plans */}
        <Card className="lg:col-span-2 glass-card glow-card p-8 rounded-[2rem] border-none">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-headline font-bold text-lg tracking-tight text-foreground uppercase">最近編輯 / Recent Activity</h3>
            </div>
            <Button variant="ghost" className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest cursor-pointer" onClick={() => onSetViewMode('editor')}>檢視全部 / View All</Button>
          </div>
          <div className="space-y-3">
            {stats.recentPlans.length > 0 ? stats.recentPlans.map((plan) => (
              <div 
                key={plan.id} 
                onClick={() => onSelectPlan(plan.id)}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 dark:bg-secondary hover:bg-secondary dark:hover:bg-secondary/80 border border-transparent hover:border-primary/10 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6",
                    plan.category === 'activity' ? "bg-primary/10 text-primary" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  )}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground uppercase tracking-tight">
                      {plan.scheduledName ? `${plan.scheduledName} - ${plan.activityName}` : plan.activityName || "未命名教案"}
                    </h4>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1 font-comic">
                      最後修改：{new Date(plan.updatedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="hidden md:block w-32">
                      <Progress value={Math.min(100, (plan.content?.length || 0) / 10)} className="h-1.5" />
                   </div>
                   <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            )) : (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/30">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-muted-foreground font-medium font-comic">目前還沒有教案紀錄 / No plans found</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
