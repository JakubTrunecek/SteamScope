# Play Together - manager review, 2026-10-29

Status: audit reviewed; prototype authorized. No production implementation or release authorization from this document.

## Accepted evidence and limitations

- Exact AppID intersection is supported by existing library contracts.
- Existing routing carries the primary ID, not shared loaded-library state. Implementation must add bounded in-memory reuse with expiry and isolation.
- Observed Store category 38 permits wording 'Steam lists Online Co-op'. It does not verify a two-person lobby, available servers, DLC, editions or platform compatibility. Two people is user intent, not a verified capacity claim.
- Source appdetails is an observed first-party endpoint, not a documented supported Web API contract. Provider/reuse terms, rate ceilings and cache policy remain unresolved production dependencies. Prototype contains no calls.
- Broad genres are insufficient for the promised fine-grained taste matching. Do not rebrand genre overlap as roguelike/mechanic affinity. Audit a suitable source before implementing those claims; manual user notes may be displayed as self-reported information, never as Steam evidence.

## Candidate ranking policy for review (not yet frozen)

1. Eligibility: exact shared AppID, explicit game type, desired mode listed in available source, neither player's explicit rejection, no session exclusion. Unknown mode is separate, not a match. Unknown capacity remains prominently unverified; guaranteed-two-player filter is not offered yet.
2. User-selected modes use recorded minutes with explicit thresholds: Discover = both known under 120 minutes; Introduce = one known under 120, other at least 120; Return = both at least 120. Unknown times stay in All candidates, never zero. Labels describe recorded time only. These thresholds are product heuristics, not proof of experience.
3. Explicit favorite for both ranks before favorite for one, then neither. Similarity to chosen favorites requires audited feature metadata. No metadata means no similarity claim.
4. If genre affinity is used later, each player's affinity is the fraction of their favourite games with known genres sharing at least one candidate genre (each favourite counts once). Unknown favourites excluded from denominator and coverage displayed; no known evidence means unknown, not zero. Only compare balanced min/mean affinity where both have evidence, with explicit metadata coverage. This policy is provisional until QA and owner review; avoid false precision scores in UI.
5. Playtime selects a mode; it does not measure enjoyment. Break remaining ties by display name then AppID. Player swapping and input order must preserve order and merely swap reason attribution.
6. Exactly five is a maximum, not a quota: never pad with ineligible candidates. Partial loading gives a provisional list and visible checked/common counts.

## Review artifact and next gate

Implementation agent owns docs/prototypes/play-together.html, with fictional sample data, no network/storage and simulated states. QA independently reviews structure, state behavior and wording. It is not evidence of real Steam recommendations or tested metadata integration.

Present artifact and QA findings to owner before application integration. Ask for approval of visible interaction and wording only after artifact exists. Fine-grained recommendation metadata remains a separate technical decision; owner design approval does not resolve missing data or terms.

No deployment, automated follow-ups or background monitoring are configured.

## QA disposition on ranking

QA identified that conditional pairwise affinity comparisons can create a non-transitive sort when evidence is missing. Accepted correction: prototype ranks only explicit favorite tiers and stable name/AppID ties after eligibility/mode filters. No cross-title affinity score in the prototype. Future affinity needs a globally consistent ordering/evidence-group policy and new tests before activation; unknown evidence must never imply dislike. Test mode thresholds at 119/120 minutes and exclude unknown times from specific modes.

## Team checkpoint, 2026-10-29

- Implementation produced docs/prototypes/play-together.html: isolated fictional-data review prototype, not app integration.
- QA reviewed the source and ran bounded jsdom behavior checks, not a real browser or screenshot review.
- QA found focus loss after favorites/exclusion and missing contextual accessible names/dialog title association. Returned to implementation for correction before owner review.
- Local preview served only from docs/prototypes at http://127.0.0.1:5188/play-together.html. No production deploy or network data integration.

## Owner review handoff (2026-10-29)

Saved implementation fixes passed manager DOM retest after both agents hit usage limits. No independent QA rerun is claimed. Prototype ready for owner review at local preview; no production integration, push or deploy. Next action: obtain owner feedback on two-profile flow, preference selection and shortlist layout, then resolve metadata/taste evidence gaps before application work.

## Approved prototype variant - Lobby + library map

Owner approved a second review artifact on 2026-10-29. Preserve original dashboard prototype for comparison. Lobby and Map share filters, session exclusions and a pinned tonight selection. Map groups known playtimes into four quadrants using the disclosed 120-minute threshold, with unknown times separate. Default online-coop evidence filter also applies to the map. Mobile stacks quadrants. Pinning is a local choice, not ownership, availability or gameplay verification. Excluding a game removes its pin. No tournament, external catalog or production integration in this prototype task. Fictional data only. Implementation owns play-together-lobby.html; QA owns PLAY_TOGETHER_LOBBY_QA.md.

Lobby + Map handoff: independent QA completed bounded jsdom tests with no blocking finding: all quadrants, 119/120 thresholds, null separation, shared filters/pins/exclusions, exclusion unpins and reset does not repin, accessible action names and focus behavior. Actual desktop/mobile rendering remains unverified because browser automation failed. HTTP preview verified 200 at http://127.0.0.1:5189/play-together-lobby.html. Existing dashboard prototype is unchanged. No production app changes or deployment.

## Application integration checkpoint - 2026-10-30

Owner requested continuation after reviewing the prototype direction. Proceed with a bounded first application slice: current profile plus friend profile/URL, exact AppID intersection, Lobby and recorded-time Map, shared session pins and exclusions. Lobby shows at most three candidates, ordered deterministically; these are shared-library candidates, not taste recommendations. Unknown times remain separate. Profile visibility must not determine library availability.

No online-co-op filter or eligibility claim is enabled without metadata evidence. Store metadata support/terms and fine-grained taste evidence remain unresolved; this slice must explicitly say game modes and two-player compatibility are unverified. Existing API routes suffice. Add bounded expiring in-memory library reuse and bypass it on explicit retry. No login or database in this slice; the owner-requested persistent shared board is recorded as a later roadmap phase.

Implementation owns frontend source/tests; QA independently reviews tests, failure states and diffs. Parent owns scope documentation and integration. Production release still requires owner acceptance of the working result. Do not label automated DOM checks as rendered desktop/mobile verification.

## Integration validation - 2026-10-30

First application slice is implemented locally. Full pnpm check passed: Worker 72 tests, frontend 54 tests, both typechecks and frontend production build. Independent QA reran all seven focused Play Together tests successfully after focus, cache invalidation and stable-name fixes. No blocking source/DOM finding remains. Browser/mobile rendering is still unverified because browser automation fails during sandbox startup.

Live local Worker smoke test of the owner-provided pair returned 256 and 121 games, with 56 exact shared AppIDs. Recorded-time groups: both under 120 minutes 10, only first player at least 120 minutes 5, only friend at least 120 minutes 3, both at least 120 minutes 38, unknown 0. These are current API observations, not confirmed co-op or taste matches. No secrets printed or copied. Local frontend uses http://localhost:5173/SteamScope/ and local Worker port 8787. Production has not been changed; owner review remains the release gate.
