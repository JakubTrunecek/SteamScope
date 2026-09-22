// Only the public Worker origin is allowed as frontend deployment configuration.
try {
  const url = new URL(process.env.VITE_API_BASE_URL ?? '');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
  if (Object.keys(process.env).some(name => name.startsWith('VITE_') && name !== 'VITE_API_BASE_URL')) throw new Error();
  const response = await fetch(new URL('/api/health', url), {
    headers: { Origin: 'https://jakubtrunecek.github.io' }, redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'ok' || body.service !== 'steamscope-worker' || response.headers.get('Access-Control-Allow-Origin') !== 'https://jakubtrunecek.github.io') throw new Error();
  console.log('Production Worker origin, health and CORS verified.');
} catch {
  console.error('Production check failed: supply a healthy HTTPS workers.dev origin configured for the GitHub Pages origin. Only VITE_API_BASE_URL is permitted.');
  process.exitCode = 1;
}
