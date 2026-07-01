# Songs Supabase Data Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect `#songs` to real Supabase `songs` data with a minimal read/add loop.

**Architecture:** Keep data access in `src/features/songs/songs.service.ts`. `SongListPage` becomes a small stateful page that calls injected `onLoadSongs`/`onCreateSong` functions by defaulting to the real service, while tests inject fake functions.

**Tech Stack:** React 18, TypeScript, Supabase JS, Vite, Vitest, Testing Library, current i18n system.

---

## File Structure

- Create: `src/features/songs/songs.service.test.ts`
  - Tests Supabase reads, inserts, status fallback, and missing-session errors.
- Modify: `src/features/songs/song.types.ts`
  - Adds `CreateSongInput`.
- Modify: `src/features/songs/songs.service.ts`
  - Adds `createSong(input)` and hardens `listSongs()` row mapping.
- Modify: `src/features/songs/SongListPage.test.tsx`
  - Covers loading, real list, empty, error, create-and-refresh, and Chinese copy.
- Modify: `src/features/songs/SongListPage.tsx`
  - Loads songs from service, renders minimal add form, and refreshes after create.
- Modify: `src/features/songs/SongListPage.css`
  - Adds feature-local form/error/loading styles.
- Modify: `src/i18n/messages.ts`
  - Adds loading/error/add form messages.
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`
  - Records Songs real data loop completion.

## Commands

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/songs/songs.service.test.ts src/features/songs/SongListPage.test.tsx
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

---

### Task 1: Add Songs Service Read/Write Tests

**Files:**
- Create: `src/features/songs/songs.service.test.ts`
- Modify: `src/features/songs/song.types.ts`
- Modify: `src/features/songs/songs.service.ts`

- [ ] **Step 1: Write failing service tests**

Create `src/features/songs/songs.service.test.ts` with tests that mock `getSupabase()` and verify:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const insertMock = vi.fn();
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock }));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: { getSession: getSessionMock },
    from: fromMock,
  }),
}));

describe('songs.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists songs from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'song-1', title: 'Little Wing', status: 'learning', difficulty: 4 }],
      error: null,
    });
    const { listSongs } = await import('./songs.service');

    await expect(listSongs()).resolves.toEqual([
      { id: 'song-1', title: 'Little Wing', artistName: 'Unknown artist', status: 'learning', difficulty: 4 },
    ]);
    expect(fromMock).toHaveBeenCalledWith('songs');
    expect(selectMock).toHaveBeenCalledWith('id,title,status,difficulty');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('falls back to planned for unknown song status', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'song-1', title: 'Untyped Song', status: 'unexpected', difficulty: null }],
      error: null,
    });
    const { listSongs } = await import('./songs.service');

    await expect(listSongs()).resolves.toEqual([
      { id: 'song-1', title: 'Untyped Song', artistName: 'Unknown artist', status: 'planned', difficulty: null },
    ]);
  });

  it('creates a song for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createSong } = await import('./songs.service');

    await createSong({ title: 'New Song', status: 'planned', difficulty: 3 });

    expect(fromMock).toHaveBeenCalledWith('songs');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'New Song',
      status: 'planned',
      difficulty: 3,
    });
  });

  it('writes null difficulty when difficulty is empty', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createSong } = await import('./songs.service');

    await createSong({ title: 'New Song', status: 'learning', difficulty: null });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ difficulty: null }));
  });

  it('throws when creating without a signed-in user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { createSong } = await import('./songs.service');

    await expect(createSong({ title: 'New Song', status: 'planned', difficulty: null })).rejects.toThrow(
      'Sign in before adding songs.',
    );
  });
});
```

- [ ] **Step 2: Run service tests and verify red**

Expected: FAIL because `createSong` and `CreateSongInput` do not exist yet.

- [ ] **Step 3: Implement types and service**

Add `CreateSongInput` to `song.types.ts`:

```ts
export interface CreateSongInput {
  title: string;
  status: SongStatus;
  difficulty: number | null;
}
```

Update `songs.service.ts` so it exports `createSong(input: CreateSongInput): Promise<void>`, validates status with a local `toSongStatus`, reads `supabase.auth.getSession()`, requires `session.user.id`, and inserts `{ user_id, title, status, difficulty }`.

- [ ] **Step 4: Verify service tests pass**

Run targeted service test.

- [ ] **Step 5: Commit service changes**

```powershell
git add src/features/songs/songs.service.test.ts src/features/songs/song.types.ts src/features/songs/songs.service.ts
git commit -m "feat: add songs supabase write service"
```

---

### Task 2: Connect SongListPage To Real Data

**Files:**
- Modify: `src/features/songs/SongListPage.test.tsx`
- Modify: `src/features/songs/SongListPage.tsx`
- Modify: `src/features/songs/SongListPage.css`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Replace page tests with real-data behavior tests**

Tests should verify injected loader data renders, loading text appears, empty/error states render, create calls injected creator and refreshes, and Chinese add-song text renders.

- [ ] **Step 2: Run page tests and verify red**

Expected: FAIL because `SongListPage` does not load or create real data yet.

- [ ] **Step 3: Add i18n keys**

Add English keys:

```ts
'songs.loading': 'Loading songs...',
'songs.loadError': 'Unable to load songs.',
'songs.addTitle': 'Add song',
'songs.titleLabel': 'Title',
'songs.statusLabel': 'Status',
'songs.difficultyLabel': 'Difficulty',
'songs.noDifficulty': 'No difficulty',
'songs.addSubmit': 'Add song',
'songs.addSuccess': 'Song added.',
```

Add Chinese keys:

```ts
'songs.loading': '正在加载曲目...',
'songs.loadError': '曲目加载失败。',
'songs.addTitle': '新增曲目',
'songs.titleLabel': '标题',
'songs.statusLabel': '状态',
'songs.difficultyLabel': '难度',
'songs.noDifficulty': '不设置难度',
'songs.addSubmit': '新增曲目',
'songs.addSuccess': '曲目已新增。',
```

- [ ] **Step 4: Implement SongListPage data loop**

`SongListPage` should accept optional props:

```ts
songs?: SongSummary[];
onLoadSongs?: () => Promise<SongSummary[]>;
onCreateSong?: (input: CreateSongInput) => Promise<void>;
```

When `songs` prop is absent, call `onLoadSongs` on mount. Render loading/error/empty/list. Render a form with title, status, difficulty. On submit call `onCreateSong`, then reload via `onLoadSongs`.

- [ ] **Step 5: Add small feature-local styles**

Add form/status/error styles to `SongListPage.css` using existing colors and spacing.

- [ ] **Step 6: Verify page tests pass**

Run targeted page test.

- [ ] **Step 7: Commit page changes**

```powershell
git add src/features/songs/SongListPage.test.tsx src/features/songs/SongListPage.tsx src/features/songs/SongListPage.css src/i18n/messages.ts
git commit -m "feat: load songs from supabase"
```

---

### Task 3: Update Status And Verify

**Files:**
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update project status**

Record that Songs has a Supabase real data read/add loop. Move next suggestion to Artist Library or Practice real data query, depending on current direction.

- [ ] **Step 2: Run targeted tests**

Run Songs service and page tests.

- [ ] **Step 3: Run full test suite**

Run full Vitest suite.

- [ ] **Step 4: Run production build**

Run `npm run build` with command-local Node 20.

- [ ] **Step 5: Commit status update**

```powershell
git add docs/superpowers/docs/PROJECT_STATUS.md
git commit -m "docs: update songs data loop status"
```

---

## Self-Review

- Spec coverage: covers real Supabase read, create, user_id/RLS, loading/error/empty/list states, i18n, no Node backend, no schema changes.
- Placeholder scan: no TBD/TODO remains.
- Type consistency: `CreateSongInput`, `SongSummary`, `SongStatus`, `listSongs`, and `createSong` are consistently named.
- Scope check: Artist relationships and Practice real queries are explicitly excluded.
