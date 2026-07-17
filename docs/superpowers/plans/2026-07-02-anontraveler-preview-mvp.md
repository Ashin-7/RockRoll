# Anontraveler Preview MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-URL Anontraveler preview workflow in Inbox that reads public JSON and shows proposed Artist / Album / Archive data without writing to RockRoll.

**Architecture:** Keep the feature inside `src/features/inbox`. Add a focused `anontraveler.service.ts` for URL parsing, public JSON fetching, and response mapping. Extend `InboxPage` with an optional loader prop so tests can verify the preview without network calls.

**Tech Stack:** React 18, TypeScript, browser `fetch`, Vitest, Testing Library.

---

### Task 1: Preview Service

**Files:**
- Create: `src/features/inbox/anontraveler.types.ts`
- Create: `src/features/inbox/anontraveler.service.test.ts`
- Create: `src/features/inbox/anontraveler.service.ts`

- [ ] Write failing tests for parsing `rank/version/:versionId`, rejecting non-Anontraveler URLs, fetching the public JSON endpoint, and mapping article/items into preview data.
- [ ] Run `npm test -- --run src/features/inbox/anontraveler.service.test.ts` and verify RED.
- [ ] Implement the minimal parser, fetcher, and mapper.
- [ ] Re-run the same test and verify GREEN.

### Task 2: Inbox Page Preview

**Files:**
- Modify: `src/features/inbox/InboxPage.test.tsx`
- Modify: `src/features/inbox/InboxPage.tsx`
- Modify: `src/features/inbox/InboxPage.css`
- Modify: `src/i18n/messages.ts`

- [ ] Write failing tests for entering an Anontraveler URL, submitting preview, and rendering collection / artist / album / skipped song counts.
- [ ] Run `npm test -- --run src/features/inbox` and verify RED.
- [ ] Implement the minimal preview form and read-only result panel.
- [ ] Re-run the same test and verify GREEN.

### Task 3: Documentation And Verification

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `docs/IMPORT_ANONTRAVELER.md`

- [ ] Update docs to mark the preview MVP as local implementation complete.
- [ ] Run `npm test -- --run src/features/inbox`.
- [ ] Run `git diff --check`.
