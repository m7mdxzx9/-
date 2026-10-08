import * as Location from 'expo-location';

import type { TrackPoint } from './types';

export interface WatchHandle {
  stop: () => void;
}
export type PointCb = (p: TrackPoint) => void;
export type ErrCb = (message: string) => void;

export async function ensurePermission(): Promise<'granted' | 'denied'> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return 'granted';
    const asked = await Location.requestForegroundPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function startGpsWatch(onPoint: PointCb, onError: ErrCb): Promise<WatchHandle> {
  if ((await ensurePermission()) !== 'granted') {
    onError('لم يُمنح إذن الموقع. استخدم وضع المحاكاة لتجربة الميزة.');
    return { stop: () => {} };
  }
  try {
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1500, distanceInterval: 3 },
      (loc) => {
        onPoint({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          at: loc.timestamp,
          alt: loc.coords.altitude ?? undefined,
          spd: loc.coords.speed ?? undefined,
        });
      },
    );
    return { stop: () => sub.remove() };
  } catch (err) {
    onError(err instanceof Error ? err.message : 'تعذّر بدء تتبع الموقع.');
    return { stop: () => {} };
  }
}

export const platformLabel = 'native';
