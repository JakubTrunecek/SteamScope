# Production deployment

## Verification

`pnpm check` checks both packages, runs frontend interaction tests and Worker tests, then builds the frontend. `pnpm worker:dry-run` verifies production bundling without publishing. GitHub's Verify SteamScope workflow runs these commands on main pushes and pull requests without Steam or Cloudflare secrets.

## Cloudflare Worker

Use the account intended for SteamScope. Wrangler authentication must allow account/user reads and Workers script/route writes. Device login avoids localhost callback problems. Review OAuth scopes in Cloudflare before granting them.

```sh
pnpm --filter @steamscope/worker exec wrangler login --device --browser=false --scopes account:read user:read workers:write workers_scripts:write workers_routes:write
pnpm --filter @steamscope/worker run deploy
pnpm --filter @steamscope/worker exec wrangler secret put STEAM_API_KEY --env production
```

Enter the key through the secret prompt. Never paste it into a shell command, GitHub variable, frontend environment, ticket or chat. `.dev.vars` is local only and does not provision the production secret. The Worker remains `not_configured` until its secret and rate-limit bindings exist.

Before first deployment, confirm rate-limit namespace IDs 1001/1002 are not used by another Worker in this account. CORS must allow `https://jakubtrunecek.github.io`. Rate limits are per Cloudflare location, not a global Steam quota guarantee. No database, historical tracking or login is added by deployment.

## GitHub Pages frontend

1. In repository Settings → Pages, select GitHub Actions as the publishing source.
2. Open Actions → Deploy frontend to GitHub Pages → Run workflow, on main.
3. Set `api_url` to the production HTTPS `*.workers.dev` origin, with no path, query or credentials.

The workflow verifies Worker health and CORS, runs all checks, builds only `frontend/dist`, and deploys that artifact. It needs no Steam key or Cloudflare token. Publication is manual so code pushes run CI without accidentally publishing an unconfigured frontend. Action references are pinned to verified commit hashes.

## Smoke checks after publication

- Open `https://jakubtrunecek.github.io/SteamScope/` and check the backend status.
- Enter the audit SteamID and verify profile, library, search and game navigation.
- Refresh a direct hash URL to a game; confirm achievements and stats load independently.
- Confirm the browser only calls the Worker and does not receive a Steam key.
- Verify an invalid SteamID returns 400 and an unapproved Origin receives 403.

Record actual production URLs and verification results in PROJECT_CONTEXT.md only after successful publication. OAuth success alone does not prove that deployment succeeded.
