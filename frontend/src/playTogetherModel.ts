import type { Game } from '../../shared/api';
export type SharedGame = { appId: number; name: string; you: number | null; friend: number | null };
export type TimeGroup = 'discover' | 'you' | 'friend' | 'return' | 'unknown';
export function sharedLibrary(you: Game[], friend: Game[]): SharedGame[] {
  const theirs = new Map(friend.map(game => [game.appId, game]));
  const seen = new Set<number>();
  return you.flatMap(game => {
    const other = theirs.get(game.appId);
    if (!other || seen.has(game.appId)) return [];
    seen.add(game.appId);
    // Stable name even if the two snapshots use different localized titles.
    const name = [game.name, other.name].sort((a, b) => a.localeCompare(b, 'en') || (a < b ? -1 : a > b ? 1 : 0))[0];
    return [{ appId: game.appId, name, you: game.playtimeMinutes, friend: other.playtimeMinutes }];
  }).sort((a, b) => a.name.localeCompare(b.name, 'en') || a.appId - b.appId);
}
export function timeGroup(game: SharedGame): TimeGroup {
  if (game.you === null || game.friend === null) return 'unknown';
  if (game.you < 120) return game.friend < 120 ? 'discover' : 'friend';
  return game.friend < 120 ? 'you' : 'return';
}
