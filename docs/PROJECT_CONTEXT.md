# SteamScope project context

Steam profile, library and game statistics explorer.

## Current milestone

- 0.0.1 / R-001 Steam API Capability Audit: complete.
- 0.0.2 Project Skeleton: complete locally; not deployed. Four frontend routes, health-only Worker, workspace lockfile and verification scripts are ready.
- 0.0.3 First Live Data: implemented and verified locally. Profile, library, recently played, library search/sort and basic game information use real Steam data. Skeleton commits were pushed to GitHub.
- 0.0.4 Game Detail capabilities: implemented and verified locally, including achievements, global rates, schema labels and generic Detailed Stats.
- 0.0.5 MVP hardening: frontend interaction tests, route focus/title improvements and GitHub Actions workflows implemented. Production deployment is in progress and is not yet verified.
- Source: owner handoff on 2026-09-21; original raw audit responses are not in this repository.

## Locked MVP

Home, Profile Overview, Library and Game Detail. Game Detail includes achievements and Detailed Stats where available. React + TypeScript + Vite on GitHub Pages; Cloudflare Worker as the only Steam API gateway. No database, login, tracking, social features or AI.

Steam API keys belong exclusively in server-side secrets. Never place them in Git, frontend environment variables, URLs exposed to clients, fixtures or logs.

## Product rules

- Stats use a generic model; no hardcoded kills/deaths or other game-specific fields.
- Preserve internal stat names; do not infer their meaning.
- Use schema display labels only when actually supplied by Steam.
- Achievements are a per-game capability, not a universal library progress metric.
- Missing/private/unavailable data must not become a zero value or an unsupported claim.

See [roadmap](../ROADMAP.md), [architecture](../ARCHITECTURE.md), [research](../API_RESEARCH.md) and [decisions](../DECISIONS.md).

## Verification (2026-09-21)

TypeScript checks, five Worker boundary tests and the frontend production build passed. Wrangler dry-run passed; local browser smoke checks covered input validation, all four routes and successful Worker health connection. Steam endpoints were not called and no API key was needed.

0.0.3 adds adapter/cache/timeout/validation tests and live Worker checks. The audit account returned 252 games, a public profile and 4 recently played games. A local ignored `worker/.dev.vars` supplies the key; never read or print it during routine context recovery. No secret is needed for automated tests.

0.0.4 live checks matched all five audited stat counts. Left 4 Dead 2 returned 317 stats and 101 achievements (26 unlocked). Browser checks covered exact-name labels, the unlocked filter (26 matches), empty stat search and expansion from 50 to 100 stat rows. Max Payne demonstrated distinct unsupported achievements and ambiguous unavailable stats. Test fixtures cover privacy, malformed data, cache isolation and independent failures.

0.0.5 adds eight frontend interaction tests (67 tests total). Test suites use synthetic data and do not require secrets. Cloudflare device authentication succeeded, but initial deployment lacked script/route OAuth scopes; do not assume production is live. See DEPLOYMENT.md for the deployment procedure.
