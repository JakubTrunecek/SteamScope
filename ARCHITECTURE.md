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

`GET /api/health` returns `{ "status": "ok", "service": "steamscope-worker" }` without credentials.

0.0.3 implements `GET /api/players/:steamId/profile`, `/library`, and `/recent`. Types and individual SteamID64 validation are shared in `shared/api.ts`. Profile uses GetPlayerSummaries v2; library and recent use IPlayerService v1 with input_json. Upstream host is fixed to `https://api.steampowered.com`. Caller query strings are rejected. Manual redirect mode plus non-2xx rejection prevents forwarding credentials on redirects. Requests time out after 8 seconds, including body consumption. Errors expose only stable codes; no upstream response bodies, URLs or exception messages.

Responses use a discriminated `status` (`available` / `unavailable`). Missing games and count mean private-or-unavailable; an explicit zero count means empty. Malformed or inconsistent responses fail with 502 instead of fabricating data. Missing playtime is null; zero remains zero. Profile visibility does not determine game-details visibility. Profile/library/recent requests are independent so one failure does not hide successful sections.

## Request protection and cache

CORS uses one explicit frontend origin; it is not authentication. Cloudflare REQUEST_LIMITER allows 30 requests/minute per connecting IP, including cache hits. STEAM_LIMITER allows 60 upstream calls/minute per location across all clients. Anonymous access has no stable user identity; shared-IP users share the request allowance. Missing bindings fail closed. These are approximate per-location limits, not a global quota. Confirm namespace IDs are unique before deployment and evaluate global quota protection before wider public traffic.

An isolate-local in-memory cache stores normalized successful available responses for 60 seconds, at most 100 entries. At most 20 distinct upstream requests may be pending; identical requests share a promise. Errors and ambiguous/private results are not cached. This cache is ephemeral (no DB, persisted history or tracking). Privacy changes may take up to the TTL to be reflected. Browser responses use `Cache-Control: no-store`. Worker observability is disabled and application code does not log upstream requests or credentials.

## Data model

Detailed stat: internal `name`, numeric `value`, optional schema-provided `displayName`. No semantic guessing or game-specific property names. Preserve zero as a legitimate value.

Achievements and stats have independent per-game capability states. A failed request is not proof of unsupported capability. Private data is not an empty library. Aggregate achievement completion across all owned games is not an MVP metric.

## References

- [Vite guide](https://vite.dev/guide/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Steam IPlayerService](https://partner.steamgames.com/doc/webapi/IPlayerService)
- [Steam ISteamUser](https://partner.steamgames.com/doc/webapi/ISteamUser)
- [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
