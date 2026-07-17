# Album Collection Full-Style Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `/albums` service-side pagination while making style filtering apply to the whole selected collection, not only the current page.

**Architecture:** Reuse `external_sources.raw_payload.metadata.styles` as the source of style metadata. Keep the unfiltered collection load on the current fast `.range()` path; when a style is selected, load only lightweight collection item ids plus external metadata to find matching album ids, then fetch the requested page of album details. No schema or migration changes.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Supabase JS/PostgREST.

---

### Task 1: Service Filtering

**Files:**
- Modify: `src/features/albums/album.types.ts`
- Modify: `src/features/albums/albums.service.ts`
- Test: `src/features/albums/albums.service.test.ts`

- [ ] Add `style?: string` to `AlbumCollectionPageInput`.
- [ ] Add tests showing `getAlbumCollectionById(collectionId, { pageIndex, pageSize, style })` returns only matching rows and uses filtered total count.
- [ ] Add a helper to read all collection album item ids and all matching external metadata for style filtering.
- [ ] Keep unfiltered calls on the existing `.range()` path.

### Task 2: Page Wiring

**Files:**
- Modify: `src/features/albums/AlbumListPage.tsx`
- Test: `src/features/albums/AlbumListPage.test.tsx`

- [ ] Add tests showing style selection calls `onLoadAlbumCollection` with `{ pageIndex: 0, pageSize: 25, style }`.
- [ ] Add tests showing next page under a selected style keeps the style parameter.
- [ ] Wire `selectedStyle` into collection page loads and reset to page 0 when changed.

### Task 3: Verification and Docs

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] Run `npm test -- --run src/features/albums`.
- [ ] Run `npm test -- --run src/features/inbox` and `npm test -- --run src/features/archive`.
- [ ] Run `npm run build`.
- [ ] Update docs with the full-collection style filtering behavior and remaining trade-off.
