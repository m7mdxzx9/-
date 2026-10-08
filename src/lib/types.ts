export type CourseGroup = string;

/** مقرر واحد من الخطة الدراسية */
export interface Course {
  id: string;
  name: string;
  semester: number;
  credits: number;
  group: CourseGroup;
  prereqs: string[];
  outcomes: string[];
}

export interface Track {
  id: string;
  name: string;
  summary: string;
  semesters: number[];
  courses: string[];
  projects: string[];
  resources: string[];
  tools: string[];
}

export interface Project {
  id: string;
  title: string;
  level: number;
  summary: string;
  tools: string[];
  deliverables: string[];
  steps?: string[];
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface ResourceGroupItem {
  id: string;
  name: string;
  summary: string;
  links: ResourceLink[];
}

export interface GradeOption {
  key: string;
  points: number;
}

export interface GpaScale {
  label: string;
  minPassingPoints: number;
  grades: GradeOption[];
}

export interface Program {
  university: string;
  program: string;
  totalCreditHours: number;
  maxSemesterLoad: number;
  recommendedMaxLoad: number;
  defaultScale: string;
  disclaimer: string;
  gpaScales: Record<string, GpaScale>;
}

/** كل المحتوى القادم من JSON أو من السيرفر */
export interface ContentBundle {
  version: string;
  fetchedAt?: number;
  source: 'bundled' | 'server' | 'local-edit';
  program: Program;
  courses: Course[];
  tracks: Track[];
  projects: Project[];
  resources: ResourceGroupItem[];
}

export type CourseStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'failed'
  | 'deferred'
  | 'withdrawn';

export interface CourseRecord {
  status: CourseStatus;
  grade?: string;
  note?: string;
  /**_override_ عدد الساعات لو كانت خطتك الفعلية تختلف عن الخطة المعروضة */
  hoursOverride?: number;
}

export type ProgressMap = Record<string, CourseRecord>;

export interface Settings {
  apiBase: string;
  deviceId: string;
  scaleKey: string;
  autoSync: boolean;
  lastSyncAt?: number;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  at: number;
  alt?: number;
  spd?: number;
  /** true لو النقطة مولَّدة للعرض (وضع المحاكاة) */
  sim?: boolean;
}

export interface RouteRun {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  points: TrackPoint[];
  distanceM: number;
  source: 'gps' | 'demo';
  note?: string;
}

export interface SemesterSummary {
  semester: number;
  credits: number;
  plannedCredits: number;
  inProgressCredits: number;
  doneCredits: number;
  points: number;
  gpa: number | null;
  courseIds: string[];
}
