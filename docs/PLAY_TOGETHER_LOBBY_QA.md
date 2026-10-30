# Play Together Lobby + Map - independent QA

Status: review plan only, 2026-10-29. Implementation artifact expected at `docs/prototypes/play-together-lobby.html`; waiting for ready notification. No application/prototype edits, deployment, screenshots or browser verification by QA.

## Contract to verify

The Lobby and Map must be two views of the same fictional pair/session state, not separate sets of suggestions. Exact shared AppID candidates, default Store-listed Online Co-op mode, same filters/exclusions and same pinned picks must apply in both views. Two-player capacity stays unverified. A map based on recorded time is not a taste map or proof of experience.

## Bounded DOM/semantic acceptance cases

| ID | Case | Expected result |
|---|---|---|
| L-01 | A/B known time 119/119, 119/120, 120/119, 120/120 | Four distinct quadrants: both under 120, A under/B at least 120, A at least 120/B under, both at least 120. Axes name players; boundary 120 is in the high bucket. |
| L-02 | A or B null time, including null/null | Separate unknown-time group; never placed in a zero/low quadrant or numerically plotted as zero. Known zero remains valid low time. |
| L-03 | Change mode/filter, exclude game, switch Lobby -> Map -> Lobby | Same eligible candidate set and state in both views; exclusions not lost; names/counters match filtered scope. |
| L-04 | Pin in Lobby, switch to Map and back; unpin in Map | Same AppID pinned exactly once everywhere. A visual marker alone must not be the only selected-state signal. |
| L-05 | Exclude a pinned game | Pinned state is removed or explicitly invalidated immediately; no excluded game remains an active pick. Reset exclusions has a documented deterministic outcome and must not silently recreate removed pins. |
| L-06 | Pin then choose filter hiding it | Chosen policy is explicit: maintain a labelled out-of-filter selection or remove the pin. No hidden stale selection contradicts visible picks/counters. |
| L-07 | Default online mode; local co-op, generic multiplayer, PvP-only and unknown candidates | Only explicit online-coop evidence admitted as confirmed candidates. Unknown/local entries not silently converted to online; if shown separately they are labelled and cannot be mistaken for recommended matches. |
| L-08 | Duplicate title with distinct AppIDs / candidate absent from one library | Distinct identity preserved, no title merge; no non-shared candidate in V1 Lobby/Map. |
| L-09 | Repeated action controls | Accessible names identify game and action; selected/pinned state programmatic; keyboard operation available without dragging/hover. |
| L-10 | Pin/exclude/filter rerender | Focus remains on logical surviving control, next item or result heading. No BODY fall-through after deleting focused nodes. View switch leaves focus predictable. |
| L-11 | No results / all excluded / only null times | Helpful scoped message and reset path; no empty chart pretending complete coverage; counts remain consistent. |
| L-12 | Structural mobile layout | Source offers stacked/reflow fallback, readable player labels and touch-sized actions. Actual 320/390px screenshots and overflow checks remain required separately; DOM structure is not proof. |
| L-13 | Fictional data, source and persistence | Prominent prototype label, no actual Steam recommendation claim, no network/storage. Capacity and playtime caveats remain visible near decision context. |
| L-14 | AppID-to-map association | Every rendered tile/marker/pin resolves to the same game's Lobby details and original player times. No duplicate/omitted known-time candidates across quadrants. |

## Evidence discipline

Source inspection and jsdom execution can verify deterministic state, DOM labels and simulated interactions. They do not validate layout, real keyboard navigation, native dialogs, actual assistive-technology output, touch behavior, source API integration or real user satisfaction. Record exact commands/scenarios and observed results after readiness; never infer release approval from a prototype pass.

## Executed review — 2026-10-29

Reviewed `docs/prototypes/play-together-lobby.html` and executed its inline script in installed jsdom 30.1.0, without external resource loading. This is bounded source/DOM QA, not rendered browser QA.

Passed checks:

- Initial Lobby is exactly IDs 1, 2, 3 in the documented favorite priority order.
- Default Map groups are `[1,4]`, `[2]`, `[5]`, `[3,9]`, and separate unknown `[6]`. The first four correspond to both under 120, only Alex at least 120, only Sam at least 120, both at least 120 minutes. Direct classification fixtures for 119/119, 120/119, 119/120 and 120/120 passed. Null on either side remains unknown.
- Pin state survives switching views and applying a time filter that hides the pinned card. The shortlist explicitly explains this persistence, and each pin includes mode evidence. This implements the keep-pins policy in L06.
- Excluding a pinned game removes its pin and result in both views. Resetting exclusions makes it eligible again without silently repinning it.
- The same time filter remains active across Lobby and Map. All-shared opt-in exposes nine games; switching back to online removes local ID 8 and unknown-mode ID 7.
- Pin action restores focus to its corresponding control and updates `aria-pressed`. Seven consecutive default-mode exclusions preserve meaningful focus, then focus the results heading with a useful empty message.
- Every result action includes its game's title. Dialog has `aria-labelledby` pointing to its title. Actions use native buttons; view choices expose pressed state. No drag interaction is required.
- Source has a single shared game list and shared Sets for IDs, pins and exclusions. Details derive identity, time and mode from the same object used for its card. No separate title-based merge is performed in this mock.
- Source contains no network or persistence APIs; the page declares fictional data and capacity uncertainty, and CSP specifies `connect-src 'none'`. This is source inspection, not a network capture or CSP enforcement test.
- CSS includes a 700px single-column map/card fallback and wrapping controls. Structural mobile accommodation exists, but this does not establish absence of clipping or acceptable visual layout at 320/390px.

### Disposition

No blocking functional or semantic defect found in this bounded prototype review. Suitable for owner review of Lobby + Map interaction. This is not production acceptance: simulated ownership and mode evidence do not test real privacy, friend replacement, stale requests, API coverage, metadata provider support, or two-player compatibility. Real-browser keyboard/dialog behavior, screen-reader announcements, visual hierarchy, contrast and small-screen rendering remain unverified. The existing metadata/capacity and ranking decisions remain production gates in the main QA plan.
