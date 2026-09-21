# SteamScope
Steam profile, library and game statistics explorer

## Status

0.0.2 Project Skeleton. R-001 audit is complete; this shell does not fetch live Steam data yet.

## Local development

Requires Node.js 22.12+ and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
```

Copy `frontend/.env.example` to `frontend/.env.local`. It contains only the public Worker URL. Run these in separate terminals:

```sh
pnpm dev:worker
pnpm dev:frontend
```

Open `http://localhost:5173/SteamScope/`. Worker health: `http://localhost:8787/api/health`. No Steam key is needed for the skeleton.

Routes:

- `#/` — Home
- `#/profile/76561198004260198` — Profile Overview
- `#/profile/76561198004260198/library` — Library
- `#/profile/76561198004260198/game/550` — Game Detail

The ID in these examples is the audit account, not an automatically loaded default profile. Screens explicitly show that live data has not been loaded.

## Verification

```sh
pnpm check
pnpm worker:dry-run
```

## Deployment preparation

Frontend output: `frontend/dist`. GitHub Pages must serve it at `/SteamScope/`. Set public `VITE_API_BASE_URL` to the deployed Worker origin at build time. No deployment has been performed by this milestone.

For the production Worker, run from `worker/`:

```sh
pnpm exec wrangler secret put STEAM_API_KEY --env production
pnpm exec wrangler deploy --env production
```

Enter the key through Wrangler's prompt; never paste it into a command, source file or frontend variable. The production origin is configured as `https://jakubtrunecek.github.io`. Local Steam integration may later use an ignored `worker/.dev.vars` file. Health works without credentials. Public Steam routes require rate-limit/cache decisions before implementation and deployment.

## Project documentation

- [Project context](docs/PROJECT_CONTEXT.md)
- [Roadmap](ROADMAP.md)
- [Architecture](ARCHITECTURE.md)
- [API research](API_RESEARCH.md)
- [Decisions](DECISIONS.md)
