import type { CurrentPlayersResult, ReviewsResult } from '../../shared/api';
import { ApiError } from './errors';

function invalid(): never { throw new ApiError('invalid_steam_response', 502); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) return invalid();
  return value as number;
}
const absent = { status: 'unavailable', reason: 'not_exposed' } as const;
export function parseCurrentPlayers(body: unknown, fetchedAt: number): CurrentPlayersResult {
  const response = record(record(body).response);
  if (typeof response.result !== 'number' || !Number.isSafeInteger(response.result)) return invalid();
  if (response.result !== 1) return absent;
  return { status: 'available', data: { count: count(response.player_count), fetchedAt } };
}
export function parseReviews(body: unknown, fetchedAt: number): ReviewsResult {
  const response = record(body);
  if (response.success === 0) return absent;
  if (response.success !== 1) return invalid();
  const summary = record(response.query_summary);
  const positive = count(summary.total_positive), negative = count(summary.total_negative), total = count(summary.total_reviews);
  if (!Number.isSafeInteger(positive + negative) || positive + negative !== total) return invalid();
  return { status: 'available', data: { positive, negative, total, fetchedAt } };
}
export async function fetchCommunity(resource: 'players' | 'reviews', appId: string, upstream: typeof fetch, now = Date.now): Promise<CurrentPlayersResult | ReviewsResult> {
  // Fixed public endpoints only. Neither endpoint receives the Steam key or a profile ID.
  const url = resource === 'players'
    ? new URL(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`)
    : new URL(`https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&filter=all&review_type=all&filter_offtopic_activity=1&num_per_page=0`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await upstream(url.toString(), { signal: controller.signal, redirect: 'manual' });
    if (response.status === 429) throw new ApiError('rate_limited', 429);
    if (!response.ok) throw new ApiError('steam_unavailable', 502);
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new ApiError(controller.signal.aborted ? 'steam_timeout' : 'invalid_steam_response', controller.signal.aborted ? 504 : 502); }
    return resource === 'players' ? parseCurrentPlayers(body, now()) : parseReviews(body, now());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'steam_timeout' : 'steam_unavailable', controller.signal.aborted ? 504 : 502);
  } finally { clearTimeout(timeout); }
}
