"use client";

import { usePlans } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  MapPin,
  Tent,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  Sparkles,
  Layers,
  Calendar,
  FileText,
  Activity,
  CheckCircle2,
  Users,
  Compass,
} from "lucide-react";
import { cn, stripHtml, getUnifiedGroupBadgeParams } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { HeroCarousel } from "@/components/HeroCarousel";
import { RotatingText } from "@/components/RotatingText";
import { useTranslation } from "@/lib/i18n-context";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from "framer-motion";

/* ── helpers ────────────────────────────────────── */
function isPast(dateStr?: string) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getTime() <= Date.now();
  } catch {
    return false;
  }
}

function getDaysRemaining(targetDate?: string) {
  if (!targetDate) return null;
  const target = new Date(targetDate).getTime();
  if (isNaN(target)) return null;
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Architectural Hairline Divider (fluid.glass signature 1px line)
 * Scales smoothly from center to edges on scroll
 */
function ScrollLineDivider() {
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 98%", "start 65%"],
  });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={lineRef} className="w-full h-[1px] bg-stone-200/50 dark:bg-white/10 relative overflow-hidden">
      <motion.div
        style={{ scaleX }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/60 to-transparent origin-center"
      />
    </div>
  );
}



/**
 * Floating Bottom Capsule HUD (fluid.glass .header)
 * Minimalist, architectural pill that quietly reports section and progress
 */
function FluidBottomPill({
  activeSection,
  globalProgress,
}: {
  activeSection: string;
  globalProgress: any;
}) {
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(globalProgress, "change", (latest: number) => {
    setPercent(Math.min(100, Math.max(0, Math.round(latest * 100))));
    setVisible(latest > 0.04);
  });

  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      exit={{ y: 40, opacity: 0, x: "-50%" }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 left-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 dark:bg-[#0B1012]/80 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-2xl text-xs font-mono select-none"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-stone-200/80 dark:border-white/10">
        <span className="w-1.5 h-1.5 rotate-45 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
        <span className="text-[11px] font-medium text-foreground tracking-wider uppercase">
          {activeSection}
        </span>
      </div>

      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
        <span>[{percent.toString().padStart(2, "0")}%]</span>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="ml-1 p-1 rounded-full hover:bg-orange-500/10 text-fg-muted hover:text-orange-500 transition-colors"
        title="Scroll to top"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const { camps, activeCampId, plans, groups, isLoading } = usePlans();
  const { t, language } = useTranslation();
  const activeCamp = camps?.find((c) => c.id === activeCampId);

  // 1. Global Page Scroll Tracker
  const { scrollYProgress: globalScroll } = useScroll();
  const smoothGlobalProgress = useSpring(globalScroll, {
    stiffness: 140,
    damping: 32,
    restDelta: 0.001,
  });

  // Track active section for bottom pill
  const [activeSectionName, setActiveSectionName] = useState("STUDIO");
  useMotionValueEvent(globalScroll, "change", (progress) => {
    if (progress < 0.25) {
      setActiveSectionName("STUDIO");
    } else if (progress < 0.55) {
      setActiveSectionName("TIMELINE");
    } else if (progress < 0.82) {
      setActiveSectionName("DIVISIONS");
    } else {
      setActiveSectionName("ACTIVITY");
    }
  });

  // 2. Hero Section Parallax Scrubbing
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroScroll, [0, 1], ["0%", "36%"]);
  const heroTextOpacity = useTransform(heroScroll, [0, 0.7, 1], [1, 0.4, 0]);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1, 1.16]);
  const heroBgY = useTransform(heroScroll, [0, 1], ["0%", "8%"]);
  const heroHudY = useTransform(heroScroll, [0, 1], ["0%", "20%"]);

  // 3. Featured Division Rows Parallax
  const featuredRef = useRef<HTMLElement>(null);
  const { scrollYProgress: featuredScroll } = useScroll({
    target: featuredRef,
    offset: ["start end", "end start"],
  });
  const featuredScale = useTransform(featuredScroll, [0, 0.5, 1], [0.98, 1, 0.98]);

  useEffect(() => {
    if (isLoading) return;
    if ((camps?.length || 0) === 0) {
      router.replace("/settings?createProject=1");
    }
  }, [isLoading, camps, router]);

  const heroQuotes = useMemo(
    () =>
      language === "zh"
        ? [
            "崇德人，崇德魂！用生命影響生命。",
            "點燃每個孩子心中的無限可能。",
            "你今天的每一份用心，都在為孩子的夢想打底。",
            "熱情不是名詞，是我們現在進行式的行動。",
            "正在載入孩子們的笑容與無限好奇……",
            "微小而持續的付出，正在凝聚改變的力量。",
          ]
        : [
            "Lead with passion, inspire through action.",
            "Igniting infinite potential in every young heart.",
            "Every detail crafted today shapes a child's future.",
            "Passion is an ongoing commitment to excellence.",
            "Loading genuine smiles, courage, and curiosity...",
            "Small deliberate efforts compound into profound transformation.",
          ],
    [language]
  );

  const planQuotes = useMemo(
    () =>
      language === "zh"
        ? [
            "台上的閃亮，來自這裡每一個教案的千錘百鍊。",
            "我們寫下的不只是活動流程，更是孩子未來回憶裡的感動啟發。",
            "每一次的推演與優化，都是為了接住每一雙充滿好奇的眼睛。",
            "教育沒有捷徑，投入的每一分鐘都在縮短孩子與夢想的距離。",
            "從科學探索到品格實踐，裝備迎向未來的超能力。",
          ]
        : [
            "Brilliance on stage is forged in the meticulous craft of our curriculum.",
            "We author not just event workflows, but lifelong moments of inspiration.",
            "Every dry-run exists to honor the curious gaze of each child.",
            "No shortcuts in mentorship; every minute invested brings dreams closer.",
            "Equipping youth with resilience, scientific curiosity, and moral grounding.",
          ],
    [language]
  );

  const timeline = useMemo(
    () => [
      {
        label: t("MEETING_1"),
        code: "M1",
        stageTitle: "籌備起跑 • 核心目標確認",
        desc: language === "zh" ? "確立營隊核心價值，進行各組工作架構分工與企劃草擬。" : "Core Objectives & Division Setup",
        deliverable: "營隊主旨綱要、組別人力確認",
        start: activeCamp?.meeting1StartDate,
        end: activeCamp?.meeting1EndDate,
        icon: Clock,
      },
      {
        label: t("MEETING_2"),
        code: "M2",
        stageTitle: "教案初審 • 流程道具對焦",
        desc: language === "zh" ? "初次教案試教演練，清點器材清單與場地器材需求。" : "Rehearsal, Props & Stage Draft",
        deliverable: "初版教案、道具物資預算表",
        start: activeCamp?.meeting2StartDate,
        end: activeCamp?.meeting2EndDate,
        icon: FileText,
      },
      {
        label: t("MEETING_3"),
        code: "M3",
        stageTitle: "總驗驗證 • 細部默契深化",
        desc: language === "zh" ? "全流程情境推演，主持串場與突發應變措施驗證。" : "Full Verification & Edge Cases",
        deliverable: "定稿教案手冊、緊急應變流程",
        start: activeCamp?.meeting3StartDate,
        end: activeCamp?.meeting3EndDate,
        icon: Clock,
      },
      {
        label: language === "zh" ? "集訓" : "Training",
        code: "TR",
        stageTitle: "團隊集訓 • 沉浸式實戰磨合",
        desc: language === "zh" ? "連續性排練強化團隊凝聚力，熟稔營隊口號與團康默契。" : "Intensive Team Immersion",
        deliverable: "默契排練達標、總動員誓師",
        start: activeCamp?.trainingStartDate,
        end: activeCamp?.trainingEndDate,
        icon: Users,
      },
      {
        label: language === "zh" ? "駐站" : "On Site",
        code: "OS",
        stageTitle: "前進基地 • 場地布置與動線",
        desc: language === "zh" ? "志工團隊進駐營地，架設舞台音響、測試燈光與生活動線。" : "Base Deployment & Soundcheck",
        deliverable: "場地安檢通過、器材設備就緒",
        start: activeCamp?.siteStartDate,
        end: activeCamp?.siteEndDate,
        icon: MapPin,
      },
      {
        label: language === "zh" ? "營期" : "Camp Live",
        code: "LIVE",
        stageTitle: "出隊展開 • 點燃熱情與感動",
        desc: language === "zh" ? "孩子們入場！以全心全意的愛與專業陪伴這趟成長旅程。" : "Operational Live & Delivery",
        deliverable: "出隊成果呈現、感動回饋總結",
        start: activeCamp?.campStartDate,
        end: activeCamp?.campEndDate,
        icon: Tent,
      },
    ],
    [activeCamp, t, language]
  );

  const realCurrentIdx = useMemo(() => {
    let lastValidIdx = -1;
    for (let i = 0; i < timeline.length; i++) {
      if (isPast(timeline[i].start)) {
        lastValidIdx = i;
      } else {
        break;
      }
    }
    return lastValidIdx;
  }, [timeline]);

  // Current real-world milestone index (e.g. TR / 集訓)
  const currentFocusedIdx = useMemo(() => {
    return realCurrentIdx >= 0 ? realCurrentIdx : 0;
  }, [realCurrentIdx]);

  // Selected stage automatically defaults to current real-time milestone
  const [selectedStage, setSelectedStage] = useState(currentFocusedIdx);

  useEffect(() => {
    setSelectedStage(currentFocusedIdx);
  }, [currentFocusedIdx]);

  // 4. Milestone Timeline Section Scroll Animation
  const timelineSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: milestoneScroll } = useScroll({
    target: timelineSectionRef,
    offset: ["start 85%", "center center"],
  });
  const smoothMilestoneScroll = useSpring(milestoneScroll, {
    stiffness: 90,
    damping: 25,
    restDelta: 0.001,
  });

  const targetLaserPercent = useMemo(() => {
    const activeIdx = selectedStage >= 0 ? selectedStage : currentFocusedIdx;
    return Math.max(16, ((activeIdx + 1) / timeline.length) * 100);
  }, [selectedStage, currentFocusedIdx, timeline.length]);

  const animatedLaserWidth = useTransform(
    smoothMilestoneScroll,
    [0, 1],
    ["0%", `${targetLaserPercent}%`]
  );

  const recentPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5);
  }, [plans]);

  const daysToCamp = useMemo(() => {
    return getDaysRemaining(activeCamp?.campStartDate);
  }, [activeCamp]);

  const safeGroups = useMemo(() => {
    if (!groups || groups.length === 0) {
      return [
        { id: "group-activity", slug: "activity", nameZh: "活動組", nameEn: "Activity" },
        { id: "group-teaching", slug: "teaching", nameZh: "教學組", nameEn: "Teaching" },
        { id: "group-life", slug: "life", nameZh: "生活組", nameEn: "Life" },
        { id: "group-art", slug: "art", nameZh: "美宣組", nameEn: "Design" },
        { id: "group-props", slug: "props", nameZh: "器材組", nameEn: "Props" },
        { id: "group-admin", slug: "general", nameZh: "總務組", nameEn: "General" },
      ];
    }
    return groups;
  }, [groups]);

  return (
    <div className="relative w-full bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground min-h-screen font-sans flex flex-col transition-colors duration-500 overflow-x-clip selection:bg-orange-500/20 selection:text-orange-600 dark:selection:bg-orange-500/30 dark:selection:text-orange-300">
      {/* ── TOP LASER SCROLL PROGRESS BAR (Fluid.glass signature hairline scrub) ── */}
      <motion.div
        style={{ scaleX: smoothGlobalProgress }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 origin-left z-50 shadow-[0_0_12px_rgba(249,115,22,0.8)] pointer-events-none"
      />

      {/* ── FLOATING BOTTOM CAPSULE HUD (fluid.glass .header) ── */}
      <FluidBottomPill activeSection={activeSectionName} globalProgress={globalScroll} />

      {/* Fluid Glass Subtle Ambient Mesh (Subtle architectural glow, no noise) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full bg-gradient-to-b from-orange-500/[0.08] via-transparent to-transparent blur-[140px] dark:from-orange-500/[0.12]" />
        <div className="absolute top-[50%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/[0.04] to-transparent blur-[160px]" />
      </div>

      <main className="flex-1 w-full relative z-10">
        {/* ══════════════════════════════════════════════════════════
            1. CINEMATIC HERO SECTION (fluid.glass .home-header style)
               - Large Display Typography with Regular (400) weight
               - Parallax glide on scroll
            ══════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative w-full min-h-[100svh] flex flex-col justify-between pt-28 sm:pt-36 pb-12 sm:pb-16 px-6 sm:px-10 md:px-16 xl:px-24 max-w-[1720px] mx-auto overflow-hidden"
        >
          {/* Background Hero Carousel with smooth architectural mask & scroll zoom */}
          <motion.div
            style={{ scale: heroBgScale, y: heroBgY }}
            className="absolute inset-0 z-0 origin-center will-change-transform"
          >
            <HeroCarousel />
            {/* Fluid Glass Asymmetric Mask */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5] via-[#FAF8F5]/92 sm:via-[#FAF8F5]/85 to-transparent dark:from-[#0B1012] dark:via-[#0B1012]/94 sm:dark:via-[#0B1012]/88 w-full sm:w-[85%] md:w-[75%] z-10 transition-colors duration-500" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#FAF8F5] dark:from-[#0B1012] via-[#FAF8F5]/85 dark:via-[#0B1012]/85 to-transparent z-10" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#FAF8F5]/70 dark:from-[#0B1012]/70 to-transparent z-10" />
          </motion.div>

          {/* Top Micro-Tag */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
              <span className="w-1.5 h-1.5 rotate-45 bg-orange-500" />
              <span className="text-[11px] font-mono tracking-widest uppercase text-foreground/80 font-medium">
                {activeCamp ? activeCamp.name : "NTUT CHONG DE STUDIO"}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-6 text-[11px] font-mono tracking-widest text-fg-muted uppercase">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rotate-45 bg-orange-500 inline-block" />
                EST. 2006
              </span>
              <span>•</span>
              <span>ARCHITECTURAL CURRICULUM</span>
            </div>
          </motion.div>

          {/* Hero Core Typography (400 weight Regular display title) */}
          <motion.div
            style={{ y: heroTextY, opacity: heroTextOpacity }}
            className="relative z-20 my-auto py-6 sm:py-10 max-w-4xl will-change-transform"
          >
            {/* Technical Tag */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2.5 mb-4 sm:mb-6"
            >
              <span className="w-1.5 h-1.5 rotate-45 bg-orange-500 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              <span className="text-xs sm:text-sm font-mono tracking-widest text-orange-600 dark:text-orange-400 font-medium uppercase">
                {activeCamp
                  ? t("HERO_CREATING_FOR", { name: activeCamp.name?.toUpperCase() })
                  : "VOLUNTEER CURRICULUM STUDIO"}
              </span>
            </motion.div>

            {/* Massive Display Title (Fluid Glass Regular 400 Weight) */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[-0.03em] uppercase leading-[0.96] mb-6 sm:mb-8 text-foreground"
            >
              <span className="block font-light text-foreground/80">NTUT</span>
              <span className="block font-normal text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600">
                CHONG DE
              </span>
            </motion.h1>

            {/* Rotating Mission Statement */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl text-base sm:text-lg text-fg-secondary leading-relaxed mb-8 sm:mb-12 font-light min-h-[3.6em] flex items-center overflow-hidden"
            >
              <RotatingText items={heroQuotes} intervalMs={5500} className="w-full" />
            </motion.div>

            {/* Action CTA Cluster */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3 sm:gap-4"
            >
              <button
                onClick={() => router.push("/plans")}
                className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-xs font-mono font-medium uppercase tracking-widest text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <span>{t("HOME_BTN_PLANS")}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-xs font-mono font-normal uppercase tracking-widest text-foreground/80 hover:text-foreground bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/10 border border-stone-200/90 dark:border-white/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>{t("HOME_BTN_ADMIN")}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            </motion.div>
          </motion.div>

          {/* Bottom HUD Metrics Strip */}
          <motion.div
            style={{ y: heroHudY }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 pt-8 border-t border-stone-200/80 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 will-change-transform"
          >
            {/* Metric 1 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-1 rotate-45 bg-orange-500" />
                01 / TOTAL PLANS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight text-foreground">
                  {plans?.length || 0}
                </span>
                <span className="text-xs font-mono text-fg-muted uppercase">RECORDS</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-1 rotate-45 bg-orange-500" />
                02 / CURRENT STAGE
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-medium font-mono tracking-tight text-orange-600 dark:text-orange-400 truncate">
                  {realCurrentIdx >= 0 ? timeline[realCurrentIdx].label : "STANDBY"}
                </span>
                <span className="text-xs font-mono text-fg-muted uppercase">PHASE</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-1 rotate-45 bg-orange-500" />
                03 / GROUPS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight text-foreground">
                  {safeGroups.length}
                </span>
                <span className="text-xs font-mono text-fg-muted uppercase">DIVISIONS</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-1 rotate-45 bg-orange-500" />
                04 / COUNTDOWN
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight text-foreground">
                  {daysToCamp !== null ? (daysToCamp > 0 ? daysToCamp : 0) : "--"}
                </span>
                <span className="text-xs font-mono text-fg-muted uppercase">
                  {daysToCamp !== null && daysToCamp <= 0 ? "LIVE" : "DAYS"}
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── SCROLL-DRIVEN LINE DIVIDER ── */}
        <ScrollLineDivider />


        {/* ══════════════════════════════════════════════════════════
            3. OPERATIONAL MILESTONE TRACK (Fluid.glass Minimal Architecture)
               - Scroll-driven progressive laser drawing
               - Auto-focus on active current milestone
               - Completely removed redundant bottom text card per user request
            ══════════════════════════════════════════════════════════ */}
        <section
          ref={timelineSectionRef}
          className="py-16 sm:py-24 px-6 sm:px-10 md:px-16 xl:px-24 max-w-[1720px] mx-auto w-full relative z-20"
        >
          {/* Stage Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200/80 dark:border-white/10 mb-10 sm:mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rotate-45 bg-orange-500 inline-block" />
                <span className="text-xs font-mono tracking-widest text-orange-600 dark:text-orange-400 font-medium uppercase">
                  // 01 OPERATIONAL TIMELINE • STAGES
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-[-0.02em] uppercase text-foreground">
                營隊籌備里程碑演繹
                <span className="text-fg-muted font-light ml-3 text-lg sm:text-2xl">
                  STAGE EXPLORATION
                </span>
              </h2>
            </div>

            {/* Stage Selector Helper */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <Link
                href="/admin?tab=timer"
                className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-medium transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span>當前進行：{timeline[currentFocusedIdx]?.label} ({timeline[currentFocusedIdx]?.code})</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Laser Progress Rail (Scroll-driven dynamic line) */}
          <div className="hidden md:block w-full mb-6">
            <div className="relative w-full h-[2.5px] bg-stone-200/80 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                style={{ width: animatedLaserWidth }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.8)]"
              />
            </div>
          </div>

          {/* Desktop View: Dynamic Expanding Focus Accordion */}
          <div className="hidden md:flex items-stretch gap-3 lg:gap-4 w-full min-h-[380px]">
            {timeline.map((node, i) => {
              const isFocused = i === selectedStage;
              const isLive = i === currentFocusedIdx;
              const isPassed = currentFocusedIdx >= 0 && i < currentFocusedIdx;
              const Icon = node.icon;

              return (
                <motion.div
                  layout
                  key={node.code}
                  onClick={() => setSelectedStage(i)}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  className={cn(
                    "relative rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 flex flex-col justify-between",
                    isFocused
                      ? "flex-[3.8] lg:flex-[4.2] bg-white dark:bg-[#14191C] border-2 border-orange-500 shadow-[0_20px_50px_rgba(249,115,22,0.18)] ring-4 ring-orange-500/10 z-20 cursor-default"
                      : "flex-1 min-w-[85px] max-w-[150px] bg-white/40 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/10 opacity-40 hover:opacity-100 hover:border-orange-500/40 hover:bg-white/80 dark:hover:bg-white/5"
                  )}
                >
                  {isFocused ? (
                    /* ════════ FOCUSED HERO SHOWCASE ════════ */
                    <div className="relative z-10 flex flex-col justify-between h-full p-6 lg:p-8">
                      {/* Ambient Radial Glow */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

                      {/* Top Meta Bar */}
                      <div className="flex items-center justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase">
                            // 0{i + 1} STAGE • {node.code}
                          </span>
                          {isLive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                              進行中
                            </span>
                          )}
                        </div>

                        {/* Large Glowing Icon */}
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.45)] flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                        </div>
                      </div>

                      {/* Main Title */}
                      <div className="my-auto py-6 relative z-10">
                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-none">
                          {node.label}
                        </h3>
                      </div>

                      {/* Clean Date Footer */}
                      <div className="pt-4 border-t border-stone-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono text-fg-muted relative z-10">
                        <span className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          {(() => {
                            const { start, end } = node;
                            if (!start) return "時程待定 (TBD)";
                            const startStr = format(new Date(start), "yyyy/MM/dd");
                            if (end && end !== start) {
                              return `${startStr} ~ ${format(new Date(end), "MM/dd")}`;
                            }
                            return startStr;
                          })()}
                        </span>
                        {isPassed && (
                          <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            已完成
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ════════ INACTIVE COMPACT MILESTONE ════════ */
                    <div className="relative z-10 flex flex-col items-center justify-between h-full p-4 sm:p-5 text-center group">
                      {/* Top: Step Code */}
                      <span className="text-[11px] font-mono font-medium tracking-wider text-fg-muted uppercase">
                        0{i + 1}
                      </span>

                      {/* Middle: Icon & Label */}
                      <div className="flex flex-col items-center gap-2.5 my-auto py-4">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                            isPassed
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25"
                              : "bg-stone-100 dark:bg-white/5 text-fg-muted border border-stone-200 dark:border-white/10 group-hover:border-orange-500/40 group-hover:text-orange-500"
                          )}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>

                        <span className="text-base font-normal text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {node.label}
                        </span>

                        <span className="text-[10px] font-mono text-fg-muted uppercase tracking-wider">
                          {node.code}
                        </span>
                      </div>

                      {/* Bottom: Date or Status */}
                      <div className="pt-2 border-t border-stone-200/50 dark:border-white/5 w-full">
                        <span className="block text-[10px] font-mono text-fg-muted truncate">
                          {node.start ? format(new Date(node.start), "MM/dd") : "TBD"}
                        </span>
                        <span className="hidden group-hover:block text-[9px] font-mono text-orange-500 mt-1 uppercase tracking-wider font-bold">
                          點擊聚焦 →
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Mobile View: Swipeable Pill Selector + Full Width Focused Card */}
          <div className="flex md:hidden flex-col gap-4">
            {/* Mobile Pill Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {timeline.map((node, i) => {
                const isFocused = i === selectedStage;
                const isLive = i === currentFocusedIdx;
                return (
                  <button
                    key={node.code}
                    onClick={() => setSelectedStage(i)}
                    className={cn(
                      "shrink-0 px-3.5 py-2 rounded-full text-xs font-mono transition-all flex items-center gap-1.5",
                      isFocused
                        ? "bg-orange-500 text-white font-medium shadow-md shadow-orange-500/20"
                        : "bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-fg-muted"
                    )}
                  >
                    <span>0{i + 1}</span>
                    <span>{node.label}</span>
                    {isLive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Focused Stage Card */}
            {(() => {
              const activeNode = timeline[selectedStage] || timeline[0];
              const isLive = selectedStage === currentFocusedIdx;
              const isPassed = currentFocusedIdx >= 0 && selectedStage < currentFocusedIdx;
              const Icon = activeNode.icon;

              return (
                <div className="bg-white dark:bg-[#14191C] border-2 border-orange-500 rounded-2xl p-6 shadow-xl shadow-orange-500/10 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase">
                        // 0{selectedStage + 1} STAGE • {activeNode.code}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-mono text-[9px] font-bold uppercase">
                          <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                          進行中
                        </span>
                      )}
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-3xl font-normal text-foreground mb-5 leading-none">
                    {activeNode.label}
                  </h3>

                  <div className="pt-3 border-t border-stone-200/80 dark:border-white/10 text-xs font-mono text-fg-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      {(() => {
                        const { start, end } = activeNode;
                        if (!start) return "時程待定 (TBD)";
                        const startStr = format(new Date(start), "yyyy/MM/dd");
                        if (end && end !== start) {
                          return `${startStr} ~ ${format(new Date(end), "MM/dd")}`;
                        }
                        return startStr;
                      })()}
                    </span>
                    {isPassed && (
                      <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* ── SCROLL-DRIVEN LINE DIVIDER ── */}
        <ScrollLineDivider />

        {/* ══════════════════════════════════════════════════════════
            4. ARCHITECTURAL FEATURED DIVISIONS LIST
               (fluid.glass .featured-projects signature)
               - Clean 24-column layout with horizontal hairline rows
               - Large 400-weight typography
               - Interactive hover lines and stats
            ══════════════════════════════════════════════════════════ */}
        <section
          ref={featuredRef}
          className="py-24 sm:py-36 px-6 sm:px-10 md:px-16 xl:px-24 max-w-[1720px] mx-auto relative z-20"
        >
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16 sm:mb-20 pb-6 border-b border-stone-200/80 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rotate-45 bg-orange-500 inline-block" />
                <span className="text-xs font-mono tracking-widest text-orange-600 dark:text-orange-400 font-medium uppercase">
                  // 02 DIVISION DIRECTORY • ARCHITECTURAL LIST
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-[-0.02em] uppercase text-foreground">
                組別教案清冊
                <span className="text-fg-muted font-light ml-3 text-lg sm:text-2xl">
                  FEATURED DIVISIONS
                </span>
              </h2>
            </div>

            <Link
              href="/plans"
              className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-orange-600 dark:text-orange-400 font-medium hover:text-orange-500 transition-colors"
            >
              <span>BROWSE ALL PLANS</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div style={{ scale: featuredScale }} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Division Rows (7 cols) */}
            <div className="lg:col-span-7 divide-y divide-stone-200/60 dark:divide-white/10 border-y border-stone-200/60 dark:border-white/10">
              {safeGroups.map((group, idx) => {
                const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                const groupPlansCount =
                  plans?.filter(
                    (p) =>
                      p.groupId === group.id ||
                      p.groupId === group.slug ||
                      p.category?.toLowerCase() === group.slug.toLowerCase()
                  ).length || 0;

                return (
                  <Link
                    key={group.id}
                    href={`/plans?group=${encodeURIComponent(group.slug)}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between py-6 transition-all duration-300 hover:pl-2"
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <span className="text-xs font-mono text-fg-muted w-6">
                        {`0${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: badgeParams.uiBg }}
                        />
                        <h3 className="text-xl sm:text-2xl font-normal text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {language === "zh" ? group.nameZh : group.nameEn}
                        </h3>
                        <span className="text-xs font-mono text-fg-muted uppercase tracking-wider hidden sm:inline">
                          {group.nameEn || group.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-fg-muted">
                      <span className="px-3 py-1 rounded-full border border-stone-200 dark:border-white/10 group-hover:border-orange-500/40 text-foreground transition-colors">
                        {groupPlansCount} PLANS
                      </span>
                      <ArrowRight className="w-4 h-4 text-fg-muted group-hover:text-orange-500 group-hover:translate-x-1.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Right: Live Stream & Philosophy (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-7 sm:p-9 rounded-3xl bg-white/70 dark:bg-white/[0.02] border border-stone-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200/80 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono font-medium tracking-widest text-foreground uppercase">
                      即時動態 ACTIVITY STREAM
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-fg-muted uppercase">LIVE SYNC</span>
                </div>

                <div className="space-y-3">
                  {recentPlans.map((plan, idx) => (
                    <Link
                      key={plan.id}
                      href={`/plans/${encodeURIComponent(plan.id)}`}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06] border border-stone-200/60 dark:border-white/10 hover:border-orange-500/40 transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-fg-muted uppercase mb-1">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            {idx === 0 ? "LATEST" : "RECENT"}
                          </span>
                          <span>•</span>
                          <span>{plan.updatedAt ? format(new Date(plan.updatedAt), "MM/dd HH:mm") : ""}</span>
                        </div>
                        <div className="text-sm font-normal text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                          {stripHtml(plan.activityName) || "未命名教案"}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                  ))}

                  {recentPlans.length === 0 && (
                    <div className="text-center py-12 text-xs font-mono text-fg-muted">
                      目前尚無教案紀錄
                    </div>
                  )}
                </div>
              </div>

              {/* Inspirational Rotating Quote */}
              <div className="mt-8 pt-6 border-t border-stone-200/60 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted block mb-2">
                  // PHILOSOPHY TICKER
                </span>
                <div className="text-xs text-foreground/80 font-light leading-relaxed min-h-[3em] flex items-center">
                  <RotatingText items={planQuotes} intervalMs={6000} className="w-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* 1px Architectural Hairline Divider */}
      <div className="w-full h-[1px] bg-stone-200/80 dark:border-white/10" />

      {/* ══════════════════════════════════════════════════════════
          5. MINIMALIST ARCHITECTURAL FOOTER (fluid.glass style)
          ══════════════════════════════════════════════════════════ */}
      <footer className="bg-[#FAF8F5] dark:bg-[#0B1012] text-fg-secondary w-full py-16 sm:py-20 px-6 sm:px-10 md:px-16 xl:px-24 border-t border-stone-200/80 dark:border-white/10 relative z-10">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rotate-45 bg-orange-500 inline-block shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              <span className="text-foreground font-medium uppercase tracking-widest text-xs sm:text-sm font-mono">
                NTUT CHONG DE VOLUNTEER STUDIO
              </span>
            </div>
            <p className="text-[11px] font-mono text-fg-muted tracking-wider uppercase">
              © 2026 ARCHITECTURAL PRECISION • CRAFTED WITH PASSION
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs font-mono uppercase tracking-widest">
            <Link
              href="/plans"
              className="text-fg-secondary hover:text-orange-500 transition-colors"
            >
              PLANS REGISTRY
            </Link>
            <Link
              href="/admin"
              className="text-fg-secondary hover:text-orange-500 transition-colors"
            >
              ADMINISTRATION
            </Link>
            <Link
              href="/settings"
              className="text-fg-secondary hover:text-orange-500 transition-colors"
            >
              SETTINGS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
