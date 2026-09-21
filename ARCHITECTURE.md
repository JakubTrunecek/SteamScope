# Architecture

## Boundaries

Browser → React/TypeScript/Vite frontend (GitHub Pages) → Cloudflare Worker → Steam Web API.

- `frontend/`: static UI; only the public Worker base URL is configurable.
- `worker/`: request validation, fixed upstream endpoint selection, secret access and response normalization.
- No database, authentication system or collection of historical user activity.
- Use hash routes and Vite base `/SteamScope/` so direct navigation works on GitHub Pages without server rewrite rules.

## Secret handling

`STEAM_API_KEY` is a Cloudflare Worker secret, set with Wrangler's secret command. Local Worker secrets may be stored in ignored `.dev.vars` files. Never use `VITE_` for secrets. Do not log upstream request URLs, raw upstream errors or secret values. Git exclusions are a guardrail, not permission to put secrets into tracked files.

## API evolution

Skeleton: `GET /api/health` returns `{ "status": "ok", "service": "steamscope-worker" }`. No Steam requests in this milestone.

Integration: allowlisted routes only, never an arbitrary URL proxy. Validate identifiers server-side. CORS uses an explicit allowed frontend origin; CORS is not authentication or abuse prevention. Add rate limiting and cache policy before public Steam endpoints go live. Translate upstream failures into stable client errors without leaking details.

## Data model

Detailed stat: internal `name`, numeric `value`, optional schema-provided `displayName`. No semantic guessing or game-specific property names. Preserve zero as a legitimate value.

Achievements and stats have independent per-game capability states. A failed request is not proof of unsupported capability. Private data is not an empty library. Aggregate achievement completion across all owned games is not an MVP metric.

## References

- [Vite guide](https://vite.dev/guide/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
