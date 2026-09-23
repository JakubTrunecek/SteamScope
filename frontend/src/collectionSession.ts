import type { ScannedGame } from './collectionInsights';

interface CollectionSession { rows: ScannedGame[]; month: string; day: string }
// Tab memory only: never localStorage, cookies, or a server-side history.
const sessions = new Map<string, CollectionSession>();
export function readCollection(id: string): CollectionSession {
  return sessions.get(id) ?? { rows: [], month: '', day: '' };
}
export function saveCollection(id: string, session: CollectionSession) {
  sessions.delete(id);
  if (session.rows.length) sessions.set(id, session);
  while (sessions.size > 3) sessions.delete(sessions.keys().next().value!);
}
export function clearCollection(id: string) { sessions.delete(id); }
