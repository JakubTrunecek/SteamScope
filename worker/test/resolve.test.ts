import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index';
const id = '76561198004260198';
const limiter = { limit: async () => ({ success: true }) };
const env = { ALLOWED_ORIGIN: 'https://site.test', STEAM_API_KEY: 'test-only-key', REQUEST_LIMITER: limiter, STEAM_LIMITER: limiter };
it('resolves only individual vanity profiles at a fixed endpoint and caches successful results', async () => {
 const upstream = vi.fn(async () => new Response(JSON.stringify({ response: { success: 1, steamid: id } })));
 const worker = createWorker(upstream);
 for (let n=0;n<2;n++) expect(await (await worker.fetch(new Request('https://worker.test/api/resolve/Example_1'), env)).json()).toEqual({ status: 'available', steamId: id });
 expect(upstream).toHaveBeenCalledTimes(1);
 const [url, options] = upstream.mock.calls[0] as unknown as [string, RequestInit];
 expect(new URL(url).origin).toBe('https://api.steampowered.com');
 expect(new URL(url).pathname).toBe('/ISteamUser/ResolveVanityURL/v1/');
 expect(new URL(url).searchParams.get('url_type')).toBe('1');
 expect(new URL(url).searchParams.get('vanityurl')).toBe('Example_1');
 expect(options.redirect).toBe('manual');
});
it.each([{ success: 42 }, { success: 1, steamid: 'bad' }, { success: 9 }, null])('distinguishes missing and malformed responses: %j', async response => {
 const worker = createWorker(vi.fn(async () => new Response(JSON.stringify({ response }))));
 const result = await worker.fetch(new Request('https://worker.test/api/resolve/example'), env);
 expect(result.status).toBe(response?.success === 42 ? 200 : 502);
 expect(await result.json()).toEqual(response?.success === 42 ? { status: 'unavailable', reason: 'not_found' } : { error: 'invalid_steam_response' });
});
it('rejects invalid aliases, query injection, foreign origins and request limits before upstream', async () => {
 const upstream = vi.fn(); const worker = createWorker(upstream);
 for (const path of ['/api/resolve/%2F', '/api/resolve/'+'a'.repeat(65), '/api/resolve/name?url=https://evil.test']) expect((await worker.fetch(new Request('https://worker.test'+path), env)).status).toBe(400);
 expect((await worker.fetch(new Request('https://worker.test/api/resolve/name', { headers: { Origin: 'https://evil.test' } }), env)).status).toBe(403);
 expect((await worker.fetch(new Request('https://worker.test/api/resolve/name'), { ...env, REQUEST_LIMITER: { limit: async () => ({ success: false }) } })).status).toBe(429);
 expect(upstream).not.toHaveBeenCalled();
});
it('sanitizes upstream errors containing credentials', async () => {
 const worker = createWorker(vi.fn(async () => { throw new Error(env.STEAM_API_KEY); }));
 const result = await worker.fetch(new Request('https://worker.test/api/resolve/name'), env);
 expect(await result.text()).toBe('{"error":"steam_unavailable"}');
});
