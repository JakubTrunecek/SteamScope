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
