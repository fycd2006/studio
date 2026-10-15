/**
 * Sample content for the design mockup. Shapes mirror src/types/plan.ts in the
 * production app; names and dates are illustrative only.
 */

export type Role = "admin" | "crew";

export type Route =
  | "login"
  | "home"
  | "plans"
  | "editor"
  | "timer"
  | "tables"
  | "props"
  | "settings";

export interface Group {
  slug: string;
  nameZh: string;
  nameEn: string;
  /** Tailwind classes for the group dot and badge. */
  tone: { dot: string; badge: string };
}

export interface Prop {
  name: string;
  qty: number;
  unit: string;
  note?: string;
  packed?: boolean;
  checked?: boolean;
}

export interface Plan {
  id: string;
  group: string;
  title: string;
  category: string;
  lead: string;
  assistant: string;
  duration: string;
  venue: string;
  updatedAt: string; // ISO
  props: Prop[];
}

export interface Stage {
  code: string;
  label: string;
  start: string;
  end?: string;
  /** lucide icon name used for the stage card badge; mirrors the production timeline. */
  icon: "clock" | "file" | "users" | "pin" | "tent";
}

export const camp = {
  name: "2026 夏令營",
  createdAt: "2026/03/02",
};

export const groups: Group[] = [
  {
    slug: "activity",
    nameZh: "活動組",
    nameEn: "Activity",
    tone: { dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/25" },
  },
  {
    slug: "teaching",
    nameZh: "教學組",
    nameEn: "Teaching",
    tone: { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25" },
  },
  {
    slug: "admin",
    nameZh: "行政組",
    nameEn: "Administrative",
    tone: { dot: "bg-blue-500", badge: "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/25" },
  },
];

export const activityTypes = ["劇本", "大地遊戲", "科學闖關", "科學實驗", "手作課程", "相見歡", "起床遊戲"];

export const stages: Stage[] = [
  { code: "M1", label: "一收", start: "2026/06/02", icon: "clock" },
  { code: "M2", label: "二收", start: "2026/06/16", icon: "file" },
  { code: "M3", label: "三收", start: "2026/06/30", icon: "clock" },
  { code: "TR", label: "集訓", start: "2026/07/05", end: "07/09", icon: "users" },
  { code: "OS", label: "駐站", start: "2026/07/12", icon: "pin" },
  { code: "LIVE", label: "營期", start: "2026/07/20", end: "07/24", icon: "tent" },
];
export const currentStageIndex = 3;

export const quotes = [
  "崇德人，崇德魂！用生命影響生命。",
  "點燃每個孩子心中的無限可能。",
  "你今天的每一份用心，都在為孩子的夢想打底。",
  "熱情不是名詞，是我們現在進行式的行動。",
  "微小而持續的付出，正在凝聚改變的力量。",
];

export const plans: Plan[] = [
  {
    id: "p1",
    group: "activity",
    title: "森林尋寶大冒險",
    category: "大地遊戲",
    lead: "阿哲",
    assistant: "小安",
    duration: "40min",
    venue: "後山步道",
    updatedAt: "2026-07-04T21:30:00",
    props: [
      { name: "藏寶圖", qty: 8, unit: "張", packed: true, checked: true },
      { name: "指北針", qty: 8, unit: "個", packed: true },
      { name: "印章", qty: 6, unit: "顆", note: "每關一顆" },
    ],
  },
  {
    id: "p2",
    group: "teaching",
    title: "水火箭發射站",
    category: "科學實驗",
    lead: "小晴",
    assistant: "宇恩",
    duration: "60min",
    venue: "操場",
    updatedAt: "2026-07-04T19:05:00",
    props: [
      { name: "寶特瓶", qty: 30, unit: "個" },
      { name: "打氣筒", qty: 4, unit: "支", packed: true },
    ],
  },
  {
    id: "p3",
    group: "activity",
    title: "時光守護者",
    category: "劇本",
    lead: "芷涵",
    assistant: "柏宇",
    duration: "90min",
    venue: "3F 大禮堂",
    updatedAt: "2026-07-03T23:12:00",
    props: [{ name: "斗篷", qty: 4, unit: "件" }],
  },
  {
    id: "p4",
    group: "teaching",
    title: "彩虹密度塔",
    category: "科學實驗",
    lead: "宇恩",
    assistant: "小晴",
    duration: "30min",
    venue: "2F 實驗室",
    updatedAt: "2026-07-03T15:40:00",
    props: [
      { name: "量筒", qty: 10, unit: "支", packed: true, checked: true },
      { name: "食用色素", qty: 5, unit: "瓶" },
    ],
  },
  {
    id: "p5",
    group: "activity",
    title: "名字賓果",
    category: "相見歡",
    lead: "小安",
    assistant: "阿哲",
    duration: "20min",
    venue: "1F 中庭",
    updatedAt: "2026-07-02T10:18:00",
    props: [],
  },
  {
    id: "p6",
    group: "teaching",
    title: "黏土小夥伴",
    category: "手作課程",
    lead: "佳穎",
    assistant: "芷涵",
    duration: "50min",
    venue: "2F 美術教室",
    updatedAt: "2026-07-01T21:02:00",
    props: [{ name: "輕黏土", qty: 40, unit: "包", note: "六色" }],
  },
  {
    id: "p7",
    group: "admin",
    title: "報到與分隊流程",
    category: "相見歡",
    lead: "柏宇",
    assistant: "佳穎",
    duration: "30min",
    venue: "校門口",
    updatedAt: "2026-06-30T09:45:00",
    props: [{ name: "名牌", qty: 60, unit: "個", packed: true }],
  },
  {
    id: "p8",
    group: "activity",
    title: "叢林鬧鐘",
    category: "起床遊戲",
    lead: "阿哲",
    assistant: "宇恩",
    duration: "15min",
    venue: "宿舍走廊",
    updatedAt: "2026-06-28T22:30:00",
    props: [{ name: "響板", qty: 6, unit: "組" }],
  },
];

export const members = [
  { initials: "安", color: "bg-orange-600" },
  { initials: "哲", color: "bg-emerald-700" },
  { initials: "晴", color: "bg-blue-700" },
];

export const rotation = {
  title: "Day 1 科學闖關輪替表",
  stations: [
    { name: "水火箭發射站", venue: "操場", lead: "小晴", assistant: "宇恩" },
    { name: "彩虹密度塔", venue: "2F 實驗室", lead: "宇恩", assistant: "小晴" },
    { name: "靜電魔法師", venue: "2F 教室 A", lead: "佳穎", assistant: "柏宇" },
    { name: "聲音的祕密", venue: "2F 教室 B", lead: "芷涵", assistant: "阿哲" },
  ],
  rounds: [
    ["1 vs 2", "3 vs 4", "5 vs 6", "休息"],
    ["3 vs 5", "休息", "1 vs 4", "2 vs 6"],
    ["休息", "2 vs 5", "3 vs 6", "1 vs 4"],
  ],
  teams: [
    { name: "第 1 小隊", schedule: ["關卡 1", "關卡 3", "關卡 4"] },
    { name: "第 2 小隊", schedule: ["關卡 1", "關卡 4", "關卡 2"] },
    { name: "第 3 小隊", schedule: ["關卡 2", "關卡 1", "關卡 3"] },
    { name: "第 4 小隊", schedule: ["關卡 2", "關卡 3", "關卡 4"] },
  ],
};

export const versions = [
  { day: "2026/07/04", items: [
    { name: "集訓前定稿", author: "阿哲", time: "21:30" },
    { name: "自動儲存", author: "小安", time: "19:05" },
  ] },
  { day: "2026/07/03", items: [{ name: "加入道具清單", author: "阿哲", time: "23:12" }] },
];

export const broadcasts = ["進行二收", "準備進關", "用餐廣播", "雨備啟動"];

export const groupBySlug = (slug: string) => groups.find((g) => g.slug === slug) ?? groups[0];

export const formatShort = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

export const formatLong = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
