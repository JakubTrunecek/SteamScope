# SteamScope project context

Steam profile, library and game statistics explorer.

## Current milestone

- 0.0.1 / R-001 Steam API Capability Audit: complete.
- 0.0.2 Project Skeleton: complete locally; not deployed. Four frontend routes, health-only Worker, workspace lockfile and verification scripts are ready.
- 0.0.3 First Live Data: implemented and verified locally. Profile, library, recently played, library search/sort and basic game information use real Steam data. Skeleton commits were pushed to GitHub.
- 0.0.4 Game Detail capabilities: implemented and verified locally, including achievements, global rates, schema labels and generic Detailed Stats.
- 0.0.5 MVP hardening: frontend interaction tests, route focus/title improvements and GitHub Actions workflows implemented. Cloudflare Worker and GitHub Pages are deployed; production smoke checks passed on 2026-09-22.
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

0.0.5 adds eight frontend interaction tests (67 tests total). Test suites use synthetic data and do not require secrets. Both GitHub CI and manual Pages publication passed. See DEPLOYMENT.md for the deployment procedure.

## Production verification (2026-09-22)

- Frontend: https://jakubtrunecek.github.io/SteamScope/
- API: https://steamscope-api-production.steamscope-worker.workers.dev
- Repository is public with owner approval. Pages publishes the built frontend through GitHub Actions.
- Steam API key is stored as a Cloudflare Worker secret. A scan found no local key in tracked/publishable source or build artifacts.
- Production returned 252 owned games; L4D2 returned 317 stats and 101 achievements, 26 unlocked. Profile, library search, game navigation and direct game URL refresh passed in the browser.
- Health and approved-origin CORS passed; invalid SteamID returned 400 and an unapproved Origin returned 403.
- Cloudflare dashboard lists one application, steamscope-api-production; no other deployed Worker shares the configured rate-limit namespaces. Limits remain per location and are not a global quota guarantee.
- Responsive review at 390px found narrow library search and horizontal stat-table scrolling; mobile controls now stack and stat names wrap to keep values visible.

## 0.0.6 — Player insights (2026-09-22)

Added top-five playtime charts, concentration of recorded playtime, explicit playtime groups and library filters, recent-time distribution, and per-game achievement highlights. Unknown time and missing global rates are excluded from calculations, not interpreted as zero. Latest unlocks require positive supplied timestamps; rarity is not a difficulty score. All calculations reuse existing responses without additional Steam calls.

72 automated tests pass (59 Worker, 13 frontend). Local live review found 102 zero-time games, 58 games with 1–119 minutes and 92 with at least 120 minutes; top five represented 37% of recorded time. Values are snapshots, not historical tracking.

## 0.0.7 — Game detail exploration

Game Detail now shows the game rank and share of known library playtime. Equal times share a rank; zero-time games are not ranked and unknown time is excluded. Achievement lists support rarity, latest dated unlock and name sorting, with unknown metadata last. Detailed Stats can hide zero values; negative and fractional values remain intact. All features reuse existing responses.

75 tests pass (59 Worker and 16 frontend). Local live L4D2 checks: rank 18, 1.4% playtime share, 315 of 317 stats after hiding zero values; rare-unlocked sorting begins with Valve Gift Grab 2011 at 6.9%.

## 0.0.8 — Filtered exports and achievement drill-down

The owner prioritized statistics and achievements. Added exact-name drill-down from highlights, inclusive global rarity filters, reset controls and client-side CSV downloads of all matching rows (not only the visible page). Unknown rates are separate from 0%. CSV excludes hidden locked descriptions, keeps missing values blank and uses UTC dates. Spreadsheet formula-like text is prefixed with an apostrophe for safe import; numeric values retain their exact JavaScript representation. No data is uploaded by export and no new Steam calls are added.

80 tests pass (59 Worker, 21 frontend), including quoting, numeric precision, hidden descriptions, filter combinations and exporting beyond the first page. Local live L4D2 review returned 8 locked achievements at <=1% global unlock rate; a downloaded one-achievement CSV was checked.

## 0.0.9 — Achievement collection

Overview now offers on-demand batches of five games ordered by recorded playtime. Existing achievement/schema/global routes are requested sequentially with 2.5 seconds between calls. Stop aborts in-flight work; prior completed games remain until navigation/reload. Errors stop the batch and the unfinished game is retried on continuation. Unavailable/empty lists are distinct from supported games. Global rarity excludes missing percentages; 0 remains valid. The calendar counts positive supplied unlock dates in UTC, with undated unlocks disclosed separately. No DB, login or tracking added. Detailed filters also support numeric ranges and inclusive UTC dates. Validation: 84 tests plus production frontend build.

## 0.0.10 — Calendar drill-down and tab memory

Completed collection results and selected month/day now survive route navigation for up to three profiles in the current tab. The cache is memory-only and bounded; reload or explicit Clear loaded results discards it. Returning to Overview does not restart achievement calls. Games absent from the freshly returned library are dropped. Leaving Overview still aborts the unfinished scan. Calendar day buttons expose selected state and open a labelled region of dated unlocks with game links and UTC times; lists reveal 30 rows at a time. No API changes or new secrets. Validation: 86 tests pass, including cache isolation/eviction, remount restoration, clear, missing dates and UTC leap-day boundaries.
