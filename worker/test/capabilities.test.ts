import { describe, expect, it, vi } from 'vitest';
import { parseAchievements, parseGlobal, parseSchema, parseStats } from '../src/capabilities';
import { createWorker, type Env } from '../src/index';
import { isAppId } from '../../shared/api';

const id = '76561198004260198';
const statBody = { playerstats: { steamID: id, stats: [{ name: 'opaque_raw_001', value: 0 }, { name: 'negative', value: -12.75 }] } };
const achievementBody = { playerstats: { steamID: id, success: true, achievements: [{ apiname: 'EXACT_Name', achieved: 1, unlocktime: 0 }, { apiname: 'LOCKED', achieved: 0, unlocktime: 123 }] } };

describe('Game capability normalization', () => {
  it('preserves exact stat names, zero, negative and fractional values without invented labels', () => {
    expect(parseStats(statBody, id)).toEqual({ status: 'available', data: [{ name: 'opaque_raw_001', value: 0 }, { name: 'negative', value: -12.75 }] });
  });
  it('does not substitute schema defaults or achievement values for missing player stats', () => {
    expect(parseStats({ playerstats: { achievements: [] } }, id)).toEqual({ status: 'unavailable', reason: 'not_exposed' });
    expect(parseStats({ playerstats: { stats: [] } }, id)).toEqual({ status: 'available', data: [] });
  });
  it('retains unlocked state with unknown unlock time, and ignores timestamps on locked items', () => {
    expect(parseAchievements(achievementBody, id)).toEqual({ status: 'available', data: [{ name: 'EXACT_Name', achieved: true, unlockTime: null }, { name: 'LOCKED', achieved: false, unlockTime: null }] });
  });
  it('preserves valid unlock timestamps', () => {
    expect(parseAchievements({ playerstats: { achievements: [{ apiname: 'a', achieved: 1, unlocktime: 1600000000 }] } }, id)).toEqual({ status: 'available', data: [{ name: 'a', achieved: true, unlockTime: 1600000000 }] });
  });
  it('separates missing and empty achievements', () => {
    expect(parseAchievements({ playerstats: { success: true } }, id).status).toBe('unavailable');
    expect(parseAchievements({ playerstats: { achievements: [] } }, id)).toEqual({ status: 'available', data: [] });
  });
  it.each([['Profile is not public', 'private'], ['Requested app has no stats', 'unsupported']])('only classifies explicit Steam failure: %s', (error, reason) => {
    const body = { playerstats: { success: false, error } };
    expect(parseStats(body, id)).toEqual({ status: 'unavailable', reason });
    expect(parseAchievements(body, id)).toEqual({ status: 'unavailable', reason });
  });
  it('does not classify unknown or temporary failures as unsupported', () => {
    expect(() => parseStats({ playerstats: { success: false, error: 'temporary problem' } }, id)).toThrow('steam_unavailable');
  });
  it('does not invent schema labels or conflate missing lists with empty lists', () => {
    expect(parseSchema({ game: { availableGameStats: { stats: [{ name: 'internal', defaultvalue: 100 }], achievements: [] } } })).toEqual({ status: 'available', data: { stats: [{ name: 'internal', displayName: null }], achievements: [] } });
    expect(parseSchema({ game: { availableGameStats: {} } })).toEqual({ status: 'available', data: { stats: null, achievements: null } });
    expect(parseSchema({ game: {} }).status).toBe('unavailable');
  });
  it('retains schema labels and hidden flags supplied by Steam', () => {
    expect(parseSchema({ game: { availableGameStats: { achievements: [{ name: 'A', displayName: 'Actual label', description: 'Actual description', hidden: 1 }] } } })).toEqual({ status: 'available', data: { stats: null, achievements: [{ name: 'A', displayName: 'Actual label', description: 'Actual description', hidden: true }] } });
  });
  it('accepts numeric global percentages and numeric strings, including zero', () => {
    expect(parseGlobal({ achievementpercentages: { achievements: [{ name: 'A', percent: '0' }, { name: 'B', percent: 99.25 }] } })).toEqual({ status: 'available', data: [{ name: 'A', percent: 0 }, { name: 'B', percent: 99.25 }] });
  });
  it.each(['', null, -1, 101, 'oops'])('rejects invalid global percent %s', percent => {
    expect(() => parseGlobal({ achievementpercentages: { achievements: [{ name: 'A', percent }] } })).toThrow('invalid_steam_response');
  });
  it.each(['3', null, Infinity, NaN])('rejects non-finite/non-numeric stat values', value => {
    expect(() => parseStats({ playerstats: { stats: [{ name: 'x', value }] } }, id)).toThrow('invalid_steam_response');
  });
  it('rejects duplicate names, mismatched accounts and invalid unlocked values', () => {
    expect(() => parseStats({ playerstats: { stats: [{ name: 'x', value: 1 }, { name: 'x', value: 2 }] } }, id)).toThrow();
    expect(() => parseStats({ playerstats: { steamID: '76561198004260199', stats: [] } }, id)).toThrow();
    expect(() => parseAchievements({ playerstats: { achievements: [{ apiname: 'a', achieved: 2 }] } }, id)).toThrow();
  });
  it('validates uint32 app IDs without alternate encodings', () => {
    expect(isAppId('550')).toBe(true);
    expect(isAppId('4294967295')).toBe(true);
    for (const invalid of ['0', '-1', '01', '4294967296', '1e3', '55.0', '%35%35%30']) expect(isAppId(invalid)).toBe(false);
  });
});

function setup() {
  const upstream = vi.fn<typeof fetch>().mockImplementation(async input => {
    const path = new URL(String(input)).pathname;
    const body = path.includes('GetSchema') ? { game: { availableGameStats: { stats: [] } } }
      : path.includes('GetGlobal') ? { achievementpercentages: { achievements: [] } }
      : path.includes('GetPlayerAchievements') ? achievementBody : statBody;
    return new Response(JSON.stringify(body));
  });
  const env: Env = { ALLOWED_ORIGIN: 'http://localhost:5173', STEAM_API_KEY: 'fake-test-key',
    REQUEST_LIMITER: { limit: async () => ({ success: true }) }, STEAM_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } };
  const worker = createWorker(upstream);
  const request = (resource: string, app = '550', player = id) => worker.fetch(new Request(`https://worker.test/api/players/${player}/games/${app}/${resource}`), env);
  return { request, upstream, env };
}
describe('Game capability routes', () => {
  it('uses fixed endpoints and parameters without leaking keys', async () => {
    const { request, upstream } = setup();
    for (const resource of ['stats', 'achievements', 'schema', 'global']) {
      const response = await request(resource);
      expect(response.status).toBe(200);
      expect(await response.text()).not.toContain('fake-test-key');
    }
    const urls = upstream.mock.calls.map(call => new URL(String(call[0])));
    expect(urls.map(url => url.pathname)).toEqual(['/ISteamUserStats/GetUserStatsForGame/v2/', '/ISteamUserStats/GetPlayerAchievements/v1/', '/ISteamUserStats/GetSchemaForGame/v2/', '/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/']);
    expect(urls.every(url => url.origin === 'https://api.steampowered.com')).toBe(true);
    expect(urls[0].searchParams.get('steamid')).toBe(id);
    expect(urls[0].searchParams.get('appid')).toBe('550');
    expect(urls[2].searchParams.get('l')).toBe('english');
    expect(urls[3].searchParams.get('gameid')).toBe('550');
    expect(urls[3].searchParams.has('key')).toBe(false);
  });
  it('rejects invalid IDs before using the Steam key', async () => {
    const { request, upstream } = setup();
    for (const app of ['0', '-1', '4294967296', '01']) expect((await request('stats', app)).status).toBe(400);
    expect((await request('stats', '550', '123')).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('isolates player/app/resource caches and shares only public metadata between players', async () => {
    const { request, upstream } = setup();
    await request('stats'); await request('stats'); await request('stats', '730');
    await request('achievements'); await request('schema'); await request('schema', '550', '76561198004260199');
    expect(upstream).toHaveBeenCalledTimes(4);
    await request('stats', '550', '76561198004260199');
    expect(upstream).toHaveBeenCalledTimes(5);
  });
  it('counts each new upstream call against the limit', async () => {
    const { request, env } = setup();
    await request('stats'); await request('achievements'); await request('schema'); await request('global'); await request('stats');
    expect(env.STEAM_LIMITER!.limit).toHaveBeenCalledTimes(4);
  });
  it('preserves personal data when schema fails', async () => {
    const { request, upstream } = setup();
    upstream.mockResolvedValueOnce(new Response('unavailable', { status: 500 }));
    expect((await request('schema')).status).toBe(502);
    expect((await request('stats')).status).toBe(200);
  });
  it.each([[400, 'Requested app has no stats', 'unsupported'], [403, 'Profile is not public', 'private']])('recognizes explicit capability response with HTTP %s', async (status, error, reason) => {
    const { request, upstream } = setup();
    upstream.mockResolvedValue(new Response(JSON.stringify({ playerstats: { success: false, error } }), { status: Number(status) }));
    const response = await request('achievements');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'unavailable', reason });
    await request('achievements');
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('does not treat upstream outages as absent capability', async () => {
    const { request, upstream } = setup();
    upstream.mockResolvedValue(new Response(JSON.stringify({ playerstats: { success: false, error: 'Requested app has no stats' } }), { status: 500 }));
    expect((await request('stats')).status).toBe(502);
  });
  it('keeps empty HTTP 400 distinct from unsupported and server failures', async () => {
    const { request, upstream } = setup();
    upstream.mockResolvedValueOnce(new Response('{}', { status: 400 }));
    expect(await (await request('stats')).json()).toEqual({ status: 'unavailable', reason: 'not_exposed' });
    upstream.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect((await request('stats')).status).toBe(502);
  });
});
