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

## 0.0.6 — Player and library insights

- [x] Most-played games chart and top-five share of known recorded time.
- [x] Library groups: zero time, 1–119 minutes, 120+ minutes, and unknown time.
- [x] Library playtime-group filter combined with search and sorting.
- [x] Recent-time total and chart based on the returned last-two-week data.
- [x] Per-game rare unlocked, latest dated unlocks and rare locked achievement highlights.
- [x] Boundary and missing-data tests; no new API requests, persistence or guessed stat meanings.

## 0.0.7 — Game detail exploration

- [x] Game playtime rank (shared ranks for ties) and share of known library time.
- [x] Achievement sorting by rarity, dated unlocks and names, combined with existing filters.
- [x] Optional zero-stat filter with visible zero/nonzero counts; exact values preserved.
- [x] Missing-data, tie and interaction tests; 75 tests pass.

## 0.0.8 — Filtered exports and achievement drill-down

- [x] Open a specific achievement from a highlight, with keyboard focus on results.
- [x] Global rarity filters: <=1%, <=5%, <=10%, unknown and any rate.
- [x] Reset filters and export all matching stats/achievements in their current order.
- [x] CSV keeps exact numeric values, UTC dates and blank missing metadata; hidden locked descriptions are excluded.
- [x] CSV quoting and formula protection for untrusted labels; no extra API calls or persistence.
- [x] 80 tests and a live CSV download verified.

Profile URL input remains a future usability improvement; the owner prioritized statistics and achievements.

## MVP completion

Complete all four screens, loading/empty/error states and accessibility review. Validate with the audited account and other visibility/capability cases. Deploy frontend to GitHub Pages and proxy to Cloudflare Workers.

Excluded from MVP: DB, login, tracking, social and AI features.

## 0.0.9 — Library achievement collection

- [x] User-triggered batches of five games, paced requests, cancellation and retry of unfinished games.
- [x] Explicit checked/support/unavailable/empty coverage, rarest and latest unlocks, completed and nearly completed games.
- [x] UTC monthly unlock calendar; missing dates excluded, no playtime history inferred.
- [x] Numeric statistic ranges, inclusive unlock date ranges and visible-description search.
- [x] 84 automated tests pass; no persistence or new backend permissions.

## 0.0.10 — Keep exploration context and open calendar days

- [x] Keep completed scan results and calendar selection across route navigation in tab memory (at most three profiles).
- [x] Clear results explicitly; full reload clears memory. No browser storage, DB or tracking.
- [x] Select calendar days to see exact supplied unlock times, labels and game links, including honest empty-day states.
- [x] Bound long daily lists and verify profile isolation, navigation restoration, stale library entries and calendar boundaries.

## 0.0.11 — Community context in Game Detail

- [x] Audit public current-player counts and review summaries on three games.
- [x] Add independent, timestamped community panels with explicit review scope and zero/missing/error states.
- [x] Keep public requests keyless, validate aggregate totals, reuse rate limits and bounded cache.
- [x] 94 automated tests, frontend build and production Worker dry run pass.

## 0.0.12 — Review discovery in Library

- [x] Load public review summaries in explicit, paced batches of five games matching name/playtime filters.
- [x] Sort by positive share and sample size; filter by percentage and minimum review count.
- [x] Show not-loaded, unavailable, zero-review and dated aggregate states separately.
- [x] Preserve up to 500 public game summaries in tab memory, abort on navigation, keep successful rows on errors.
- [x] 97 tests pass, including batch size, rate-limit retry, cancellation and filter boundaries.

## 0.0.13 — Achievement year

- [x] Annual unlock totals, days with unlocks, longest consecutive-day streak and best day.
- [x] Twelve-month chart with keyboard-accessible calendar drill-down and year selection.
- [x] Explicit loaded-game coverage, UTC dates and year-boundary streak semantics; no extra requests.
- [x] 100 tests pass, including leap days, gaps, year boundaries, ties, empty years and focus behavior.

## 0.0.14 - Choose scan size

Achievement and review scans offer 5, 20 or all remaining games, with completed/selected progress. Requests remain paced, errors stop the queue, and cancellation preserves completed games for retry without duplicates. Navigation stops loading. Review results on the current page are retained even beyond 500 games; only the cross-navigation public cache remains capped at 500. Validation: 102 tests and frontend build pass, including twenty-game batches and stop/resume of all remaining games for both scans.

## 0.0.15 - Achievement Explorer

- [x] Browse all achievements in loaded games, preserving per-game identities.
- [x] Combine game, name, unlock state, global rarity and inclusive UTC date filters.
- [x] Order by name, game, rarity or latest unlock; quick views for rarest and latest unlocks.
- [x] Render 30 rows at a time and export every matching row in the current order.
- [x] Keep unknown metadata explicit, protect CSV formulas and make no additional API requests.
- [x] 105 tests and frontend production build pass, including cross-game name collisions, filter combinations, focus, missing dates and full-result export.
