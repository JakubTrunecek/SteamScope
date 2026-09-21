import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorker, type Env } from '../src/index';
import { parseGames, parseProfile } from '../src/steam';
import { isSteamId } from '../../shared/api';

const id = '76561198004260198';
const fixture = { response: { game_count: 2, games: [
  { appid: 550, name: 'Left 4 Dead 2', playtime_forever: 120 },
  { appid: 730, name: 'Counter-Strike 2', playtime_forever: 0 },
] } };
function setup(body: unknown = fixture) {
  const upstream = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(body)));
  const env: Env = { ALLOWED_ORIGIN: 'http://localhost:5173', STEAM_API_KEY: 'fake-test-key',
    REQUEST_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    STEAM_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } };
  let time = 0;
  const worker = createWorker(upstream, () => time);
  const request = (resource = 'library', steamId = id) => worker.fetch(new Request(`https://worker.test/api/players/${steamId}/${resource}`), env);
  return { upstream, env, request, worker, advance: () => { time += 60001; } };
}
afterEach(() => vi.useRealTimers());

describe('Steam response normalization', () => {
  it('keeps zero playtime distinct from missing playtime', () => {
    const result = parseGames(fixture, 'library');
    expect(result.status).toBe('available');
    if (result.status === 'available') expect(result.games[1]).toEqual({ appId: 730, name: 'Counter-Strike 2', playtimeMinutes: 0, recentMinutes: null });
  });
  it('distinguishes hidden/ambiguous data from a reported empty library', () => {
    expect(parseGames({ response: {} }, 'library').status).toBe('unavailable');
    expect(parseGames({ response: { game_count: 0 } }, 'library')).toEqual({ status: 'available', total: 0, games: [] });
  });
  it('normalizes recent games and profile without copying arbitrary fields', () => {
    expect(parseGames({ response: { total_count: 1, games: [{ appid: 550, playtime_2weeks: 12 }] } }, 'recent')).toEqual({ status: 'available', total: 1, games: [{ appId: 550, name: 'App 550', playtimeMinutes: null, recentMinutes: 12 }] });
    expect(parseProfile({ response: { players: [{ steamid: id, personaname: 'Tester', communityvisibilitystate: 1, ignored: 'secret' }] } }, id)).toEqual({ status: 'available', steamId: id, name: 'Tester', visibility: 'private' });
    expect(parseProfile({ response: { players: [] } }, id).status).toBe('unavailable');
  });
  it.each([{}, { response: { game_count: 1 } }, { response: { game_count: -1 } }, { response: { game_count: 1, games: [{ appid: '550' }] } }, { response: { game_count: 1, games: [{ appid: 550, playtime_forever: -5 }] } }])('rejects malformed responses', body => {
    expect(() => parseGames(body, 'library')).toThrow('invalid_steam_response');
  });
  it('rejects invalid account identifiers without precision loss', () => {
    expect(isSteamId(id)).toBe(true);
    for (const invalid of ['123', '99999999999999999', '76561197960265728', '76561202255233024', '../profile']) expect(isSteamId(invalid)).toBe(false);
  });
});

describe('Steam proxy protection and caching', () => {
  it('uses a fixed Steam host, disables redirects and normalizes results', async () => {
    const { request, upstream } = setup();
    const response = await request();
    expect(response.status).toBe(200);
    const url = new URL(String(upstream.mock.calls[0][0]));
    expect(url.origin).toBe('https://api.steampowered.com');
    expect(url.pathname).toBe('/IPlayerService/GetOwnedGames/v0001/');
    expect(JSON.parse(url.searchParams.get('input_json')!)).toEqual({ steamid: id, include_appinfo: true, include_played_free_games: true });
    expect(upstream.mock.calls[0][1]?.redirect).toBe('manual');
    expect(await response.text()).not.toContain('fake-test-key');
  });
  it('rejects invalid IDs and missing configuration before fetching', async () => {
    const { request, upstream, env } = setup();
    expect((await request('library', '123')).status).toBe(400);
    env.STEAM_API_KEY = '';
    expect((await request()).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('rejects caller-supplied query strings', async () => {
    const { worker, env, upstream } = setup();
    expect((await worker.fetch(new Request(`https://worker.test/api/players/${id}/library?key=override`), env)).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('caches normalized successes for 60 seconds and coalesces concurrent requests', async () => {
    const { request, upstream, advance } = setup();
    await Promise.all([request(), request()]);
    await request();
    expect(upstream).toHaveBeenCalledTimes(1);
    advance(); await request();
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('bounds the cache to 100 entries', async () => {
    const { request, upstream } = setup();
    for (let i = 0; i < 101; i++) await request('library', String(BigInt(id) + BigInt(i)));
    await request();
    expect(upstream).toHaveBeenCalledTimes(102);
  });
  it('does not cache unavailable responses', async () => {
    const { request, upstream } = setup({ response: {} });
    await request(); await request();
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('enforces request and upstream limits', async () => {
    for (const binding of ['REQUEST_LIMITER', 'STEAM_LIMITER'] as const) {
      const { env, request, upstream } = setup();
      env[binding] = { limit: async () => ({ success: false }) };
      const response = await request();
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(upstream).not.toHaveBeenCalled();
    }
  });
  it('sanitizes fetch exceptions and does not cache failures', async () => {
    const { request, upstream } = setup();
    upstream.mockRejectedValueOnce(new Error('https://api.steampowered.com/?key=fake-test-key'));
    const response = await request();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'steam_unavailable' });
    expect((await request()).status).toBe(200);
  });
  it.each([[302, 502, 'steam_unavailable'], [403, 502, 'steam_auth_error'], [429, 429, 'rate_limited'], [500, 502, 'steam_unavailable']])('maps HTTP %s safely', async (status, expected, error) => {
    const { request, upstream } = setup();
    upstream.mockResolvedValue(new Response('sensitive upstream text', { status: Number(status) }));
    const response = await request();
    expect(response.status).toBe(expected);
    expect(await response.json()).toEqual({ error });
  });
  it('handles non-JSON Steam responses', async () => {
    const { request, upstream } = setup();
    upstream.mockResolvedValue(new Response('<html>error</html>'));
    expect(await (await request()).json()).toEqual({ error: 'invalid_steam_response' });
  });
  it('aborts a stalled upstream request after eight seconds', async () => {
    vi.useFakeTimers();
    const { request, upstream } = setup();
    upstream.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = request();
    await vi.advanceTimersByTimeAsync(8001);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'steam_timeout' });
  });
});
