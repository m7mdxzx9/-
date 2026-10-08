import type {
  ContentBundle,
  Course,
  CourseRecord,
  GpaScale,
  ProgressMap,
  SemesterSummary,
} from './types';

export const EMPTY_RECORD: CourseRecord = { status: 'todo' };

export function recordFor(progress: ProgressMap, id: string): CourseRecord {
  return progress[id] ?? EMPTY_RECORD;
}

export function hoursOf(course: Course, record: CourseRecord): number {
  const o = record.hoursOverride;
  return typeof o === 'number' && o >= 0 ? o : course.credits;
}

export function scaleOf(bundle: ContentBundle, scaleKey: string): GpaScale {
  const scales = bundle.program.gpaScales ?? {};
  return scales[scaleKey] ?? scales[bundle.program.defaultScale] ?? Object.values(scales)[0];
}

export function pointsForGrade(scale: GpaScale, grade?: string): number | null {
  if (!grade) return null;
  const found = scale.grades.find((g) => g.key === grade);
  return found ? found.points : null;
}

export type PrereqState = 'ready' | 'blocked' | 'repeat';

export interface CourseView {
  course: Course;
  record: CourseRecord;
  hours: number;
  points: number | null;
  prereqState: PrereqState;
  pendingPrereqs: string[];
  failedPrereqs: string[];
}

export function buildCourseViews(bundle: ContentBundle, progress: ProgressMap, scaleKey: string): CourseView[] {
  const scale = scaleOf(bundle, scaleKey);
  const byId = new Map(bundle.courses.map((c) => [c.id, c]));
  return bundle.courses.map((course) => {
    const record = recordFor(progress, course.id);
    const pending: string[] = [];
    const failed: string[] = [];
    for (const pid of course.prereqs) {
      const pre = byId.get(pid);
      if (!pre) continue;
      const rec = recordFor(progress, pid);
      if (rec.status === 'done') continue;
      if (rec.status === 'failed') failed.push(pre.name);
      else pending.push(pre.name);
    }
    const prereqState: PrereqState = failed.length > 0 ? 'repeat' : pending.length > 0 ? 'blocked' : 'ready';
    return {
      course,
      record,
      hours: hoursOf(course, record),
      points: record.status === 'done' || record.status === 'failed' ? pointsForGrade(scale, record.grade) : null,
      prereqState,
      pendingPrereqs: pending,
      failedPrereqs: failed,
    };
  });
}

export interface Totals {
  totalHours: number;
  earnedHours: number;
  inProgressHours: number;
  attemptedHours: number;
  gpaPoints: number;
  cumulativeGpa: number | null;
  percent: number;
  doneCount: number;
  failedCount: number;
  inProgressCount: number;
  missingGradeCount: number;
}

export function computeTotals(views: CourseView[], bundle: ContentBundle): Totals {
  const totalHours = bundle.program.totalCreditHours || views.reduce((s, v) => s + v.hours, 0);
  let earnedHours = 0;
  let inProgressHours = 0;
  let attemptedHours = 0;
  let gpaPoints = 0;
  let doneCount = 0;
  let failedCount = 0;
  let missingGradeCount = 0;
  let inProgressCount = 0;

  for (const v of views) {
    const { status } = v.record;
    if (status === 'done') {
      doneCount += 1;
      earnedHours += v.hours;
      if (v.points == null) missingGradeCount += 1;
    }
    if (status === 'failed') {
      failedCount += 1;
      if (v.points == null) missingGradeCount += 1;
    }
    if (status === 'in_progress') {
      inProgressCount += 1;
      inProgressHours += v.hours;
    }
    if ((status === 'done' || status === 'failed') && v.points != null) {
      attemptedHours += v.hours;
      gpaPoints += v.points * v.hours;
    }
  }

  return {
    totalHours,
    earnedHours,
    inProgressHours,
    attemptedHours,
    gpaPoints,
    cumulativeGpa: attemptedHours > 0 ? gpaPoints / attemptedHours : null,
    percent: totalHours > 0 ? Math.min(100, Math.round((earnedHours / totalHours) * 100)) : 0,
    doneCount,
    failedCount,
    inProgressCount,
    missingGradeCount,
  };
}

type SemAccumulator = SemesterSummary & { gradedHours: number };

/** ملخص لكل فصل: ساعات مسجَّلة/منجزة + معدل الفصل (SGPA) */
export function computeSemesters(views: CourseView[]): SemesterSummary[] {
  const map = new Map<number, SemAccumulator>();
  const ensure = (sem: number): SemAccumulator => {
    const existing = map.get(sem);
    if (existing) return existing;
    const fresh: SemAccumulator = {
      semester: sem,
      credits: 0,
      plannedCredits: 0,
      inProgressCredits: 0,
      doneCredits: 0,
      points: 0,
      gpa: null,
      courseIds: [],
      gradedHours: 0,
    };
    map.set(sem, fresh);
    return fresh;
  };

  for (const v of views) {
    const e = ensure(v.course.semester);
    e.courseIds.push(v.course.id);
    e.plannedCredits += v.hours;
    if (v.record.status === 'in_progress') e.inProgressCredits += v.hours;
    if (v.record.status === 'done') e.doneCredits += v.hours;
    if ((v.record.status === 'done' || v.record.status === 'failed') && v.points != null) {
      e.points += v.points * v.hours;
      e.gradedHours += v.hours;
    }
  }

  return [...map.values()]
    .sort((a, b) => a.semester - b.semester)
    .map((e) => ({
      semester: e.semester,
      credits: e.doneCredits,
      plannedCredits: e.plannedCredits,
      inProgressCredits: e.inProgressCredits,
      doneCredits: e.doneCredits,
      points: e.points,
      gpa: e.gradedHours > 0 ? Number((e.points / e.gradedHours).toFixed(2)) : null,
      courseIds: e.courseIds,
    }));
}

export type AlertTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

export interface Alert {
  id: string;
  tone: AlertTone;
  title: string;
  detail: string;
}

/** تنبيهات حقيقية مبنية على الخطة + حالة الطالب + متطلبات المقررات */
export function buildAlerts(views: CourseView[], bundle: ContentBundle, totals: Totals): Alert[] {
  const out: Alert[] = [];
  const program = bundle.program;

  const bySemester = new Map<number, CourseView[]>();
  for (const v of views) {
    const list = bySemester.get(v.course.semester) ?? [];
    list.push(v);
    bySemester.set(v.course.semester, list);
  }

  for (const v of views) {
    if (v.record.status === 'in_progress' && v.prereqState !== 'ready') {
      out.push({
        id: `prereq-${v.course.id}`,
        tone: v.prereqState === 'repeat' ? 'danger' : 'warn',
        title:
          v.prereqState === 'repeat'
            ? `${v.course.name}: متطلب لم يُنجَح بعد`
            : `${v.course.name}: مسجَّل ومتطلبه غير منجز`,
        detail:
          v.prereqState === 'repeat'
            ? `أعد المادة أولاً: ${v.failedPrereqs.join('، ')}`
            : `بانتظار: ${v.pendingPrereqs.join('، ')}`,
      });
    }
  }

  for (const [sem, list] of [...bySemester.entries()].sort((a, b) => a[0] - b[0])) {
    const load = list
      .filter((v) => v.record.status === 'in_progress')
      .reduce((s, v) => s + v.hours, 0);
    if (load > program.maxSemesterLoad) {
      out.push({
        id: `load-${sem}`,
        tone: 'danger',
        title: `الفصل ${sem}: ${load} ساعة تتجاوز الحد الأقصى ${program.maxSemesterLoad}`,
        detail: 'اختر مقرراً وأجّله، أو استخدم "ساعات بديلة" لو خطتك الفعلية أقل.',
      });
    } else if (load > program.recommendedMaxLoad) {
      out.push({
        id: `load-${sem}`,
        tone: 'warn',
        title: `الفصل ${sem}: ${load} ساعة فوق الموصى (${program.recommendedMaxLoad})`,
        detail: 'قابل للتصديق بشرط موافقة المرشد الأكاديمي.',
      });
    }
  }

  if (totals.missingGradeCount > 0) {
    out.push({
      id: 'missing-grade',
      tone: 'warn',
      title: `${totals.missingGradeCount} مقرر بدون تقدير`,
      detail: 'بدون تقدير لا يُحتسب المعدل التراكمي. اختر التقدير من شاشة المتابعة.',
    });
  }

  if (totals.attemptedHours === 0) {
    out.push({
      id: 'no-data',
      tone: 'info',
      title: 'ما فيه بيانات بعد',
      detail: 'علّم مقرراتك في تبويب «الخطة» ليبدأ حساب المعدل والتقدم.',
    });
  }

  const remaining = Math.max(0, totals.totalHours - totals.earnedHours);
  if (totals.attemptedHours > 0 && remaining > 0) {
    out.push({
      id: 'remaining',
      tone: 'neutral',
      title: `باقي ${remaining} ساعة معتمدة للتخرج`,
      detail: `متوسط ${Math.ceil(remaining / Math.max(1, program.recommendedMaxLoad))} فصلاً إضافياً بالحِمل الموصى.`,
    });
  }

  return out;
}

export interface LoadSuggestion {
  semester: number;
  hours: number;
  readyCourses: CourseView[];
  blockedCourses: CourseView[];
}

/** يقترح أول فصل يمكن تسجيله بالكامل مع مراعاة المتطلبات والحِمل */
export function suggestNextSemester(views: CourseView[], bundle: ContentBundle): LoadSuggestion | null {
  const bySemester = new Map<number, CourseView[]>();
  for (const v of views) {
    const list = bySemester.get(v.course.semester) ?? [];
    list.push(v);
    bySemester.set(v.course.semester, list);
  }
  const semesters = [...bySemester.keys()].sort((a, b) => a - b);
  for (const sem of semesters) {
    const list = bySemester.get(sem) ?? [];
    const notDone = list.filter((v) => v.record.status !== 'done');
    if (notDone.length === 0) continue;
    const ready = notDone.filter((v) => v.prereqState === 'ready');
    const blocked = notDone.filter((v) => v.prereqState !== 'ready');
    const hours = ready.reduce((s, v) => s + v.hours, 0);
    if (hours === 0) continue;
    return {
      semester: sem,
      hours: Math.min(hours, bundle.program.recommendedMaxLoad),
      readyCourses: ready,
      blockedCourses: blocked,
    };
  }
  return null;
}

export interface GradeNeed {
  feasible: boolean;
  neededAverage: number;
  nearestGrade?: string;
  bestCase: number;
}

/** كم متوسط التقدير محتاج في المتبقي ليصل معدلك للهدف؟ */
export function neededForTarget(totals: Totals, scale: GpaScale, target: number): GradeNeed {
  const remainingHours = Math.max(0, totals.totalHours - totals.attemptedHours);
  const maxPoints = Math.max(...scale.grades.map((g) => g.points));
  const bestCase =
    remainingHours > 0
      ? (totals.gpaPoints + maxPoints * remainingHours) / (totals.attemptedHours + remainingHours)
      : totals.cumulativeGpa ?? 0;
  if (remainingHours <= 0) return { feasible: totals.cumulativeGpa != null && (totals.cumulativeGpa ?? 0) >= target, neededAverage: target, bestCase };
  const neededAverage = (target * (totals.attemptedHours + remainingHours) - totals.gpaPoints) / remainingHours;
  const feasible = neededAverage <= maxPoints && neededAverage >= 0;
  const sorted = [...scale.grades].sort((a, b) => a.points - b.points);
  const nearest = sorted.find((g) => g.points >= neededAverage);
  return { feasible, neededAverage, nearestGrade: nearest?.key, bestCase };
}
