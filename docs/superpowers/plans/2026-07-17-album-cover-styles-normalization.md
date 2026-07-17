# Album Cover and Styles Normalization Implementation Plan

> **For the implementing agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless the user explicitly requests them.

**Goal:** Add formal `albums.cover_url` and `albums.styles` fields, write them for newly imported albums, and make Archive and Albums prefer formal values while retaining raw-payload fallback for old data.

**Architecture:** Use one additive Supabase migration and keep cover/styles on the existing `albums` row so album creation stays a single insert and existing Albums RLS remains authoritative. Preserve `external_sources.raw_payload` unchanged, keep Review plan and `match_existing` behavior unchanged, and merge formal values over source metadata in existing chunked read paths.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Supabase/PostgreSQL

## Global Constraints

- Do not run `npm install` or change dependencies or lockfiles.
- Do not run a real import, repeat an existing import, or write production-like data.
- Do not apply the migration to linked or remote Supabase without separate user authorization.
- Do not edit historical migrations; create one new migration through the Supabase CLI.
- Do not add RPCs, triggers, workers, task state, queues, tables, indexes, UI frameworks, or navigation entries.
- Do not restore Inbox as a main navigation entry.
- Do not change one-click import timing, Review plan payloads, import quantity semantics, external source identity, archive item identity, or artist/album `match_existing` behavior.
- Keep public album reads and admin-only public-library writes enforced by existing UI, service guards, and RLS.
- Preserve raw source metadata exactly; normalize only values written into the new formal columns.
- Do not perform old-data backfill. Existing albums use formal-field-first/raw-payload-fallback reads.
- Do not commit, push, publish, or deploy unless the user explicitly asks.
- Do not spawn subagents unless the user explicitly asks for subagent execution.

## File Map

- Create through Supabase CLI: the single generated migration under `supabase/migrations` for `add_album_cover_and_styles`.
- Create: `src/features/inbox/album-metadata.ts` — pure normalization for fields written into `albums`.
- Create: `src/features/inbox/album-metadata.test.ts` — focused normalization tests.
- Modify: `src/features/inbox/inbox.service.ts` — write normalized cover/styles in the existing album insert.
- Modify: `src/features/inbox/inbox.service.test.ts` — prove import writes the fields and permission/match behavior remains intact.
- Modify: `src/features/albums/albums.service.ts` — formal-first display and style filtering using existing 200-row/3-worker batching.
- Modify: `src/features/albums/albums.service.test.ts` — prove formal priority, raw fallback, full-collection filtering, and batching.
- Modify: `src/features/archive/archive.service.ts` — batch-load formal album metadata and merge it over raw payload.
- Modify: `src/features/archive/archive.service.test.ts` — prove formal priority, raw fallback, and no N+1 reads.
- Modify: `docs/PROJECT_STATUS.md` — record completed behavior, permission conclusion, and verification.
- Modify: `docs/NEXT_TASKS.md` — mark normalization complete and retain excluded follow-ups.
- Modify: `docs/SESSION_HANDOFF.md` — record files, commands, results, risks, and next prompt.
- Do not modify: `docs/PERMISSIONS.md`, `src/i18n/messages.ts`, UI pages, or existing migration files because the permission model and copy do not change.

---

### Task 1: Create the additive schema migration and verify inherited permissions

**Files:**
- Read: `supabase/migrations/0001_initial_schema.sql`
- Read: `supabase/migrations/20260706034529_public_library_admin_import.sql`
- Read: `supabase/migrations/20260708064649_restrict_public_library_writes_to_admin.sql`
- Create via CLI: the file printed by `supabase migration new add_album_cover_and_styles`

**Interfaces:**
- Consumes: existing `public.albums` table, table-level select/write grants, and Albums RLS policies.
- Produces: `public.albums.cover_url text null` and `public.albums.styles text[] not null default '{}'::text[]`.

- [ ] **Step 1: Verify current official Supabase migration/RLS guidance before schema work**

Use official Supabase sources only. Check `https://supabase.com/changelog.md` for relevant breaking changes, then confirm current migration creation and RLS behavior in official documentation. Stop and report if the installed CLI or official guidance conflicts with the commands below.

- [ ] **Step 2: Discover the installed CLI commands instead of guessing**

Run:

```powershell
supabase --version
supabase migration --help
supabase migration new --help
```

Expected: all commands exit 0 and document `supabase migration new <name>`. If `supabase` is unavailable, stop; do not hand-create or invent a timestamped migration filename.

- [ ] **Step 3: Reconfirm the existing Albums permission boundary**

Run:

```powershell
rg -n -C 4 "grant select on public\.albums|albums are public or owned for select" supabase/migrations/20260706034529_public_library_admin_import.sql
rg -n -C 4 "albums admin insert|albums admin update|albums admin delete" supabase/migrations/20260708064649_restrict_public_library_writes_to_admin.sql
```

Expected: public album rows are selectable by `anon, authenticated`; insert/update/delete policies call `public.is_public_library_admin((select auth.uid()))`. No policy change is needed for new columns on the same row.

- [ ] **Step 4: Create exactly one migration through the CLI**

Run:

```powershell
$before = @(Get-ChildItem -LiteralPath .\supabase\migrations -File | Select-Object -ExpandProperty FullName)
supabase migration new add_album_cover_and_styles
$after = @(Get-ChildItem -LiteralPath .\supabase\migrations -File | Select-Object -ExpandProperty FullName)
$migrationPath = @($after | Where-Object { $_ -notin $before })
if ($migrationPath.Count -ne 1) { throw "Expected exactly one generated migration, found $($migrationPath.Count)." }
$migrationPath = $migrationPath[0]
$migrationPath
```

Expected: one path ending in `_add_album_cover_and_styles.sql` is printed.

- [ ] **Step 5: Put only the approved additive SQL in the generated file**

Use `apply_patch` against the exact path printed in Step 4. The complete file content must be:

```sql
alter table public.albums
  add column cover_url text,
  add column styles text[] not null default '{}'::text[];
```

Do not add `if not exists`, data updates, policies, grants, functions, triggers, or indexes.

- [ ] **Step 6: Verify migration scope without applying it**

Run in the same PowerShell session that owns `$migrationPath`:

```powershell
$actual = (Get-Content -LiteralPath $migrationPath -Encoding UTF8 -Raw).Trim()
$expected = @"
alter table public.albums
  add column cover_url text,
  add column styles text[] not null default '{}'::text[];
"@.Trim()
if ($actual -ne $expected) { throw 'Migration content differs from the approved schema.' }
git diff --check -- $migrationPath
```

Expected: no exception and no `git diff --check` output. Do not run remote apply or RLS probes in this plan.

- [ ] **Step 7: Review checkpoint**

Confirm the migration is the only new file under `supabase/migrations` and contains no permission change. Do not commit unless the user explicitly asks.

---

### Task 2: Normalize import metadata and write it in the existing album insert

**Files:**
- Create: `src/features/inbox/album-metadata.ts`
- Create: `src/features/inbox/album-metadata.test.ts`
- Modify: `src/features/inbox/inbox.service.ts:1-12,852-870`
- Modify: `src/features/inbox/inbox.service.test.ts:757-890,981-986,1019-1071,1107-1161`

**Interfaces:**
- Consumes: `ImportCandidateMetadata` from `src/features/inbox/inbox.types.ts`.
- Produces: `normalizeAlbumFields(metadata?: ImportCandidateMetadata): { coverUrl: string | null; styles: string[] }`.
- Preserves: `commitPublicImportReviewPlan()` signature and `CommitImportReviewPlanResult`.

- [ ] **Step 1: Write the failing pure normalization tests**

Create `src/features/inbox/album-metadata.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeAlbumFields } from './album-metadata';

describe('normalizeAlbumFields', () => {
  it('trims cover urls and removes empty duplicate style labels in first-seen order', () => {
    expect(
      normalizeAlbumFields({
        coverUrl: '  https://img.example.test/album.jpg  ',
        styles: [' Rock ', '', 'Rock', 'rock', '  Psychedelic  '],
      }),
    ).toEqual({
      coverUrl: 'https://img.example.test/album.jpg',
      styles: ['Rock', 'rock', 'Psychedelic'],
    });
  });

  it('uses null and an empty array when source metadata is missing or blank', () => {
    expect(normalizeAlbumFields()).toEqual({ coverUrl: null, styles: [] });
    expect(normalizeAlbumFields({ coverUrl: '   ', styles: [' ', ''] })).toEqual({
      coverUrl: null,
      styles: [],
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox/album-metadata.test.ts
```

Expected: FAIL because `./album-metadata` does not exist.

- [ ] **Step 3: Implement the complete pure normalizer**

Create `src/features/inbox/album-metadata.ts` with:

```ts
import { ImportCandidateMetadata } from './inbox.types';

export interface NormalizedAlbumFields {
  coverUrl: string | null;
  styles: string[];
}

export function normalizeAlbumFields(metadata?: ImportCandidateMetadata): NormalizedAlbumFields {
  const coverUrl = metadata?.coverUrl?.trim() ?? '';
  const styles = Array.from(
    new Set((metadata?.styles ?? []).map((styleName) => styleName.trim()).filter(Boolean)),
  );

  return {
    coverUrl: coverUrl || null,
    styles,
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command again.

Expected: 1 test file and 2 tests pass.

- [ ] **Step 5: Extend the existing commit test so it fails on missing formal fields**

In `commits create review items into public formal library records as an admin`, add source fields to the album metadata:

```ts
metadata: {
  artistName: 'The Beatles',
  releaseYear: 1963,
  coverUrl: '  https://img.example.test/please-please-me.jpg  ',
  styles: [' Beat music ', '', 'Beat music', 'Rock'],
  albumType: 'studio album',
  note: 'Beat music marker.',
},
```

Change the expected album insert to:

```ts
expect(formalInsertMock).toHaveBeenCalledWith({
  user_id: 'user-1',
  artist_id: 'artist-created-1',
  title: 'Please Please Me',
  release_year: 1963,
  cover_url: 'https://img.example.test/please-please-me.jpg',
  styles: ['Beat music', 'Rock'],
  album_type: 'album',
  notes: 'Beat music marker.',
  visibility: 'public',
});
```

- [ ] **Step 6: Run the service test and verify RED**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox/inbox.service.test.ts
```

Expected: FAIL because the album insert lacks `cover_url` and `styles`.

- [ ] **Step 7: Use the helper only in the new-album create branch**

Add this import to `src/features/inbox/inbox.service.ts`:

```ts
import { normalizeAlbumFields } from './album-metadata';
```

Replace the album create callback body with the following logic, leaving automatic reuse and `match_existing` branches untouched:

```ts
.map(async (item) => {
  const payload = item.review_payload ?? {};
  const artistId = artistIdsByName.get(normalizeArtistName(payload.metadata?.artistName)) ?? null;
  const albumFields = normalizeAlbumFields(payload.metadata);
  const entityId = await insertPublicEntity('albums', {
    user_id: userId,
    artist_id: artistId,
    title: item.display_title,
    release_year: payload.metadata?.releaseYear ?? null,
    cover_url: albumFields.coverUrl,
    styles: albumFields.styles,
    album_type: normalizeAlbumType(payload.metadata?.albumType),
    notes: payload.metadata?.note ?? '',
    visibility: 'public',
  });
  albumIdsBySourceId.set(item.source_id, entityId);
  await savePublicExternalSource(item, 'album', entityId, userId);
  createdCount += 1;
}),
```

- [ ] **Step 8: Protect `match_existing` and automatic reuse with explicit assertions**

In the existing prefetch/reuse tests, add assertions that no album metadata update was introduced:

```ts
expect(formalUpdateMock).not.toHaveBeenCalledWith(
  expect.objectContaining({ cover_url: expect.anything() }),
);
expect(formalUpdateMock).not.toHaveBeenCalledWith(
  expect.objectContaining({ styles: expect.anything() }),
);
```

Keep the existing archive-item note backfill assertion unchanged; it is a different entity and remains supported.

- [ ] **Step 9: Run Inbox GREEN and permission regression**

Run the Step 6 command.

Expected: all `inbox.service.test.ts` tests pass, including `rejects public import commits from non-admin users`, automatic source reuse, note backfill, and manual match tests.

- [ ] **Step 10: Review checkpoint**

Inspect the diff for `src/features/inbox`. Confirm only the `planned_action === 'create'` album path writes the new columns and raw payload persistence is unchanged. Do not commit unless the user explicitly asks.

---

### Task 3: Make Albums collection cards prefer formal cover/styles with raw fallback

**Files:**
- Modify: `src/features/albums/albums.service.ts:14-21,54-56,72-134,254-365,482-503,655-677`
- Modify: `src/features/albums/albums.service.test.ts:74-103,147-214,378-491,619-798,800-827`

**Interfaces:**
- Consumes: `AlbumCollectionAlbumSummary` and existing `AlbumExternalMetadata`.
- Produces internally: `resolveAlbumCoverUrl(row: AlbumRow, metadata?: AlbumExternalMetadata): string` and `resolveAlbumStyles(formalStyles: unknown, fallbackStyles?: string[]): string[]`.
- Preserves: all exported Albums service signatures and existing artist-name/review-note fallback behavior.

- [ ] **Step 1: Write failing formal-priority and raw-fallback assertions**

In `lists albums grouped by public import collection with imported metadata`, make the album row contain formal values that differ from raw metadata:

```ts
{
  id: 'album-1',
  title: 'Axis: Bold as Love',
  release_year: 1967,
  album_type: 'album',
  notes: 'Second studio album.',
  cover_url: 'https://formal.example.test/axis.jpg',
  styles: ['Formal psychedelic rock'],
  artists: { name: 'Jimi Hendrix' },
}
```

Keep the existing raw metadata, then change the expected collection fields to:

```ts
availableStyles: ['Formal psychedelic rock'],
albums: [
  expect.objectContaining({
    id: 'album-1',
    coverUrl: 'https://formal.example.test/axis.jpg',
    styles: ['Formal psychedelic rock'],
    reviewNote: 'Essential guitar record.',
  }),
],
```

In `loads a single import collection by id with its albums`, add `cover_url: null` and `styles: []` to the album row. Replace the empty `externalInMock` result with:

```ts
{
  data: [
    {
      entity_id: 'album-1',
      raw_payload: {
        metadata: {
          coverUrl: 'https://img.example.test/axis-fallback.jpg',
          styles: ['Psychedelic rock', 'Blues rock'],
          artistName: 'The Jimi Hendrix Experience',
          note: 'Raw review note.',
        },
      },
    },
  ],
  error: null,
}
```

Extend the existing album assertion with:

```ts
artistName: 'The Jimi Hendrix Experience',
coverUrl: 'https://img.example.test/axis-fallback.jpg',
styles: ['Psychedelic rock', 'Blues rock'],
reviewNote: 'Raw review note.',
```

This is the explicit raw fallback case; keep rank, title, and the rest of the existing test intact.

- [ ] **Step 2: Run Albums service tests and verify RED**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums/albums.service.test.ts
```

Expected: FAIL because album selects and collection mapping ignore formal fields.

- [ ] **Step 3: Add formal fields and centralized select strings**

Extend `AlbumRow` and define select constants:

```ts
interface AlbumRow {
  id: string;
  title: string;
  release_year: number | null;
  album_type: string;
  notes: string;
  cover_url: string | null;
  styles: string[];
  artists: { name: string } | Array<{ name: string }> | null;
}

const albumSelectColumns = 'id,title,release_year,album_type,notes,cover_url,styles,artists(name)';
```

Replace all four repeated album select strings in `loadAlbumRowsByIds`, `listAlbums`, and `getAlbumById` with `albumSelectColumns`. Update select-string expectations in tests to use the exact new value.

- [ ] **Step 4: Add the formal-first resolver functions**

Add next to the existing raw metadata helpers:

```ts
function resolveAlbumCoverUrl(album: AlbumRow, metadata?: AlbumExternalMetadata): string {
  return album.cover_url?.trim() || metadata?.coverUrl || '';
}

function resolveAlbumStyles(formalStyles: unknown, fallbackStyles: string[] = []): string[] {
  const styles = readStringArray(formalStyles);
  return styles.length > 0 ? styles : fallbackStyles;
}
```

Do not trim, translate, case-fold, or otherwise rewrite stored formal styles during reads.

- [ ] **Step 5: Merge raw and formal data without changing artist/note precedence**

In `buildAlbumCollections`, keep raw metadata mapping but retain the raw `AlbumRow` in `albumsById`:

```ts
const albumsById = new Map(albumRows.map((album) => [album.id, album]));
const metadataByAlbumId = mapExternalMetadataRows(resolvedExternalSourceRows);
```

Use the following item mapping fields:

```ts
const albumRow = albumsById.get(item.entity_id);
if (!albumRow) {
  return groupedItems;
}

const album = mapAlbumRow(albumRow);
const metadata = metadataByAlbumId.get(item.entity_id);

// inside the collection item object
artistName: metadata?.artistName || album.artistName,
rank: item.position,
coverUrl: resolveAlbumCoverUrl(albumRow, metadata),
styles: resolveAlbumStyles(albumRow.styles, metadata?.styles),
reviewNote: metadata?.reviewNote || item.note || album.notes,
```

Calculate current-row available styles from the resolved collection items rather than raw metadata alone:

```ts
const availableStyles = Array.from(
  new Set(Object.values(itemsByCollectionId).flatMap((albums) => albums.flatMap((album) => album.styles))),
).sort((left, right) => left.localeCompare(right));
```

- [ ] **Step 6: Run Albums service tests and verify GREEN for display/fallback**

Run the Step 2 command.

Expected: formal cover/styles win, empty formal fields fall back to raw payload, imported artist-name and review-note behavior is unchanged, and all current batching tests still pass.

- [ ] **Step 7: Review checkpoint**

Confirm no exported type or UI component changed. Manual `createAlbum` and `updateAlbum` continue relying on schema defaults because this plan adds no cover/styles edit UI. Do not commit unless the user explicitly asks.

---

### Task 4: Include formal styles in full-collection style options and filtering

**Files:**
- Modify: `src/features/albums/albums.service.ts:43-48,128-134,254-294,391-479`
- Modify: `src/features/albums/albums.service.test.ts:216-376,493-617`

**Interfaces:**
- Consumes: existing 200-row chunk size and 3-worker batching.
- Produces internally: `AlbumStyleRow`, `loadAlbumStyleRowsByIds(...)`, and `mapResolvedStylesByAlbumId(...)`.
- Preserves: `getAlbumCollectionById(collectionId, page)` signature, page size, collection rank order, and source-note behavior.

- [ ] **Step 1: Change the style-filter test so formal styles must participate**

In `filters a collection by style across all collection items while loading only the requested result page`, make the source payload disagree with one formal row:

```ts
const albumStyleRows = [
  { id: 'album-rock', styles: ['Rock'] },
  { id: 'album-folk-1', styles: ['Formal folk'] },
  { id: 'album-folk-2', styles: [] },
];
```

Keep raw metadata for `album-folk-1` as `['Folk']` and for `album-folk-2` as `['Folk', 'Singer-songwriter']`. Request `style: 'Formal folk'` and expect:

```ts
expect.objectContaining({
  totalAlbumCount: 1,
  availableStyles: ['Folk', 'Formal folk', 'Rock', 'Singer-songwriter'],
  albums: [expect.objectContaining({ id: 'album-folk-1', styles: ['Formal folk'] })],
})
```

The expected style set demonstrates formal priority per album: raw `Folk` comes only from the old `album-folk-2`, not from `album-folk-1`.

- [ ] **Step 2: Run the filter test and verify RED**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums/albums.service.test.ts -t "filters a collection by style"
```

Expected: FAIL because filtering currently reads only `external_sources.raw_payload`.

- [ ] **Step 3: Add a lightweight full-collection formal-style loader**

Add:

```ts
interface AlbumStyleRow {
  id: string;
  styles: string[];
}

async function loadAlbumStyleRowsByIds(
  supabase: ReturnType<typeof getSupabase>,
  albumIds: string[],
): Promise<AlbumStyleRow[]> {
  const rows: AlbumStyleRow[] = [];

  await runWithConcurrency(
    chunkArray(albumIds, supabaseInFilterChunkSize),
    supabaseBatchConcurrency,
    async (albumIdChunk) => {
      const { data, error } = await supabase.from('albums').select('id,styles').in('id', albumIdChunk);
      if (error) {
        throw new Error(error.message);
      }
      rows.push(...((data ?? []) as AlbumStyleRow[]));
    },
  );

  return rows;
}
```

This query intentionally omits artist joins and other album columns so pagination still loads full detail only for the result page.

- [ ] **Step 4: Resolve one style array per album**

Add:

```ts
function mapResolvedStylesByAlbumId(
  albumRows: AlbumStyleRow[],
  externalSourceRows: ExternalSourceRow[],
): Map<string, string[]> {
  const externalMetadata = mapExternalMetadataRows(externalSourceRows);

  return new Map(
    albumRows.map((album) => [
      album.id,
      resolveAlbumStyles(album.styles, externalMetadata.get(album.id)?.styles),
    ]),
  );
}

function collectResolvedStyles(stylesByAlbumId: Map<string, string[]>): string[] {
  return Array.from(new Set(Array.from(stylesByAlbumId.values()).flat())).sort((left, right) =>
    left.localeCompare(right),
  );
}
```

Albums missing from `albumRows` must not be fabricated; public RLS determines which albums are visible.

- [ ] **Step 5: Load full formal styles and raw fallback together for paginated collections**

Replace the paginated prefetch branch with:

```ts
let fullAlbumStyleRows: AlbumStyleRow[] | undefined;
let resolvedStylesByAlbumId: Map<string, string[]> | undefined;

if (page) {
  fullCollectionItems = await loadCollectionAlbumItems(supabase, collectionId);
  const fullAlbumIds = Array.from(new Set(fullCollectionItems.map((item) => item.entity_id)));
  [fullAlbumStyleRows, fullExternalSourceRows] = await Promise.all([
    loadAlbumStyleRowsByIds(supabase, fullAlbumIds),
    loadExternalSourceRowsByAlbumIds(supabase, fullAlbumIds),
  ]);
  resolvedStylesByAlbumId = mapResolvedStylesByAlbumId(fullAlbumStyleRows, fullExternalSourceRows);
  availableStyles = collectResolvedStyles(resolvedStylesByAlbumId);
}
```

Change the selected-style filter to:

```ts
const filteredItems = (fullCollectionItems ?? []).filter((item) =>
  resolvedStylesByAlbumId?.get(item.entity_id)?.includes(selectedStyle),
);
```

Keep existing slice, total count, rank order, and page-detail load behavior unchanged.

- [ ] **Step 6: Update mocks to distinguish `id,styles` from full album selects**

In affected Albums service tests, implement the albums mock by select columns:

```ts
const albumSelectMock = vi.fn((columns: string) => ({
  in: columns === 'id,styles' ? albumStyleInMock : albumInMock,
}));

// inside fromMock for albums
return { delete: deleteMock, insert: insertMock, select: albumSelectMock, update: updateMock };
```

Assert both calls explicitly:

```ts
expect(albumSelectMock).toHaveBeenCalledWith('id,styles');
expect(albumStyleInMock).toHaveBeenCalledWith('id', ['album-rock', 'album-folk-1', 'album-folk-2']);
expect(albumInMock).toHaveBeenCalledWith('id', ['album-folk-1']);
```

- [ ] **Step 7: Preserve 200-row/3-worker behavior**

Extend `chunks collection album lookups` and `loads large collection album rows and metadata in limited parallel batches` so the lightweight style loader is also asserted to use chunks of 200 and at most three unresolved requests at once. Reuse the existing `createTrackedDeferred` helper rather than adding another concurrency implementation.

- [ ] **Step 8: Run all Albums service tests and verify GREEN**

Run the Task 3 Step 2 command.

Expected: all Albums service tests pass, including full-collection filtering, current-page detail loading, ranking, artist fallback, chunk sizes, and concurrency limits.

- [ ] **Step 9: Review checkpoint**

Confirm the new full-collection query selects only `id,styles`, formal styles override raw styles per album, and empty formal arrays still fall back. Do not commit unless the user explicitly asks.

---

### Task 5: Make Archive detail prefer formal album metadata in chunked reads

**Files:**
- Modify: `src/features/archive/archive.service.ts:34-47,80-117,337-415`
- Modify: `src/features/archive/archive.service.test.ts:1-15,164-291`

**Interfaces:**
- Consumes: existing `ArchiveItemSummary['albumMetadata']` shape.
- Produces internally: `AlbumFormalMetadataRow`, `loadFormalAlbumMetadataRows(...)`, and `mergeAlbumMetadata(...)`.
- Preserves: `getArchiveCollectionById(collectionId)` and all Archive UI types.

- [ ] **Step 1: Write failing formal-priority and fallback service cases**

Update `hydrates archive album items with imported external metadata` so the test provides both sources:

```ts
const albumInMock = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'album-1',
      cover_url: 'https://formal.example.test/please-please-me.jpg',
      styles: ['Formal beat music'],
    },
  ],
  error: null,
});
```

Keep the existing raw payload, then expect:

```ts
albumMetadata: {
  coverUrl: 'https://formal.example.test/please-please-me.jpg',
  releaseYear: 1963,
  styles: ['Formal beat music'],
  note: 'Original preview comment.',
}
```

Add a second case with `cover_url: null` and `styles: []`, asserting the original raw cover and `['Beat music', 'Rock']` are returned.

- [ ] **Step 2: Run Archive service tests and verify RED**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive/archive.service.test.ts
```

Expected: FAIL because `archive.service` does not query `albums` or merge formal values.

- [ ] **Step 3: Add formal metadata types and a sequential 200-row batch loader**

Add:

```ts
interface AlbumFormalMetadataRow {
  id: string;
  cover_url: string | null;
  styles: string[];
}

const supabaseInFilterChunkSize = 200;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function loadFormalAlbumMetadataRows(
  supabase: ReturnType<typeof getSupabase>,
  albumIds: string[],
): Promise<AlbumFormalMetadataRow[]> {
  const rows: AlbumFormalMetadataRow[] = [];

  for (const albumIdChunk of chunkArray(albumIds, supabaseInFilterChunkSize)) {
    const { data, error } = await supabase
      .from('albums')
      .select('id,cover_url,styles')
      .in('id', albumIdChunk);
    if (error) {
      throw new Error(error.message);
    }
    rows.push(...((data ?? []) as AlbumFormalMetadataRow[]));
  }

  return rows;
}

async function loadExternalAlbumMetadataRows(
  supabase: ReturnType<typeof getSupabase>,
  albumIds: string[],
): Promise<ExternalSourceRow[]> {
  const { data, error } = await supabase
    .from('external_sources')
    .select('entity_id,raw_payload')
    .eq('entity_type', 'album')
    .in('entity_id', albumIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExternalSourceRow[];
}
```

Sequential chunks are deliberate: they obey the established maximum concurrency without adding another concurrency helper to Archive.

- [ ] **Step 4: Add the formal/raw merge helper**

Add:

```ts
function mergeAlbumMetadata(
  formal: AlbumFormalMetadataRow | undefined,
  source: NonNullable<ArchiveItemSummary['albumMetadata']> | undefined,
): NonNullable<ArchiveItemSummary['albumMetadata']> {
  const formalStyles = readStringArray(formal?.styles);

  return {
    coverUrl: formal?.cover_url?.trim() || source?.coverUrl || '',
    releaseYear: source?.releaseYear ?? null,
    styles: formalStyles.length > 0 ? formalStyles : source?.styles ?? [],
    note: source?.note ?? '',
  };
}
```

Do not formalize release year or note in this task.

- [ ] **Step 5: Batch-load both metadata sources and merge per archive item**

In `getArchiveCollectionById`, load both sources after collecting unique album IDs:

```ts
const [formalAlbumRows, externalSourceRows] = await Promise.all([
  loadFormalAlbumMetadataRows(supabase, albumEntityIds),
  loadExternalAlbumMetadataRows(supabase, albumEntityIds),
]);
const formalByAlbumId = new Map(formalAlbumRows.map((row) => [row.id, row]));
const sourceByAlbumId = mapAlbumMetadataRows(externalSourceRows);
albumMetadataByEntityId = new Map(
  albumEntityIds
    .filter((albumId) => formalByAlbumId.has(albumId) || sourceByAlbumId.has(albumId))
    .map((albumId) => [
      albumId,
      mergeAlbumMetadata(formalByAlbumId.get(albumId), sourceByAlbumId.get(albumId)),
    ]),
);
```

The filter preserves the existing behavior for archive items that have neither a readable album row nor source metadata: do not fabricate an empty `albumMetadata` object.

- [ ] **Step 6: Update Archive mocks and prove no N+1 query**

Change affected `fromMock` behavior to distinguish `albums` and `external_sources`, then assert:

```ts
expect(fromMock).toHaveBeenCalledWith('albums');
expect(albumSelectMock).toHaveBeenCalledWith('id,cover_url,styles');
expect(albumInMock).toHaveBeenCalledWith('id', ['album-1']);
expect(albumInMock).toHaveBeenCalledTimes(1);
expect(externalSourceEqMock).toHaveBeenCalledWith('entity_type', 'album');
expect(externalInMock).toHaveBeenCalledWith('entity_id', ['album-1']);
```

Add 251 album IDs to a focused chunk test and assert `albumInMock` receives 200 then 51 IDs. The external-source query remains its existing bulk query in this task; do not introduce per-album calls.

- [ ] **Step 7: Run Archive service tests and verify GREEN**

Run the Step 2 command.

Expected: all Archive service tests pass with formal priority, raw fallback, existing notes/years, chunking, and admin-only write regressions intact.

- [ ] **Step 8: Review checkpoint**

Confirm Archive types and UI need no change and a missing formal value is the only condition that triggers raw fallback. Do not commit unless the user explicitly asks.

---

### Task 6: Run scoped verification and update RockRoll handoff documents

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Verify without modifying: `docs/PERMISSIONS.md`
- Verify without modifying: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: results from Tasks 1-5.
- Produces: current project status, next task boundary, and a compact handoff that records migration state and verification evidence.

- [ ] **Step 1: Run focused normalization and service tests**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox/album-metadata.test.ts src/features/inbox/inbox.service.test.ts src/features/albums/albums.service.test.ts src/features/archive/archive.service.test.ts
```

Expected: all four test files pass.

- [ ] **Step 2: Run the allowed feature regression set**

Run:

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive src/features/inbox src/features/albums
```

Expected: all Archive, Inbox, and Albums tests pass. Do not run the complete repository test suite.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite production build exit 0. Do not run `npm install` if the build fails; diagnose only within changed files and existing dependencies.

- [ ] **Step 4: Verify the migration and permission scope statically**

Run:

```powershell
rg -n "add column cover_url text|add column styles text\[\] not null default" supabase/migrations
rg -n "albums admin insert|albums admin update|albums admin delete" supabase/migrations/20260708064649_restrict_public_library_writes_to_admin.sql
rg -n "grant select on public\.albums|albums are public or owned for select" supabase/migrations/20260706034529_public_library_admin_import.sql
```

Expected: exactly one new cover/styles migration match and unchanged existing permission definitions. Do not run remote apply or use secrets.

- [ ] **Step 5: Check formatting only in the task scope**

Run:

```powershell
git diff --check -- supabase/migrations src/features/archive src/features/inbox src/features/albums docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md docs/superpowers/specs/2026-07-17-album-cover-styles-normalization-design.md docs/superpowers/plans/2026-07-17-album-cover-styles-normalization.md
```

Expected: no whitespace errors. Existing line-ending warnings may be recorded but must not trigger formatting-only rewrites.

- [ ] **Step 6: Update project status with exact evidence**

Append a dated section to `docs/PROJECT_STATUS.md` containing:

```markdown
## 追加完成：专辑封面与曲风正式字段化

- 新增 `albums.cover_url` 与 `albums.styles` additive migration；未回填旧数据，未应用 remote。
- 新导入专辑在原有单次 album insert 中写入清洗后的正式字段，同时继续保存 external source raw payload。
- Albums 与 Archive 正式字段优先、raw payload 回退；Albums 完整集合曲风筛选保持 200 条分块和最多 3 路并发。
- `match_existing`、一键导入提交时机、Review plan、导入数量口径、Inbox 导航和 admin-only 权限均未改变。
- `albums` 新列继承现有 public-read 与 admin-only write grants/RLS，没有新增 policy。
```

Add the actual test counts, build result, diff result, branch state, and any unresolved risk after running Steps 1-5. Do not claim remote RLS verification.

- [ ] **Step 7: Update next tasks and handoff without expanding scope**

In `docs/NEXT_TASKS.md`, mark cover/styles formalization complete and explicitly keep these outside the next task:

```markdown
- 不自动回填旧专辑，不重复真实导入；如需回填，单独设计 admin-only 幂等任务。
- 不建立曲风字典、别名或 `album_styles` 关系表，除非出现明确查询需求。
- migration 尚未应用 remote；应用与真实角色探针需要用户另行授权。
```

In `docs/SESSION_HANDOFF.md`, record:

- exact changed files, including the CLI-generated migration filename;
- exact commands and observed counts/results;
- no real import, no remote migration apply, no `npm install`;
- formal-first/raw-fallback behavior;
- unchanged `match_existing`, one-click timing, Inbox navigation, and permissions;
- the next prompt limited to remote migration apply/role probes only if the user explicitly authorizes it.

- [ ] **Step 8: Final review checkpoint**

Review `git diff --stat` and scoped `git diff`. Confirm there is no unrelated file, no generated build output, no secret, no `.env` change, no permissions document change, and no Inbox navigation change. Do not commit or push unless the user explicitly asks.

## Completion Criteria

- The CLI-generated additive migration contains only `cover_url` and `styles` additions and is not remotely applied.
- New imported albums write normalized formal fields in the existing insert.
- Existing albums display through raw fallback without reimport or backfill.
- Albums display and full-collection style filtering prefer formal styles per album.
- Archive detail prefers formal cover/styles and keeps raw year/note fallback.
- `match_existing`, automatic reuse, Review plan, one-click timing, counts, permissions, and Inbox navigation remain unchanged.
- Archive, Inbox, and Albums scoped tests plus production build pass.
- Status, next-task, and handoff documents contain exact observed evidence.
