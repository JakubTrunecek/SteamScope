import { isAppId, isSteamId } from '../../shared/api';
import { ApiError, fetchSteam, type Resource } from './steam';

interface Limiter { limit(input: { key: string }): Promise<{ success: boolean }> }
export interface Env {
  ALLOWED_ORIGIN: string;
  STEAM_API_KEY?: string;
  REQUEST_LIMITER?: Limiter;
  STEAM_LIMITER?: Limiter;
}

export function createWorker(upstream: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expires: number; body: unknown }>();
  const pending = new Map<string, Promise<unknown>>();
  return {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && origin !== env.ALLOWED_ORIGIN) return json({ error: 'origin_not_allowed' }, 403);
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    const url = new URL(request.url);
    const health = url.pathname === '/api/health';
    const match = /^\/api\/players\/([^/]+)\/(profile|library|recent)$/.exec(url.pathname);
    const gameMatch = /^\/api\/players\/([^/]+)\/games\/([^/]+)\/(stats|achievements|schema|global)$/.exec(url.pathname);
    if (!health && !match && !gameMatch) return json({ error: 'not_found' }, 404);
    if (url.search) return json({ error: 'unexpected_query' }, 400);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'GET') {
      headers.set('Allow', 'GET, OPTIONS');
      return json({ error: 'method_not_allowed' }, 405);
    }
    if (health) return json({ status: 'ok', service: 'steamscope-worker' });
    const steamId = (match ?? gameMatch)![1];
    const resource = (match ? match[2] : gameMatch![3]) as Resource;
    const appId = gameMatch?.[2];
    if (!isSteamId(steamId)) return json({ error: 'invalid_steam_id' }, 400);
    if (appId !== undefined && !isAppId(appId)) return json({ error: 'invalid_app_id' }, 400);
    if (!env.STEAM_API_KEY?.trim() || !env.REQUEST_LIMITER || !env.STEAM_LIMITER) return json({ error: 'not_configured' }, 503);
    try {
      const client = request.headers.get('CF-Connecting-IP') ?? 'local';
      if (!(await env.REQUEST_LIMITER.limit({ key: client })).success) throw new ApiError('rate_limited', 429);
      const cacheKey = resource === 'schema' || resource === 'global' ? `${resource}:${appId}` : `${resource}:${steamId}:${appId ?? ''}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > now()) return json(cached.body);
      cache.delete(cacheKey);
      let operation = pending.get(cacheKey);
      if (!operation) {
        if (pending.size >= 20) throw new ApiError('rate_limited', 429);
        operation = (async () => {
          if (!(await env.STEAM_LIMITER!.limit({ key: 'all-steam-requests' })).success) throw new ApiError('rate_limited', 429);
          const body = await fetchSteam(resource, steamId, env.STEAM_API_KEY!, upstream, appId);
          if (body.status === 'available') {
            if (cache.size >= 100) cache.delete(cache.keys().next().value!);
            cache.set(cacheKey, { expires: now() + 60000, body });
          }
          return body;
        })();
        pending.set(cacheKey, operation);
      }
      try { return json(await operation); }
      finally { if (pending.get(cacheKey) === operation) pending.delete(cacheKey); }
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError('steam_unavailable', 502);
      if (safe.status === 429) headers.set('Retry-After', '60');
      return json({ error: safe.code }, safe.status);
    }
  },
  };
}
export default createWorker();
