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
export type ApiErrorCode = 'invalid_steam_id' | 'invalid_app_id' | 'not_configured' | 'rate_limited'
  | 'steam_unavailable' | 'steam_timeout' | 'steam_auth_error' | 'invalid_steam_response';
export function isSteamId(value: string): boolean {
  // Public-universe individual desktop account; retain full precision as a string.
  if (!/^\d{17}$/.test(value)) return false;
  const id = BigInt(value);
  return id > 76561197960265728n && id <= 76561202255233023n;
}
export function isAppId(value: string): boolean {
  return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 4294967295;
}
export type Capability<T> = { status: 'available'; data: T }
  | { status: 'unavailable'; reason: 'private' | 'unsupported' | 'not_exposed' };
export interface DetailedStat { name: string; value: number }
export interface Achievement { name: string; achieved: boolean; unlockTime: number | null }
export interface SchemaAchievement {
  name: string; displayName: string | null; description: string | null; hidden: boolean;
}
export interface GameSchema {
  stats: { name: string; displayName: string | null }[] | null;
  achievements: SchemaAchievement[] | null;
}
export type StatsResult = Capability<DetailedStat[]>;
export type AchievementsResult = Capability<Achievement[]>;
export type SchemaResult = Capability<GameSchema>;
export type GlobalResult = Capability<{ name: string; percent: number }[]>;
export type CurrentPlayersResult = Capability<{ count: number; fetchedAt: number }>;
export type ReviewsResult = Capability<{ positive: number; negative: number; total: number; fetchedAt: number }>;
