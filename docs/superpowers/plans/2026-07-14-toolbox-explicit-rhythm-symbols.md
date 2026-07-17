# Toolbox Explicit Rhythm Topology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recognize rhythm explicitly encoded by real electronic standard-staff notation, using painted vector topology and reliably mapped music-font glyphs, while exporting only complete high-confidence measures.

**Architecture:** Extend the browser-local PDF snapshot with compound painted shapes and conservative music-glyph evidence while preserving the existing line-segment API. Normalize both evidence channels into staff-gap-scaled primitives, build a local topology graph for each paired standard/TAB system, derive duration only from explicit symbol structure, and validate the whole measure before MusicXML consumes it.

**Tech Stack:** React 18, TypeScript 5.7, Vite 8, Vitest 4, Testing Library, `pdfjs-dist@4.10.38`, MusicXML 4.0.

## Global Constraints

- Browser-local only; never upload, persist, copy, or log the source PDF.
- Do not modify Supabase, RLS, migrations, storage, permissions, or dependencies.
- Do not run `npm install`.
- Never derive rhythm, beat position, or duration from TAB horizontal spacing.
- Horizontal coordinates may only group notation primitives, order events, assign measures, and uniquely pair standard-staff events with existing TAB columns.
- Support whole, half, quarter, eighth, and sixteenth notes/rests plus one augmentation dot.
- Do not support tuplets, ties, cross-measure beams, grace notes, overlapping voices, techniques, scans, playback, manual duration editing, or proprietary `.gp` generation.
- A measure is either fully recognized and duration-valid or fully replaced by the existing whole-measure rest placeholder.
- Medium-confidence, unknown, conflicting, or unsupported evidence is diagnostic-only and never exported as real notes.
- Preserve the existing safe-skeleton download when no reliable paired standard staff or no strong rhythm evidence exists.

---

## File Structure

- Modify `src/features/toolbox/toolbox.types.ts`: stable snapshot, painted-shape, music-glyph, paired-staff, recognized-event, and measure-result contracts.
- Modify `src/features/toolbox/pdf.service.ts` and test: preserve compound painted shapes, graphics state, font metadata, and reliable/unknown glyph evidence.
- Create `src/features/toolbox/staff-tab-alignment.ts` and test: pair one five-line standard staff with the nearest unique six-line TAB system below it.
- Create `src/features/toolbox/notation-primitives.ts` and test: normalize vector and glyph evidence into system-local primitives.
- Create `src/features/toolbox/rhythm-topology.ts` and test: build topology relations and recognize notes, shared beams, flags, rests, dots, and conflicts.
- Create `src/features/toolbox/rhythm-measures.ts` and test: align recognized events to TAB columns and validate exact whole-measure capacity.
- Modify analyzer, MusicXML, page, CSS, tests, and `src/i18n/messages.ts` only after pure recognition is covered.
- Modify the three status documents after focused verification.

### Task 1: Preserve Compound Painted Shapes

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/pdf.service.ts`
- Test: `src/features/toolbox/pdf.service.test.ts`

**Interfaces:**
- Produces: `PdfBounds`, `PdfVectorCommand`, `PdfVectorSubpath`, `PdfPaintedShape`, and `PdfDocumentSnapshot.vectorShapes`.
- Preserves: `PdfDocumentSnapshot.lineSegments` and all existing text/count/cleanup behavior.

- [ ] **Step 1: Write failing adapter tests**

Cover transformed curves, multiple subpaths in one paint operation, multiple `constructPath` operations before paint, `fill`, `eoFill`, `stroke`, `fillStroke`, `setLineWidth`, `closePath`, `rectangle`, `endPath`, save/restore, and document destruction.

```ts
expect(snapshot.vectorShapes).toEqual([
  expect.objectContaining({
    page: 1,
    paint: 'fill',
    fillRule: 'evenodd',
    subpaths: [
      expect.objectContaining({ closed: true }),
      expect.objectContaining({ closed: true }),
    ],
  }),
]);
expect(snapshot.lineSegments).toEqual(existingLineSegments);
```

- [ ] **Step 2: Run the adapter test and verify failure**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts`

Expected: FAIL because `vectorShapes` is absent while existing assertions still pass.

- [ ] **Step 3: Add stable painted-shape types**

```ts
export interface PdfBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type PdfVectorCommand =
  | { type: 'move' | 'line'; x: number; y: number }
  | { type: 'curve'; x1: number; y1: number; x2: number; y2: number; x: number; y: number };

export interface PdfVectorSubpath {
  commands: PdfVectorCommand[];
  closed: boolean;
}

export interface PdfPaintedShape {
  page: number;
  paint: 'fill' | 'stroke' | 'fill-stroke';
  fillRule: 'nonzero' | 'evenodd';
  strokeWidth: number | null;
  subpaths: PdfVectorSubpath[];
  bounds: PdfBounds;
}
```

Add `vectorShapes?: PdfPaintedShape[]` to `PdfDocumentSnapshot` for source compatibility with existing fixtures.

- [ ] **Step 4: Implement graphics-state-aware extraction**

Keep pending subpaths until a paint operator flushes them. Apply the current transform to every point, retain subpath closure, derive fill rule from the paint operator, track line width through save/restore, include curve control/end points in bounds, and discard unpainted paths at `endPath`. Do not reuse `extractLineSegments` output as symbol evidence.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts src/features/toolbox/tab-staff-geometry.test.ts`

Expected: PASS, including unchanged line transforms and six-line-system behavior.

### Task 2: Capture Conservative Music-Font Evidence

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/pdf.service.ts`
- Modify: `src/features/toolbox/pdf.service.test.ts`

**Interfaces:**
- Produces: font metadata on `PdfTextItem`, `PdfMusicGlyphEvidence`, and `PdfDocumentSnapshot.musicGlyphs`.
- Preserves: ordinary title, tempo, measure-number, and fret text.

- [ ] **Step 1: Write failing reliable/unknown glyph tests**

Use injected text-content fixtures with a font key, style family, a mapped SMuFL character, an unknown private-use character, and ordinary text. Assert mapped evidence has explicit semantics, unknown private-use evidence remains `mapping: 'unknown'`, and ordinary text does not become music evidence.

```ts
expect(snapshot.musicGlyphs).toEqual([
  expect.objectContaining({ semantic: 'notehead-filled', mapping: 'reliable' }),
  expect.objectContaining({ semantic: null, mapping: 'unknown' }),
]);
```

- [ ] **Step 2: Run the adapter test and verify failure**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts`

Expected: FAIL because font metadata and `musicGlyphs` are absent.

- [ ] **Step 3: Add glyph evidence contracts**

```ts
export type MusicGlyphSemantic =
  | 'note-whole' | 'note-half' | 'note-quarter' | 'note-eighth' | 'note-16th'
  | 'notehead-whole' | 'notehead-half' | 'notehead-filled'
  | 'flag-eighth' | 'flag-16th' | 'augmentation-dot'
  | 'rest-whole' | 'rest-half' | 'rest-quarter' | 'rest-eighth' | 'rest-16th';

export interface PdfMusicGlyphEvidence {
  page: number;
  bounds: PdfBounds;
  fontName: string | null;
  fontFamily: string | null;
  text: string;
  semantic: MusicGlyphSemantic | null;
  mapping: 'reliable' | 'unknown';
}
```

Add optional `fontName` and `fontFamily` to `PdfTextItem`, and optional `musicGlyphs` to `PdfDocumentSnapshot`.

- [ ] **Step 4: Implement an allowlisted mapper**

Map only exact SMuFL PUA values when the normalized font family is an exact allowlist entry:

```ts
const smuflFamilies = new Set([
  'bravura',
  'finale maestro',
  'leland',
  'musejazz',
  'november2',
  'petaluma',
]);

const smuflSemantics: Record<string, MusicGlyphSemantic> = {
  '\uE0A2': 'notehead-whole',
  '\uE0A3': 'notehead-half',
  '\uE0A4': 'notehead-filled',
  '\uE1D2': 'note-whole',
  '\uE1D3': 'note-half',
  '\uE1D4': 'note-half',
  '\uE1D5': 'note-quarter',
  '\uE1D6': 'note-quarter',
  '\uE1D7': 'note-eighth',
  '\uE1D8': 'note-eighth',
  '\uE1D9': 'note-16th',
  '\uE1DA': 'note-16th',
  '\uE1E7': 'augmentation-dot',
  '\uE240': 'flag-eighth',
  '\uE241': 'flag-eighth',
  '\uE242': 'flag-16th',
  '\uE243': 'flag-16th',
  '\uE4E3': 'rest-whole',
  '\uE4E4': 'rest-half',
  '\uE4E5': 'rest-quarter',
  '\uE4E6': 'rest-eighth',
  '\uE4E7': 'rest-16th',
};
```

Read `fontName` from the text item and `fontFamily` from the matching text-content style. Preserve other private-use characters as unknown evidence. Do not map by bounding-box shape, vertical position, or approximate font-family substring alone.

- [ ] **Step 5: Run adapter and analyzer tests**

Run: `npm test -- --run src/features/toolbox/pdf.service.test.ts src/features/toolbox/tab-analyzer.test.ts`

Expected: PASS; ordinary text analysis remains unchanged.

### Task 3: Pair Standard and TAB Staff Systems

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/staff-tab-alignment.ts`
- Create: `src/features/toolbox/staff-tab-alignment.test.ts`

**Interfaces:**
- Consumes: `PdfLineSegment[]`, `TabStaffSystem[]`.
- Produces: `findPairedStaffSystems(lineSegments, tabSystems): PairedStaffSystem[]`.

- [ ] **Step 1: Write failing pairing and rejection tests**

Cover one five-line system above one TAB system, four/six-row rejection, uneven gaps, cross-page candidates, overlap below 80%, excessive vertical separation, and non-unique nearest matches.

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/staff-tab-alignment.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the paired-system contract**

```ts
export interface PairedStaffSystem {
  page: number;
  x1: number;
  x2: number;
  standardLineYs: [number, number, number, number, number];
  averageStaffGap: number;
  tabSystem: TabStaffSystem;
  confidence: 'high' | 'medium';
}
```

- [ ] **Step 4: Implement unique nearest pairing**

Detect exactly five near-horizontal, near-equal-length, evenly spaced rows. Pair only the nearest TAB system below on the same page when overlap is at least 80% of the shorter width and the vertical separation is within a staff-gap-derived bound. Reject tied nearest candidates.

- [ ] **Step 5: Run focused geometry tests**

Run: `npm test -- --run src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/tab-staff-geometry.test.ts`

Expected: PASS.

### Task 4: Normalize Evidence Into System-Local Primitives

**Files:**
- Create: `src/features/toolbox/notation-primitives.ts`
- Create: `src/features/toolbox/notation-primitives.test.ts`

**Interfaces:**
- Consumes: `PdfPaintedShape[]`, `PdfMusicGlyphEvidence[]`, `PairedStaffSystem[]`.
- Produces: `normalizeNotationEvidence(input): NotationPrimitiveResult`.

- [ ] **Step 1: Write failing normalization tests**

Cover one compound shape split into spatially disconnected contour primitives, nested contours retaining containment candidates, one stroked stem becoming a segment primitive, reliable glyphs, unknown glyphs, staff-gap scaling, and cross-system isolation.

```ts
expect(result.primitives).toEqual(expect.arrayContaining([
  expect.objectContaining({ kind: 'contour', systemIndex: 0, quality: 'reliable' }),
  expect.objectContaining({ kind: 'glyph', semantic: 'notehead-filled', quality: 'reliable' }),
  expect.objectContaining({ kind: 'unknown-glyph', quality: 'uncertain' }),
]));
```

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/notation-primitives.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Define the internal primitive union**

```ts
export type NotationPrimitive =
  | { id: string; kind: 'contour'; page: number; systemIndex: number; bounds: PdfBounds; closed: boolean; hasHole: boolean; filled: boolean; quality: 'reliable' | 'uncertain'; sourceIds: string[] }
  | { id: string; kind: 'segment'; page: number; systemIndex: number; bounds: PdfBounds; quality: 'reliable' | 'uncertain'; sourceIds: string[] }
  | { id: string; kind: 'glyph'; page: number; systemIndex: number; bounds: PdfBounds; semantic: MusicGlyphSemantic; quality: 'reliable'; sourceIds: string[] }
  | { id: string; kind: 'unknown-glyph'; page: number; systemIndex: number; bounds: PdfBounds; quality: 'uncertain'; sourceIds: string[] };

export interface NotationPrimitiveResult {
  primitives: NotationPrimitive[];
  warnings: string[];
}
```

- [ ] **Step 4: Implement deterministic normalization**

Normalize measurements by `averageStaffGap`; never resize source coordinates used later for TAB pairing. Split only spatially disconnected subpath groups, retain source IDs, derive hole evidence from fill rule plus containment, and keep uncertain stroke-width classifications at `quality: 'uncertain'`. A reliable primitive is not yet strong musical evidence; only a resolved topology relation or reliable mapped glyph becomes strong evidence.

- [ ] **Step 5: Run primitive tests**

Run: `npm test -- --run src/features/toolbox/notation-primitives.test.ts`

Expected: PASS.

### Task 5: Build Note, Stem, Beam, and Flag Topology

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/rhythm-topology.ts`
- Create: `src/features/toolbox/rhythm-topology.test.ts`

**Interfaces:**
- Consumes: `NotationPrimitive[]`, `PairedStaffSystem[]`.
- Produces: `recognizeRhythmTopology(primitives, pairedSystems): RhythmTopologyResult`.

- [ ] **Step 1: Write failing structural-note tests**

Cover path-only and glyph-only whole/half/quarter notes, different paint operations composing one note, even-odd and nested-contour open noteheads, multiple noteheads sharing one stem, detached stems, one flag, two flags, one shared sloped beam, two beam layers, a partial secondary beam, and an unrelated nearby beam.

```ts
expect(result.events).toContainEqual(expect.objectContaining({
  duration: 'eighth',
  isRest: false,
  confidence: 'high',
  sourceSymbols: expect.arrayContaining(['filled-notehead', 'stem', 'beam-1']),
}));
```

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/rhythm-topology.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add topology result types**

```ts
export interface RhythmTopologyEvent {
  page: number;
  systemIndex: number;
  x: number;
  duration: RhythmDuration;
  dots: 0 | 1;
  isRest: boolean;
  confidence: 'high' | 'medium';
  sourceSymbols: string[];
}

export interface RhythmTopologyResult {
  events: RhythmTopologyEvent[];
  warnings: string[];
}
```

Define `RhythmDuration` in `toolbox.types.ts` so the later stable measure-output contracts do not depend on an internal topology module:

```ts
export type RhythmDuration = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';
```

- [ ] **Step 4: Implement relation-first recognition**

Build `touches`, `intersects`, `contains`, `aligned-with`, and `incident-to` relations inside each system. Determine open/filled noteheads from holes, nested contours, stroke topology, or reliable glyph semantics. Resolve shared stems before duration. Build beam groups, then count distinct beam layers incident to each stem; never copy another stem's layer count and never use event spacing.

- [ ] **Step 5: Run topology tests**

Run: `npm test -- --run src/features/toolbox/rhythm-topology.test.ts`

Expected: PASS for notes, chords, flags, shared/sloped beams, partial beams, and rejection cases.

### Task 6: Fuse Evidence and Recognize Rests and One Dot

**Files:**
- Modify: `src/features/toolbox/rhythm-topology.ts`
- Modify: `src/features/toolbox/rhythm-topology.test.ts`

**Interfaces:**
- Extends: `recognizeRhythmTopology` with dual-channel conflict handling, rests, and `dots: 0 | 1`.

- [ ] **Step 1: Add failing fusion, rest, and dot tests**

Cover path/glyph agreement, path/glyph duration conflict, unknown glyph near a note, reliable whole-through-sixteenth rests, topology-template rests, one augmentation dot, two possible dots, staccato-dot ambiguity, unsupported tuplet/tie/grace evidence, and overlapping voices.

- [ ] **Step 2: Run and verify new assertions fail**

Run: `npm test -- --run src/features/toolbox/rhythm-topology.test.ts`

Expected: FAIL because fusion, rests, and dot ambiguity are not implemented.

- [ ] **Step 3: Implement evidence precedence**

Require at least one strong topology or reliable-glyph source. Merge agreeing sources and retain all source IDs. When strong sources disagree, emit one medium-confidence diagnostic event or warning and no exportable event. Unknown glyphs never determine duration.

- [ ] **Step 4: Implement rests and local dot attachment**

Recognize rests from reliable glyph semantics or exact staff-gap-normalized topology. Attach one dot only when it is uniquely to the right of the event and vertically compatible; this local attachment relation is allowed, but adjacent TAB/event spacing must not enter the calculation. Treat two candidates or staccato ambiguity as medium confidence.

- [ ] **Step 5: Run complete topology tests**

Run: `npm test -- --run src/features/toolbox/rhythm-topology.test.ts`

Expected: PASS for agreement, conflicts, rests, dots, and unsupported-structure diagnostics.

### Task 7: Align Events and Validate Whole Measures

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/rhythm-measures.ts`
- Create: `src/features/toolbox/rhythm-measures.test.ts`

**Interfaces:**
- Consumes: `RhythmTopologyEvent[]`, `TabFretEvent[]`, measure numbers, `beats`, and `beatType`.
- Produces: `buildMeasureRhythmResults(input): MeasureRhythmResult[]`.

- [ ] **Step 1: Write failing measure tests**

Cover unique standard/TAB x pairing, multiple frets in one TAB event, explicit rests with `tabEventOrder: null`, ambiguous nearest TAB events, medium-confidence events, missing events, exact/short/long 4/4 totals, another supported time signature, and unsupported capacity.

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `npm test -- --run src/features/toolbox/rhythm-measures.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add stable output contracts**

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

- [ ] **Step 4: Implement exact capacity and unique pairing**

Use thirty-second-note integer units: whole 32, half 16, quarter 8, eighth 4, sixteenth 2, and one dot adds half the base. Pair a non-rest event only when one TAB event in the same page/measure is uniquely nearest within a selection tolerance derived from TAB column geometry. The tolerance selects a matching column only; it never determines duration.

- [ ] **Step 5: Run measure and event tests**

Run: `npm test -- --run src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/tab-events.test.ts`

Expected: PASS; any ambiguity or capacity mismatch returns whole-measure fallback.

### Task 8: Integrate Analysis Without Breaking Safe Export

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/tab-analyzer.ts`
- Modify: `src/features/toolbox/tab-analyzer.test.ts`

**Interfaces:**
- Consumes: snapshot shapes/glyphs, paired systems, normalized primitives, topology events, and existing TAB events.
- Produces: `TabScoreAnalysis.rhythmMeasures` and concise rhythm warnings.

- [ ] **Step 1: Add failing analyzer tests**

Cover one fully recognized measure, one conflict fallback, no paired staff, path-only evidence, glyph-only evidence, and snapshots without the new optional fields.

- [ ] **Step 2: Run and verify type/assertion failures**

Run: `npm test -- --run src/features/toolbox/tab-analyzer.test.ts`

Expected: FAIL because `rhythmMeasures` is absent.

- [ ] **Step 3: Add orchestration in dependency order**

```ts
const pairedSystems = findPairedStaffSystems(snapshot.lineSegments ?? [], tabStaffSystems);
const primitives = normalizeNotationEvidence({
  shapes: snapshot.vectorShapes ?? [],
  glyphs: snapshot.musicGlyphs ?? [],
  pairedSystems,
});
const topology = recognizeRhythmTopology(primitives.primitives, pairedSystems);
const rhythmMeasures = buildMeasureRhythmResults({
  events: topology.events,
  tabEvents: fretEvents.events,
  measureNumbers,
  beats: timeSignature.beats,
  beatType: timeSignature.beatType,
});
```

Keep the explicit skeleton warning when no reliable paired staff or no strong evidence exists. Append concise fallback reasons without logging raw glyphs or PDF content.

- [ ] **Step 4: Run all pure Toolbox analysis tests**

Run: `npm test -- --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/notation-primitives.test.ts src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/rhythm-measures.test.ts`

Expected: PASS.

### Task 9: Export Recognized Measures to MusicXML

**Files:**
- Modify: `src/features/toolbox/musicxml.service.ts`
- Modify: `src/features/toolbox/musicxml.service.test.ts`

**Interfaces:**
- Consumes: `TabScoreAnalysis.rhythmMeasures` and existing `fretEvents`.
- Produces: recognized notes/rests for safe measures and whole-measure placeholders for fallback measures.

- [ ] **Step 1: Write failing MusicXML tests**

Assert divisions 8, exact durations/types, one optional `<dot/>`, string/fret technical notation, `<chord/>` for additional positions in one TAB column, explicit recognized rests, whole-measure fallback, and fallback measure numbers in credit text.

- [ ] **Step 2: Run and verify failures**

Run: `npm test -- --run src/features/toolbox/musicxml.service.test.ts`

Expected: FAIL because all measures still use skeleton rests.

- [ ] **Step 3: Implement measure-level serialization**

Serialize a recognized measure only when every referenced TAB event still resolves. If any lookup fails, serialize the entire measure as the existing placeholder. Keep XML escaping, standard tuning, object URL behavior, and `.musicxml` filename behavior unchanged.

- [ ] **Step 4: Parse and verify generated XML**

Run: `npm test -- --run src/features/toolbox/musicxml.service.test.ts`

Expected: PASS with zero `DOMParser` errors.

### Task 10: Show Rhythm Recognition and Fallback Status

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.css`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: `TabScoreAnalysis.rhythmMeasures`.
- Produces: checked/recognized/fallback counts, per-measure statuses, and mixed-export notice.

- [ ] **Step 1: Add failing page assertions**

Assert a rhythm summary, recognized and fallback measure labels, concise reasons, and a notice that fallback measures export as rest placeholders.

- [ ] **Step 2: Run and verify missing UI failures**

Run: `npm test -- --run src/features/toolbox/ToolboxPage.test.tsx`

Expected: FAIL because the rhythm section is absent.

- [ ] **Step 3: Add semantic status markup and bilingual copy**

Render one compact section and list, with text labels rather than color alone. Keep the existing download button condition, avoid nested cards, and do not add animation or editing controls.

- [ ] **Step 4: Run page and Toolbox tests**

Run: `npm test -- --run src/features/toolbox/ToolboxPage.test.tsx src/features/toolbox`

Expected: PASS.

### Task 11: Focused Verification and Handoff

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

**Interfaces:**
- Verifies: Toolbox behavior using synthetic evidence only.
- Records: supported topology, fallback rules, exact commands/results, and remaining unsupported notation.

- [ ] **Step 1: Run the focused Toolbox suite**

Run: `npm test -- --run src/features/toolbox`

Expected: all Toolbox tests PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite PASS; record the existing chunk-size warning separately if it remains.

- [ ] **Step 3: Check the scoped diff**

Run: `git diff --check -- src/features/toolbox src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`

Expected: no whitespace errors.

- [ ] **Step 4: Update the handoff documents**

Record that explicit duration came only from symbol topology or reliable glyph semantics, never TAB spacing; record supported notes/rests/dot, whole-measure fallback, tests/build, and unsupported tuplets/ties/cross-measure beams/grace notes/voices/techniques/scans/playback/manual editing/`.gp`.

Do not read, copy, upload, or commit a real PDF as part of automated verification. Do not push unless the user explicitly requests it.

## Plan Self-Review

- Spec coverage: adapter evidence, dual-channel normalization, relation-first topology, shared/partial beams, rests/dots, whole-measure validation, safe export, UI status, and handoff all have dedicated tasks.
- Placeholder scan: no incomplete marker or unspecified implementation step remains.
- Type consistency: `vectorShapes`, `musicGlyphs`, `NotationPrimitive`, `RhythmTopologyEvent`, and `MeasureRhythmResult` are introduced before downstream use.
- Scope check: no Supabase, dependency, upload, real-PDF fixture, manual editor, playback, technique, or `.gp` work is included.
