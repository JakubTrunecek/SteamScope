# Play Together - independent QA plan

Status: planning/audit only. Prepared 2026-10-28 against the current 0.0.19 source. No Play Together code exists yet. This document records required acceptance evidence, not passed tests. No test suite or browser verification was run for this assignment.

## Scope and release contract

V1 compares the active user's library with one explicitly entered friend's library. Exact AppID intersection, individually attributed preferences, online play requirements, transparent ranking, and a five-game shortlist plus a filterable full intersection. Existing API key remains server-side. No persistent preferences, authentication, background tracking, new-game catalogue, purchases, push notifications or social invitations. Production release needs owner approval after the reviewable result is presented.

The QA agent owns this plan and later independent test/review findings. Implementation must not edit expected outcomes merely to accommodate its output. Project manager resolves ambiguous product decisions before dependent implementation.

## Existing architecture: reuse and gaps

- `frontend/src/App.tsx` keys `Screen` by the complete hash path, unmounting screen state on navigation. Active SteamID is route context, but profile/library responses are not currently a shared frontend resource cache. `useApi` fetches per mount. Reusing the already loaded first library therefore requires an explicit small bounded in-memory resource design, not an assumption that the context already contains it.
- `frontend/src/api.ts` has cleanup/abort and ignores completed results after dependency changes. New paired requests and metadata scans need the same guards across success, error and finally paths.
- `frontend/src/collectionSession.ts` stores at most three profiles in tab memory. Do not place pair-specific preferences or exclusions into a cache keyed only by AppID or only by the first player.
- `frontend/src/libraryReviews.ts` shares public app summaries with a 500-item cap. Public metadata may be shared across pairs; personal reasons, hours and selected preferences may not. A scan must retain its on-screen results if more entries than the navigation-cache cap are processed.
- `shared/api.ts` distinguishes null playtime, zero time, unavailable library and empty library. Existing types have no genre, online-coop or player-count contract. A new contract must preserve unknowns explicitly and include evidence source/fetch time.
- `worker/src/index.ts` uses fixed upstreams, validation, sanitized errors, request/upstream limiters, 60-second cache (100 entries) and pending-request deduplication (20 entries). Its CORS is not authentication. Metadata enrichment must not bypass these controls or turn into an arbitrary URL proxy.
- Existing relevant tests: `app.test.tsx` (old request completion), `resolveProfile.test.tsx` (alias lookup stale response), `profileInput.test.ts` (canonical identity input), `scanSize.test.tsx`/`libraryReviews.test.tsx` (paced loading/cancel/retry), and Worker boundary/adapter tests. These are useful patterns, not proof of the new feature.

## Acceptance matrix

Priority P0 blocks release for safety/correctness; P1 blocks feature acceptance for promised behavior. Automated = unit/component/Worker synthetic fixtures. Manual = actual browser and approved live profile checks.

| ID | Priority | Scenario / stimulus | Required result | Evidence |
|---|---|---|---|---|
| PT-01 | P0 | Direct Play Together route, navigation from Overview, and first-user change | Canonical first SteamID preserved; no old user's name, hours, prefs or shortlist appears under the new first user. Already loaded library reused when available; direct route can load it. | Component + bounded request-count test |
| PT-02 | P0 | Friend entered as ID, numeric URL, alias URL; two aliases resolve to the same user | Identity comparison happens after canonical resolution. Reject first == second with actionable message, without displaying a fake two-player match or fetching the duplicate library. | Parser + component |
| PT-03 | P0 | Pair A/B changes to A/C or D/B while profile/library/metadata requests resolve in any order | Reset pair-specific results and preferences according to documented policy; abort obsolete work and ignore late successes/errors/finally. Generic public metadata cache may remain. No flashing old shortlist. | Deferred promises + UI assertions |
| PT-04 | P0 | Both profiles have a game with different names; unrelated games share names | Intersection uses AppID only and does not mutate input arrays. Names do not merge different games. Player A/B hours remain correctly attributed. | Unit |
| PT-05 | P0 | Private profile but available library; public profile with unavailable library; valid empty library; invalid or missing player | Use actual library capability; do not infer it from profile visibility. Unavailable is not zero common games. Empty is accurately labelled. Allow appropriate retry without losing independent valid data. | Component + adapter |
| PT-06 | P0 | Friendship change while previous scan is active; leaving route; Stop and retry | No new queued requests after cancellation; incomplete game can retry; completed current-pair results remain; no stale progress/status overwrites. | Fake timers + deferred fetch |
| PT-07 | P0 | Generic multiplayer, local co-op, split screen, PvP or Remote Play Together but no online-coop evidence | None qualifies as confirmed online co-op by itself. Separate evidence for online co-op; explicit false and unknown stay distinguishable. | Normalizer fixtures + filter unit |
| PT-08 | P0 | Online-coop evidence exists but numeric capacity is absent, contradictory or untrusted | Never print verified capacity for two based on a guessed max count. Hard player-count filter only passes supported evidence. Unknown candidates are a separate opt-in/unverified group, never silently promoted. PM must approve final UX policy after audit. | Unit + component |
| PT-09 | P0 | Game has both online co-op and PvP tags | Co-op is not rejected merely because PvP also exists. User mode filters consider the selected mode; do not imply every mode supports co-op. | Unit |
| PT-10 | P0 | Demo vs full game, separate editions/AppIDs, same title but differing server versions, removed game, DLC | No inferred cross-edition compatibility. Exact intersection is reported as games returned by Steam, not an assurance that installation, licenses, servers or all DLC allow play today. Metadata failures stay visible. | Unit + content review |
| PT-11 | P0 | Metadata only partly loaded, API timeout/429/500, missing fields, wrong AppID, bad schema | Explicit checked/eligible/unknown/failed counts and source freshness. Display 'among checked games', not complete best-of-library. Do not convert missing category arrays into verified non-coop. Retry is bounded; 429 halts/throttles rather than loops. | Worker + component |
| PT-12 | P0 | One user's explicit favorite conflicts with other user's rejection; thousands of hours vs explicit 'not now' | Document veto semantics first. If 'not now' is an exclusion, neither score nor tie-break can restore it. Explicit preferences outweigh inferred playtime signals as specified; hours never imply enjoyment. | Property/counterexample fixtures |
| PT-13 | P1 | Swap player order with symmetric preferences; reverse input game order; equal scores | Same eligible game order for symmetric pair semantics, independent of input ordering and fetch completion order. Use stable AppID tie-break after documented factors. Player labels may swap, not reasoning truth. | Unit metamorphic tests |
| PT-14 | P1 | One player has huge playtime totals; other has small totals; one has no favorites | Balanced combination uses defined per-player signal, not raw sum of hours. No-preference fallback disclosed. No hidden 97% compatibility/difficulty/confidence claims. Exact weights and bounded signals must be frozen before expected-output tests. | Unit + explanation review |
| PT-15 | P0 | Null/zero hours, negative or malformed upstream data; both low vs only one low vs both experienced | Missing never becomes zero. Bucket thresholds are defined and tested at boundaries. 'No recorded time' is not 'never played'. Invalid negative upstream values fail normalization. | Unit + Worker |
| PT-16 | P1 | Fewer than five eligible games; no intersection; all excluded; reset exclusions | Show available count honestly without duplicate/padded cards. Distinct empty messages; reset restores deterministic results. Full intersection remains accessible separately from shortlist. | Component |
| PT-17 | P0 | Every recommendation reason and warning | Each stated preference, genre, mode, ownership and hour reason is traceable to data for the correct player and selected candidate. No inferred genres from names/stats, no completion-time claim. Metadata source/fetch time available. | Reason-generator unit + sampled UI review |
| PT-18 | P0 | Cache entries across pair changes, reload, explicit reset, fresh library removes a game | Public app metadata may be reused; player/pair state is correctly scoped and bounded. Reload clears preferences/exclusions; deleted library entries cannot remain eligible. No localStorage, sessionStorage, IndexedDB, cookies or backend history introduced. | Unit + source/network review |
| PT-19 | P0 | Malicious URL, long alias/AppID, HTML in names or metadata, upstream error including key | Fixed allowed endpoint/path validation; no caller URLs followed, no untrusted HTML rendering, no secrets/raw errors in response/logs/bundle. No credential-bearing URLs in cards. Existing CORS/limits remain. | Worker tests + source/build inspection |
| PT-20 | P1 | Keyboard-only use and screen reader semantics | Labels for both players/filters, selected state, actionable inline errors, visible focus, status announcements without every-row spam. No unexpected focus jump as rankings update. Exclusion control names identify their game. | Component + manual keyboard |
| PT-21 | P1 | Narrow 320/390px and desktop 1280px, 200% zoom, long game/player names, many preferences | No page-wide horizontal overflow, clipped actions or overlapping cards; understandable A/B attribution in stacked cards; usable loading/empty/error states. | Actual browser screenshots/manual |
| PT-22 | P1 | Large fixtures (several thousand games per player, large intersection) | Linear/set-based intersection, bounded visible list, metadata pacing/cancel, no API fan-out across entire unrelated catalog; responsive editing during load. Measure rather than assert performance from tests alone. | Unit/request counts + browser |
| PT-23 | P0 | Friend preferences entered on one device | UI says whose preferences these are without claiming friend authenticated, consented or personally supplied them. No automatic friend-list crawl or messages/invitations. | Content/source review |

## Required fixture set

Use synthetic players A/B/C with canonical individual SteamIDs and distinct display names. Include identical names across different AppIDs; duplicate IDs rejected upstream; titles containing markup/long Unicode; null vs 0 vs just-below/at/above playtime threshold. Metadata variants: verified online-coop, only local, only multiplayer, only PvP, both co-op/PvP, missing categories, explicit supported/unsupported capacity, capacity unknown, conflicting capacity, unavailable/deleted app and mismatched AppID. Keep fetch timestamps deterministic. No real API key in fixtures.

Build ranking fixtures that counter simplistic scoring: A plays one game 10,000 hours but B explicitly rejects it; balanced candidate moderately matches both vs one excellent/one poor match; metadata-free candidate; equal scores; cold start; reversed players and input order. Assertions should prove desired ordering and reasons from the frozen policy, not repeat implementation formulas.

## Feasibility and decisions blocking implementation/release

1. **Metadata truth is the main feasibility gate.** The current app has no audited online-coop, genres or capacity source. Audit must record upstream reliability, reuse terms, field meaning and unknown behavior. API reachability alone is not verification of gameplay compatibility.
2. **Exact player count must not be promised prematurely.** Online-coop classification and capacity are separate facts. If audit cannot reliably support a numeric filter, PM must approve explicitly labelled unknowns or reduce the UI promise before implementation.
3. **Balanced ranking is not defined by 'fair to both'.** Freeze score features, normalization, veto semantics, thresholds and tie-breaks in a readable policy before implementation tests are written. Qualitative owner review of shortlist relevance remains necessary even if arithmetic passes.
4. **Frontend resource reuse is real work.** Route context currently contains the first ID, not a reusable library response. Any cache must include freshness, capacity and profile isolation; do not silently reuse indefinitely stale personal data.
5. **No compatible match is a valid result.** Returned owned-library data is not a live license/server/DLC availability guarantee. Demo/edition matching must not be 'fixed' by fuzzy names to enlarge results.
6. **Browser QA remains mandatory for final visual acceptance.** Earlier app work reported unavailable browser automation. This assignment did not retry it. If still unavailable, automated/component evidence may support implementation review but cannot be presented as mobile/visual QA completion. Owner or a functioning browser must perform that review before approval.

## Review and release sequence

- Gate A: metadata audit reviewed independently; unknown/capacity policy resolved. PM accepts a minimal source contract.
- Gate B: screen proposal shows no friend, loading, private library, zero intersection, partial metadata and cold-start recommendations; owner can review concrete behavior.
- Gate C: implementation provides diff and targeted tests. QA reviews separately, runs the tests, and reports defects with severity and reproduction. No silent edits of app code by QA unless PM explicitly reassigns ownership.
- Gate D: typecheck, meaningful new tests, full existing suite, frontend build and Worker dry run when Worker changes. Record commands, timestamp, commit and actual results; test counts are evidence, not a quality guarantee.
- Gate E: bounded live audit on approved public profiles, fixed metadata probes, desktop/mobile screenshots and keyboard checks. Verify HTTP/cache boundaries and absence of unexpected persistence/requests.
- Gate F: PM summarizes remaining limitations and owner approves production deployment. Neither implementation nor QA deploys autonomously under this phase.

## Current QA disposition

Planning complete; implementation and release NOT yet approved by QA. No findings here claim an observed Play Together runtime defect, because the feature has not been implemented. Open blockers are the audited metadata/capacity contract, frozen ranking policy and eventual browser verification.

## Initial audit review (manager evidence, 2026-10-28)

Read the locked `PLAY_TOGETHER_PLAN.md`; this QA plan is subordinate to it. Manager reports four appdetails probes with category 38 (online co-op), 39 (local co-op) and 44 (Remote Play Together), but no numeric player capacity or taste tags. This QA assignment did not independently repeat those probes; treat their raw evidence and source citations in the implementation audit as the review source.

- Category 38 can support the narrow statement "Steam lists Online Co-op" once the mapping and provider contract are accepted. It does not establish that exactly two people can start the relevant mode, that no additional participants are required, or that servers/cross-edition play currently work. A max count alone also does not establish a minimum count.
- Keep "two players" as the pair's intent, not a verified compatibility badge. A card may state "Online co-op listed; exact player requirements not verified". Do not headline the default shortlist "verified playable by two". If the product instead requires guaranteed two-player compatibility, the missing minimum/maximum/session requirements block that guarantee and may leave the strict shortlist empty.
- Local co-op and Remote Play Together must remain distinct choices from native online co-op; do not promote category 39/44 into category 38. Remote Play Together availability is a different delivery method with its own operational assumptions.
- Appdetails reachability and category presence are not a published support/SLA, permission or reuse guarantee. Provider terms, practical limits, permissible caching and source stability remain Gate A uncertainties; record them explicitly before deciding production use. Legal interpretation is not established by this QA plan.
- If only coarse genres are reliable, limit recommendation explanations to those genres and explicit input. Do not claim roguelike mechanics or tags when those signals were absent. Add manual per-session preference controls or a separately audited source before promising finer taste matching.

## Independent audit and ranking-policy review (2026-10-29)

Reviewed the complete `PLAY_TOGETHER_METADATA_AUDIT.md`, not only the earlier manager summary. The audit describes seven keyless probes and distinguishes observations from first-party documentation and unknowns. I did not repeat those probes or independently establish source permission/support. Its recommendation to proceed to a reviewable proposal, not production, is appropriate.

### Audit disposition and remaining conditions

- **Accept for prototype:** exact-AppID intersection, separate online/local/Remote Play categories and the minimal normalized metadata shape. Preserve categories and explicit source/fetch time so explanations are reviewable. App type, AppID equality, null arrays, malformed payload and unknown category IDs need adapter fixtures before production code is accepted.
- **Not established:** a stable supported appdetails contract, a specific permission/caching allowance, detailed gameplay tags or two-person minimum/session requirements. The documented Web API daily quota must not be copied as the Store endpoint's supported limit. Source-risk acceptance remains with the manager/owner; this plan gives no legal approval.
- **Positive category with conflicting label:** the proposed mapping is observed rather than an immutable enum. Freeze a mapping version and test contradictory ID/label input. Do not translate a clearly contradictory entry into a confident Online Co-op badge. A defensive candidate policy is unknown/conflict plus an explicit warning; the manager must choose the exact normalization behavior.
- **Type filtering:** the seven probes are all games. That does not validate exclusion of demos, DLC/software, unavailable responses, region restrictions or mismatched AppIDs; synthetic adapter fixtures and bounded contrast probes still need coverage.
- **Taste limitations:** genres can support coarse similarity statements, not roguelike/deckbuilding/session-length claims. The generic Indie label is particularly weak evidence. A result must not say "roguelike like your favorite" without separately available verified metadata.
- **Favorites outside the intersection:** they may legitimately influence taste, but metadata for them is a separate explicitly disclosed queue. Missing favorite metadata lowers inference coverage; it must not act as evidence of no preference. Track how many selected favorites have usable metadata for each player.

### Proposed ranking interpretation for manager sign-off

The manager supplied the following policy direction: hard exclusions first; exact shared AppIDs; category 38 only for listed Online Co-op; capacity caveat; shared explicit favorite evidence before one-sided favorite; balanced minimum of normalized individual affinity before mean; hours only select a mode; stable name/AppID ties. This is testable if expressed as a deterministic lexicographic order, but several definitions are still needed.

Suggested reference order (proposal, not implementation):

1. **Eligibility:** exact shared AppID; explicit `appType=game`; required mode listed with accepted evidence; neither player rejects the candidate and it is not session-excluded. Unknown metadata is not a confirmed candidate. Exact player count remains unverified, visibly stated. A strict verified-capacity option, if exposed later, excludes unknown capacity.
2. **Explicit favorite tier:** 2 if both players explicitly liked the candidate AppID, 1 if exactly one did, 0 otherwise. This needs confirmation: if "shared favorite evidence" means similar-to-two-favorites instead of both liking the candidate itself, its definition changes and this tier must be revised before tests are locked.
3. **Balanced affinity:** highest `min(affinityA, affinityB)` first, then highest `(affinityA + affinityB) / 2`. Each individual affinity must use the same documented normalization range, e.g. [0,1], without raw playtime weighting. This deliberately prioritizes the weaker match within a tier.
4. **Stable tie:** explicitly configured name comparison and then ascending AppID. Do not rely on whichever library supplied its name first or unspecified machine locale. Choose a canonical display-name fallback and a fixed comparator. Never use fetch arrival order.

Mode playtime conditions are a separate eligibility/segmentation step, not taste. Define the thresholds and missing-time behavior for Discover together, One knows/one discovers and Return together before UI tests. To avoid hidden inference, 'hours only mode selection' also means no playtime sort tie-break or extra recommendation weight.

Genre affinity must be computed only from actual available genre IDs and explicit selections. Needed decisions: similarity method (for example Jaccard vs weighted overlap), weighting of broad genres such as Indie, favorites aggregation (max/mean), and missing metadata policy. A normalized numeric affinity does not imply calibrated recommendation confidence; it is internal ordering only. Repeating a favorite must not change the result. Unknown must not silently become a negative affinity.

**Cold-start proposal:** with no explicit favorites for either player, do not call the fallback taste-matched. Apply constraints and chosen playtime mode, then deterministic neutral ordering. With favorites for only one player, label that limitation and rank only by the evidence actually available. The manager must choose whether incomplete favorite metadata gets a separate provisional group or a disclosed fallback; a missing player's affinity must not be presented as zero dislike.

### Reproducible ranking acceptance examples

These are reference examples for a pure comparator accepting already normalized evidence. They do not dictate the yet-unapproved genre-to-affinity formula. All candidates are exact shared AppIDs, `type=game`, category 38 listed, no rejection, capacity unknown unless overridden. Affinity values below are synthetic test inputs, not displayed percentages.

| Example | Inputs / manipulation | Required outcome under proposed policy |
|---|---|---|
| R-01 Hard exclusion | App 101 liked by both, A/B affinities 1/1, but B marks Not now; app 102 eligible, no likes, .1/.1 | 101 absent; 102 may appear. Reset removes only the intended session exclusion, not an explicit player's rejection unless the UI says so. |
| R-02 Shared vs one-sided | App 101 favorite tier 2, .1/.1; app 102 tier 1, 1/1 | 101 before 102 if exact-candidate favorite tier is approved. This exposes the trade-off and must be reviewed by the owner, rather than hidden in implementation. |
| R-03 Balanced minimum | Same tier: app 101 affinities 1/.2; app 102 .6/.6 | 102 before 101 even though both means are .6. |
| R-04 Mean tie-break | Same tier: app 101 .5/.9; app 102 .5/.7 | 101 before 102; minima equal, means differ. |
| R-05 Symmetry | Swap player A/B, their favorite sets and hours for R-03/R-04 | Same candidate order; only player-specific displayed columns/reasons swap. |
| R-06 Hours not taste | Two same-tier/same-affinity candidates; multiply A's positive playtime by 100 while staying in the same chosen mode bucket | Order and taste reasons unchanged. Crossing a documented bucket threshold may change membership only. |
| R-07 Duplicate favorite | Add the same liked AppID twice to input or metadata queue | No ranking or coverage inflation; favorite sets deduplicated by AppID. |
| R-08 Real genres only | Favorite genres null vs empty vs actual Strategy ID; candidate has only Indie | No fabricated Strategy overlap or roguelike reason. Unknown and explicit no-overlap remain distinguishable. |
| R-09 Exact identity | A has app 201 "Game Deluxe", B only app 202 "Game Deluxe" | Neither app joins the intersection via title. Same-title unrelated candidates cannot merge. |
| R-10 Mode evidence | Apps: 301 categories [1,9,39,44], 302 [1,36,49], 303 [38,36], 304 categories null | Only 303 admitted to confirmed Online Co-op candidates; PvP coexistence does not disqualify it. 304 belongs to unknown, not unsupported. |
| R-11 Tie stability | Apps 401 and 402 have same canonical name/tier/affinity; reverse source arrays and request-completion order | 401 then 402. Different spelling/accent/case fixtures must match the frozen comparator. |
| R-12 Capacity | Candidate has category 38 and `playerCapacity=null` | Card says exact player requirements unverified. It cannot receive a verified-two-player label or pass a future strict capacity filter. |
| R-13 Partial coverage | 3 of 10 common games checked; 2 eligible | Display two provisional candidates with 3/10 checked, not a definitive top five; untouched 7 are not scored as failures. |
| R-14 Non-game | Same AppID appears in both libraries, category 38 present, `appType=dlc` | Excluded from base-game recommendations regardless of popularity or likes. |

### Review gate status

Audit supports a mock screen and limited prototype with the above caveats. Production readiness remains blocked on source-risk acceptance and normalized data validation. Ranking implementation readiness remains blocked on the exact meaning of favorite tier, genre normalization/missing-data behavior, mode thresholds and canonical tie comparator. These are product/engineering decisions, not reasons to invent unsupported metadata.

Prototype structural review is pending manager notification that `docs/prototypes/play-together.html` is ready. No screenshot/mobile rendering approval is implied by source inspection.

### Follow-up: manager candidate policy reviewed

Read `PLAY_TOGETHER_MANAGER_REVIEW.md` (2026-10-29). The explicit under-120/at-least-120 modes and decision not to expose a guaranteed-two-player filter resolve two earlier questions for the prototype. Boundary fixtures: 119/119 -> Discover; 119/120 or 120/119 -> Introduce; 120/120 -> Return; null with any value -> All candidates only. Favorite tier appears to mean direct liked candidate, not similarity; make this wording explicit in the eventual function contract.

The proposed genre normalization is now concrete enough to discuss: fraction of known-genre favorites sharing any candidate genre, each favorite counted once. It remains a coarse signal. Excluding missing favorites from the denominator can make one known match out of ten selected favorites look stronger than a well-covered profile; show per-player evidence coverage and do not call either result confidently more suitable. The universal Indie genre can make almost every favorite overlap, so the owner should assess relevance before choosing genre weighting or exclusion. None of these production choices blocks a prototype showing explicit likes and mode filtering only.

**Important comparator ambiguity:** "Only compare min/mean where both have evidence" must not be implemented as a pairwise conditional comparator falling back to names whenever one candidate is unknown. That can violate transitivity. Reproducible same-tier example: A has name Z and known affinities .8/.8; B has name M and unknown affinity; C has name A and known affinities .2/.2. Affinity puts A before C, name fallback puts C before B and B before A, producing a cycle. Sorting then becomes dependent on input order.

Two defensible later options are (a) separate complete-evidence and incomplete-evidence result groups with clear wording, or (b) disable the affinity stage for the entire relevant ranking group when evidence is insufficient, retaining favorite/name/AppID order. Do not automatically demote unknowns as dislike. The manager must choose a total-order policy before production affinity implementation; the prototype need not invent that stage now.

Name tie-breaking still needs a deterministic comparator and canonical-name source eventually (fixed locale/case handling and explicit fallback), but no new inference formula is required for a mock. Current QA recommendation: approve explicit favorite/mode-only prototype work, keep rich affinity and production source-risk decisions pending.

## Prototype independent structural/behavior review (2026-10-29)

Artifact: `docs/prototypes/play-together.html`. Executed the artifact's inline script in the repository's installed jsdom 30.1.0 with a synthetic `https://prototype.invalid/` URL and no external resource loader. This is DOM behavior inspection, **not a real browser, visual, mobile, CSP enforcement or screen-reader test**. No application code was edited and no network/storage interaction was performed.

### Observed behavior

- Initial shortlist has five fictional cards, ordered by explicit favorite count then title/AppID: Mossbound Expedition, Harbor Workshop, Little Orbit Crew, Clockwork Hollow, Emberfield Caravan.
- Discover returns Mossbound Expedition and Emberfield Caravan; Introduce returns Harbor Workshop; Return returns Little Orbit Crew and Tidebreak Tactics. Clockwork Hollow's null time appears only in All candidates, not as zero in a mode.
- Partial metadata simulation shows 4/8 checked and four provisional results; private/unavailable simulation shows no recommendation cards and an explanation that missing ownership cannot support recommendations.
- Source uses only fictional constants and local DOM manipulation. No fetch, XMLHttpRequest, localStorage, sessionStorage or indexedDB API usage was found by source scan. CSP declares `connect-src 'none'`; jsdom execution does not validate browser enforcement.
- Capacity caveats and fictional-data disclosure are visible in source. No rich genre/mechanic match is claimed. Direct favorite ranking is suitable for the current prototype scope.

### Findings requiring prototype correction

| ID | Severity | Reproduction / evidence | Requested correction |
|---|---|---|---|
| MOCK-01 | P1 keyboard-review blocker | Focus a favorite button and activate it. `prefRender()` removes that focused element; jsdom reports `document.activeElement.tagName === 'BODY'`. Excluding a card also removes its focused action with focus falling to BODY. | Preserve/restore focus to the same favorite control after rerender; after exclusion move to a predictable adjacent result action or results heading/empty-state target, without triggering unrelated focus jumps. |
| MOCK-02 | P1 accessibility-review blocker | Every result card exposes the same two button texts, 'View demo details' and 'Not this session', without an accessible game-specific name. | Add per-game accessible names while keeping concise visible labels. |
| MOCK-03 | P1 accessibility-review blocker | `dialog#detail` has no aria-label or aria-labelledby. Its heading alone does not explicitly name the dialog. | Reference the dynamic detail heading via aria-labelledby; verify open/close keyboard behavior later in a real browser. |

Manager has assigned these corrections to the implementation owner. QA will rerun only affected behavior when notified; no app-source changes by QA. Desktop/mobile layout and real modal focus handling remain unverified regardless of jsdom results.

## Manager retest after agent limit (2026-10-29)

Implementation corrections were saved before the agent hit its usage limit. QA agent also hit its limit, so parent manager performed the targeted retest rather than claiming an independent QA sign-off. Executed current prototype inline script in installed jsdom 30.1.0 with no resource loader. Passed assertions: favorite focus restored to same data-favorite key; all result action names unique; successive exclusions keep focus out of BODY including empty-list fallback to resultsHeading; dialog references detailTitle; reset restores five cards. MOCK-01/02/03 are corrected at source/DOM level. Browser modal keyboard behavior, real screen-reader behavior and desktop/mobile appearance remain unverified. Prototype is ready for owner design review, not production acceptance.

## Accessibility repair retest — 2026-10-29

Bounded jsdom 30.1.0 execution of the updated local HTML passed: favorite toggle restores focus to the same player/game control; six consecutive exclusions retain meaningful focus and end at the results heading; repeated detail/exclusion names now include the game title; dialog references its populated title via `aria-labelledby`. MOCK-01, MOCK-02 and MOCK-03 are closed for this prototype's source/DOM review. An initial retest used the old exact button text and failed to select the renamed action; rerunning with its new prefix passed. This was a test-selector correction, not a product failure.

No screenshot, real browser dialog/focus-trap, screen-reader or mobile viewport validation was performed. Production release gates elsewhere in this plan remain open.
