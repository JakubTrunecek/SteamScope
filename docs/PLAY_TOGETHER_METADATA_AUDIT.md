# Play Together metadata audit

Date: 2026-10-28 (Europe/Prague). Status: initial research complete; implementation and deployment not started. This document supports, but does not replace, the locked plan in PLAY_TOGETHER_PLAN.md.

## Decision summary

**Proceed to a reviewable screen proposal and a guarded metadata prototype, not straight to production recommendations.** Exact-AppID library intersection and Steam-store-labelled online co-op filtering are feasible with current evidence. Rich taste matching (roguelike, deckbuilding, survival, etc.) and exact two-player capacity are not established by the sampled metadata source. Do not silently reduce these promised capabilities to broad genre matching or claim a guaranteed playable session.

Main proposed source: fixed, keyless `https://store.steampowered.com/api/appdetails?appids=<id>&l=english&cc=us`. It is a first-party Store endpoint observed to work, **not an assured supported public Steam Web API contract**. Its schema, availability, regional behavior, rate ceiling and permission/terms treatment require explicit engineering/product acceptance before production dependence. No documented appdetails contract was found in the first-party Web API references examined; that is a bounded research result, not proof no documentation exists anywhere.

## Existing architecture reviewed

- React/TypeScript hash routes, current profile ID in the route, Worker-only fixed upstream requests.
- `Game` exposes AppID, name, nullable total/recent minutes. Profile and library requests already distinguish unavailable data from empty results.
- `useApi` currently refetches per mount. A requirement to reuse the already loaded first library needs deliberate context/cache work; it is not already a universal shared profile context.
- Existing `worker/src/community.ts` supplies a suitable fixed-host, keyless, 8-second timeout and sanitized-error pattern.
- Existing Worker cache: isolate-local, 60 seconds, max 100 successes; pending map capped at 20. Request limiter: 30/minute per IP; upstream limiter: 60/minute per location. These are project settings, not Steam quotas.
- No DB, saved history, login, social linking or preference persistence. Never read or transfer `.dev.vars` for this audit. No key was used in live probes.

## First-party evidence

1. [Steam Tags](https://partner.steamgames.com/doc/store/tags): tags cover genre/subgenre, presentation, themes, mechanics and player support. Developers, players and moderators contribute them, and weights may change. This is why broad genres alone are insufficient for the user's roguelike/indie taste. It does **not** document a supported bulk consumer tag API.
2. [IStoreService](https://partner.steamgames.com/doc/webapi/IStoreService): documented GetAppList gives catalog identity/change information. The fields described are not a replacement for per-title gameplay features, tag vectors or player capacity.
3. [Applications](https://partner.steamgames.com/doc/store/application): AppIDs identify applications; demos and DLC can have separate AppIDs from their parent game.
4. [Packages](https://partner.steamgames.com/doc/store/application/packages): a package grants a collection of applications/depots. A package/edition name is not an application identity or proof that two users share identical playable content.
5. [Steam Web API Terms](https://steamcommunity.com/dev/apiterms): describe conditional access/data distribution, end-user-requested retrieval, storage/privacy disclosures, confidential keys and a 100,000-call daily Web API limit. They also permit service changes/termination and provide data as-is. These terms are relevant baseline evidence, **not a conclusion that an undocumented Store endpoint is covered or licensed identically**. No appdetails-specific allowance, cache retention rule or numeric Store throttle was established. No legal assurance is being given.
6. [Web API overview](https://partner.steamgames.com/doc/webapi_overview): official reference for documented API use; do not conflate that public API with observed Store endpoints.

## Bounded live probes

Seven successful, sequential appdetails requests were made without credentials, at least 2.5 seconds apart, with a 12-second per-probe timeout. Language was English and country US. Earlier non-escalated attempts failed before useful network results and are not API availability evidence. Only selected metadata was printed; no user profile was fetched. No app source code was changed.

All seven successful responses were `type=game`, and none contained a numeric session-player capacity field or a user-tag vector. Observed feature categories:

| AppID | Returned title | Relevant Store category IDs | Interpretation allowed |
|---|---|---|---|
| 892970 | Valheim | 1, 9, 38 | Store lists online co-op. Exact group size not verified. |
| 686200 | Door Kickers: Action Squad | 1, 9, 38, 39, 44 | Store separately lists online co-op, local/split co-op and Remote Play Together. |
| 646570 | Slay the Spire | 2; no 38 | No online co-op label in this response. **Not Slay the Spire 2.** |
| 1248130 | Farming Simulator 22 | 1, 9, 38, 27 | Online co-op listed; cross-platform label is not a detailed platform compatibility matrix. |
| 448510 | Overcooked | 1, 9, 39, 44; no 38 | Local co-op / Remote Play Together must not be admitted as native online co-op. |
| 1238840 | Battlefield 1 | 1, 49, 36; no 38 | Online PvP must not be admitted as online co-op. |
| 228380 | Wreckfest | 1, 49, 36; no 38 | A second online-PvP contrast case. |

Reproduce with the fixed Store endpoint above and one AppID at a time. Primary product links: [Valheim](https://store.steampowered.com/app/892970/), [Door Kickers](https://store.steampowered.com/app/686200/), [Slay the Spire](https://store.steampowered.com/app/646570/), [FS22](https://store.steampowered.com/app/1248130/), [Overcooked](https://store.steampowered.com/app/448510/), [Battlefield 1](https://store.steampowered.com/app/1238840/), [Wreckfest](https://store.steampowered.com/app/228380/).

Observed category mapping (evidence from this sample, not an immutable documented enumeration): 1 Multiplayer; 2 Single-player; 9 Co-op; 36 Online PvP; 37 Shared/Split Screen PvP; 38 Online Co-op; 39 Shared/Split Screen Co-op; 44 Remote Play Together; 49 PvP. Preserve raw IDs and labels. Add fixtures and mapping version; unknown categories must not be guessed. A positive category is a Store declaration, not a live multiplayer connectivity test. Missing category means not listed in the available snapshot, not a definitive unsupported capability.

Genres are very broad: Slay the Spire returned Indie/Strategy, with no roguelike/deckbuilding detail; Valheim returned Action/Adventure/Indie/RPG. Matching all these titles via Indie would produce weak recommendations. Do not call broad-genre overlap a verified match for a specific mechanic.

## Unknowns and handling

- **Two-player capacity:** no structured minimum/maximum count found. Online co-op implies some cooperative online support, but does not prove a private two-person session, minimum lobby size, campaign support or absence of extra services. Keep `playerCapacity: null` unless a separately verified first-party source establishes it. With a strict numeric-capacity requirement, unknown games stay outside verified-capacity results. If the reviewed product instead permits Store-listed online co-op candidates, prominently say group size unverified; this is a product decision, not silent fallback.
- **Tags/taste:** no tag vector in appdetails responses. Further investigate a stable permitted first-party tag source; do not scrape Store HTML as an unannounced production dependency. Explicit favorites can immediately boost the same game and explain broad genre overlap, but cannot unlock rich cross-title taste inference without suitable metadata.
- **Type/availability:** `success=false` or absent metadata must remain unavailable, not single-player or false ownership. Explicit non-game types should be excluded from game recommendations. Test DLC/demo/software and unavailable samples before release; those cases were not live-probed here.
- **Editions:** intersect exact AppIDs only. Do not merge similar names, remasters, different base applications or demos. Same AppID still does not certify matching DLC, branches, mods, cross-platform arrangements or working servers.
- **Library semantics:** present `returned in both visible libraries`, not an entitlement or installation guarantee. Zero recorded time does not establish that a title was never played.
- **Art:** header/capsule URLs exist, but reuse terms and acceptable CDN hosts were not separately verified. Prototype can use a neutral cover placeholder; never fetch an arbitrary metadata URL server-side.
- **Region:** US probe data is not universal. Avoid prices/purchase advice in V1. Surface metadata unavailable rather than implying a removed/region-restricted game is unowned.

## Proposed minimal metadata contract (for review, not implemented)

`GET /api/games/:appId/metadata`, fixed query internally, no client URLs or arbitrary query passthrough. Response union: `available` with normalized metadata; `unavailable` with not-exposed reason; existing safe HTTP error codes for malformed data, limits and upstream failure.

Available data fields: `appId`, `name`, `appType`, nullable `genres: {id,label}[]`, nullable `categories: {id,label}[]`, `source: steam_store_appdetails`, fixed first-party `sourceUrl`, `fetchedAt` UTC milliseconds, `mappingVersion`. Derived feature evidence should distinguish `listed`, `not_listed` and `unknown`; only listed category 38 qualifies as Store-listed online co-op. Keep `playerCapacity: null` in this first adapter. No fabricated tags, confidence percentages or guarantee of playability. Missing arrays differ from explicit empty arrays. Validate returned steam_appid equals the requested ID; reject malformed records and bound arrays/strings.

Request/caching proposal: retain existing guards; queue only common AppIDs initially, deduplicate requests, pace at 2.5 seconds or slower and stop on 429 with explicit resume. No automatic catalog crawl. Pair/profile changes abort the client queue; stale results cannot update the new pair. On initial prototype, reuse 60-second/max-100 cache for simplicity and record coverage. For useful wider traffic, consider a separate public-metadata cache (e.g. bounded 500 entries / 1-hour TTL), clearly documented as an engineering choice, not Steam guidance. Cache eligibility and timeout must cover complete response consumption. Do not cache raw Store payloads, failed responses, user preferences or pair histories. Surface snapshot age and don't silently serve stale as fresh.

Recommendation output should contain reason objects referencing actual features/preferences, not invented prose. Filter hard conditions first; both profiles contribute equally to preference evidence. Stable tie-breaker by name then AppID. With incomplete metadata, call results provisional and show `checked / common games`, not a definitive best five of the whole library.

## Proposed screen layout

Top navigation adds Play Together using the current primary profile. Two compact identity cards show You and Friend; only the friend card has a profile input and Replace action. Never imply login or consent from that friend. Show privacy/unavailable/error states beside the corresponding identity card rather than replacing a valid primary profile with a blank screen.

Below identities, a coverage strip shows shared AppIDs, metadata checked, Store-listed online co-op candidates and unknown metadata. A compact conditions panel defaults to Online co-op; a separate capacity note explains whether exact player count is verified. The favorites panel has two explicitly labelled columns and says preferences were entered on this device. Favorites may be selected from each full library; fetching their metadata is a bounded, explicit follow-up after the common-library queue, not a hidden whole-library scan.

Results start with five cards: two playtime columns, Store mode badge, reasons per player, caveat, detail/Steam links and Exclude action. Segments are Discover together, One knows / one discovers, and Return together. An expandable table shows the entire filtered intersection plus an explicit Unknown metadata group. Distinguish zero results from still loading, private library, empty intersection, no verified mode matches and all candidates excluded. Reset exclusions is always available. On mobile, identity/preference columns stack and result cards retain both player's labels.

## Required review gates before implementation/release

1. Parent/owner resolves player-capacity wording and rich-tag scope; don't promise exact co-op compatibility or rich taste from broad genres.
2. Parent reviews Store-source risk, limits and terms evidence; provenance remains visible.
3. QA tests category contrasts, missing/malformed arrays, type filtering, AppID mismatch, private/empty libraries, stale pair results, data coverage, equal player weighting and no secret use.
4. Owner reviews screen proposal before production release, per locked plan. No commit, push or deployment was performed by this audit agent.
