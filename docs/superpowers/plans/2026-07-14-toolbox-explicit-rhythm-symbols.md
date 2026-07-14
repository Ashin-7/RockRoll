# Toolbox Explicit Rhythm Symbols Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recognize rhythm values explicitly drawn in the standard staff paired with a guitar TAB system, export only complete high-confidence measures as MusicXML notes, and fall back whole measures without asking the user to enter durations.

**Architecture:** Extend the browser-local PDF snapshot with normalized painted vector paths while preserving the existing line-segment API. Pure Toolbox modules pair five-line staff systems with six-line TAB systems, classify explicit note/rest symbols, align them to existing `TabFretEvent` columns, and validate complete measure duration before MusicXML consumes the result.

**Tech Stack:** React 18, TypeScript 5.7, Vite 8, Vitest 4, Testing Library, `pdfjs-dist@4.10.38`, MusicXML 4.0.

## Global Constraints

- Browser-local only; never upload, persist, copy, or log the source PDF.
- Do not modify Supabase, RLS, migrations, storage, or permissions.
- Do not add dependencies and do not run `npm install`.
- Recognize explicit standard-staff symbols only; never derive rhythm from TAB horizontal spacing.
- Support whole, half, quarter, eighth, and sixteenth notes/rests plus one dot.
- Do not support tuplets, ties, cross-measure continuation, techniques, scans, playback, manual duration editing, or proprietary `.gp` generation.
- A measure is either fully recognized and duration-valid or fully replaced by the existing whole-measure rest placeholder.
- Medium-confidence or ambiguous symbols are diagnostic-only and never exported as real notes.
- Preserve the existing safe-skeleton download when no reliable paired standard staff exists.

---

## File Structure

- Modify `src/features/toolbox/toolbox.types.ts`: normalized PDF path, paired staff, rhythm glyph, recognized event, and measure result types.
- Modify `src/features/toolbox/pdf.service.ts`: extract painted paths without changing existing text and line-segment behavior.
- Modify `src/features/toolbox/pdf.service.test.ts`: characterize path transforms, paint state, bounds, and cleanup.
- Create `src/features/toolbox/staff-tab-alignment.ts`: locate five-line systems and pair each one with the six-line TAB system below it.
- Create `src/features/toolbox/staff-tab-alignment.test.ts`: pairing, rejection, and page/system isolation fixtures.
- Create `src/features/toolbox/rhythm-symbols.ts`: classify explicit noteheads, stems, beams, dots, and rests into rhythm glyph events.
- Create `src/features/toolbox/rhythm-symbols.test.ts`: duration, rest, dot, conflict, and unsupported-symbol fixtures.
- Create `src/features/toolbox/rhythm-measures.ts`: align glyph events to `TabFretEvent` and validate exact measure capacity.
- Create `src/features/toolbox/rhythm-measures.test.ts`: unique pairing, chord columns, rests, capacity, and whole-measure fallback.
- Modify `src/features/toolbox/tab-analyzer.ts` and test: orchestrate the new pure modules and expose measure results.
- Modify `src/features/toolbox/musicxml.service.ts` and test: serialize only recognized measures as notes and keep fallback measures as rests.
- Modify `src/features/toolbox/ToolboxPage.tsx`, CSS, test, and `src/i18n/messages.ts`: show checked/recognized/fallback counts and per-measure status.
- Modify `docs/PROJECT_STATUS.md`, `docs/NEXT_TASKS.md`, and `docs/SESSION_HANDOFF.md`: record exact implementation and verification results.

---

### Task 1: Preserve Painted PDF Vector Paths

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/pdf.service.ts`
- Test: `src/features/toolbox/pdf.service.test.ts`

**Interfaces:**
- Produces: `PdfVectorCommand`, `PdfVectorPath`, and `PdfDocumentSnapshot.vectorPaths`.
- Preserves: `PdfDocumentSnapshot.lineSegments` and all existing `readPdfSnapshot` behavior.

- [ ] **Step 1: Add a failing adapter test for transformed filled and stroked paths**

Add a PDF.js fixture whose operator list contains `save`, `transform`, `constructPath`, `fill`, `stroke`, and `restore`. Assert the normalized snapshot contains paint mode and transformed bounds:

```ts
expect(snapshot.vectorPaths).toEqual([
  {
    page: 1,
    paint: 'fill',
    commands: [
      { type: 'move', x: 20, y: 32 },
      { type: 'curve', x1: 24, y1: 28, x2: 34, y2: 28, x: 38, y: 32 },
      { type: 'close' },
    ],
    bounds: { x1: 20, y1: 28, x2: 38, y2: 32 },
  },
]);
```

- [ ] **Step 2: Run the adapter test and verify the new assertion fails**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts`

Expected: FAIL because `vectorPaths` is absent.

- [ ] **Step 3: Add normalized path types**

Add these exact public types:

```ts
export type PdfVectorCommand =
  | { type: 'move'; x: number; y: number }
  | { type: 'line'; x: number; y: number }
  | { type: 'curve'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'close' };

export interface PdfVectorPath {
  page: number;
  paint: 'fill' | 'stroke' | 'fill-stroke';
  commands: PdfVectorCommand[];
  bounds: { x1: number; y1: number; x2: number; y2: number };
}
```

Add `vectorPaths?: PdfVectorPath[]` to `PdfDocumentSnapshot` so existing fixtures remain source-compatible.

- [ ] **Step 4: Implement minimal painted-path extraction**

Refactor the current path loop so `constructPath` stores transformed commands in a pending path. Flush it only when the next painting operator is `fill`, `eoFill`, `stroke`, `fillStroke`, or `eoFillStroke`:

```ts
function getPaintMode(operator: number, ops: Record<string, number>): PdfVectorPath['paint'] | null {
  if (operator === ops.fill || operator === ops.eoFill) return 'fill';
  if (operator === ops.stroke) return 'stroke';
  if (operator === ops.fillStroke || operator === ops.eoFillStroke) return 'fill-stroke';
  return null;
}
```

Keep `extractLineSegments` behavior unchanged. Discard pending paths on `endPath` without paint and after each flush. Include curve control/end points when calculating bounds.

- [ ] **Step 5: Run the adapter tests**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts`

Expected: PASS, including existing line transform and document destruction tests.

- [ ] **Step 6: Commit the adapter slice**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/pdf.service.ts src/features/toolbox/pdf.service.test.ts
git commit -m "feat: preserve toolbox pdf vector paths"
```

---

### Task 2: Pair Standard Staff and TAB Systems

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/staff-tab-alignment.ts`
- Create: `src/features/toolbox/staff-tab-alignment.test.ts`

**Interfaces:**
- Consumes: `PdfLineSegment[]`, `TabStaffSystem[]`.
- Produces: `findPairedStaffSystems(lineSegments, tabSystems): PairedStaffSystem[]`.

- [ ] **Step 1: Write failing pairing tests**

Use five equal horizontal rows above an existing six-line TAB system and assert one pair. Add rejection cases for four/six rows, excessive vertical separation, horizontal overlap below 80%, and cross-page candidates:

```ts
expect(findPairedStaffSystems(lines, [tabSystem])).toEqual([
  {
    page: 1,
    x1: 50,
    x2: 250,
    standardLineYs: [40, 45, 50, 55, 60],
    tabSystem,
    confidence: 'high',
  },
]);
```

- [ ] **Step 2: Run the new test and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/staff-tab-alignment.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the paired system type**

```ts
export interface PairedStaffSystem {
  page: number;
  x1: number;
  x2: number;
  standardLineYs: [number, number, number, number, number];
  tabSystem: TabStaffSystem;
  confidence: 'high' | 'medium';
}
```

- [ ] **Step 4: Implement five-line detection and pairing**

Reuse the established horizontal-line tolerances conceptually, but keep this module independent. Accept five rows only when adjacent gaps differ by at most `1` PDF unit. Pair a standard system only with the nearest TAB system below it on the same page when horizontal overlap is at least `0.8` of the shorter system width. Reject non-unique nearest matches.

```ts
export function findPairedStaffSystems(
  lineSegments: PdfLineSegment[],
  tabSystems: TabStaffSystem[],
): PairedStaffSystem[] {
  const standardSystems = findFiveLineSystems(lineSegments);
  return standardSystems.flatMap((standard) => pairWithUniqueTabSystem(standard, tabSystems));
}
```

- [ ] **Step 5: Run pairing and existing staff tests**

Run: `npm test -- --run src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/tab-staff-geometry.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the pairing slice**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/staff-tab-alignment.ts src/features/toolbox/staff-tab-alignment.test.ts
git commit -m "feat: pair standard and tab staff systems"
```

---

### Task 3: Recognize Explicit Note Durations

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/rhythm-symbols.ts`
- Create: `src/features/toolbox/rhythm-symbols.test.ts`

**Interfaces:**
- Consumes: `PdfVectorPath[]`, `PairedStaffSystem[]`.
- Produces: `recognizeRhythmGlyphs(paths, pairedSystems): RhythmGlyphResult`.

- [ ] **Step 1: Write failing note classification tests**

Build normalized vector fixtures rather than PDF fixtures. Cover:

- open notehead without stem -> whole;
- open notehead with one stem -> half;
- filled notehead with stem and no beam -> quarter;
- filled notehead with one beam -> eighth;
- filled notehead with two beams -> sixteenth;
- filled notehead without a stem -> rejected;
- a beam not attached to the event stem -> rejected.

```ts
expect(result.glyphs).toContainEqual(expect.objectContaining({
  duration: 'eighth',
  isRest: false,
  confidence: 'high',
  sourceSymbols: ['filled-notehead', 'stem', 'beam-1'],
}));
```

- [ ] **Step 2: Run the test and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add internal glyph result types**

```ts
export type RhythmDuration = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

export interface RhythmGlyphEvent {
  page: number;
  systemIndex: number;
  x: number;
  duration: RhythmDuration;
  dots: 0 | 1;
  isRest: boolean;
  confidence: 'high' | 'medium';
  sourceSymbols: string[];
}

export interface RhythmGlyphResult {
  glyphs: RhythmGlyphEvent[];
  warnings: string[];
}
```

- [ ] **Step 4: Implement structural note recognition**

Only inspect paths inside the five-line vertical band plus one staff gap above/below. Classify a notehead by a closed compact contour; determine open/filled from paint mode and nested contour evidence. Require stems to touch the notehead bounds within one staff-gap-derived tolerance. Count only thick filled rectangles or parallel filled contours that touch the stem as beams.

```ts
const durationByShape = {
  openNoStem: 'whole',
  openStem: 'half',
  filledStem: 'quarter',
  filledStemOneBeam: 'eighth',
  filledStemTwoBeams: '16th',
} as const;
```

If more than one duration matches the same notehead, emit a warning and no high-confidence glyph.

- [ ] **Step 5: Run the note classifier tests**

Run: `npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

Expected: PASS for the note cases; rest/dot behavior is not added yet.

- [ ] **Step 6: Commit the note-recognition slice**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/rhythm-symbols.ts src/features/toolbox/rhythm-symbols.test.ts
git commit -m "feat: recognize explicit staff note durations"
```

---

### Task 4: Recognize Rests and One Dot

**Files:**
- Modify: `src/features/toolbox/rhythm-symbols.ts`
- Modify: `src/features/toolbox/rhythm-symbols.test.ts`

**Interfaces:**
- Extends: `recognizeRhythmGlyphs` with rests and `dots: 0 | 1`.
- Preserves: note-duration behavior from Task 3.

- [ ] **Step 1: Add failing rest and dot tests**

Add fixtures for whole/half rest rectangles anchored to the correct staff line, quarter rest contour signature, eighth rest with one flag, sixteenth rest with two flags, and one small filled dot immediately to the right of a note/rest. Add rejection tests for two dots and an isolated dot.

```ts
expect(result.glyphs).toContainEqual(expect.objectContaining({
  duration: 'quarter',
  dots: 1,
  isRest: true,
  sourceSymbols: ['quarter-rest', 'dot'],
}));
```

- [ ] **Step 2: Run the classifier test and verify the new assertions fail**

Run: `npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

Expected: FAIL because rests and dots are not classified.

- [ ] **Step 3: Implement high-confidence rest templates**

Normalize each candidate contour by staff gap before matching. Whole and half rests require a filled rectangle with the documented line attachment. Quarter/eighth/sixteenth rests require the exact normalized segment/curve topology represented by the test fixtures; a topology mismatch is diagnostic-only.

```ts
function attachSingleDot(event: RhythmGlyphEvent, dots: PdfVectorPath[], staffGap: number): RhythmGlyphEvent {
  const matches = dots.filter((dot) => isImmediatelyRightOf(dot.bounds, event.x, staffGap));
  return matches.length === 1 ? { ...event, dots: 1, sourceSymbols: [...event.sourceSymbols, 'dot'] } : event;
}
```

If two candidate dots match, downgrade the event to `medium` and warn rather than choosing one.

- [ ] **Step 4: Run the complete symbol tests**

Run: `npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

Expected: PASS for notes, rests, dots, and ambiguity cases.

- [ ] **Step 5: Commit the rest/dot slice**

```powershell
git add src/features/toolbox/rhythm-symbols.ts src/features/toolbox/rhythm-symbols.test.ts
git commit -m "feat: recognize explicit staff rests and dots"
```

---

### Task 5: Align Rhythm Events and Validate Whole Measures

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/rhythm-measures.ts`
- Create: `src/features/toolbox/rhythm-measures.test.ts`

**Interfaces:**
- Consumes: `RhythmGlyphEvent[]`, `TabFretEvent[]`, `measureNumbers`, `beats`, `beatType`.
- Produces: `buildMeasureRhythmResults(input): MeasureRhythmResult[]`.

- [ ] **Step 1: Write failing measure-building tests**

Cover unique x-position pairing, multiple frets in one TAB event, explicit rests with `tabEventOrder: null`, ambiguous nearest TAB events, medium-confidence glyphs, missing glyphs, and exact/short/long 4/4 totals.

```ts
expect(results).toContainEqual({
  measureNumber: 3,
  status: 'recognized',
  events: expect.arrayContaining([
    expect.objectContaining({ tabEventOrder: 1, duration: 'quarter', isRest: false }),
  ]),
  warning: null,
});
```

- [ ] **Step 2: Run the test and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/rhythm-measures.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add confirmed rhythm types**

```ts
export interface RecognizedRhythmEvent {
  page: number;
  measureNumber: number;
  tabEventOrder: number | null;
  duration: RhythmDuration;
  dots: 0 | 1;
  isRest: boolean;
  confidence: 'high' | 'medium';
  sourceSymbols: string[];
}

export interface MeasureRhythmResult {
  measureNumber: number;
  status: 'recognized' | 'fallback';
  events: RecognizedRhythmEvent[];
  warning: string | null;
}
```

- [ ] **Step 4: Implement exact rational duration validation**

Represent duration in thirty-second-note units to avoid floating-point comparison and keep dotted sixteenth notes integral:

```ts
const durationUnits: Record<RhythmDuration, number> = {
  whole: 32,
  half: 16,
  quarter: 8,
  eighth: 4,
  '16th': 2,
};

function getEventUnits(event: Pick<RecognizedRhythmEvent, 'duration' | 'dots'>): number {
  const base = durationUnits[event.duration];
  return event.dots === 1 ? base + base / 2 : base;
}
```

Calculate measure capacity as `beats * (32 / beatType)`. If capacity produces a non-integer unit in the supported model, return `fallback` with an explicit warning. Pair a non-rest glyph only when one TAB event in the same page/measure is uniquely nearest within half the median adjacent TAB-column gap. This tolerance selects a matching column but never determines duration.

- [ ] **Step 5: Run measure and event tests**

Run: `npm test -- --run src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/tab-events.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the measure-validation slice**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/rhythm-measures.ts src/features/toolbox/rhythm-measures.test.ts
git commit -m "feat: validate recognized rhythm measures"
```

---

### Task 6: Integrate Rhythm Analysis Without Breaking Safe Export

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/tab-analyzer.ts`
- Modify: `src/features/toolbox/tab-analyzer.test.ts`

**Interfaces:**
- Consumes: `snapshot.vectorPaths`, paired systems, rhythm glyphs, and existing `fretEvents`.
- Produces: `TabScoreAnalysis.rhythmMeasures` and rhythm warnings.

- [ ] **Step 1: Extend analyzer tests first**

Add one fixture with a complete high-confidence measure and one with missing/conflicting symbols. Assert the first is `recognized`, the second is `fallback`, and a snapshot without `vectorPaths` preserves the current skeleton behavior.

```ts
expect(analysis.rhythmMeasures).toEqual([
  expect.objectContaining({ measureNumber: 1, status: 'recognized' }),
  expect.objectContaining({ measureNumber: 2, status: 'fallback' }),
]);
```

- [ ] **Step 2: Run the analyzer test and verify type/assertion failures**

Run: `npm test -- --run src/features/toolbox/tab-analyzer.test.ts`

Expected: FAIL because `rhythmMeasures` is absent.

- [ ] **Step 3: Add analysis output and orchestration**

Add `rhythmMeasures: MeasureRhythmResult[]` to `TabScoreAnalysis`. In `analyzeTabScore`, call the new stages after `fretEvents`:

```ts
const pairedSystems = findPairedStaffSystems(snapshot.lineSegments ?? [], tabStaffSystems);
const rhythmGlyphs = recognizeRhythmGlyphs(snapshot.vectorPaths ?? [], pairedSystems);
const rhythmMeasures = buildMeasureRhythmResults({
  glyphs: rhythmGlyphs.glyphs,
  tabEvents: fretEvents.events,
  measureNumbers,
  beats: timeSignature.beats,
  beatType: timeSignature.beatType,
});
```

Append concise warnings for fallback measures. Remove the blanket “Rhythm recognition is not available” warning only when at least one measure was checked; keep an explicit skeleton warning when no reliable paired staff exists.

- [ ] **Step 4: Run analyzer and all pure Toolbox analysis tests**

Run: `npm test -- --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/rhythm-symbols.test.ts src/features/toolbox/rhythm-measures.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the integration slice**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/tab-analyzer.ts src/features/toolbox/tab-analyzer.test.ts
git commit -m "feat: integrate toolbox rhythm analysis"
```

---

### Task 7: Export Recognized Measures to MusicXML

**Files:**
- Modify: `src/features/toolbox/musicxml.service.ts`
- Modify: `src/features/toolbox/musicxml.service.test.ts`

**Interfaces:**
- Consumes: `TabScoreAnalysis.rhythmMeasures` and existing `fretEvents`.
- Produces: MusicXML notes for recognized measures and existing rest placeholders for fallback measures.

- [ ] **Step 1: Write failing MusicXML tests**

Assert:

- `divisions` is `8`, supporting dotted sixteenth notes with integer MusicXML durations;
- recognized notes include `<duration>`, `<type>`, optional `<dot/>`, `<notations><technical><string>` and `<fret>`;
- additional positions in the same TAB event include `<chord/>`;
- explicit rests contain the recognized duration;
- fallback measures contain `<rest measure="yes"/>` only;
- mixed exports list fallback measure numbers in credit text.

- [ ] **Step 2: Run the MusicXML tests and verify failures**

Run: `npm test -- --run src/features/toolbox/musicxml.service.test.ts`

Expected: FAIL because all measures are still whole-measure rests and divisions is `1`.

- [ ] **Step 3: Implement measure-level serialization**

Use exact duration mapping for `divisions = 8`:

```ts
const musicXmlDuration = { whole: 32, half: 16, quarter: 8, eighth: 4, '16th': 2 } as const;
const duration = musicXmlDuration[event.duration] * (event.dots === 1 ? 1.5 : 1);
```

For recognized non-rest events, resolve the matching `TabFretEvent` by measure and order and serialize all positions. If that lookup fails at serialization time, serialize the entire measure as fallback rather than emitting a partial event. Keep XML escaping and object URL behavior unchanged.

- [ ] **Step 4: Parse and verify the generated XML**

Run: `npm test -- --run src/features/toolbox/musicxml.service.test.ts`

Expected: PASS with zero `DOMParser` parser errors.

- [ ] **Step 5: Commit the export slice**

```powershell
git add src/features/toolbox/musicxml.service.ts src/features/toolbox/musicxml.service.test.ts
git commit -m "feat: export recognized tab rhythm to musicxml"
```

---

### Task 8: Show Rhythm Recognition and Fallback Status

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.css`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: `TabScoreAnalysis.rhythmMeasures`.
- Produces: checked/recognized/fallback counts, per-measure statuses, and mixed-export notice.

- [ ] **Step 1: Extend the page test first**

Update the analysis fixture with one recognized and one fallback measure. Assert bilingual message keys through the English rendering:

```ts
expect(screen.getByText('Rhythm recognition')).toBeInTheDocument();
expect(screen.getByText('2 measures checked · 1 ready · 1 fallback')).toBeInTheDocument();
expect(screen.getByText('Measure 1 · Recognized')).toBeInTheDocument();
expect(screen.getByText('Measure 2 · Fallback')).toBeInTheDocument();
expect(screen.getByText(/Some measures will be exported as rest placeholders/)).toBeInTheDocument();
```

- [ ] **Step 2: Run the page test and verify missing UI failures**

Run: `npm test -- --run src/features/toolbox/ToolboxPage.test.tsx`

Expected: FAIL because the rhythm status section is absent.

- [ ] **Step 3: Add bilingual copy and semantic status markup**

Add `toolbox.rhythmTitle`, `rhythmChecked`, `rhythmReady`, `rhythmFallback`, `rhythmRecognizedStatus`, `rhythmFallbackStatus`, and `rhythmMixedExportNotice` in English and Chinese. Render a compact `<section>` with a summary and `<ul>`; use text status rather than color alone. Keep the existing download button condition unchanged.

- [ ] **Step 4: Add restrained responsive styles**

Use the existing amber/muted tokens, one divider, compact rows, and wrapping status text. Do not add cards inside the output card and do not add animation.

- [ ] **Step 5: Run the page and Toolbox tests**

Run: `npm test -- --run src/features/toolbox/ToolboxPage.test.tsx src/features/toolbox`

Expected: PASS.

- [ ] **Step 6: Commit the UI slice**

```powershell
git add src/features/toolbox/ToolboxPage.tsx src/features/toolbox/ToolboxPage.css src/features/toolbox/ToolboxPage.test.tsx src/i18n/messages.ts
git commit -m "feat: show toolbox rhythm recognition status"
```

---

### Task 9: Focused Verification and Handoff

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

**Interfaces:**
- Verifies: all Toolbox behavior without reading or uploading a real PDF.
- Records: exact commands, results, remaining unsupported notation, and optional user-authorized local sample verification.

- [ ] **Step 1: Run the focused Toolbox test suite**

Run: `npm test -- --run src/features/toolbox`

Expected: all Toolbox test files and cases PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build PASS. Record any existing chunk-size warning without treating it as a rhythm failure.

- [ ] **Step 3: Check the scoped diff**

Run:

```powershell
git diff --check -- src/features/toolbox src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

Expected: no whitespace errors. A Windows LF/CRLF conversion warning is informational.

- [ ] **Step 4: Update the three status documents**

Record:

- explicit symbol recognition implemented without TAB-spacing inference;
- supported note/rest values and one dot;
- whole-measure fallback rules;
- tests/build results;
- real PDF not read, copied, uploaded, or committed;
- tuplets, ties, techniques, scans, playback, manual editing, and `.gp` remain unsupported.

- [ ] **Step 5: Commit the handoff documents**

```powershell
git add docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
git commit -m "docs: record toolbox rhythm recognition status"
```

Do not push unless the user explicitly requests it or the current project handoff rules require a stage publication and the working tree has been checked for unrelated changes.
