# RcokRoll

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
3. Optional: fill `VITE_TEST_LOGIN_EMAIL` with a Supabase Auth test user email to show a quick-fill login button.
4. Run `npm install`.
5. Run `npm run dev`.

Secrets must stay in local environment files and must not be committed.

## Test Login

For local testing, create a test user in Supabase Auth and put its email in `.env.local`:

```env
VITE_TEST_LOGIN_EMAIL=player-test@example.com
```

RcokRoll still uses magic link login, so the test email must be able to receive the login link. Do not commit passwords, service role keys, or real private inbox credentials.

## Verification

Run the fastest local checks before pushing:

```powershell
npm test -- --run
npm run build
```
