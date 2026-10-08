import bundledCourses from '../../content/courses.json';
import bundledProgram from '../../content/program.json';
import bundledProjects from '../../content/projects.json';
import bundledResources from '../../content/resources.json';
import bundledTracks from '../../content/tracks.json';

import type { ContentBundle, Course, Program, Project, ResourceGroupItem, Track } from './types';
import { KEYS, readJson, removeKey, writeJson } from './storage';

/** ترقية هذا الرقم عند تعديل محتوى JSON المضمّن، ليُعرف هل الكاش قديم */
export const BUNDLED_VERSION = '2026.10.08-static';

export const bundledContent: ContentBundle = {
  version: BUNDLED_VERSION,
  source: 'bundled',
  program: bundledProgram as Program,
  courses: bundledCourses as Course[],
  tracks: bundledTracks as Track[],
  projects: bundledProjects as Project[],
  resources: bundledResources as ResourceGroupItem[],
};

export function validateBundle(input: unknown): ContentBundle | null {
  if (!input || typeof input !== 'object') return null;
  const b = input as Partial<ContentBundle>;
  if (!Array.isArray(b.courses) || !Array.isArray(b.tracks)) return null;
  if (!b.program || typeof b.program !== 'object' || !b.program.gpaScales) return null;
  const courses = (b.courses as Course[]).filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string');
  if (courses.length === 0) return null;
  return {
    version: typeof b.version === 'string' ? b.version : 'server',
    fetchedAt: b.fetchedAt,
    source: b.source === 'server' ? 'server' : 'bundled',
    program: b.program as Program,
    courses,
    tracks: (b.tracks as Track[]) ?? [],
    projects: (b.projects as Project[]) ?? [],
    resources: (b.resources as ResourceGroupItem[]) ?? [],
  };
}

/** يبني الكائن النهائي مع إسقاط أي مقرر غير موجود حتى لا تنفجر الواجهة */
function normalize(bundle: ContentBundle): ContentBundle {
  const ids = new Set(bundle.courses.map((c) => c.id));
  const courses = bundle.courses.map((c) => ({
    ...c,
    prereqs: (c.prereqs ?? []).filter((p) => ids.has(p) && p !== c.id),
    outcomes: c.outcomes ?? [],
  }));
  return { ...bundle, courses };
}

export async function loadContent(): Promise<ContentBundle> {
  const cached = await readJson<ContentBundle | null>(KEYS.contentCache, null);
  if (cached) {
    const valid = validateBundle(cached);
    if (valid) return normalize(valid);
    await removeKey(KEYS.contentCache);
  }
  return normalize(bundledContent);
}

export interface SyncResult {
  ok: boolean;
  changed: boolean;
  message: string;
  bundle?: ContentBundle;
}

/** يسحب المحتوى من السيرفر (لوحة التحكم) ويخزّنه محلياً للعمل بدون إنترنت لاحقاً */
export async function syncContent(apiBase: string): Promise<SyncResult> {
  const base = apiBase.trim().replace(/\/+$/, '');
  if (!base) return { ok: false, changed: false, message: 'لم يتم ضبط رابط السيرفر.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/content`, { signal: controller.signal as RequestInit['signal'] });
    if (!res.ok) return { ok: false, changed: false, message: `السيرفر ردّ بالرمز ${res.status}.` };
    const json = (await res.json()) as unknown;
    const bundle = validateBundle(json);
    if (!bundle) return { ok: false, changed: false, message: 'استجابة غير مطابقة للصيغة المتوقعة.' };
    const withMeta: ContentBundle = { ...bundle, source: 'server', fetchedAt: Date.now() };
    await writeJson(KEYS.contentCache, withMeta);
    return {
      ok: true,
      changed: withMeta.version !== BUNDLED_VERSION,
      message: `تمّت المزامنة • الإصدار ${withMeta.version}`,
      bundle: normalize(withMeta),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, changed: false, message: `تعذّر الوصول للسيرفر (${msg.slice(0, 60)}).` };
  } finally {
    clearTimeout(timer);
  }
}

export async function clearContentCache(): Promise<void> {
  await removeKey(KEYS.contentCache);
}

export function semestersOf(courses: Course[]): number[] {
  const set = new Set(courses.map((c) => c.semester));
  return [...set].sort((a, b) => a - b);
}

export function coursesBySemester(courses: Course[]): Map<number, Course[]> {
  const map = new Map<number, Course[]>();
  for (const c of courses) {
    const list = map.get(c.semester) ?? [];
    list.push(c);
    map.set(c.semester, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  return map;
}
