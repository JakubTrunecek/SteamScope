export interface Env {
  ALLOWED_ORIGIN: string;
  STEAM_API_KEY?: string;
}

export default {
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
    if (new URL(request.url).pathname !== '/api/health') return json({ error: 'not_found' }, 404);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'GET') {
      headers.set('Allow', 'GET, OPTIONS');
      return json({ error: 'method_not_allowed' }, 405);
    }
    return json({ status: 'ok', service: 'steamscope-worker' });
  },
};
