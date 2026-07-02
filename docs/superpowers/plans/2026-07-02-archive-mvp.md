# Archive MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest usable Archive Collection / Archive Item workflow for saving ranked or curated music lists inside RockRoll.

**Architecture:** Keep Archive inside `src/features/archive`. Add two private Supabase tables with RLS, mirror the existing Demo Mode pattern in localStorage, and expose a list page plus detail page through hash routing.

**Tech Stack:** React 18, TypeScript, Supabase, Vitest, Testing Library.

---

### Task 1: Archive Service

**Files:**
- Modify: `src/features/archive/archive.types.ts`
- Create: `src/features/archive/archive.service.test.ts`
- Modify: `src/features/archive/archive.service.ts`

- [ ] Write failing service tests for listing collections, creating collections, loading details with items, and adding album items.
- [ ] Run `npm test -- --run src/features/archive/archive.service.test.ts` and verify RED.
- [ ] Implement minimal Supabase and Demo Mode service functions.
- [ ] Re-run the same test and verify GREEN.

### Task 2: Archive Pages And Routes

**Files:**
- Modify: `src/features/archive/ArchivePage.test.tsx`
- Modify: `src/features/archive/ArchivePage.tsx`
- Create: `src/features/archive/ArchiveDetailPage.test.tsx`
- Create: `src/features/archive/ArchiveDetailPage.tsx`
- Create: `src/features/archive/ArchivePage.css`
- Create: `src/features/archive/ArchiveDetailPage.css`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/routes.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/messages.ts`

- [ ] Write failing page and route tests for `#archive` and `#archive/:id`.
- [ ] Run `npm test -- --run src/features/archive src/app/routes.test.tsx` and verify RED.
- [ ] Implement the minimal UI: collection list, collection creation, detail view, and manual album item form.
- [ ] Re-run the same test and verify GREEN.

### Task 3: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260702153000_create_archive_collections.sql`

- [ ] Add `archive_collections` and `archive_items` tables.
- [ ] Enable RLS and private policies.
- [ ] Add ownership checks so archive items can only reference collections and entities owned by the current user.
- [ ] Run `git diff --check -- supabase/migrations/20260702153000_create_archive_collections.sql`.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] Update docs with Archive MVP status and verification results.
- [ ] Run `npm test -- --run src/features/archive src/app/routes.test.tsx`.
- [ ] Run `git diff --check`.
