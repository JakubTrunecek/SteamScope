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

## Next — Steam integration

- Define stable API contracts and validate SteamID64/app IDs.
- Implement fixed Steam endpoint adapters, timeouts and sanitized errors.
- Profile/library/recently played data, then per-game achievements/schema/stats.
- Distinguish available, empty, private, unsupported and failed responses where evidence permits.
- Add request limits, bounded caching and deployment configuration before public traffic.

## MVP completion

Complete all four screens, loading/empty/error states and accessibility review. Validate with the audited account and other visibility/capability cases. Deploy frontend to GitHub Pages and proxy to Cloudflare Workers.

Excluded from MVP: DB, login, tracking, social and AI features.
