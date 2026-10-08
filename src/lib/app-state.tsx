import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadContent, syncContent, clearContentCache, BUNDLED_VERSION } from './content';
import { buildAlerts, buildCourseViews, computeSemesters, computeTotals, scaleOf, type Alert, type CourseView } from './gpa';
import { demoRoute, fitPoints, pathLengthM } from './geo';
import { KEYS, newId, readJson, removeKey, writeJson } from './storage';
import type { ContentBundle, CourseRecord, ProgressMap, RouteRun, Settings, SemesterSummary } from './types';

const DEFAULT_SETTINGS: Settings = {
  apiBase: '',
  deviceId: '',
  scaleKey: '',
  autoSync: false,
};

export interface Backup {
  kind: 'ai-uqu-backup';
  version: 1;
  exportedAt: number;
  contentVersion: string;
  progress: ProgressMap;
  routes: RouteRun[];
  settings: Settings;
}

interface AppValue {
  ready: boolean;
  content: ContentBundle;
  progress: ProgressMap;
  routes: RouteRun[];
  settings: Settings;
  views: CourseView[];
  totals: ReturnType<typeof computeTotals>;
  semesters: SemesterSummary[];
  alerts: Alert[];
  scale: ReturnType<typeof scaleOf>;
  setRecord: (courseId: string, patch: Partial<CourseRecord>) => void;
  saveRoute: (run: Omit<RouteRun, 'id' | 'distanceM'> & { id?: string; points: RouteRun['points'] }) => Promise<RouteRun>;
  deleteRoute: (id: string) => void;
  addDemoRoute: () => Promise<RouteRun | null>;
  updateSettings: (patch: Partial<Settings>) => void;
  syncNow: () => Promise<string>;
  restoreBundled: () => Promise<string>;
  pushBackup: () => Promise<string>;
  exportBackup: () => string;
  importBackup: (raw: string) => Promise<string>;
  wipeAll: () => Promise<void>;
  lastSyncAt?: number;
}

const Ctx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp يجب أن يُستخدم داخل AppProvider');
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [content, setContent] = useState<ContentBundle | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [routes, setRoutes] = useState<RouteRun[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [bundle, savedProgress, savedRoutes, savedSettings] = await Promise.all([
        loadContent(),
        readJson<ProgressMap>(KEYS.progress, {}),
        readJson<RouteRun[]>(KEYS.routes, []),
        readJson<Settings>(KEYS.settings, DEFAULT_SETTINGS),
      ]);
      if (!alive) return;
      setContent(bundle);
      setProgress(savedProgress);
      setRoutes(Array.isArray(savedRoutes) ? savedRoutes : []);
      const deviceId = savedSettings.deviceId || newId('device');
      const scaleKey = savedSettings.scaleKey || bundle.program.defaultScale || '5.0';
      const next: Settings = { ...DEFAULT_SETTINGS, ...savedSettings, deviceId, scaleKey };
      const needsPersist = !savedSettings.deviceId || !savedSettings.scaleKey;
      setSettings(next);
      if (needsPersist) await writeJson(KEYS.settings, next);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setRecord = useCallback((courseId: string, patch: Partial<CourseRecord>) => {
    setProgress((prev) => {
      const current = prev[courseId] ?? { status: 'todo' as const };
      const merged: CourseRecord = { ...current, ...patch };
      const isEmpty =
        merged.status === 'todo' && !merged.grade && !merged.note && merged.hoursOverride == null;
      const next = { ...prev };
      if (isEmpty) delete next[courseId];
      else next[courseId] = merged;
      void writeJson(KEYS.progress, next);
      return next;
    });
  }, []);

  const saveRoute = useCallback<AppValue['saveRoute']>(
    async (input) => {
      const points = fitPoints(input.points, 400);
      const run: RouteRun = {
        id: input.id ?? newId('route'),
        name: input.name,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        points,
        distanceM: Math.round(pathLengthM(points)),
        source: input.source,
        note: input.note,
      };
      setRoutes((prev) => {
        const next = [run, ...prev.filter((r) => r.id !== run.id)].slice(0, 60);
        void writeJson(KEYS.routes, next);
        return next;
      });
      return run;
    },
    [],
  );

  const deleteRoute = useCallback((id: string) => {
    setRoutes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void writeJson(KEYS.routes, next);
      return next;
    });
  }, []);

  const addDemoRoute = useCallback(async () => {
    const points = demoRoute(Math.floor(Math.random() * 1000));
    if (points.length < 2) return null;
    return saveRoute({
      name: `مسار تجريبي • ${new Date().toLocaleDateString('ar-SA')}`,
      startedAt: points[0].at,
      endedAt: points[points.length - 1].at,
      points,
      source: 'demo',
      note: 'خطوط مولَّدة لعرض الميزة بدون GPS حقيقي.',
    });
  }, [saveRoute]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void writeJson(KEYS.settings, next);
      return next;
    });
  }, []);

  const syncNow = useCallback(async () => {
    if (!content) return 'المحتوى لم يُحمَّل بعد.';
    const result = await syncContent(settings.apiBase);
    if (result.ok && result.bundle) {
      setContent(result.bundle);
      updateSettings({ lastSyncAt: Date.now() });
    }
    return result.message;
  }, [content, settings.apiBase, updateSettings]);

  const restoreBundled = useCallback(async () => {
    await clearContentCache();
    setContent(await loadContent());
    return 'تمّ إرجاع المحتوى إلى النسخة المضمّنة داخل التطبيق.';
  }, []);

  // مزامنة تلقائية عند الإقلاع إن كان المستخدم فعّلها
  useEffect(() => {
    if (!ready || !settings.autoSync || !settings.apiBase) return;
    let alive = true;
    (async () => {
      const result = await syncContent(settings.apiBase);
      if (alive && result.ok && result.bundle) {
        setContent(result.bundle);
        updateSettings({ lastSyncAt: Date.now() });
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, settings.autoSync, settings.apiBase, updateSettings]);

  const exportBackup = useCallback(() => {
    const backup: Backup = {
      kind: 'ai-uqu-backup',
      version: 1,
      exportedAt: Date.now(),
      contentVersion: content?.version ?? BUNDLED_VERSION,
      progress,
      routes,
      settings,
    };
    return JSON.stringify(backup, null, 2);
  }, [content, progress, routes, settings]);

  const pushBackup = useCallback(async () => {
    const base = settings.apiBase.trim().replace(/\/+$/, '');
    if (!base) return 'لم يُضبط رابط السيرفر في الإعدادات.';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}/api/devices/${encodeURIComponent(settings.deviceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: exportBackup(),
        signal: controller.signal as RequestInit['signal'],
      });
      clearTimeout(timer);
      if (!res.ok) return `رفض السيرفر (HTTP ${res.status}).`;
      return `رفعنا ${Object.keys(progress).length} سجل تقدّم و${routes.length} مسار إلى السيرفر.`;
    } catch {
      return 'تعذّر الوصول للسيرفر.';
    }
  }, [exportBackup, progress, routes, settings.apiBase, settings.deviceId]);

  const importBackup = useCallback(async (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<Backup> & ProgressMap;
      if (parsed && parsed.kind === 'ai-uqu-backup') {
        if (parsed.progress) setProgress(parsed.progress);
        if (Array.isArray(parsed.routes)) setRoutes(parsed.routes);
        if (parsed.settings) setSettings((prev) => ({ ...prev, ...parsed.settings }));
        void writeJson(KEYS.progress, parsed.progress ?? {});
        void writeJson(KEYS.routes, parsed.routes ?? []);
        return 'تمّ استيراد نسخة كاملة (تقدّم + مسارات + إعدادات).';
      }
      // صيغة مبسطة: كائن تقدّم فقط
      const entries = Object.entries(parsed ?? {});
      const looksLikeProgress = entries.some(
        ([, value]) => value && typeof value === 'object' && 'status' in (value as object),
      );
      if (looksLikeProgress) {
        const map = parsed as unknown as ProgressMap;
        setProgress(map);
        await writeJson(KEYS.progress, map);
        return 'تمّ استيراد بيانات التقدّم فقط.';
      }
      return 'الملف لا يطابق صيغة النسخة الاحتياطية.';
    } catch {
      return 'تعذّر قراءة JSON — تأكد من لصق النسخة كاملة.';
    }
  }, []);

  const wipeAll = useCallback(async () => {
    await Promise.all([removeKey(KEYS.progress), removeKey(KEYS.routes)]);
    setProgress({});
    setRoutes([]);
  }, []);

  const bundle = content ?? { ...emptyBundleStub() };
  const scale = useMemo(() => scaleOf(bundle, settings.scaleKey), [bundle, settings.scaleKey]);
  const views = useMemo(() => buildCourseViews(bundle, progress, settings.scaleKey), [bundle, progress, settings.scaleKey]);
  const totals = useMemo(() => computeTotals(views, bundle), [views, bundle]);
  const semesters = useMemo(() => computeSemesters(views), [views]);
  const alerts = useMemo(() => buildAlerts(views, bundle, totals), [views, bundle, totals]);

  const value: AppValue = {
    ready,
    content: bundle,
    progress,
    routes,
    settings,
    views,
    totals,
    semesters,
    alerts,
    scale,
    setRecord,
    saveRoute,
    deleteRoute,
    addDemoRoute,
    updateSettings,
    syncNow,
    restoreBundled,
    pushBackup,
    exportBackup,
    importBackup,
    wipeAll,
    lastSyncAt: settings.lastSyncAt,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function emptyBundleStub(): ContentBundle {
  return {
    version: 'loading',
    source: 'bundled',
    program: {
      university: 'جامعة أم القرى',
      program: 'بكالوريوس الذكاء الاصطناعي',
      totalCreditHours: 0,
      maxSemesterLoad: 18,
      recommendedMaxLoad: 16,
      defaultScale: '5.0',
      disclaimer: '',
      gpaScales: { '5.0': { label: 'مقياس ٥ نقاط', minPassingPoints: 2, grades: [] } },
    },
    courses: [],
    tracks: [],
    projects: [],
    resources: [],
  };
}

