# Play Together - locked delivery plan

Approved by owner on 2026-10-28. This takes priority over earlier proposed value-roadmap milestones. Future discovery outside owned libraries is phase two, not first-release scope.

## Outcome and scope

Reuse the current profile as player one. Add Play Together beside Overview and Library. Accept a friend's SteamID or supported profile URL, load the available library and intersect exact AppIDs. Default intent: two players and online co-op. Show five explained suggestions plus a filterable shared library. Views: discover together, one knows/one discovers, return together.

Separate mandatory constraints (shared ownership, verified requested mode, capacity where verifiable, session exclusions) from ranking preferences. Explicit liked/similar/not-now choices outrank inferred playtime signals. Zero time does not prove never played; missing time is not zero. Never claim enjoyment, difficulty, session length, compatibility or a numerical match confidence without evidence. Both players must influence ranking. Preferences entered on one device are not authenticated statements by the friend.

Each suggestion states both playtimes, metadata evidence, reasons, caveats and detail/Steam links. Unverified co-op candidates must stay distinct from verified matches. State partial coverage. Do not silently treat generic multiplayer as online co-op or assume edition interoperability.

React/Vite frontend + Cloudflare Worker, existing server-only secret. No DB/login/social connections/background tracking/AI ranking. Session preferences and exclusions live only in tab memory. Profile change cancels requests and isolates results. Reuse current library data where possible; game metadata cache is profile independent and bounded. No arbitrary upstream URL fetches.

## Team and ownership

- Parent assistant: project/agent manager; locked scope, source decisions, integration review, progress reporting and release gate.
- implementation agent: metadata audit and implementation after manager clears audit. Owns audit file initially; application ownership assigned at next gate.
- qa agent: independent acceptance plan, later tests and review. Owns QA plan initially. Must report observed evidence, not inferred pass status.
- Shared workspace: no concurrent edits to same files. No worker may push/deploy or expand scope without manager coordination. Secrets are never inspected for planning.

## Delivery gates

1. Metadata audit: primary sources, bounded probes, online-coop/category interpretation, player limits, terms, coverage, caching and failure semantics. Uncertainty stays explicit.
2. Reviewable screen proposal with example data. Owner reviews design before broad implementation, per approved plan.
3. Two-library flow and failure states.
4. Constraints, preferences, evidence-backed deterministic ranking and explanations.
5. Independent QA, relevant automated checks and actual desktop/mobile visual checks. Missing friend's profile or unavailable browser must be reported, not invented verification.
6. Present concrete result for owner acceptance. Production deployment only after owner approval. No deployment in initial audit phase.

## Reporting

Report completed work, evidence, unresolved decisions and next gate. QA findings return to implementation, then QA retests affected behavior. Manager decides readiness from both reports. Agents run only during active task execution; no recurring/background schedule is established.

## Phase two

Candidates owned by one player, then neither player, require separate catalog discovery and data validation. Pricing and budget are later scope. Persistence/history require explicit scope approval.
