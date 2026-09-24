# R-001 — Steam API Capability Audit

Status: complete. Results below were supplied by the project owner in the 2026-09-21 handoff; this milestone does not rerun the audit. Raw response artifacts and original execution date are not available in this repository.

Test SteamID64: `76561198004260198`. Owned games: **252**.

| Observation | Result |
| --- | --- |
| Games with achievements | 176/252 = 69.8% |
| GetUserStatsForGame returning at least one stat | 183/252 = 72.6% |

| Game | Returned stats |
| --- | ---: |
| Left 4 Dead 2 | 317 |
| Counter-Strike 2 | 193 |
| HUMANKIND | 49 |
| The Witcher 3 | 34 |
| Kingdom Come: Deliverance | 13 |

## Verified endpoints

- GetOwnedGames
- GetRecentlyPlayedGames (RecentlyPlayedGames in handoff)
- GetPlayerAchievements
- GetGlobalAchievementPercentagesForApp (Global Achievement Percentages)
- GetSchemaForGame
- GetUserStatsForGame

## Conclusions

Detailed Stats remain in MVP, represented generically. Labels may come from the actual game schema; internal names must not be guessed or translated into invented meanings. Achievements are available per game and must not be treated as a universal progress metric.

These percentages describe one account at audit time, not all Steam games. Lack of returned data does not independently establish why it is missing. Endpoint integration must handle visibility restrictions, empty results, unsupported features and temporary errors separately where the response makes that possible.

## Follow-up research

Capture sanitized response shapes during integration, verify error/visibility behavior and schema label coverage, and establish rate-limit/cache behavior. Never commit API keys or raw request URLs containing credentials.

## 0.0.3 live integration verification — 2026-09-21

Through the local Cloudflare Worker, the audit account returned 252 owned games, an available public profile, and 4 recently played games. GetPlayerSummaries v2 was newly verified in this milestone; it was not one of the six R-001 endpoints. Actual library search, sorting and game navigation were checked in the browser. No raw responses or credentials are saved in this document.

IPlayerService calls use input_json and include played free games for library results. Counts may change over time. Privacy/error cases are covered with synthetic fixtures, not claimed as live-account observations.

Sources: [IPlayerService](https://partner.steamgames.com/doc/webapi/IPlayerService), [ISteamUser](https://partner.steamgames.com/doc/webapi/ISteamUser).

## 0.0.4 live game capabilities — 2026-09-21

The same account returned the audited Detailed Stats counts through the local Worker: Left 4 Dead 2 317, CS2 193, HUMANKIND 49, Witcher 3 34 and Kingdom Come: Deliverance 13.

Left 4 Dead 2 returned 101 player achievements (26 unlocked), 101 global percentage entries and a schema containing 733 stat definitions and 101 achievement definitions. This confirms why player stats must not be populated from schema defaults: schema definitions exceed the 317 returned player values.

Max Payne returned HTTP 400 with an empty object for GetUserStatsForGame, which remains ambiguous `not_exposed`. GetPlayerAchievements returned HTTP 400 with an explicit no-stats failure, classified as unsupported for that request. Do not infer one capability's state from another endpoint.

Private profiles and malformed payloads are covered by synthetic tests; they were not newly verified against private live accounts. Raw upstream payloads and request URLs are not stored in the repository.

Reference: [ISteamUserStats methods and parameters](https://partner.steamgames.com/doc/webapi/ISteamUserStats).

## R-002 / 0.0.11 — Public community context (2026-09-24)

Verified without credentials: GetNumberOfCurrentPlayers v1 on api.steampowered.com and Store appreviews summaries on store.steampowered.com for apps 550, 730 and 379430. All six calls succeeded. Snapshot counts: L4D2 19,524 players / 1,059,522 reviews; CS2 1,203,287 / 9,878,764; KCD 3,795 / 185,985. Values change over time and are not fixtures or promised current totals.

Reviews request all languages, all purchase types and both positive/negative reviews with off-topic filtering enabled. num_per_page=0 returned the aggregate summary without review text. We compute positive share from validated counts, not the returned score category. This selection can differ from the store headline. Zero reviews has no percentage. Current players excludes Steam-offline players and is not a daily peak or unique-player count.

Sources: [Current players](https://partner.steamgames.com/doc/webapi/ISteamUserStats#GetNumberOfCurrentPlayers), [Review summary parameters](https://partner.steamgames.com/doc/store/getreviews).
