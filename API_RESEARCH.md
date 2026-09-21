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
