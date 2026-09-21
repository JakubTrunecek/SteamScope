import { describe, expect, it } from 'vitest';
import worker from '../src/index';

const env = { ALLOWED_ORIGIN: 'http://localhost:5173', STEAM_API_KEY: 'test-only-sentinel' };
const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://worker.test${path}`, init), env);

describe('Worker boundary', () => {
  it('reports health without exposing environment values', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'steamscope-worker' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('allows the configured browser origin', async () => {
    const response = await request('/api/health', { headers: { Origin: env.ALLOWED_ORIGIN } });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(env.ALLOWED_ORIGIN);
  });
  it('rejects other origins without granting CORS access', async () => {
    const response = await request('/api/health', { headers: { Origin: 'https://other.test' } });
    expect(response.status).toBe(403);
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
  });
  it('supports preflight', async () => {
    const response = await request('/api/health', { method: 'OPTIONS', headers: { Origin: env.ALLOWED_ORIGIN } });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });
  it('rejects unknown routes and unsupported methods', async () => {
    expect((await request('/api/proxy?url=https://example.com')).status).toBe(404);
    const response = await request('/api/health', { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});
