import type { AchievementsResult, Capability, GlobalResult, SchemaResult, StatsResult } from '../../shared/api';
import { ApiError } from './errors';

function invalid(): never { throw new ApiError('invalid_steam_response', 502); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function name(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : invalid();
}
function optionalText(value: unknown): string | null {
  return value === undefined || value === '' ? null : typeof value === 'string' ? value : invalid();
}
function items<T extends { name: string }>(value: unknown, parse: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value) || value.length > 100000) return invalid();
  const result = value.map(item => parse(record(item)));
  if (new Set(result.map(item => item.name)).size !== result.length) return invalid();
  return result;
}
const absent = { status: 'unavailable', reason: 'not_exposed' } as const;

// Only explicit Steam messages establish privacy or unsupported capability.
// Unknown failures are errors, not proof that a game lacks the feature.
export function explicitFailure(body: unknown): Extract<Capability<never>, { status: 'unavailable' }> | null {
  if (!body || typeof body !== 'object' || !('playerstats' in body)) return null;
  const player = record(body.playerstats);
  if (player.success !== false) return null;
  if (player.error === 'Profile is not public') return { status: 'unavailable', reason: 'private' };
  if (player.error === 'Requested app has no stats') return { status: 'unavailable', reason: 'unsupported' };
  return null;
}
function playerStats(body: unknown, steamId: string): Record<string, unknown> {
  const player = record(record(body).playerstats);
  if (player.success === false) throw new ApiError('steam_unavailable', 502);
  if (player.success !== undefined && player.success !== true) return invalid();
  if (player.steamID !== undefined && player.steamID !== steamId) return invalid();
  return player;
}
export function parseStats(body: unknown, steamId: string): StatsResult {
  const failure = explicitFailure(body);
  if (failure) return failure;
  const player = playerStats(body, steamId);
  if (player.stats === undefined) return absent;
  return { status: 'available', data: items(player.stats, item => {
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) return invalid();
    return { name: name(item.name), value: item.value };
  }) };
}
export function parseAchievements(body: unknown, steamId: string): AchievementsResult {
  const failure = explicitFailure(body);
  if (failure) return failure;
  const player = playerStats(body, steamId);
  if (player.achievements === undefined) return absent;
  return { status: 'available', data: items(player.achievements, item => {
    if (item.achieved !== 0 && item.achieved !== 1) return invalid();
    if (item.unlocktime !== undefined && (!Number.isSafeInteger(item.unlocktime) || Number(item.unlocktime) < 0 || Number(item.unlocktime) > 8640000000000)) return invalid();
    return { name: name(item.apiname), achieved: item.achieved === 1,
      unlockTime: item.achieved === 1 && Number(item.unlocktime) > 0 ? item.unlocktime as number : null };
  }) };
}
export function parseSchema(body: unknown): SchemaResult {
  const game = record(record(body).game);
  if (game.availableGameStats === undefined) return absent;
  const schema = record(game.availableGameStats);
  return { status: 'available', data: {
    stats: schema.stats === undefined ? null : items(schema.stats, item => ({ name: name(item.name), displayName: optionalText(item.displayName) })),
    achievements: schema.achievements === undefined ? null : items(schema.achievements, item => {
      if (item.hidden !== undefined && item.hidden !== 0 && item.hidden !== 1) return invalid();
      return { name: name(item.name), displayName: optionalText(item.displayName), description: optionalText(item.description), hidden: item.hidden === 1 };
    }),
  } };
}
export function parseGlobal(body: unknown): GlobalResult {
  const percentages = record(record(body).achievementpercentages);
  if (percentages.achievements === undefined) return absent;
  return { status: 'available', data: items(percentages.achievements, item => {
    // Steam may encode percentages as numeric strings. Empty strings are invalid.
    const percent = typeof item.percent === 'string' && /^\d+(\.\d+)?$/.test(item.percent) ? Number(item.percent) : item.percent;
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) return invalid();
    return { name: name(item.name), percent };
  }) };
}
