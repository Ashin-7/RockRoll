# Toolbox Vector Tab Staff Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从电子 PDF 的矢量线段定位可靠的六线谱字符串基线，使品位文本无需覆盖全部六弦也能归属弦号。

**Architecture:** 扩展现有 PDF 快照以保留最小线段几何；新增纯 `tab-staff-geometry` 模块将近似水平、等长且等距的线段组合为 `TabStaffSystem`。现有 `tab-geometry` 优先消费这些系统，保留文本行回退。MusicXML 与下载流程不改动。

**Tech Stack:** TypeScript、Vitest、现有 `pdfjs-dist@4.10.38`、PDF.js operator list。

## Global Constraints

- 全程浏览器本地处理；不上传、不保存 PDF、线段或分析结果。
- 仅支持清晰电子六线谱；拒绝扫描件、五线谱、装饰线和不完整六线组合。
- 不识别节奏、时值、音高、和弦、技巧、连音或 `.gp`。
- 不修改 Supabase、RLS、Archive、Inbox、Practice、依赖版本或 MusicXML 休止骨架。
- 矢量系统不可靠时必须回退或警告，不得伪造弦号。

---

### Task 1: Extend the Local PDF Snapshot With Line Segments

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/pdf.service.ts`
- Modify: `src/features/toolbox/pdf.service.test.ts`

**Interfaces:**
- Produces: `PdfLineSegment { page, x1, y1, x2, y2 }` and `PdfDocumentSnapshot.lineSegments`.

- [ ] **Step 1: Write the failing adapter normalization test.**

```ts
expect(snapshot.lineSegments).toEqual([
  { page: 1, x1: 50, y1: 100, x2: 250, y2: 100 },
]);
```

- [ ] **Step 2: Verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/pdf.service.test.ts`

Expected: FAIL because the snapshot has no `lineSegments` field.

- [ ] **Step 3: Add minimum operator-list extraction.**

```ts
export interface PdfLineSegment {
  page: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
```

Track PDF.js path move/line operators only while reading each page. Normalize coordinates to the same page space as `PdfTextItem`; retain the current drawing count and image detection unchanged.

- [ ] **Step 4: Verify the adapter test passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/pdf.service.test.ts`

Expected: PASS with normalized text, counts and the exact line segment.

### Task 2: Detect Reliable Six-String Vector Systems

**Files:**
- Create: `src/features/toolbox/tab-staff-geometry.ts`
- Create: `src/features/toolbox/tab-staff-geometry.test.ts`
- Modify: `src/features/toolbox/toolbox.types.ts`

**Interfaces:**
- Consumes: `PdfLineSegment[]`.
- Produces: `findTabStaffSystems(segments): TabStaffSystem[]`.

- [ ] **Step 1: Write the failing six-line system test.**

```ts
expect(findTabStaffSystems(sixHorizontalSegments)).toEqual([
  expect.objectContaining({ page: 1, x1: 50, x2: 250, stringYs: [100, 110, 120, 130, 140, 150], confidence: 'high' }),
]);
```

- [ ] **Step 2: Verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-staff-geometry.test.ts`

Expected: FAIL because `tab-staff-geometry.ts` does not exist.

- [ ] **Step 3: Implement only horizontal, equal-spacing detection.**

```ts
export interface TabStaffSystem {
  page: number;
  x1: number;
  x2: number;
  stringYs: [number, number, number, number, number, number];
  averageStringGap: number;
  confidence: 'high' | 'medium';
}
```

Filter near-horizontal segments, merge collinear segments with small gaps, then accept only six consecutive rows whose lengths and spacing meet fixed tolerances. Return no system for five-line staff fixtures or unequal gaps.

- [ ] **Step 4: Verify the system tests pass.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-staff-geometry.test.ts`

Expected: PASS for six strings and rejection fixtures.

### Task 3: Prefer Vector Baselines for String/Fret Assignment

**Files:**
- Modify: `src/features/toolbox/tab-geometry.ts`
- Modify: `src/features/toolbox/tab-geometry.test.ts`
- Modify: `src/features/toolbox/tab-analyzer.ts`
- Modify: `src/features/toolbox/tab-analyzer.test.ts`

**Interfaces:**
- Consumes: `findTabStaffSystems(snapshot.lineSegments)`.
- Produces: `locateTabFrets(textItems, measureNumbers, staffSystems)` with vector-backed positions.

- [ ] **Step 1: Write the failing sparse-text geometry test.**

```ts
expect(locateTabFrets([fret7], [1, 2], [staffSystem])).toMatchObject({
  positions: [expect.objectContaining({ stringNumber: 3, fret: 7, confidence: 'high' })],
});
```

- [ ] **Step 2: Verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-analyzer.test.ts`

Expected: FAIL because the locator only derives rows from numeric text.

- [ ] **Step 3: Add vector-first assignment with text fallback.**

```ts
const systems = staffSystems.filter((system) => system.page === page && item.x >= system.x1 && item.x <= system.x2);
```

Choose the unique system whose nearest string baseline is within the current string tolerance. Use its `stringYs` and `averageStringGap`; only use existing text-row logic when no reliable vector system covers the item. Append a warning for each medium-confidence system used.

- [ ] **Step 4: Verify focused geometry and analyzer tests pass.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-analyzer.test.ts`

Expected: PASS; sparse text locates to the vector system, existing text-only fallback remains covered.

### Task 4: Surface Baseline Diagnostics and Verify Boundaries

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/i18n/messages.ts`
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] **Step 1: Write the failing page summary test.**

```tsx
expect(screen.getByText('1 six-string tab system located')).toBeInTheDocument();
```

- [ ] **Step 2: Verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx`

Expected: FAIL because no tab-staff-system count is exposed.

- [ ] **Step 3: Add read-only localized count and keep export unchanged.**

```tsx
<p>{analysis.tabStaffSystems.length} {t('toolbox.tabStaffSystemsLocated')}</p>
```

Expose only the count and existing warnings. Do not add editing, upload, playback or MusicXML note generation.

- [ ] **Step 4: Run full Toolbox verification and update handoff.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build } }`

Expected: all Toolbox tests, TypeScript and Vite pass. Record that real PDF verification is local-only and that rhythm/techniques remain out of scope.
