import type { Game, GamesResult, ProfileResult, StatsResult, AchievementsResult, SchemaResult, GlobalResult } from '../../shared/api';
import { ApiError } from './errors';
import { explicitFailure, parseAchievements, parseGlobal, parseSchema, parseStats } from './capabilities';
export { ApiError } from './errors';
export type Resource = 'profile' | 'library' | 'recent' | 'stats' | 'achievements' | 'schema' | 'global';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('invalid_steam_response', 502);
  return value as Record<string, unknown>;
}
function minutes(value: unknown): number | null {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ApiError('invalid_steam_response', 502);
  return value;
}
function game(value: unknown): Game {
  const item = record(value);
  if (!Number.isSafeInteger(item.appid) || Number(item.appid) <= 0 || Number(item.appid) > 4294967295) throw new ApiError('invalid_steam_response', 502);
  return {
    appId: item.appid as number,
    name: typeof item.name === 'string' && item.name ? item.name : `App ${item.appid}`,
    playtimeMinutes: minutes(item.playtime_forever), recentMinutes: minutes(item.playtime_2weeks),
  };
}
export function parseGames(body: unknown, resource: 'library' | 'recent'): GamesResult {
  const response = record(record(body).response);
  const count = response[resource === 'library' ? 'game_count' : 'total_count'];
  if (count === undefined && response.games === undefined) return { status: 'unavailable', reason: 'private_or_unavailable' };
  if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) > 100000) throw new ApiError('invalid_steam_response', 502);
  const raw = response.games ?? (count === 0 ? [] : undefined);
  if (!Array.isArray(raw) || raw.length !== count) throw new ApiError('invalid_steam_response', 502);
  const games = raw.map(game);
  if (new Set(games.map(item => item.appId)).size !== games.length) throw new ApiError('invalid_steam_response', 502);
  return { status: 'available', total: count as number, games };
}
export function parseProfile(body: unknown, steamId: string): ProfileResult {
  const players = record(record(body).response).players;
  if (!Array.isArray(players)) throw new ApiError('invalid_steam_response', 502);
  if (players.length === 0) return { status: 'unavailable', reason: 'not_found' };
  const player = record(players[0]);
  if (players.length !== 1 || player.steamid !== steamId || typeof player.personaname !== 'string') throw new ApiError('invalid_steam_response', 502);
  return { status: 'available', steamId, name: player.personaname,
    visibility: player.communityvisibilitystate === 3 ? 'public' : [1, 2].includes(Number(player.communityvisibilitystate)) ? 'private' : 'unknown' };
}
export async function fetchSteam(resource: Resource, steamId: string, key: string, upstream: typeof fetch, appId?: string): Promise<GamesResult | ProfileResult | StatsResult | AchievementsResult | SchemaResult | GlobalResult> {
  const endpoints: Record<Resource, string> = {
    profile: 'ISteamUser/GetPlayerSummaries/v0002/', library: 'IPlayerService/GetOwnedGames/v0001/', recent: 'IPlayerService/GetRecentlyPlayedGames/v0001/',
    stats: 'ISteamUserStats/GetUserStatsForGame/v2/', achievements: 'ISteamUserStats/GetPlayerAchievements/v1/',
    schema: 'ISteamUserStats/GetSchemaForGame/v2/', global: 'ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/',
  };
  const endpoint = endpoints[resource];
  const url = new URL(endpoint, 'https://api.steampowered.com/');
  if (resource !== 'global') url.searchParams.set('key', key);
  url.searchParams.set('format', 'json');
  if (resource === 'profile') url.searchParams.set('steamids', steamId);
  else if (resource === 'library' || resource === 'recent') url.searchParams.set('input_json', JSON.stringify(resource === 'library'
    ? { steamid: steamId, include_appinfo: true, include_played_free_games: true }
    : { steamid: steamId, count: 0 }));
  else {
    url.searchParams.set(resource === 'global' ? 'gameid' : 'appid', appId!);
    if (resource === 'stats' || resource === 'achievements') url.searchParams.set('steamid', steamId);
    if (resource === 'schema' || resource === 'achievements') url.searchParams.set('l', 'english');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Never log this URL or raw fetch exceptions: both may contain credentials.
    const response = await upstream(url.toString(), { signal: controller.signal, redirect: 'manual' });
    if (response.status === 429) throw new ApiError('rate_limited', 429);
    const playerCapability = resource === 'stats' || resource === 'achievements';
    if (!response.ok && !(playerCapability && [400, 403].includes(response.status))) {
      throw new ApiError([401, 403].includes(response.status) ? 'steam_auth_error' : 'steam_unavailable', 502);
    }
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new ApiError(controller.signal.aborted ? 'steam_timeout' : 'invalid_steam_response', controller.signal.aborted ? 504 : 502); }
    if (playerCapability) {
      const failure = explicitFailure(body);
      if (failure) return failure;
      // Observed on valid requests for games without exposed stats. The empty
      // 400 response does not establish privacy or unsupported capability.
      if (response.status === 400 && body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0) {
        return { status: 'unavailable', reason: 'not_exposed' };
      }
    }
    if (!response.ok) throw new ApiError(response.status === 403 ? 'steam_auth_error' : 'steam_unavailable', 502);
    if (resource === 'profile') return parseProfile(body, steamId);
    if (resource === 'stats') return parseStats(body, steamId);
    if (resource === 'achievements') return parseAchievements(body, steamId);
    if (resource === 'schema') return parseSchema(body);
    if (resource === 'global') return parseGlobal(body);
    return parseGames(body, resource);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'steam_timeout' : 'steam_unavailable', controller.signal.aborted ? 504 : 502);
  } finally { clearTimeout(timeout); }
}
