# Media Library MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest usable Media Library workflow for adding media metadata and optionally linking it to an existing Song, Practice Session, Artist, or Album.

**Architecture:** Keep the feature inside `src/features/library`. Reuse the existing `media_assets` and `media_links` tables, mirror the current Supabase + Demo Mode service pattern, and keep the UI as a simple list plus creation form.

**Tech Stack:** React 18, TypeScript, Supabase, Vitest, Testing Library.

---

### Task 1: Media Service

**Files:**
- Modify: `src/features/library/media.types.ts`
- Create: `src/features/library/media.service.test.ts`
- Modify: `src/features/library/media.service.ts`

- [ ] Write failing tests for listing media assets with link summaries, creating a media asset, creating a media asset with a link, and Demo Mode behavior.
- [ ] Run `npm test -- --run src/features/library/media.service.test.ts` and verify RED.
- [ ] Implement minimal service functions: `listMediaAssets` and `createMediaAsset`.
- [ ] Re-run the same test and verify GREEN.

### Task 2: Library Page

**Files:**
- Modify: `src/features/library/LibraryPage.test.tsx`
- Modify: `src/features/library/LibraryPage.tsx`
- Create: `src/features/library/LibraryPage.css`
- Modify: `src/i18n/messages.ts`

- [ ] Write failing page tests for loading media assets and creating an asset linked to an album.
- [ ] Run `npm test -- --run src/features/library` and verify RED.
- [ ] Implement the minimal UI: media categories, creation form, loading/empty/error states, and asset list.
- [ ] Re-run the same test and verify GREEN.

### Task 3: Supabase Policy Stabilization

**Files:**
- Create: `supabase/migrations/20260702162000_stabilize_media_links.sql`

- [ ] Replace the broad `media_links` policy with select/insert/update/delete policies.
- [ ] Ensure a media link can only reference a media asset owned by the current user.
- [ ] Ensure linked Song / Practice / Artist / Album belongs to the current user.
- [ ] Run `git diff --check -- supabase/migrations/20260702162000_stabilize_media_links.sql`.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] Update docs with Media Library MVP status and verification results.
- [ ] Run `npm test -- --run src/features/library`.
- [ ] Run `git diff --check`.
