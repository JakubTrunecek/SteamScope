# Decisions

Decisions D-001 through D-007 are locked by the owner handoff (2026-09-21).

| ID | Decision | Rationale / consequence |
| --- | --- | --- |
| D-001 | React + TypeScript + Vite | Static frontend with typed application code. |
| D-002 | GitHub Pages frontend; Cloudflare Worker proxy | Steam credentials stay server-side. |
| D-003 | Home, Profile Overview, Library, Game Detail | Bounded MVP navigation. |
| D-004 | Detailed Stats stay in MVP | R-001 found stats for 183 of 252 owned games. |
| D-005 | Generic stats; no hardcoded game metrics | Preserve returned names/values; use real schema labels only. |
| D-006 | Achievements are a per-game capability | No universal library achievement progress metric. |
| D-007 | No DB, login, tracking, social or AI in MVP | Keep the initial product focused. |

## Skeleton implementation choices

- D-008: Hash navigation and `/SteamScope/` asset base for GitHub Pages compatibility.
- D-009: Separate frontend and Worker packages in a pnpm workspace with a shared lockfile.
- D-010: Health-only Worker initially. Steam adapters follow after contracts and error states are defined.

## 0.0.3 implementation choices

- D-011: Independent profile, library and recent endpoints with shared response types. Partial failure preserves successful sections.
- D-012: GetOwnedGames includes app information and played free games. Use exact returned counts, not a fixed audit count.
- D-013: Missing game counts are ambiguous unavailable data; only explicit zero counts establish an empty result. Missing playtime is null.
- D-014: 8-second upstream timeout; no redirects; bounded 60-second isolate cache; Cloudflare rate-limit bindings. No persistent storage or logs of upstream credentials. Limits are per location, not a global quota.
- D-015: 0.0.3 covers first live data. Per-game achievements and Detailed Stats are the next milestone, 0.0.4, and remain in MVP.

## 0.0.4 implementation choices

- D-016: Independent per-game endpoints for player achievements, player stats, schema and global percentages. Metadata failures cannot erase player results.
- D-017: Join labels and global rates by exact internal name. Keep unmatched names and values; never fill missing player stats with schema defaults.
- D-018: Only explicit Steam failures establish private/unsupported states. An empty 400 response is ambiguous not-exposed data; outages remain errors.
- D-019: Achievement progress uses only the selected game's returned player list. Unknown unlock dates are null. Hidden locked descriptions remain concealed in the UI.
- D-020: Player caches include app and player; public metadata caches include app. One request token per actual upstream call, even when the detail loads several independent sections.
