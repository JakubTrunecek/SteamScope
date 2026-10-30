# Play Together real library flow — QA

Review date: 2026-10-30. Scope: existing first-profile context plus one friend supplied by SteamID/profile URL; exact AppID intersection; Lobby and recorded-time Map; local pins and exclusions. Metadata, inferred taste, co-op eligibility and login are outside this increment. Earlier online-mode prototype expectations do not apply to this metadata-free flow.

## Contract findings

- `GamesResult` distinguishes unavailable data from an available empty library. A public profile does not imply a public library.
- Worker parsing already rejects duplicate AppIDs, invalid values and mismatched game counts. Missing time is normalized to null; zero is a distinct known value.
- `parseProfileInput` accepts individual SteamID64 and supported Steam Community profile URLs, extracting identity without fetching arbitrary pasted URLs. Vanity resolution must validate the canonical returned ID.
- `Screen key={path}` currently unmounts a screen on navigation. `useApi` aborts stale loads but does not cache data across routes. Do not promise existing loaded-library reuse unless implemented; session lifetime of pair choices must be stated accurately.

## Required acceptance cases

| Case | Reproducible setup | Expected |
| --- | --- | --- |
| Identity | A owns IDs 10,20; B owns 20,30; names of 10 and 30 equal | Only ID 20 shared; no title/edition merging |
| Same profile | Friend direct ID equals A; separately vanity resolves to A | Explicit validation; no self-comparison or duplicate library load |
| URL safety | Paste foreign URL or deceptive Steam hostname | Local error; never request arbitrary URL |
| Empty vs unavailable | B available with zero games; separately unavailable | Empty shared-library result vs unavailable explanation, never fabricated zero coverage |
| Independent privacy | A profile public, A library unavailable | Library unavailable remains blocking regardless of profile visibility |
| Pair isolation | Pin/exclude game for A+B, then load C | No old B cards or pair-specific choices leak into A+C |
| Pending replacement | Start slow B, change input to C and submit, then resolve B | B cannot replace C results, errors, loading state or identity |
| Resolver cancellation | Start slow vanity lookup then edit input/unmount | Old resolution cannot load the wrong friend or update unmounted screen |
| Failure/retry | Library timeout/429 then retry succeeds | Clear recoverable state; no stale old pair presented as new results |
| Boundaries | 119/119,120/119,119/120,120/120 | Four respective known-time groups |
| Missing time | null/0,0/null,null/null | Separate unknown group; never under-120 or fabricated zero |
| Cross-view state | Pin in Lobby, switch Map, filter, exclude pinned ID | Shared state; exclusion removes pin; reset excludes does not silently repin |
| Hidden pins | Pin then filter out candidate | Retention/removal is clearly explained and internally consistent |
| Deterministic listing | Reverse server order and include equal game names | Stable documented ordering with AppID tie-break; no claimed taste score |
| Focus | Pin/unpin, exclude first/last/all, clear pins | Focus remains on useful action or heading; accessible action names identify game |
| Scope honesty | Inspect headings, reasons and empty states | Shared ownership and recorded time only; no online-co-op recommendation or capacity claim |
| Bounded traffic | Load pair and switch view/filter/pin | No metadata scan or per-game request; view changes do not refetch libraries |
| Storage/secrets | Inspect new code | No persistent identity/pref storage, exposed key, login or tracking |
| Routing | Direct-link feature and navigate library/detail/back | Correct first ID and active nav; existing routes unchanged |
| Responsive | Inspect styles; later real 320/390px browser | Single-column fallback and usable labels; DOM checks alone cannot establish visual pass |

## Execution status

Contract/source review completed. Implementation diff and new tests not yet reviewed; no implementation acceptance or browser validation claimed. No application edits made by QA.

## Independent implementation review — 2026-10-30

Reviewed PlayTogether, its intersection/time-group model, scoped library cache, useApi changes, App route/nav, CSS and focused tests. The bounded implementation uses exact AppIDs, canonical identity validation, cancellation guards, page-local pair choices and explicit metadata-free copy. Its first library can be reused from a 60-second, four-profile tab-memory cache; unavailable responses are not newly cached. New map rendering is bounded to six cards per group initially.

Findings sent to implementation:

- FLOW-01: final Map “Show more” action disappears after revealing the final batch, risking keyboard focus loss. Keep meaningful focus and cover expansion beyond six cards.
- FLOW-02: explicit retry bypasses cache reads but initially left an older successful entry intact after failed retry. Invalidate the retried path so a later mount cannot revive superseded data. The current page exposes retry only on error, reducing ordinary exposure.
- FLOW-03: test fixture used mutating `theirs.reverse()`; copy before reversing for independent fixtures. Collation-equivalent localized title representations also need a secondary lexical tie-break if full pair-symmetric display is promised.

Initial independent focused execution used `node node_modules/vitest/vitest.mjs run test/playTogether.test.tsx` in frontend. Result: five passed, two failed in newly added tests due to replacement characters in expected Unicode text. This is a test encoding issue; implementation notified. A preceding pnpm invocation attempted package-manager auto-install and failed sandbox symlink permission checks; direct installed runner worked. Final disposition awaits fixes and retest.

No browser screenshots, mobile rendering or real two-profile smoke test performed by QA. Actual second profile has not been supplied. CSS fallback and DOM tests cannot substitute for those checks.

## Final targeted retest — 2026-10-30

Independent rerun of the installed Vitest runner completed successfully: `node node_modules/vitest/vitest.mjs run test/playTogether.test.tsx` in frontend, **7 tests passed, 1 file passed** (33.90 seconds). This run includes final map expansion from 6 through 20 cards with retained focus, stale vanity resolution, stale friend library response, pair choice isolation, exact intersection/time grouping, private library handling and bounded cache expiry/eviction.

FLOW-01 closed at source/jsdom level: the final Show more control remains in the DOM, becomes disabled and retains focus in the test. Real-browser behavior of disabling a focused control is still unverified. FLOW-02 source fix verified: explicit retry invalidates the path before incrementing its attempt. Existing tests cover cache expiry and capacity, but do not independently exercise the full cached-success → forced failed retry → remount sequence. FLOW-03 fixed: reverse operates on a copy; lexical fallback resolves collation-equal display-name selection. The two Unicode-selector test failures are resolved.

No remaining blocking source/DOM defect identified for this bounded metadata-free increment. Seven focused passing tests do not constitute exhaustive coverage of the acceptance matrix: real-browser/mobile review, explicit retry-remount integration, all error statuses and live pair behavior remain separate validation. Parent is handling live smoke testing with the now-supplied second Steam profile. QA made no application edits and performed no deployment.
