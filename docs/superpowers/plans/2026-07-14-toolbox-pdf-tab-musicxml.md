# Toolbox PDF Tab to MusicXML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-local Toolbox workflow that diagnoses clean electronic guitar-tab PDFs and exports a safe MusicXML score skeleton for Guitar Pro 8.

**Architecture:** Add a feature-first `toolbox` module. Dynamically load PDF.js behind a small adapter, analyze normalized text/vector data in pure functions, serialize a score skeleton independently, and keep the React page limited to workflow state and presentation.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, `pdfjs-dist@4.10.38`, MusicXML 4.0.

## Global Constraints

- Browser-local only; never upload or persist source PDFs.
- Support clean electronic PDF, single six-string guitar, standard E A D G B E tuning.
- Export `.musicxml`, not proprietary `.gp`.
- Do not silently guess uncertain music symbols; surface warnings.
- Do not modify Supabase, RLS, Archive, Inbox, or Practice behavior.
- Keep `pdfjs-dist` dynamically imported from the toolbox adapter.

---

### Task 1: Route and Toolbox Page Shell

**Files:**
- Create: `src/features/toolbox/ToolboxPage.tsx`
- Create: `src/features/toolbox/ToolboxPage.css`
- Create: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/routes.test.tsx`
- Modify: `src/app/shell/AppShell.tsx`
- Modify: `src/app/shell/AppShell.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Produces: `ToolboxPage`, route name `toolbox`, hash `#toolbox`, bilingual `toolbox.*` messages.

- [ ] Write failing route, navigation, App, and page-shell tests for `#toolbox`, local-only copy, and a PDF file input.
- [ ] Run `vitest --run src/app/routes.test.tsx src/app/shell/AppShell.test.tsx src/App.test.tsx src/features/toolbox/ToolboxPage.test.tsx`; expect missing route/component failures.
- [ ] Implement the minimal route, navigation item, page shell, accessible file input, and responsive feature styles.
- [ ] Re-run the four tests; expect PASS.

### Task 2: Pure PDF Input Validation and Score Analysis

**Files:**
- Create: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/tab-analyzer.ts`
- Create: `src/features/toolbox/tab-analyzer.test.ts`

**Interfaces:**
- Produces: `PdfTextItem`, `PdfDocumentSnapshot`, `TabScoreAnalysis`, `validatePdfFile(file)`, `analyzeTabScore(snapshot)`.

- [ ] Write failing tests that reject non-PDF/over-20-MB files and extract title, 92 BPM, 4/4, measures 1-18, vector-PDF status, and warnings from normalized fixtures.
- [ ] Run `vitest --run src/features/toolbox/tab-analyzer.test.ts`; expect missing-module failure.
- [ ] Implement pure validation and analysis with no PDF.js or React imports.
- [ ] Re-run the analyzer test; expect PASS.

### Task 3: Browser PDF.js Adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/toolbox/pdf.service.ts`
- Create: `src/features/toolbox/pdf.service.test.ts`

**Interfaces:**
- Consumes: `PdfDocumentSnapshot` from Task 2.
- Produces: `readPdfSnapshot(file: File): Promise<PdfDocumentSnapshot>`.

- [ ] Add `pdfjs-dist@4.10.38` as the only new dependency.
- [ ] Write a failing adapter test using an injected PDF loader fixture to verify page/text/vector normalization and 20-page rejection.
- [ ] Run `vitest --run src/features/toolbox/pdf.service.test.ts`; expect missing implementation failure.
- [ ] Implement dynamic PDF.js loading, worker URL configuration, cleanup, and normalized snapshot output.
- [ ] Re-run the adapter test; expect PASS.

### Task 4: Safe MusicXML Skeleton Export

**Files:**
- Create: `src/features/toolbox/musicxml.service.ts`
- Create: `src/features/toolbox/musicxml.service.test.ts`

**Interfaces:**
- Consumes: `TabScoreAnalysis` from Task 2.
- Produces: `createMusicXml(analysis): string`, `getMusicXmlFileName(pdfName): string`.

- [ ] Write failing tests for XML escaping, standard guitar tuning, tempo/time signature, exact measure count, whole-measure rest placeholders, and warning credit text.
- [ ] Run `vitest --run src/features/toolbox/musicxml.service.test.ts`; expect missing-module failure.
- [ ] Implement MusicXML 4.0 serialization without DOM-only APIs.
- [ ] Parse the result with `DOMParser` in the test and assert zero parser errors.
- [ ] Re-run the MusicXML test; expect PASS.

### Task 5: Connect Analysis and Download Workflow

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/features/toolbox/ToolboxPage.css`

**Interfaces:**
- Consumes: `readPdfSnapshot`, `analyzeTabScore`, `createMusicXml`, `getMusicXmlFileName`.
- Produces: complete local select -> analyze -> review warnings -> download workflow.

- [ ] Extend the page test first for loading, summary, warning, disabled download, successful download, error recovery, and object URL cleanup.
- [ ] Run the page test; expect missing workflow failures.
- [ ] Implement the minimal state machine and dependency-injected handlers for deterministic tests.
- [ ] Re-run the page test; expect PASS.

### Task 6: Real Sample and Project Verification

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

**Interfaces:**
- Verifies the local sample without copying it into the repository.

- [ ] Run toolbox, routes, shell, and App tests.
- [ ] Run TypeScript and Vite build.
- [ ] Use a temporary local verification script against `C:\Users\Ashin\Downloads\endless rain.pdf`; assert 4 pages, vector content, measures 1-18, and 92 BPM.
- [ ] Open the generated XML with an XML parser; record that Guitar Pro manual-open verification remains user-side if the application is unavailable.
- [ ] Update status, next tasks, and handoff with exact results and the next recognition stage: string/fret geometry before rhythm/techniques.

