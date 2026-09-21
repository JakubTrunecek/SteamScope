export interface Game {
  appId: number;
  name: string;
  playtimeMinutes: number | null;
  recentMinutes: number | null;
}
export type GamesResult = { status: 'available'; total: number; games: Game[] }
  | { status: 'unavailable'; reason: 'private_or_unavailable' };
export type ProfileResult = {
  status: 'available'; steamId: string; name: string;
  visibility: 'public' | 'private' | 'unknown';
} | { status: 'unavailable'; reason: 'not_found' };
export type ApiErrorCode = 'invalid_steam_id' | 'not_configured' | 'rate_limited'
  | 'steam_unavailable' | 'steam_timeout' | 'steam_auth_error' | 'invalid_steam_response';
export function isSteamId(value: string): boolean {
  // Public-universe individual desktop account; retain full precision as a string.
  if (!/^\d{17}$/.test(value)) return false;
  const id = BigInt(value);
  return id > 76561197960265728n && id <= 76561202255233023n;
}
