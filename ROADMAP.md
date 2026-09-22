# Roadmap

## 0.0.1 — R-001 Steam API Capability Audit (complete)

Verified the six endpoints listed in API_RESEARCH.md. Findings support achievements and generic Detailed Stats within MVP.

## 0.0.2 — Project Skeleton

- [x] Inspect repository and preserve existing history.
- [x] Record project context, audit results and locked decisions.
- [x] Establish frontend/ and worker/ boundaries and secret exclusions.
- [x] Create React + TypeScript + Vite shell with four MVP routes.
- [x] Create Cloudflare Worker health endpoint and configuration.
- [x] Add reproducible dependency installation and verification commands.
- [x] Verify frontend build, TypeScript and Worker behavior.

This milestone establishes a runnable shell, not live Steam integration or production deployment.

## 0.0.3 — First Live Data (complete locally)

- [x] Shared API contracts and individual SteamID64 validation.
- [x] Fixed Steam adapters, timeouts and sanitized errors.
- [x] Profile, owned library and recently played data.
- [x] Search, sort and links to a game's name and playtime.
- [x] Independent loading, empty, unavailable and error states.
- [x] Request limits and bounded ephemeral cache.
- [x] Live verification: 252 owned games and 4 recently played games.

## 0.0.4 — Game Detail capabilities (complete locally)

- [x] Per-game achievements, global percentages, schema and generic Detailed Stats.
- [x] Distinguish available, empty, private, unsupported and failed responses where evidence permits.
- [x] Preserve actual internal names; only use schema-provided labels.
- [x] Search stats and achievements, filter unlocked/locked, sort stats and expand long lists.
- [x] Verify all five audited stat counts against live data and exercise unsupported/ambiguous responses.

## 0.0.5 — MVP hardening and deployment

- [x] Frontend interaction tests for navigation, focus, search/sort, errors/retry, stale requests and independent game capabilities.
- [x] Route titles, focus management, game-section shortcuts and small-playtime display.
- [x] Pinned GitHub Actions CI and guarded manual Pages deployment workflow.
- [x] Responsive browser review (390px); stack filters and wrap stats to keep values visible.
- [x] Verify CI on GitHub.
- [x] Review production rate-limit namespaces and quota protection (only one deployed Worker; limits are per location).
- [x] Configure GitHub Pages and Cloudflare production secrets; deploy and smoke-test both environments.

## MVP completion

Complete all four screens, loading/empty/error states and accessibility review. Validate with the audited account and other visibility/capability cases. Deploy frontend to GitHub Pages and proxy to Cloudflare Workers.

Excluded from MVP: DB, login, tracking, social and AI features.
