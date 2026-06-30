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
3. Run `npm install`.
4. Run `npm run dev`.

Secrets must stay in local environment files and must not be committed.

## Verification

Run the fastest local checks before pushing:

```powershell
npm test -- --run
npm run build
```
