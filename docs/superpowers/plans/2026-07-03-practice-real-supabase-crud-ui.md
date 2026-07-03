# Practice Real Supabase CRUD UI Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and, only if necessary, minimally complete the Practice UI create / list / update / delete loop under a real Supabase authenticated session.

**Architecture:** Keep work inside the existing `src/features/practice` feature. Do not introduce a new state manager, backend, UI framework, or schema change unless a real RLS / missing-field blocker proves it is necessary. Use the existing Supabase client and RLS model; every persisted row must be bound to the authenticated user.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, Supabase Auth, Supabase Postgres with RLS.

---

### Task 1: Inspect Current Practice CRUD Surface

**Files:**
- Read: `src/features/practice/practice.service.ts`
- Read: `src/features/practice/practice.service.test.ts`
- Read: `src/features/practice/PracticeSessionForm.tsx`
- Read: `src/features/practice/PracticeSessionForm.test.tsx`
- Read: `src/features/practice/PracticeHistoryPage.tsx`
- Read: `src/features/practice/PracticeHistoryPage.test.tsx`

- [ ] **Step 1: Confirm service methods**

Check whether `practice.service.ts` already exposes methods equivalent to:

```ts
listPracticeSessions()
createPracticeSession(input)
updatePracticeSession(id, input)
deletePracticeSession(id)
```

Expected result: identify whether update / delete already exist or need minimal additions.

- [ ] **Step 2: Confirm user binding**

Inspect create / update payloads and verify Supabase writes bind rows to the current authenticated user. The service must not accept arbitrary user ids from UI input.

Expected result: record whether user binding is already handled by service, database default, or RLS policy.

- [ ] **Step 3: Confirm UI coverage**

Inspect Practice UI and tests to confirm whether users can:

```text
create a practice session
see it in a list
edit it
delete it
```

Expected result: identify the smallest missing UI piece, if any.

---

### Task 2: Add Missing Service Coverage Only If Needed

**Files:**
- Modify if needed: `src/features/practice/practice.service.test.ts`
- Modify if needed: `src/features/practice/practice.service.ts`

- [ ] **Step 1: Write failing tests for missing service behavior**

If update or delete is missing, add focused tests similar to existing service tests. Test that Supabase calls only target the current row and do not accept UI-provided `user_id`.

Example expected behavior:

```ts
expect(queryBuilderMock.update).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: expect.any(String) }));
expect(queryBuilderMock.delete).toHaveBeenCalled();
```

- [ ] **Step 2: Run service tests and verify RED**

Run:

```powershell
npm test -- --run src/features/practice/practice.service.test.ts
```

Expected: new test fails for missing behavior, not because of syntax or test setup errors.

- [ ] **Step 3: Implement minimal service behavior**

Add only the missing service method or mapping. Do not refactor unrelated Practice service code.

- [ ] **Step 4: Run service tests and verify GREEN**

Run:

```powershell
npm test -- --run src/features/practice/practice.service.test.ts
```

Expected: all Practice service tests pass.

---

### Task 3: Add Missing UI Coverage Only If Needed

**Files:**
- Modify if needed: `src/features/practice/PracticeHistoryPage.test.tsx`
- Modify if needed: `src/features/practice/PracticeHistoryPage.tsx`
- Modify if needed: `src/features/practice/PracticeHistoryPage.css`
- Modify if needed: `src/features/practice/PracticeSessionForm.test.tsx`
- Modify if needed: `src/features/practice/PracticeSessionForm.tsx`

- [ ] **Step 1: Write failing UI test for the missing action**

If edit / delete UI is missing, add a test that starts from an existing practice session and verifies the expected user flow.

Example delete behavior:

```ts
await user.click(screen.getByRole('button', { name: /delete/i }));
expect(deletePracticeSession).toHaveBeenCalledWith('practice-1');
```

Example edit behavior:

```ts
await user.click(screen.getByRole('button', { name: /edit/i }));
await user.clear(screen.getByLabelText(/focus/i));
await user.type(screen.getByLabelText(/focus/i), 'alternate picking');
await user.click(screen.getByRole('button', { name: /save/i }));
expect(updatePracticeSession).toHaveBeenCalled();
```

Use existing labels and copy from the current Practice UI instead of inventing new wording.

- [ ] **Step 2: Run Practice UI tests and verify RED**

Run:

```powershell
npm test -- --run src/features/practice
```

Expected: new UI test fails for missing UI behavior.

- [ ] **Step 3: Implement minimal UI**

Add only the missing controls and states. Keep styling consistent with existing Practice pages. Do not redesign the page.

Required states if adding actions:

- loading / submitting disabled state
- error message when service rejects
- list refresh after success

- [ ] **Step 4: Run Practice UI tests and verify GREEN**

Run:

```powershell
npm test -- --run src/features/practice
```

Expected: all Practice tests pass.

---

### Task 4: Real Browser Supabase Verification

**Files:**
- No code change expected.

- [ ] **Step 1: Start or reuse the dev server**

If the app is already running at `http://localhost:5173`, reuse it. Do not run `npm install`.

- [ ] **Step 2: Use real login session**

Open the app with the same real Supabase account used for Auth smoke testing.

Expected account:

```text
15779799065@163.com
```

- [ ] **Step 3: Execute Practice CRUD UI flow**

In the Practice UI:

1. Create one temporary practice session.
2. Confirm it appears in the list.
3. Update a visible field such as focus area, duration, completion percent, or tags.
4. Confirm the updated value appears.
5. Delete the temporary row.
6. Confirm it disappears.

- [ ] **Step 4: Capture RLS errors without bypassing**

If Supabase returns RLS / permission errors, record the exact operation:

```text
select / insert / update / delete
```

Then fix the relevant policy with `TO authenticated` and ownership predicates using `auth.uid() = user_id`. Do not use service role key and do not add `SECURITY DEFINER` as a workaround.

---

### Task 5: Documentation Update

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] **Step 1: Record actual verification result**

Add whether Practice real CRUD UI passed or which operation failed.

- [ ] **Step 2: Update next queue**

If Practice CRUD UI passes, set next recommended task to Anontraveler import MVP using `docs/IMPORT_ANONTRAVELER.md`.

- [ ] **Step 3: Run final focused verification**

Run the smallest relevant checks:

```powershell
npm test -- --run src/features/practice
npm run build
```

Expected: tests and build pass, unless the task was documentation-only.
