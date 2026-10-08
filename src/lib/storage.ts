import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  progress: 'uqu.progress.v1',
  routes: 'uqu.routes.v1',
  settings: 'uqu.settings.v1',
  contentCache: 'uqu.content.cache.v1',
} as const;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // التخزين الممتلئ أو تعطّل AsyncStorage لا يجب أن يكسر الواجهة
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
