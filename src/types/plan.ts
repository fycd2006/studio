
export type PlanCategory = 'activity' | 'teaching';

export interface Group {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  createdAt?: number;
}

export interface PropItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  remarks?: string;
  isFromClub?: boolean;
  isToPurchase?: boolean;
}

export interface CampItem {
  id: string;
  usage: string;
  name: string;
  isPacked?: boolean;
  isChecked?: boolean;
}

export interface Camp {
  id: string;
  name: string;
  startDate?: string; // Legacy
  endDate?: string;   // Legacy
  campStartDate?: string;
  campEndDate?: string;
  meeting1StartDate?: string;
  meeting1EndDate?: string;
  meeting2StartDate?: string;
  meeting2EndDate?: string;
  meeting3StartDate?: string;
  meeting3EndDate?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  siteStartDate?: string;
  siteEndDate?: string;
  isLocked?: boolean;
  ownerId: string;
  createdAt: number;
  campItems?: CampItem[];
}

export interface Station {
  id: string;
  name: string;
  location: string;
  lead: string;
  assistant: string;
}

export interface RotationRound {
  cells: string[];
}

export interface TeamOrder {
  id: string;
  name: string;
  stations: string[];
}

export interface RotationTableData {
  id: string;
  campId: string;
  ownerId: string;
  title: string;
  day: string;
  stations: Station[];
  rounds: RotationRound[]; 
  teamOrders: TeamOrder[];
}

export interface UserSettings {
  duration: number;
  timeLeft: number;
  targetEndTime?: number;
  isRunning: boolean;
  isReminderSet: boolean;
  isAlarmSet: boolean;
  updatedAt: number;
  activityTypes?: string[];
  groupTypes?: string[];
  groups?: Group[];
}

export interface LessonPlan {
  id: string;
  campId: string;
  ownerId: string;
  category: PlanCategory;
  groupId?: string;
  scheduledName: string;
  activityName: string;
  members: string;
  time: string;
  location: string;
  purpose: string;
  process: string;
  content: string; 
  divisionOfLabor: string; 
  props: PropItem[]; 
  remarks: string; 
  openingClosingRemarks: string; 
  canvasData?: string | null; 
  canvasImage?: string | null;
  canvasHeight?: number | null; 
  googleDocUrl: string;
  order: number;
  versionName?: string | null;
  updatedAt: number;
  isPropsPacked?: boolean;
  isPreDepartureChecked?: boolean;
}

export interface PlanVersion {
  id: string;
  planId: string;
  name: string;
  versionName?: string;
  createdAt: number;
  type: 'snapshot' | 'patch';
  authorId: string;
  authorName: string;
  authorColor: string;
  snapshot?: LessonPlan; // Present only if type is 'snapshot'
  delta?: any; // JSON diff from the previous version, present if type is 'patch'
}

/** 
 * 選項折衷方案：內部選項維持純中文以減少視覺混亂
 * Values for the category dropdown, simplified to Chinese only as requested.
 */
export const SCHEDULE_OPTIONS = [
  '劇本',
  '起床遊戲',
  '大地遊戲',
  '科學闖關',
  '科學實驗',
  '科學手作',
];
