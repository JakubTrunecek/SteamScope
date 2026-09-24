import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCommunity, parseCurrentPlayers, parseReviews } from '../src/community';
import { createWorker } from '../src/index';

const summary = { success: 1, query_summary: { total_positive: 8, total_negative: 2, total_reviews: 10 }, reviews: [{ review: 'Never forward individual reviews' }] };
const env = { ALLOWED_ORIGIN: 'https://example.test', REQUEST_LIMITER: { limit: async () => ({ success: true }) }, STEAM_LIMITER: { limit: async () => ({ success: true }) } };
afterEach(() => vi.useRealTimers());
describe('Public community data', () => {
  it('keeps explicit zero distinct from unavailable or invalid counts', () => {
    expect(parseCurrentPlayers({ response: { result: 1, player_count: 0 } }, 123)).toEqual({ status: 'available', data: { count: 0, fetchedAt: 123 } });
    expect(parseCurrentPlayers({ response: { result: 42 } }, 123).status).toBe('unavailable');
    for (const value of [undefined, null, -1, 1.5, '25', Infinity]) expect(() => parseCurrentPlayers({ response: { result: 1, player_count: value } }, 123)).toThrow('invalid_steam_response');
  });
  it('only returns validated aggregate counts, including no reviews', () => {
    expect(parseReviews(summary, 123)).toEqual({ status: 'available', data: { positive: 8, negative: 2, total: 10, fetchedAt: 123 } });
    expect(parseReviews({ success: 0 }, 123).status).toBe('unavailable');
    expect(parseReviews({ success: 1, query_summary: { total_positive: 0, total_negative: 0, total_reviews: 0 } }, 123).status).toBe('available');
    for (const body of [{ success: 1 }, {}, { success: 1, query_summary: { total_positive: 8, total_negative: 2, total_reviews: 9 } }, { success: 1, query_summary: { total_positive: -1, total_negative: 2, total_reviews: 1 } }]) expect(() => parseReviews(body, 0)).toThrow('invalid_steam_response');
  });
  it('uses fixed keyless URLs, caches by app and preserves the original snapshot time', async () => {
    const upstream = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(summary)));
    let time = 100;
    const worker = createWorker(upstream, () => time);
    const request = () => worker.fetch(new Request('https://worker.test/api/games/550/reviews'), { ...env, STEAM_API_KEY: 'do-not-send-this' });
    expect((await request()).status).toBe(200);
    time = 101; expect(await (await request()).json()).toMatchObject({ data: { fetchedAt: 100 } });
    expect(upstream).toHaveBeenCalledTimes(1);
    const url = new URL(String(upstream.mock.calls[0][0]));
    expect(url.origin).toBe('https://store.steampowered.com'); expect(url.pathname).toBe('/appreviews/550');
    expect(url.searchParams.get('key')).toBeNull(); expect(url.searchParams.get('steamid')).toBeNull();
    for (const name of ['language', 'purchase_type', 'review_type']) expect(url.searchParams.get(name)).toBe('all');
    expect(url.searchParams.get('num_per_page')).toBe('0');
    expect(url.searchParams.get('filter_offtopic_activity')).toBe('1');
    time = 60101; expect(await (await request()).json()).toMatchObject({ data: { fetchedAt: 60101 } });
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('serves current counts without a secret and rejects invalid app IDs, origins and queries', async () => {
    const upstream = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ response: { result: 1, player_count: 4 } })));
    const worker = createWorker(upstream);
    const request = (path: string, origin = env.ALLOWED_ORIGIN) => worker.fetch(new Request(`https://worker.test${path}`, { headers: { Origin: origin } }), env);
    expect((await request('/api/games/550/players')).status).toBe(200);
    const url = new URL(String(upstream.mock.calls[0][0]));
    expect(url.origin).toBe('https://api.steampowered.com'); expect(url.searchParams.get('appid')).toBe('550'); expect(url.searchParams.get('key')).toBeNull();
    expect((await request('/api/games/0/players')).status).toBe(400);
    expect((await request('/api/games/550/reviews?url=https://other.test')).status).toBe(400);
    expect((await request('/api/games/550/reviews', 'https://other.test')).status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('enforces the public endpoint rate limit and never follows redirects', async () => {
    const upstream = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 302, headers: { Location: 'https://other.test' } }));
    const worker = createWorker(upstream);
    const request = new Request('https://worker.test/api/games/550/reviews');
    const limited = await worker.fetch(request, { ...env, REQUEST_LIMITER: { limit: async () => ({ success: false }) } });
    expect(limited.status).toBe(429); expect(limited.headers.get('Retry-After')).toBe('60'); expect(upstream).not.toHaveBeenCalled();
    expect((await worker.fetch(request, env)).status).toBe(502);
    expect(upstream.mock.calls[0][1]?.redirect).toBe('manual');
  });
  it('times out and sanitizes upstream errors', async () => {
    vi.useFakeTimers();
    const upstream = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('raw secret URL')), { once: true })));
    const result = fetchCommunity('players', '550', upstream).catch(error => error);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await result).toMatchObject({ code: 'steam_timeout', status: 504 });
  });
});
