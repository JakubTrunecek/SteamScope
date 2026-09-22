# SteamScope
Steam profile, library and game statistics explorer

## Status

0.0.6 Player insights. Profile, library, recently played games, achievements and generic Detailed Stats use live Steam data through the Worker. Automated frontend and Worker checks plus GitHub Pages deployment workflow are available. Production status is tracked in docs/PROJECT_CONTEXT.md.

Game Detail shows unlocked/locked achievements, unlock dates when supplied, schema descriptions and global unlock percentages. Progress belongs only to the selected game's returned achievements. Detailed Stats preserve exact internal names and numeric values; labels are added only on an exact schema-name match. Search, filters and progressive list expansion keep long lists usable. Failures in labels or global percentages do not hide player data.

Live app: [SteamScope](https://jakubtrunecek.github.io/SteamScope/).

The profile now shows top games, their share of recorded playtime, explicit library playtime groups and recent activity charts. Library filters use the same visible boundaries. Game Detail highlights rare unlocked achievements, latest dated unlocks and rare locked achievements using available per-game data.

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

Open `http://localhost:5173/SteamScope/`. Worker health: `http://localhost:8787/api/health`.

For live Steam data, create `worker/.dev.vars` locally, enter `STEAM_API_KEY=` followed by your own key, and save. This file is ignored by Git. Restart the Worker if it does not reload the secret automatically. Never share the file, commit it, or place the key in a `VITE_` variable. Health works without a key; data endpoints return a configuration error when it is missing.

Routes:

- `#/` — Home
- `#/profile/76561198004260198` — Profile Overview
- `#/profile/76561198004260198/library` — Library
- `#/profile/76561198004260198/game/550` — Game Detail

The ID in these examples is the audit account, not an automatically loaded default profile. Profile sections load independently. Library supports search, sorting and navigation to a game. Private/ambiguous, empty, loading and error states are separate.

## Verification

```sh
pnpm check
pnpm worker:dry-run
```

## Deployment preparation

See [deployment guide](docs/DEPLOYMENT.md) for GitHub Actions verification, production authentication, secrets, Pages publication and smoke checks.

Frontend output: `frontend/dist`. GitHub Pages must serve it at `/SteamScope/`. Set public `VITE_API_BASE_URL` to the deployed Worker origin at build time. Production URLs and verification results are recorded in docs/PROJECT_CONTEXT.md.

For the production Worker, run from `worker/`:

```sh
pnpm exec wrangler secret put STEAM_API_KEY --env production
pnpm exec wrangler deploy --env production
```

Enter the key through Wrangler's prompt; never paste it into a command, source file or frontend variable. The production origin is configured as `https://jakubtrunecek.github.io`. Local `.dev.vars` secrets are not deployed. Before production, confirm that rate-limit namespace IDs 1001 and 1002 are unused by other Workers on the account. Current limits are per Cloudflare location and do not provide a global Steam quota guarantee. See ARCHITECTURE.md for limits and cache policy.

## Project documentation

- [Project context](docs/PROJECT_CONTEXT.md)
- [Roadmap](ROADMAP.md)
- [Architecture](ARCHITECTURE.md)
- [API research](API_RESEARCH.md)
- [Decisions](DECISIONS.md)
