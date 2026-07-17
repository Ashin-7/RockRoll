# Toolbox String/Fret Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从清晰电子六线谱 PDF 的已归一化文本坐标中定位六条字符串基线，并输出带置信度的弦号和品位候选。

**Architecture:** 保持 PDF 适配器与页面不变。新增纯 `tab-geometry` 模块消费现有 `PdfTextItem[]` 和连续小节编号；它只返回可审计的几何对象和警告。`tab-analyzer` 只负责把定位结果附加到现有分析摘要，MusicXML 继续输出安全休止骨架。

**Tech Stack:** TypeScript、Vitest、现有 `pdfjs-dist@4.10.38` 快照类型。

## Global Constraints

- 仅支持清晰电子、单吉他轨、六弦标准调弦的 PDF 文本坐标。
- 浏览器本地处理；不上传、不持久化 PDF 或识别结果。
- 不修改 Supabase、RLS、Archive、Inbox、Practice、PDF 读取适配器或依赖版本。
- 不识别节奏时值、音高、连音、推弦、滑音、其他技巧符号，也不生成 `.gp`。
- 仅接受 `0` 至 `24` 的品位文本；无法唯一定位的候选必须拒绝并产生警告。
- 阶段 1 MusicXML 休止骨架与下载行为保持不变。

---

## 文件职责

- `src/features/toolbox/toolbox.types.ts`：声明几何系统、字符串基线、品位候选与分析摘要的可选定位字段。
- `src/features/toolbox/tab-geometry.ts`：纯坐标分组、基线识别、品位过滤和置信度判定。
- `src/features/toolbox/tab-geometry.test.ts`：用固定文本项覆盖几何规则与拒绝规则。
- `src/features/toolbox/tab-analyzer.ts`：将现有小节序列传给几何模块，并把返回的候选/警告并入 `TabScoreAnalysis`。
- `src/features/toolbox/tab-analyzer.test.ts`：验证阶段 1 摘要兼容，以及定位结果仅在可靠系统中出现。
- `src/features/toolbox/ToolboxPage.tsx`、`ToolboxPage.test.tsx`、`src/i18n/messages.ts`：仅显示候选计数与几何警告，不改变下载决策或 MusicXML 内容。

### Task 1: Define Geometry Data and Pure Locator

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/tab-geometry.ts`
- Create: `src/features/toolbox/tab-geometry.test.ts`

**Interfaces:**
- Consumes: `PdfTextItem[]` and `measureNumbers: number[]`.
- Produces: `locateTabFrets(textItems, measureNumbers): TabGeometryResult`.

- [ ] **Step 1: Write failing tests for one reliable six-string system.**

```ts
expect(locateTabFrets(items, [1, 2])).toMatchObject({
  positions: [
    { measureNumber: 1, stringNumber: 1, fret: 3, confidence: 'high' },
    { measureNumber: 2, stringNumber: 6, fret: 12, confidence: 'high' },
  ],
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts`

Expected: FAIL because `tab-geometry.ts` and `locateTabFrets` do not exist.

- [ ] **Step 3: Add the minimum types and locator.**

```ts
export interface TabFretPosition {
  page: number;
  measureNumber: number;
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  x: number;
  y: number;
  confidence: 'high' | 'medium';
}

export interface TabGeometryResult {
  positions: TabFretPosition[];
  warnings: string[];
}

export function locateTabFrets(textItems: PdfTextItem[], measureNumbers: number[]): TabGeometryResult {
  // 仅从已定位的六条字符串系统中返回唯一的品位候选。
}
```

Implement page-local system grouping, six条近似等距基线验证, `0..24` filtering, nearest-string assignment, and measure interval assignment. Return a warning whenever a candidate cannot be uniquely assigned.

- [ ] **Step 4: Run the focused test to verify it passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts`

Expected: PASS with the reliable-system case.

- [ ] **Step 5: Commit the isolated geometry unit.**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/tab-geometry.ts src/features/toolbox/tab-geometry.test.ts
git commit -m "feat: locate tab string and fret geometry"
```

### Task 2: Reject Ambiguous and Non-TAB Numbers

**Files:**
- Modify: `src/features/toolbox/tab-geometry.test.ts`
- Modify: `src/features/toolbox/tab-geometry.ts`

**Interfaces:**
- Consumes: `locateTabFrets` from Task 1.
- Produces: stable rejection warnings and no false `TabFretPosition` values.

- [ ] **Step 1: Write failing tests for double-digit frets, distant numbers, and boundary ambiguity.**

```ts
expect(result.positions.map((position) => position.fret)).toEqual([0, 12, 24]);
expect(result.positions).not.toContainEqual(expect.objectContaining({ fret: 92 }));
expect(result.warnings).toContain('Ignored 1 ambiguous tab fret candidate.');
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts`

Expected: FAIL because the first locator does not yet count and report all rejected candidates.

- [ ] **Step 3: Implement deterministic rejection diagnostics.**

```ts
function createAmbiguousCandidateWarning(count: number): string {
  return `Ignored ${count} ambiguous tab fret candidate${count === 1 ? '' : 's'}.`;
}
```

Count only numeric text inside a recognized TAB system that cannot be assigned to exactly one string or measure. Ignore title, tempo and small measure labels before this count; reject numbers above 24 without creating a fret position.

- [ ] **Step 4: Run the focused test to verify it passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts`

Expected: PASS with double-digit, out-of-range and ambiguous cases.

- [ ] **Step 5: Commit the rejection rules.**

```powershell
git add src/features/toolbox/tab-geometry.ts src/features/toolbox/tab-geometry.test.ts
git commit -m "test: cover ambiguous tab fret geometry"
```

### Task 3: Attach Geometry to the Existing Analysis Summary

**Files:**
- Modify: `src/features/toolbox/tab-analyzer.ts`
- Modify: `src/features/toolbox/tab-analyzer.test.ts`
- Modify: `src/features/toolbox/toolbox.types.ts`

**Interfaces:**
- Consumes: `locateTabFrets(snapshot.textItems, measureNumbers): TabGeometryResult`.
- Produces: `TabScoreAnalysis.fretPositions` and geometry warnings while preserving all existing fields.

- [ ] **Step 1: Write a failing analyzer test for reliable geometry.**

```ts
expect(analyzeTabScore(snapshot).fretPositions).toEqual([
  expect.objectContaining({ measureNumber: 1, stringNumber: 3, fret: 7, confidence: 'high' }),
]);
expect(analyzeTabScore(snapshot).warnings).toContain('Rhythm and technique recognition are not available yet.');
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts`

Expected: FAIL because `TabScoreAnalysis` does not yet expose `fretPositions`.

- [ ] **Step 3: Make the smallest analyzer integration.**

```ts
const geometry = locateTabFrets(snapshot.textItems, measureNumbers);

return {
  // 保留现有阶段 1 字段。
  fretPositions: geometry.positions,
  warnings: [...warnings, ...geometry.warnings, 'Rhythm and technique recognition are not available yet.'],
};
```

Keep MusicXML serialization unchanged. Do not turn a position into a note or change the download-enabled condition.

- [ ] **Step 4: Run analyzer and geometry tests to verify they pass.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-analyzer.test.ts`

Expected: PASS; existing stage 1 assertions stay unchanged except for explicitly added geometry fields.

- [ ] **Step 5: Commit analysis integration.**

```powershell
git add src/features/toolbox/toolbox.types.ts src/features/toolbox/tab-analyzer.ts src/features/toolbox/tab-analyzer.test.ts
git commit -m "feat: expose tab fret geometry analysis"
```

### Task 4: Show Geometry Diagnostics Without Changing Export

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: `analysis.fretPositions` and geometry warnings.
- Produces: localized summary of located string/fret candidates; existing MusicXML download flow unchanged.

- [ ] **Step 1: Write a failing page test for the geometry count.**

```tsx
expect(await screen.findByText('3 string/fret positions located')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Download MusicXML' })).toBeEnabled();
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx`

Expected: FAIL because the page does not render a geometry count.

- [ ] **Step 3: Add localized, read-only diagnostics.**

```tsx
<p>{t('toolbox.fretPositionsLocated', { count: analysis.fretPositions.length })}</p>
```

Add matching English and Chinese messages. Render this only after analysis. Do not add controls, editing, upload behavior or MusicXML note generation.

- [ ] **Step 4: Run the page test to verify it passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx`

Expected: PASS; the download still creates and revokes an object URL.

- [ ] **Step 5: Commit the diagnostic UI.**

```powershell
git add src/features/toolbox/ToolboxPage.tsx src/features/toolbox/ToolboxPage.test.tsx src/i18n/messages.ts
git commit -m "feat: show tab geometry diagnostics"
```

### Task 5: Verify the Feature Boundary

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

**Interfaces:**
- Verifies: pure geometry, analysis summary, existing local download, TypeScript and production build.

- [ ] **Step 1: Run the Toolbox tests.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\vitest\vitest.mjs --run src/features/toolbox`

Expected: PASS with no changed behavior outside Toolbox.

- [ ] **Step 2: Run TypeScript and the production build.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }`

Expected: TypeScript exits 0 and Vite exits 0; record any pre-existing chunk-size warning separately.

- [ ] **Step 3: Perform the local-only sample check.**

Run the existing Toolbox workflow against `C:\Users\Ashin\Downloads\endless rain.pdf` without copying or uploading it. Record only page count, string/fret candidate count and geometry warnings; do not claim rhythmic or technique recognition.

- [ ] **Step 4: Update the three status documents.**

Record exact test/build outputs, files changed, the continued no-upload/no-Supabase boundary, and the next explicitly separate design topic: rhythmic duration recognition.

- [ ] **Step 5: Commit verification documentation.**

```powershell
git add docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
git commit -m "docs: record tab geometry verification"
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 cover system, string and fret geometry plus confidence/rejection; Task 3 preserves the current analysis boundary; Task 4 exposes only diagnostics; Task 5 verifies the local-only constraint.
- Placeholder scan: every behavior has an explicit test or acceptance condition; no implementation step is deferred.
- Type consistency: `TabFretPosition`, `TabGeometryResult` and `locateTabFrets` are defined in Task 1 and used consistently by Tasks 2-4.
