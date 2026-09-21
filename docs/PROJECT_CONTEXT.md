# SteamScope project context

Steam profile, library and game statistics explorer.

## Current milestone

- 0.0.1 / R-001 Steam API Capability Audit: complete.
- 0.0.2 Project Skeleton: complete locally; not deployed. Four frontend routes, health-only Worker, workspace lockfile and verification scripts are ready.
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
