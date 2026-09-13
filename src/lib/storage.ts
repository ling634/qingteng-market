import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

export const storageKey = (name: string) => `qtmarket_${name}`;

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = scopedStorage.getItem(storageKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    scopedStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function removeKey(key: string): void {
  try {
    scopedStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
