import type { TrackPoint } from './types';

export interface WatchHandle {
  stop: () => void;
}
export type PointCb = (p: TrackPoint) => void;
export type ErrCb = (message: string) => void;

export async function ensurePermission(): Promise<'granted' | 'denied'> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'denied';
  return 'granted';
}

export async function startGpsWatch(onPoint: PointCb, onError: ErrCb): Promise<WatchHandle> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('المتصفح لا يوفّر خدمة الموقع. استخدم وضع المحاكاة.');
    return { stop: () => {} };
  }
  let id = -1;
  id = navigator.geolocation.watchPosition(
    (pos) => {
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        at: pos.timestamp || Date.now(),
        alt: pos.coords.altitude ?? undefined,
        spd: pos.coords.speed ?? undefined,
      });
    },
    (err) => onError(`الموقع مرفوض/محجوب (${err.code}). جرّب وضع المحاكاة.`),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
  );
  return {
    stop: () => {
      if (id >= 0) navigator.geolocation.clearWatch(id);
    },
  };
}

export const platformLabel = 'web';
