import type { GamesResult } from '../../shared/api';

const entries = new Map<string, { expires: number; data: GamesResult }>();
const isLibrary = (path: string) => /^\/api\/players\/\d{17}\/library$/.test(path);
export function invalidateLibraryCache(path: string) { entries.delete(path); }
export function clearLibraryCache() { entries.clear(); }
export function readLibraryCache(path: string, now = Date.now()): GamesResult | undefined {
  const entry = entries.get(path);
  if (!entry) return;
  if (entry.expires <= now) { entries.delete(path); return; }
  return entry.data;
}
export function writeLibraryCache(path: string, data: unknown, now = Date.now()) {
  if (!isLibrary(path) || !data || typeof data !== 'object' || !('status' in data) || data.status !== 'available' || !('games' in data) || !Array.isArray(data.games)) return;
  entries.delete(path);
  entries.set(path, { data: data as GamesResult, expires: now + 60_000 });
  while (entries.size > 4) entries.delete(entries.keys().next().value!);
}
