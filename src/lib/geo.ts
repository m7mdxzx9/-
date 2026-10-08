import type { TrackPoint } from './types';

const R_EARTH = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthM(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineM(points[i - 1], points[i]);
  return total;
}

export function speedMs(a: TrackPoint, b: TrackPoint): number | null {
  const dt = (b.at - a.at) / 1000;
  if (dt <= 0) return null;
  return haversineM(a, b) / dt;
}

/** خوارزمية Douglas–Peucker لتبسيط الخط مع الحفاظ على الشكل */
export function rdp(points: TrackPoint[], epsilonDeg: number): TrackPoint[] {
  if (points.length < 3) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop()!;
    if (end <= start + 1) continue;
    const a = points[start];
    const b = points[end];
    let maxDist = -1;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const d = perpDistance(points[i], a, b);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index > 0 && maxDist > epsilonDeg) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpDistance(p: TrackPoint, a: TrackPoint, b: TrackPoint): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const denom = Math.hypot(dx, dy);
  if (denom === 0) return Math.hypot(p.lng - a.lng, p.lat - a.lat);
  const area = Math.abs(dy * (p.lng - a.lng) - dx * (p.lat - a.lat));
  return area / denom;
}

/** يقلّص عدد النقاط تدريجياً حتى تدخل حد التخزين دون إفساد الشكل */
export function fitPoints(points: TrackPoint[], maxPoints = 400): TrackPoint[] {
  if (points.length <= maxPoints) return points;
  let epsilon = 0.00005;
  let out = points;
  for (let i = 0; i < 10 && out.length > maxPoints; i += 1) {
    epsilon *= 2;
    out = rdp(points, epsilon);
  }
  if (out.length > maxPoints) {
    const stride = Math.ceil(out.length / maxPoints);
    out = out.filter((_, idx) => idx % stride === 0);
  }
  return out;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function boundsOf(points: { lat: number; lng: number }[]): Bounds | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} م`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} كم`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min} د`;
  return `${h} س ${min} د`;
}

export function formatClock(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** مسار تجريبي حول حرم جامعة أم القرى (للعرض عندما يكون GPS محجوباً) */
export function demoRoute(seed = 42): TrackPoint[] {
  const center = { lat: 21.3825, lng: 39.8359 };
  const points: TrackPoint[] = [];
  const now = Date.now();
  let lat = center.lat;
  let lng = center.lng;
  let heading = 0.6;
  for (let i = 0; i < 90; i += 1) {
    const rnd = Math.sin(seed + i * 1.7) * 0.5;
    heading += rnd * 0.22;
    const step = 0.00042 + Math.abs(Math.cos(seed + i)) * 0.00018;
    lat += Math.sin(heading) * step;
    lng += Math.cos(heading) * step;
    points.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      at: now - (90 - i) * 4000,
      spd: 1.3 + Math.abs(rnd),
      sim: true,
    });
  }
  return points;
}
