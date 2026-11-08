# Testing Nabni

## The dev cycle for every task

1. Plan the task in Jira (NAB) and move it to **In Progress**.
2. Build it, with unit and component tests next to the code (`*.test.ts(x)`, Vitest).
3. `npm run lint`, `npm run typecheck` and `npm test`.
4. **UI tests:** `npm run test:e2e`. Every new screen or flow ships with its Playwright spec in `e2e/`.
5. Database changes: extend and run `supabase/tests/permissions.sql` (it rolls itself back).
6. CodeRabbit review of the task's commits; open a Jira bug for each valid finding, then fix it.
7. Commit with the Jira key in the message and push to `main`. The n8n workflow moves the issue to Done, and CI runs again.

## Unit and component tests (Vitest)

`npm test` runs them. Supabase is mocked (`src/test/supabaseMock.ts`), so they need no network.

## UI tests (Playwright)

`npm run test:e2e` runs Chromium against the app and the **live** Supabase project.

- **Accounts.** Three dedicated e2e accounts (parent, educator, admin). Their emails and passwords go in
  `.env.local` (see `.env.example`) and in the repository secrets for CI, never in the repo. A role
  without credentials is skipped. The setup project logs each role in once and reuses the session.
- **Data rules.** Tests only create or change data owned by the e2e accounts, and everything they create
  starts with `[E2E]` (`e2e/support/data.ts`). Each test deletes its own data afterwards, and a sweep
  removes `[E2E]` leftovers older than 30 minutes. Admin tests only act on e2e data and only open pages
  for real accounts.
- **Cleanup clients.** Specs that need setup or cleanup use `clientAs(role)`, a Supabase client signed in
  as that e2e account, so RLS still applies. Always sign these out with `{ scope: 'local' }`: a global
  sign-out would end the browser's saved session too.
- **Locally** an already running `npm run dev` on port 3000 is reused; otherwise one is started. From a
  second checkout, set `E2E_PORT` (e.g. `E2E_PORT=3100 npm run test:e2e`) to run its own server.
- **In CI** the `e2e` job runs after typecheck, tests and build, against the production build. On failure
  the HTML report and traces are uploaded as the `playwright-report` artifact. Without the secrets the job
  is skipped with a warning; a paused free-tier Supabase project makes it fail until it is restored.

Writing specs: prefer roles and labels (`getByRole`, `getByLabel`) over CSS, wait for the `load` event
rather than `networkidle` (Next keeps prefetching links), and give each test its own `e2eText(...)` marker.

### Watching the tests (NAB-112)

```powershell
# your installed Chrome (or msedge for Edge), one test at a time, 0.5 s between actions
$env:E2E_BROWSER = 'chrome'; $env:E2E_SLOWMO = '500'; npx playwright test offers --headed --workers=1
# step through every test with a timeline
npx playwright test --ui
```

In UI mode, run the **setup** project first (it logs in the three e2e accounts and saves their
sessions); otherwise signed-in tests fail when the saved sessions are missing or expired.

Without `E2E_BROWSER` the tests use Playwright's bundled Chromium (as CI does).

## Database permission tests

`supabase/tests/permissions.sql` acts as each role inside a transaction that is always rolled back and
checks the RLS policies, column grants and RPCs. Run it with the Supabase SQL editor or `psql`; it ends
with `All permission checks passed.`
