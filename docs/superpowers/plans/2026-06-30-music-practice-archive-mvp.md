# Music Practice Archive MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first private cloud-first Web/PWA MVP for a personal music archive and practice tracking system.

**Architecture:** The MVP is a Supabase-backed Web/PWA where authenticated users manage songs, practice sessions, media assets, music archive entities, and import drafts. Songs are the central domain node connecting practice records, uploaded files, artists, albums, and genres. The first implementation prioritizes a working private product loop over PDF-to-GP conversion, public sharing, or community features.

**Tech Stack:** Recommended stack is Vite + React + TypeScript + Supabase + PostgreSQL + Supabase Storage + Playwright/Vitest. Because the user's global project default is Node.js v8.17.0, using this modern stack requires explicit approval to use a newer Node.js runtime, preferably Node.js 20 LTS or newer, before implementation begins.

---

## Scope And Runtime Decision

This repository is currently empty except for the design document. The implementation should start with a minimal but real cloud application, not a throwaway prototype.

Before running any scaffold command, the implementer must get explicit approval for one of these paths:

- **Recommended:** Modern Web/PWA stack using Node.js 20 LTS or newer, Vite, React, TypeScript, and Supabase.
- **Fallback:** Node.js v8-compatible no-build static app, which avoids modern tooling but makes maintainability, testing, type safety, and Supabase integration weaker.

This plan assumes the recommended modern stack after approval. Do not run `nvm`, `npm create`, `npm install`, or equivalent setup commands until that approval is given.

## File Structure

Planned files after MVP implementation:

```text
D:\Code\RockRoll
鈹溾攢 .env.example
鈹溾攢 .gitignore
鈹溾攢 README.md
鈹溾攢 package.json
鈹溾攢 tsconfig.json
鈹溾攢 vite.config.ts
鈹溾攢 index.html
鈹溾攢 src
鈹? 鈹溾攢 main.tsx
鈹? 鈹溾攢 App.tsx
鈹? 鈹溾攢 app
鈹? 鈹? 鈹溾攢 routes.tsx
鈹? 鈹? 鈹斺攢 shell
鈹? 鈹?    鈹溾攢 AppShell.tsx
鈹? 鈹?    鈹斺攢 AppShell.css
鈹? 鈹溾攢 config
鈹? 鈹? 鈹斺攢 env.ts
鈹? 鈹溾攢 lib
鈹? 鈹? 鈹斺攢 supabase.ts
鈹? 鈹溾攢 features
鈹? 鈹? 鈹溾攢 auth
鈹? 鈹? 鈹? 鈹溾攢 AuthPage.tsx
鈹? 鈹? 鈹? 鈹斺攢 auth.service.ts
鈹? 鈹? 鈹溾攢 backstage
鈹? 鈹? 鈹? 鈹斺攢 BackstagePage.tsx
鈹? 鈹? 鈹溾攢 songs
鈹? 鈹? 鈹? 鈹溾攢 SongListPage.tsx
鈹? 鈹? 鈹? 鈹溾攢 SongDetailPage.tsx
鈹? 鈹? 鈹? 鈹溾攢 song.types.ts
鈹? 鈹? 鈹? 鈹斺攢 songs.service.ts
鈹? 鈹? 鈹溾攢 practice
鈹? 鈹? 鈹? 鈹溾攢 PracticeSessionForm.tsx
鈹? 鈹? 鈹? 鈹溾攢 practice.types.ts
鈹? 鈹? 鈹? 鈹斺攢 practice.service.ts
鈹? 鈹? 鈹溾攢 archive
鈹? 鈹? 鈹? 鈹溾攢 ArchivePage.tsx
鈹? 鈹? 鈹? 鈹溾攢 archive.types.ts
鈹? 鈹? 鈹? 鈹斺攢 archive.service.ts
鈹? 鈹? 鈹溾攢 library
鈹? 鈹? 鈹? 鈹溾攢 LibraryPage.tsx
鈹? 鈹? 鈹? 鈹溾攢 media.types.ts
鈹? 鈹? 鈹? 鈹斺攢 media.service.ts
鈹? 鈹? 鈹斺攢 inbox
鈹? 鈹?    鈹溾攢 InboxPage.tsx
鈹? 鈹?    鈹溾攢 inbox.types.ts
鈹? 鈹?    鈹斺攢 inbox.service.ts
鈹? 鈹溾攢 styles
鈹? 鈹? 鈹溾攢 tokens.css
鈹? 鈹? 鈹斺攢 global.css
鈹? 鈹斺攢 test
鈹?    鈹斺攢 setup.ts
鈹溾攢 supabase
鈹? 鈹溾攢 migrations
鈹? 鈹? 鈹斺攢 0001_initial_schema.sql
鈹? 鈹斺攢 seed.sql
鈹斺攢 docs
   鈹斺攢 superpowers
      鈹溾攢 specs
      鈹? 鈹斺攢 2026-06-30-music-practice-archive-design.md
      鈹斺攢 plans
         鈹斺攢 2026-06-30-music-practice-archive-mvp.md
```

## Data Model

The initial schema should use user-owned rows with Row Level Security. Every user data table must include `user_id uuid not null references auth.users(id) on delete cascade`.

Core tables:

- `profiles`: user display profile and preferences.
- `artists`: artist or band records.
- `albums`: albums linked to artists.
- `genres`: genre taxonomy owned by the user.
- `songs`: central track/song records.
- `song_artists`: many-to-many relationship between songs and artists.
- `song_genres`: many-to-many relationship between songs and genres.
- `practice_sessions`: dated practice records linked to songs.
- `media_assets`: uploaded file metadata.
- `media_links`: links media assets to songs, practice sessions, artists, or albums.
- `external_sources`: external IDs and URLs from MusicBrainz, Discogs, Spotify, or other public sources.
- `import_jobs`: user-triggered import/search jobs.
- `import_candidates`: candidate results returned by external sources.
- `import_drafts`: user-selected candidates awaiting confirmation.

## Task 1: Confirm Runtime And Scaffold App

**Files:**
- Create: `D:\Code\RockRoll\.gitignore`
- Create: `D:\Code\RockRoll\.env.example`
- Create: `D:\Code\RockRoll\README.md`
- Create: `D:\Code\RockRoll\package.json`
- Create: `D:\Code\RockRoll\tsconfig.json`
- Create: `D:\Code\RockRoll\vite.config.ts`
- Create: `D:\Code\RockRoll\index.html`
- Create: `D:\Code\RockRoll\src\main.tsx`
- Create: `D:\Code\RockRoll\src\App.tsx`
- Create: `D:\Code\RockRoll\src\test\setup.ts`

- [ ] **Step 1: Get explicit runtime approval**

Ask the user:

```text
This MVP needs a modern Web/PWA toolchain. May I use Node.js 20 LTS or newer for D:\Code\RockRoll? I will not change legacy projects or use newer Node inside unrelated D:\Code projects.
```

Expected: User explicitly approves newer Node for this repository.

- [ ] **Step 2: Verify runtime**

Run:

```powershell
node -v
npm -v
```

Expected:

```text
v20.x.x or newer
npm version compatible with the active Node runtime
```

- [ ] **Step 3: Scaffold Vite React TypeScript app**

Run from `D:\Code`:

```powershell
npm create vite@latest RockRoll -- --template react-ts
```

If `D:\Code\RockRoll` already exists, use Vite only if it can scaffold into the existing empty working tree without deleting `docs`. If the command refuses, create the files manually instead of removing the repository.

Expected: `package.json`, `index.html`, `src`, and TypeScript config files exist while `docs` remains intact.

- [ ] **Step 4: Install dependencies**

Run from `D:\Code\RockRoll`:

```powershell
npm install
npm install @supabase/supabase-js @vitejs/plugin-react vite react react-dom
npm install -D typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: dependencies install without peer dependency errors.

- [ ] **Step 5: Replace `.env.example`**

Write:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

- [ ] **Step 6: Replace `.gitignore`**

Write:

```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
npm-debug.log*
coverage/
playwright-report/
test-results/
.DS_Store
Thumbs.db
```

- [ ] **Step 7: Add README project overview**

Write:

```markdown
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
3. Run `npm install`.
4. Run `npm run dev`.

Secrets must stay in local environment files and must not be committed.
```

- [ ] **Step 8: Configure test setup**

Set `vite.config.ts` to:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
```

Set `src/test/setup.ts` to:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 9: Verify scaffold**

Run:

```powershell
npm run build
npm test -- --run
```

Expected: build passes and test command exits successfully, even if there are no tests yet.

- [ ] **Step 10: Commit scaffold**

Run:

```powershell
git add .gitignore .env.example README.md package.json package-lock.json tsconfig.json vite.config.ts index.html src docs
git commit -m "chore: scaffold music archive web app"
```

## Task 2: Add Supabase Schema And Client

**Files:**
- Create: `D:\Code\RockRoll\supabase\migrations\0001_initial_schema.sql`
- Create: `D:\Code\RockRoll\supabase\seed.sql`
- Create: `D:\Code\RockRoll\src\config\env.ts`
- Create: `D:\Code\RockRoll\src\lib\supabase.ts`
- Test: `D:\Code\RockRoll\src\config\env.test.ts`

- [ ] **Step 1: Write env test**

Create `src/config/env.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

describe('env config', () => {
  it('returns configured Supabase values', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(readEnv()).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    });
  });

  it('throws when Supabase URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow('Missing VITE_SUPABASE_URL');
  });

  it('throws when Supabase anon key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow('Missing VITE_SUPABASE_ANON_KEY');
  });
});
```

- [ ] **Step 2: Run env test to verify it fails**

Run:

```powershell
npm test -- --run src/config/env.test.ts
```

Expected: FAIL because `src/config/env.ts` does not exist.

- [ ] **Step 3: Add env reader**

Create `src/config/env.ts`:

```ts
export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function readEnv(): AppEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}
```

- [ ] **Step 4: Add Supabase client**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { readEnv } from '../config/env';

const env = readEnv();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
```

- [ ] **Step 5: Add initial database migration**

Create `supabase/migrations/0001_initial_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_name text,
  country text,
  begin_year integer,
  end_year integer,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  title text not null,
  release_year integer,
  album_type text not null default 'album',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.genres(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid references public.albums(id) on delete set null,
  title text not null,
  release_year integer,
  difficulty integer check (difficulty is null or difficulty between 1 and 5),
  status text not null default 'planned',
  bpm integer check (bpm is null or bpm > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.song_artists (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'primary',
  primary key (song_id, artist_id, role)
);

create table public.song_genres (
  song_id uuid not null references public.songs(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (song_id, genre_id)
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  practiced_on date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0),
  bpm integer check (bpm is null or bpm > 0),
  focus_area text not null default '',
  problems text not null default '',
  reflection text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  media_type text not null check (media_type in ('video', 'audio', 'pdf', 'gp', 'image', 'backing_track', 'link')),
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.media_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  entity_type text not null check (entity_type in ('song', 'practice_session', 'artist', 'album')),
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.external_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song', 'genre')),
  entity_id uuid not null,
  source_name text not null check (source_name in ('musicbrainz', 'discogs', 'spotify')),
  source_id text not null,
  source_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_name, source_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  source_name text not null check (source_name in ('musicbrainz', 'discogs', 'spotify')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song')),
  display_title text not null,
  display_subtitle text not null default '',
  source_name text not null,
  source_id text not null,
  source_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_candidate_id uuid not null references public.import_candidates(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song')),
  draft_payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.genres enable row level security;
alter table public.songs enable row level security;
alter table public.song_artists enable row level security;
alter table public.song_genres enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_links enable row level security;
alter table public.external_sources enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_candidates enable row level security;
alter table public.import_drafts enable row level security;

create policy "profiles are private" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "artists are private" on public.artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "albums are private" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "genres are private" on public.genres
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "songs are private" on public.songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "song artists are private" on public.song_artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "song genres are private" on public.song_genres
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "practice sessions are private" on public.practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media assets are private" on public.media_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media links are private" on public.media_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "external sources are private" on public.external_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import jobs are private" on public.import_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import candidates are private" on public.import_candidates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import drafts are private" on public.import_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 6: Add seed file**

Create `supabase/seed.sql`:

```sql
-- Local development seed data should be added only after a local Supabase project exists.
-- Keep production secrets and real personal data out of this file.
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm test -- --run src/config/env.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit schema and client**

Run:

```powershell
git add supabase src/config src/lib
git commit -m "feat: add supabase schema and client"
```

## Task 3: Add Design System And App Shell

**Files:**
- Create: `D:\Code\RockRoll\src\styles\tokens.css`
- Create: `D:\Code\RockRoll\src\styles\global.css`
- Create: `D:\Code\RockRoll\src\app\shell\AppShell.tsx`
- Create: `D:\Code\RockRoll\src\app\shell\AppShell.css`
- Modify: `D:\Code\RockRoll\src\main.tsx`
- Modify: `D:\Code\RockRoll\src\App.tsx`
- Test: `D:\Code\RockRoll\src\app\shell\AppShell.test.tsx`

- [ ] **Step 1: Write shell test**

Create `src/app/shell/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders primary navigation and content', () => {
    render(
      <AppShell>
        <h2>Today in the room</h2>
      </AppShell>,
    );

    expect(screen.getByText('RockRoll')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Today in the room')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run shell test to verify it fails**

Run:

```powershell
npm test -- --run src/app/shell/AppShell.test.tsx
```

Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 3: Add design tokens**

Create `src/styles/tokens.css`:

```css
:root {
  --color-coal: #11100f;
  --color-smoke: #22201f;
  --color-ash: #3a3633;
  --color-paper: #f3ead8;
  --color-paper-muted: #cdbf9f;
  --color-wine: #7b1e2b;
  --color-amber: #f2a93b;
  --color-silver: #a7a29a;
  --font-display: "Arial Narrow", "Roboto Condensed", sans-serif;
  --font-body: Inter, "Segoe UI", Arial, sans-serif;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --radius-panel: 1.25rem;
  --shadow-stage: 0 24px 80px rgba(0, 0, 0, 0.4);
}
```

Create `src/styles/global.css`:

```css
@import './tokens.css';

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: var(--color-paper);
  background:
    radial-gradient(circle at 20% 0%, rgba(242, 169, 59, 0.16), transparent 32rem),
    radial-gradient(circle at 80% 20%, rgba(123, 30, 43, 0.22), transparent 28rem),
    var(--color-coal);
  font-family: var(--font-body);
}

button,
input,
textarea,
select {
  font: inherit;
}

a {
  color: inherit;
}
```

- [ ] **Step 4: Add AppShell component**

Create `src/app/shell/AppShell.tsx`:

```tsx
import './AppShell.css';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = ['Backstage', 'Songs', 'Archive', 'Inbox', 'Library'];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <span className="app-shell__rec" aria-hidden="true" />
          <span>RockRoll</span>
        </div>
        <nav aria-label="Primary" className="app-shell__nav">
          {navItems.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
```

Create `src/app/shell/AppShell.css`:

```css
.app-shell {
  display: grid;
  grid-template-columns: 16rem 1fr;
  min-height: 100vh;
}

.app-shell__sidebar {
  border-right: 1px solid rgba(167, 162, 154, 0.18);
  background: rgba(17, 16, 15, 0.78);
  padding: var(--space-6);
}

.app-shell__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-paper);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-shell__rec {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  background: var(--color-wine);
  box-shadow: 0 0 20px rgba(242, 169, 59, 0.75);
}

.app-shell__nav {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-8);
}

.app-shell__nav a {
  border: 1px solid rgba(167, 162, 154, 0.18);
  border-radius: 999px;
  padding: var(--space-3) var(--space-4);
  color: var(--color-paper-muted);
  text-decoration: none;
}

.app-shell__nav a:hover,
.app-shell__nav a:focus-visible {
  border-color: var(--color-amber);
  color: var(--color-paper);
  outline: none;
}

.app-shell__main {
  padding: var(--space-8);
}

@media (max-width: 760px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell__sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(167, 162, 154, 0.18);
  }

  .app-shell__nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 5: Wire global styles and shell**

Set `src/main.tsx` to:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Set `src/App.tsx` to:

```tsx
import { AppShell } from './app/shell/AppShell';

export default function App() {
  return (
    <AppShell>
      <section>
        <p className="eyebrow">Backstage Archive</p>
        <h1>Your private music archive and practice room.</h1>
        <p>
          Track songs, practice sessions, media files, and music research in one
          private cloud workspace.
        </p>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 6: Run shell test and build**

Run:

```powershell
npm test -- --run src/app/shell/AppShell.test.tsx
npm run build
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Commit design shell**

Run:

```powershell
git add src
git commit -m "feat: add backstage app shell"
```

## Task 4: Add Auth Page And Session Boundary

**Files:**
- Create: `D:\Code\RockRoll\src\features\auth\AuthPage.tsx`
- Create: `D:\Code\RockRoll\src\features\auth\auth.service.ts`
- Test: `D:\Code\RockRoll\src\features\auth\AuthPage.test.tsx`
- Modify: `D:\Code\RockRoll\src\App.tsx`

- [ ] **Step 1: Write auth page test**

Create `src/features/auth/AuthPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

describe('AuthPage', () => {
  it('submits email magic link request', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<AuthPage onSignIn={signIn} />);

    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send magic link' }));

    expect(signIn).toHaveBeenCalledWith('player@example.com');
    expect(await screen.findByText('Check your email for the login link.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run auth test to verify it fails**

Run:

```powershell
npm test -- --run src/features/auth/AuthPage.test.tsx
```

Expected: FAIL because `AuthPage` does not exist.

- [ ] **Step 3: Add auth service**

Create `src/features/auth/auth.service.ts`:

```ts
import { supabase } from '../../lib/supabase';

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
```

- [ ] **Step 4: Add auth page**

Create `src/features/auth/AuthPage.tsx`:

```tsx
import { FormEvent, useState } from 'react';
import { signInWithEmail } from './auth.service';

interface AuthPageProps {
  onSignIn?: (email: string) => Promise<void>;
}

export function AuthPage({ onSignIn = signInWithEmail }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await onSignIn(email);
      setMessage('Check your email for the login link.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send login link.');
    }
  }

  return (
    <main className="auth-page">
      <section>
        <p>Private backstage access</p>
        <h1>Sign in to your archive.</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit">Send magic link</button>
        </form>
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run auth test**

Run:

```powershell
npm test -- --run src/features/auth/AuthPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Wire temporary auth route**

Modify `src\App.tsx` so it renders `AuthPage` when the hash is `#auth`:

```tsx
import { AppShell } from './app/shell/AppShell';
import { AuthPage } from './features/auth/AuthPage';

export default function App() {
  if (window.location.hash === '#auth') {
    return <AuthPage />;
  }

  return (
    <AppShell>
      <section>
        <p className="eyebrow">Backstage Archive</p>
        <h1>Your private music archive and practice room.</h1>
        <p>
          Track songs, practice sessions, media files, and music research in one
          private cloud workspace.
        </p>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 7: Run tests and build**

Run:

```powershell
npm test -- --run
npm run build
```

Expected: PASS and build succeeds.

- [ ] **Step 8: Commit auth**

Run:

```powershell
git add src/features/auth src/App.tsx
git commit -m "feat: add email magic link auth"
```

## Task 5: Add Song Library

**Files:**
- Create: `D:\Code\RockRoll\src\features\songs\song.types.ts`
- Create: `D:\Code\RockRoll\src\features\songs\songs.service.ts`
- Create: `D:\Code\RockRoll\src\features\songs\SongListPage.tsx`
- Create: `D:\Code\RockRoll\src\features\songs\SongDetailPage.tsx`
- Test: `D:\Code\RockRoll\src\features\songs\SongListPage.test.tsx`

- [ ] **Step 1: Write song list test**

Create `src/features/songs/SongListPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SongListPage } from './SongListPage';
import { SongSummary } from './song.types';

describe('SongListPage', () => {
  it('renders songs and empty state', () => {
    const songs: SongSummary[] = [
      {
        id: 'song-1',
        title: 'Little Wing',
        artistName: 'Jimi Hendrix',
        status: 'learning',
        difficulty: 4,
      },
    ];

    render(<SongListPage songs={songs} />);

    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('learning')).toBeInTheDocument();
  });

  it('renders empty state when no songs exist', () => {
    render(<SongListPage songs={[]} />);

    expect(screen.getByText('No songs in the archive yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run song test to verify it fails**

Run:

```powershell
npm test -- --run src/features/songs/SongListPage.test.tsx
```

Expected: FAIL because song files do not exist.

- [ ] **Step 3: Add song types**

Create `src/features/songs/song.types.ts`:

```ts
export type SongStatus = 'planned' | 'learning' | 'polishing' | 'archived';

export interface SongSummary {
  id: string;
  title: string;
  artistName: string;
  status: SongStatus;
  difficulty: number | null;
}
```

- [ ] **Step 4: Add songs service**

Create `src/features/songs/songs.service.ts`:

```ts
import { supabase } from '../../lib/supabase';
import { SongSummary } from './song.types';

interface SongRow {
  id: string;
  title: string;
  status: SongSummary['status'];
  difficulty: number | null;
}

export async function listSongs(): Promise<SongSummary[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('id,title,status,difficulty')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SongRow[]).map((song) => ({
    id: song.id,
    title: song.title,
    artistName: 'Unknown artist',
    status: song.status,
    difficulty: song.difficulty,
  }));
}
```

- [ ] **Step 5: Add song pages**

Create `src/features/songs/SongListPage.tsx`:

```tsx
import { SongSummary } from './song.types';

interface SongListPageProps {
  songs: SongSummary[];
}

export function SongListPage({ songs }: SongListPageProps) {
  return (
    <section>
      <p className="eyebrow">Song-centered archive</p>
      <h1>Songs</h1>
      {songs.length === 0 ? (
        <p>No songs in the archive yet.</p>
      ) : (
        <div>
          {songs.map((song) => (
            <article key={song.id}>
              <h2>{song.title}</h2>
              <p>{song.artistName}</p>
              <p>{song.status}</p>
              {song.difficulty ? <p>Difficulty {song.difficulty}/5</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

Create `src/features/songs/SongDetailPage.tsx`:

```tsx
export function SongDetailPage() {
  return (
    <section>
      <p className="eyebrow">Song dossier</p>
      <h1>Song detail</h1>
      <p>Practice records, media, notes, and archive links will collect here.</p>
    </section>
  );
}
```

- [ ] **Step 6: Run song tests**

Run:

```powershell
npm test -- --run src/features/songs/SongListPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit song library**

Run:

```powershell
git add src/features/songs
git commit -m "feat: add song library foundation"
```

## Task 6: Add Practice Session Form

**Files:**
- Create: `D:\Code\RockRoll\src\features\practice\practice.types.ts`
- Create: `D:\Code\RockRoll\src\features\practice\practice.service.ts`
- Create: `D:\Code\RockRoll\src\features\practice\PracticeSessionForm.tsx`
- Test: `D:\Code\RockRoll\src\features\practice\PracticeSessionForm.test.tsx`

- [ ] **Step 1: Write practice form test**

Create `src/features/practice/PracticeSessionForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PracticeSessionForm } from './PracticeSessionForm';

describe('PracticeSessionForm', () => {
  it('submits a practice session draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<PracticeSessionForm onSave={onSave} />);

    await user.type(screen.getByLabelText('Duration minutes'), '45');
    await user.type(screen.getByLabelText('BPM'), '92');
    await user.type(screen.getByLabelText('Focus area'), 'Verse rhythm and bends');
    await user.type(screen.getByLabelText('Reflection'), 'Timing is tighter than yesterday.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSave).toHaveBeenCalledWith({
      durationMinutes: 45,
      bpm: 92,
      focusArea: 'Verse rhythm and bends',
      reflection: 'Timing is tighter than yesterday.',
    });
  });
});
```

- [ ] **Step 2: Run practice test to verify it fails**

Run:

```powershell
npm test -- --run src/features/practice/PracticeSessionForm.test.tsx
```

Expected: FAIL because practice files do not exist.

- [ ] **Step 3: Add practice types**

Create `src/features/practice/practice.types.ts`:

```ts
export interface PracticeSessionInput {
  durationMinutes: number;
  bpm: number | null;
  focusArea: string;
  reflection: string;
}
```

- [ ] **Step 4: Add practice service**

Create `src/features/practice/practice.service.ts`:

```ts
import { supabase } from '../../lib/supabase';
import { PracticeSessionInput } from './practice.types';

export async function createPracticeSession(input: PracticeSessionInput): Promise<void> {
  const { error } = await supabase.from('practice_sessions').insert({
    duration_minutes: input.durationMinutes,
    bpm: input.bpm,
    focus_area: input.focusArea,
    reflection: input.reflection,
  });

  if (error) {
    throw new Error(error.message);
  }
}
```

- [ ] **Step 5: Add practice form**

Create `src/features/practice/PracticeSessionForm.tsx`:

```tsx
import { FormEvent, useState } from 'react';
import { createPracticeSession } from './practice.service';
import { PracticeSessionInput } from './practice.types';

interface PracticeSessionFormProps {
  onSave?: (input: PracticeSessionInput) => Promise<void>;
}

export function PracticeSessionForm({ onSave = createPracticeSession }: PracticeSessionFormProps) {
  const [durationMinutes, setDurationMinutes] = useState('');
  const [bpm, setBpm] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [reflection, setReflection] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      durationMinutes: Number(durationMinutes),
      bpm: bpm ? Number(bpm) : null,
      focusArea,
      reflection,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="durationMinutes">Duration minutes</label>
      <input
        id="durationMinutes"
        type="number"
        min="1"
        value={durationMinutes}
        onChange={(event) => setDurationMinutes(event.target.value)}
        required
      />

      <label htmlFor="bpm">BPM</label>
      <input id="bpm" type="number" min="1" value={bpm} onChange={(event) => setBpm(event.target.value)} />

      <label htmlFor="focusArea">Focus area</label>
      <input id="focusArea" value={focusArea} onChange={(event) => setFocusArea(event.target.value)} />

      <label htmlFor="reflection">Reflection</label>
      <textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} />

      <button type="submit">Save practice session</button>
    </form>
  );
}
```

- [ ] **Step 6: Run practice tests**

Run:

```powershell
npm test -- --run src/features/practice/PracticeSessionForm.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit practice form**

Run:

```powershell
git add src/features/practice
git commit -m "feat: add practice session form"
```

## Task 7: Add Archive, Library, And Inbox Foundations

**Files:**
- Create: `D:\Code\RockRoll\src\features\archive\archive.types.ts`
- Create: `D:\Code\RockRoll\src\features\archive\archive.service.ts`
- Create: `D:\Code\RockRoll\src\features\archive\ArchivePage.tsx`
- Create: `D:\Code\RockRoll\src\features\library\media.types.ts`
- Create: `D:\Code\RockRoll\src\features\library\media.service.ts`
- Create: `D:\Code\RockRoll\src\features\library\LibraryPage.tsx`
- Create: `D:\Code\RockRoll\src\features\inbox\inbox.types.ts`
- Create: `D:\Code\RockRoll\src\features\inbox\inbox.service.ts`
- Create: `D:\Code\RockRoll\src\features\inbox\InboxPage.tsx`
- Test: `D:\Code\RockRoll\src\features\archive\ArchivePage.test.tsx`
- Test: `D:\Code\RockRoll\src\features\library\LibraryPage.test.tsx`
- Test: `D:\Code\RockRoll\src\features\inbox\InboxPage.test.tsx`

- [ ] **Step 1: Write page tests**

Create `src/features/archive/ArchivePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchivePage } from './ArchivePage';

describe('ArchivePage', () => {
  it('renders archive sections', () => {
    render(<ArchivePage />);

    expect(screen.getByText('Music Archive')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
  });
});
```

Create `src/features/library/LibraryPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryPage } from './LibraryPage';

describe('LibraryPage', () => {
  it('renders media categories', () => {
    render(<LibraryPage />);

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Scores')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });
});
```

Create `src/features/inbox/InboxPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InboxPage } from './InboxPage';

describe('InboxPage', () => {
  it('renders import inbox copy', () => {
    render(<InboxPage />);

    expect(screen.getByText('Import Inbox')).toBeInTheDocument();
    expect(screen.getByText('Search public music sources, then curate the result before it enters your archive.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run page tests to verify they fail**

Run:

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx src/features/library/LibraryPage.test.tsx src/features/inbox/InboxPage.test.tsx
```

Expected: FAIL because pages do not exist.

- [ ] **Step 3: Add archive files**

Create `src/features/archive/archive.types.ts`:

```ts
export interface ArchiveCountSummary {
  artists: number;
  albums: number;
  genres: number;
}
```

Create `src/features/archive/archive.service.ts`:

```ts
import { ArchiveCountSummary } from './archive.types';

export async function getArchiveSummary(): Promise<ArchiveCountSummary> {
  return {
    artists: 0,
    albums: 0,
    genres: 0,
  };
}
```

Create `src/features/archive/ArchivePage.tsx`:

```tsx
export function ArchivePage() {
  return (
    <section>
      <p className="eyebrow">Personal liner notes</p>
      <h1>Music Archive</h1>
      <div>
        <article>
          <h2>Artists</h2>
          <p>Band, artist, and musician dossiers.</p>
        </article>
        <article>
          <h2>Albums</h2>
          <p>Records, EPs, live albums, and editions.</p>
        </article>
        <article>
          <h2>Genres</h2>
          <p>Rock, jazz, blues, funk, metal, classical, fusion, and more.</p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add library files**

Create `src/features/library/media.types.ts`:

```ts
export type MediaType = 'video' | 'audio' | 'pdf' | 'gp' | 'image' | 'backing_track' | 'link';

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  mediaType: MediaType;
  createdAt: string;
}
```

Create `src/features/library/media.service.ts`:

```ts
import { supabase } from '../../lib/supabase';
import { MediaAssetSummary } from './media.types';

export async function listMediaAssets(): Promise<MediaAssetSummary[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id,file_name,media_type,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((asset) => ({
    id: asset.id,
    fileName: asset.file_name,
    mediaType: asset.media_type,
    createdAt: asset.created_at,
  }));
}
```

Create `src/features/library/LibraryPage.tsx`:

```tsx
export function LibraryPage() {
  return (
    <section>
      <p className="eyebrow">Tapes, scores, and takes</p>
      <h1>Library</h1>
      <div>
        <article>
          <h2>Videos</h2>
          <p>Practice takes and rehearsal clips.</p>
        </article>
        <article>
          <h2>Scores</h2>
          <p>PDF, Guitar Pro, MusicXML, and image scores.</p>
        </article>
        <article>
          <h2>Audio</h2>
          <p>Recordings, references, and backing tracks.</p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add inbox files**

Create `src/features/inbox/inbox.types.ts`:

```ts
export type ImportSource = 'musicbrainz' | 'discogs' | 'spotify';

export interface ImportCandidateSummary {
  id: string;
  displayTitle: string;
  displaySubtitle: string;
  sourceName: ImportSource;
}
```

Create `src/features/inbox/inbox.service.ts`:

```ts
import { supabase } from '../../lib/supabase';
import { ImportCandidateSummary } from './inbox.types';

export async function listImportCandidates(): Promise<ImportCandidateSummary[]> {
  const { data, error } = await supabase
    .from('import_candidates')
    .select('id,display_title,display_subtitle,source_name')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((candidate) => ({
    id: candidate.id,
    displayTitle: candidate.display_title,
    displaySubtitle: candidate.display_subtitle,
    sourceName: candidate.source_name,
  }));
}
```

Create `src/features/inbox/InboxPage.tsx`:

```tsx
export function InboxPage() {
  return (
    <section>
      <p className="eyebrow">Curate before it enters</p>
      <h1>Import Inbox</h1>
      <p>Search public music sources, then curate the result before it enters your archive.</p>
    </section>
  );
}
```

- [ ] **Step 6: Run page tests**

Run:

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx src/features/library/LibraryPage.test.tsx src/features/inbox/InboxPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit feature foundations**

Run:

```powershell
git add src/features/archive src/features/library src/features/inbox
git commit -m "feat: add archive library and inbox foundations"
```

## Task 8: Add Backstage Dashboard And Hash Routing

**Files:**
- Create: `D:\Code\RockRoll\src\features\backstage\BackstagePage.tsx`
- Create: `D:\Code\RockRoll\src\app\routes.tsx`
- Test: `D:\Code\RockRoll\src\app\routes.test.tsx`
- Modify: `D:\Code\RockRoll\src\App.tsx`

- [ ] **Step 1: Write routing test**

Create `src/app/routes.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { getRouteForHash } from './routes';

describe('getRouteForHash', () => {
  it('uses backstage as the default route', () => {
    expect(getRouteForHash('')).toBe('backstage');
  });

  it('resolves known routes', () => {
    expect(getRouteForHash('#songs')).toBe('songs');
    expect(getRouteForHash('#archive')).toBe('archive');
    expect(getRouteForHash('#inbox')).toBe('inbox');
    expect(getRouteForHash('#library')).toBe('library');
    expect(getRouteForHash('#auth')).toBe('auth');
  });
});
```

- [ ] **Step 2: Run routing test to verify it fails**

Run:

```powershell
npm test -- --run src/app/routes.test.tsx
```

Expected: FAIL because route helper does not exist.

- [ ] **Step 3: Add route helper**

Create `src/app/routes.tsx`:

```tsx
export type AppRoute = 'auth' | 'backstage' | 'songs' | 'archive' | 'inbox' | 'library';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
  '#archive': 'archive',
  '#inbox': 'inbox',
  '#library': 'library',
};

export function getRouteForHash(hash: string): AppRoute {
  return routes[hash] ?? 'backstage';
}
```

- [ ] **Step 4: Add backstage page**

Create `src/features/backstage/BackstagePage.tsx`:

```tsx
export function BackstagePage() {
  return (
    <section>
      <p className="eyebrow">Backstage Archive</p>
      <h1>Your private music archive and practice room.</h1>
      <div>
        <article>
          <h2>Today&apos;s practice</h2>
          <p>Choose a song, set a focus, and capture the session.</p>
        </article>
        <article>
          <h2>Recent tapes</h2>
          <p>Uploaded videos and audio will appear here.</p>
        </article>
        <article>
          <h2>Inbox</h2>
          <p>Imported music metadata waits here before it enters your archive.</p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Wire App routing**

Replace `src/App.tsx` with:

```tsx
import { AppShell } from './app/shell/AppShell';
import { getRouteForHash } from './app/routes';
import { ArchivePage } from './features/archive/ArchivePage';
import { AuthPage } from './features/auth/AuthPage';
import { BackstagePage } from './features/backstage/BackstagePage';
import { InboxPage } from './features/inbox/InboxPage';
import { LibraryPage } from './features/library/LibraryPage';
import { SongListPage } from './features/songs/SongListPage';

export default function App() {
  const route = getRouteForHash(window.location.hash);

  if (route === 'auth') {
    return <AuthPage />;
  }

  const page = {
    backstage: <BackstagePage />,
    songs: <SongListPage songs={[]} />,
    archive: <ArchivePage />,
    inbox: <InboxPage />,
    library: <LibraryPage />,
    auth: <AuthPage />,
  }[route];

  return <AppShell>{page}</AppShell>;
}
```

- [ ] **Step 6: Run tests and build**

Run:

```powershell
npm test -- --run
npm run build
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Commit routing and dashboard**

Run:

```powershell
git add src/app src/features/backstage src/App.tsx
git commit -m "feat: add backstage dashboard routing"
```

## Task 9: Add MusicBrainz Import Service Boundary

**Files:**
- Create: `D:\Code\RockRoll\src\features\inbox\musicbrainz.service.ts`
- Test: `D:\Code\RockRoll\src\features\inbox\musicbrainz.service.test.ts`

- [ ] **Step 1: Write MusicBrainz mapper test**

Create `src/features/inbox/musicbrainz.service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapMusicBrainzArtistCandidate } from './musicbrainz.service';

describe('mapMusicBrainzArtistCandidate', () => {
  it('maps MusicBrainz artist payload to import candidate shape', () => {
    const candidate = mapMusicBrainzArtistCandidate({
      id: 'abc-123',
      name: 'The Jimi Hendrix Experience',
      country: 'US',
      disambiguation: 'American-English rock band',
    });

    expect(candidate).toEqual({
      entityType: 'artist',
      displayTitle: 'The Jimi Hendrix Experience',
      displaySubtitle: 'US 路 American-English rock band',
      sourceName: 'musicbrainz',
      sourceId: 'abc-123',
      sourceUrl: 'https://musicbrainz.org/artist/abc-123',
    });
  });
});
```

- [ ] **Step 2: Run mapper test to verify it fails**

Run:

```powershell
npm test -- --run src/features/inbox/musicbrainz.service.test.ts
```

Expected: FAIL because mapper does not exist.

- [ ] **Step 3: Add MusicBrainz mapper**

Create `src/features/inbox/musicbrainz.service.ts`:

```ts
interface MusicBrainzArtistPayload {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
}

export interface ImportCandidateInput {
  entityType: 'artist' | 'album' | 'song';
  displayTitle: string;
  displaySubtitle: string;
  sourceName: 'musicbrainz';
  sourceId: string;
  sourceUrl: string;
}

export function mapMusicBrainzArtistCandidate(payload: MusicBrainzArtistPayload): ImportCandidateInput {
  const subtitleParts = [payload.country, payload.disambiguation].filter(Boolean);

  return {
    entityType: 'artist',
    displayTitle: payload.name,
    displaySubtitle: subtitleParts.join(' 路 '),
    sourceName: 'musicbrainz',
    sourceId: payload.id,
    sourceUrl: `https://musicbrainz.org/artist/${payload.id}`,
  };
}
```

- [ ] **Step 4: Run mapper test**

Run:

```powershell
npm test -- --run src/features/inbox/musicbrainz.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit import mapper**

Run:

```powershell
git add src/features/inbox/musicbrainz.service.ts src/features/inbox/musicbrainz.service.test.ts
git commit -m "feat: add musicbrainz import mapper"
```

## Task 10: Final MVP Verification

**Files:**
- Modify: `D:\Code\RockRoll\README.md`

- [ ] **Step 1: Update README with verification commands**

Append:

````markdown

## Verification

Run the fastest local checks before pushing:

```powershell
npm test -- --run
npm run build
```
````

- [ ] **Step 2: Run full fast checks**

Run:

```powershell
npm test -- --run
npm run build
git status --short
```

Expected:

```text
All tests pass.
Build succeeds.
Only README.md is modified before the final commit.
```

- [ ] **Step 3: Commit verification docs**

Run:

```powershell
git add README.md
git commit -m "docs: add verification commands"
```

- [ ] **Step 4: Confirm clean working tree**

Run:

```powershell
git status --short
```

Expected: no output.

## Spec Coverage Review

- Product positioning: covered by README, app shell, Backstage dashboard, and design tokens.
- Login and private cloud premise: covered by Supabase schema, RLS policies, and Auth page.
- Song-centered model: covered by schema, song library, practice sessions, media links, and archive relationships.
- Practice records: covered by practice session form and `practice_sessions` table.
- Video/file foundation: covered by `media_assets`, `media_links`, and Library page.
- Music archive: covered by artists, albums, genres, Archive page, and related schema.
- Import inbox: covered by import tables, Inbox page, and MusicBrainz mapper boundary.
- No sharing in MVP: preserved by omission of sharing tables, routes, and public access policies.
- PDF-to-GP: intentionally excluded from MVP implementation and retained only in the design document roadmap.

## Execution Notes

- Keep every commit small and scoped to the task.
- Do not commit `.env`, `.env.local`, secrets, uploaded media, or generated build output.
- Do not introduce public sharing routes or unauthenticated data reads in the MVP.
- Do not run expensive full browser automation until the basic test/build loop is stable.
- If Supabase credentials are not available, continue with local unit tests and schema files; do not invent credentials.

