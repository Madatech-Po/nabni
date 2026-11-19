# Deploying Nabni

The pilot runs on **Cloudflare Workers**, built with the OpenNext adapter (`@opennextjs/cloudflare`,
NAB-127). Every push to `main` that passes CI deploys automatically. The database stays on Supabase.

| File | What it does |
| --- | --- |
| `wrangler.jsonc` | Worker name (`nabni`), `nodejs_compat`, the static assets binding |
| `open-next.config.ts` | OpenNext settings: prerendered pages are served from the static assets (no R2/KV) |
| `next.config.mjs` | `images.unoptimized` (Workers has no Next image optimizer), OpenNext dev hook |
| `.github/workflows/ci.yml` | `deploy` job: after `check` and `e2e`, on pushes to `main` only |

## One-time setup in Cloudflare (the user)

1. **Create an account** at <https://dash.cloudflare.com/sign-up>. The Free plan is enough: the
   compressed worker is about 1.5 MiB, under the 3 MiB Free limit (the paid limit is 10 MiB).
2. **Pick the workers.dev subdomain.** In the dashboard open **Workers & Pages**. The first visit asks
   you to choose a subdomain (for example `nabni-pilot`). The site will live at
   `https://nabni.<your-subdomain>.workers.dev`.
3. **Create an API token.** Go to **My Profile → API Tokens → Create Token**. Choose the
   **"Edit Cloudflare Workers"** template. Under *Account Resources* pick your account, and under
   *Zone Resources* pick **All zones** (or a specific zone if you will add a custom domain). Create it
   and copy the token. It is shown only once.
4. **Copy the Account ID.** It is on the right of **Workers & Pages → Overview**, or under
   **Account Home → ⋯ → Copy account ID**.

## Add the GitHub secrets

From the repository folder, with the GitHub CLI logged in (`gh auth status`):

```powershell
gh secret set CLOUDFLARE_API_TOKEN --repo Madatech-Po/nabni     # paste the token when asked
gh secret set CLOUDFLARE_ACCOUNT_ID --repo Madatech-Po/nabni    # paste the account id when asked
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are already set for the e2e job; the
deploy job uses the same two. Check with `gh secret list --repo Madatech-Po/nabni`.

Without the two Cloudflare secrets the `deploy` job is skipped with a warning; nothing else breaks.

## How deploys happen

1. Push to `main`.
2. CI runs `check` (lint, typecheck, unit tests, `next build`) and `e2e` (Playwright on the live project).
3. If both pass, `deploy` runs `npm run deploy`: `opennextjs-cloudflare build` (which runs `next build`
   with the `NEXT_PUBLIC_*` secrets inlined) and then `opennextjs-cloudflare deploy` (a `wrangler deploy`
   of the worker and its static assets).
4. The new version is live at `https://nabni.<your-subdomain>.workers.dev` in about a minute. Logs
   are under **Workers & Pages → nabni → Logs** (observability is on).

Only one deploy runs at a time; a newer push waits for the current deploy to finish.

To roll back, open **Workers & Pages → nabni → Deployments** and pick an earlier version.

## After the first deploy: Supabase auth URLs

Email links (sign-up confirmation, magic link, password reset) go to `<site>/auth/confirm`, so tell
Supabase about the new address. In the Supabase dashboard open **Authentication → URL Configuration**:

- **Site URL:** `https://nabni.<your-subdomain>.workers.dev` (or the custom domain).
- **Redirect URLs:** add `https://nabni.<your-subdomain>.workers.dev/**`. Keep
  `http://localhost:3000/**` for local development.

## Optional: custom domain

The domain must be on Cloudflare (add it as a site and change its nameservers). Then open
**Workers & Pages → nabni → Settings → Domains & Routes → Add → Custom domain** and enter for example
`nabni.example.com`. Update the Supabase Site URL and Redirect URLs to the new domain.

## Running on the Workers runtime locally

`npm run dev` (plain `next dev`) stays the everyday way to work. To check the real Workers build:

```powershell
npm run preview          # opennextjs-cloudflare build, then wrangler dev on http://localhost:8787
$env:E2E_PORT = '8787'; npx playwright test   # in a second terminal, against the running preview
```

The build reads `NEXT_PUBLIC_SUPABASE_*` from `.env.local`, as `next build` does.

`npm run preview` only runs the worker locally (`wrangler dev`); it never uploads anything, so it may
read `.env.local`.

## Deploys only from CI, never with secrets in the bundle

OpenNext copies the values of the `.env*` files it finds, including `.env.local`, into the worker
bundle (`.open-next/cloudflare/next-env.mjs`), and locally that file also holds the e2e account
passwords. CI builds from a clean checkout without `.env.local`. So `npm run deploy` runs two guards
(`scripts/guard-deploy.mjs`):

1. **Before the build:** it refuses to run unless `CI=true`. Deploy by pushing to `main`.
2. **After the build, before the upload:** it fails if `next-env.mjs` holds any variable that is not
   `NEXT_PUBLIC_*`, or if any file in `.open-next/` names an `E2E_*`, `*SERVICE_ROLE*` or `*_SECRET*`
   variable. It prints the names and files, never the values.

If you really must deploy from your machine, move `.env.local` aside and set
`NABNI_ALLOW_LOCAL_DEPLOY=1`; the bundle check still runs.

`npm run cf-typegen` writes `cloudflare-env.d.ts` (ignored by git) with types for the worker
bindings, should code ever need `getCloudflareContext().env`.
