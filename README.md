# RockRoll

Private cloud-first music archive and practice tracking app.

## MVP

- Account login
- Song-centered practice records
- Video, audio, score, and Guitar Pro file metadata
- Personal music archive for artists, albums, and genres
- Import inbox for external music metadata

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Keep `VITE_ENABLE_DEMO_MODE=false` for real Supabase testing.
4. Optional: fill `VITE_TEST_LOGIN_EMAIL` with a Supabase Auth test user email to show a quick-fill login button.
5. Run `npm install`.
6. Run `npm run dev`.

Secrets must stay in local environment files and must not be committed.

## Test Login

For the quickest local testing, enable anonymous sign-ins in Supabase Auth, then use the `Anonymous test login` button on `#auth`. This creates a real Supabase session, so RLS-protected writes can work without a test inbox.

Demo Mode is still available for local UI development, but it is never enabled automatically. To use local `localStorage` data with `local-demo-user`, set this explicitly:

```env
VITE_ENABLE_DEMO_MODE=true
```

Turn Demo Mode off by removing that line or setting `VITE_ENABLE_DEMO_MODE=false`. When Demo Mode is off, missing Supabase env vars produce a configuration error instead of a fake login.

A real Supabase login is present only when `supabase.auth.getSession()` returns a session with `session.user.id`. On `#auth`, Demo Mode is labeled as `Demo Mode：当前不是 Supabase 真实登录`; real sessions show the `Run Supabase CRUD smoke test` button.

If you still want a reusable test email, create a test user in Supabase Auth and put its email in `.env.local`:

```env
VITE_TEST_LOGIN_EMAIL=player-test@example.com
```

Magic link login still requires the test email to receive the login link. Do not commit passwords, service role keys, or real private inbox credentials.

## Verification

Run the fastest local checks before pushing:

```powershell
npm test -- --run
npm run build
```
