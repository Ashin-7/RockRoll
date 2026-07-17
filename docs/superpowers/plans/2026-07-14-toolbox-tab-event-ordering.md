# Toolbox Tab Event Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将同一小节内已定位的弦/品位候选按横向位置整理为稳定、可审计的事件列顺序。

**Architecture:** 新增纯 `tab-events` 模块，只消费 `TabFretPosition[]`，按页与小节分组，再使用坐标容差合并事件列。`tab-analyzer` 将事件附加到既有分析摘要；页面只展示计数。MusicXML 不读取事件，因此仍生成安全休止骨架。

**Tech Stack:** TypeScript、Vitest、现有 Toolbox 类型和 React 页面。

## Global Constraints

- 仅处理阶段 2 已定位的 `TabFretPosition`，不重新读取 PDF 或修改 `pdf.service.ts`。
- 不识别节拍、时值、休止、音高、和弦、连音或技巧符号。
- 不上传、不持久化、不修改 Supabase、RLS、Archive、Inbox、Practice 或依赖。
- MusicXML 继续忽略事件列；禁止生成 `.gp`。
- 跨页、跨小节、跨系统候选不得合并；不确定时降级为 `medium` 并显示警告。

---

### Task 1: Define and Test Pure Event Ordering

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Create: `src/features/toolbox/tab-events.ts`
- Create: `src/features/toolbox/tab-events.test.ts`

**Interfaces:**
- Consumes: `TabFretPosition[]`.
- Produces: `groupTabFretEvents(positions): TabFretEventResult`.

- [ ] **Step 1: Write the failing grouped-column test.**

```ts
expect(groupTabFretEvents(positions)).toEqual({
  events: [
    { page: 1, measureNumber: 3, order: 1, x: 100, positions: [lowE3, b7], confidence: 'high' },
    { page: 1, measureNumber: 3, order: 2, x: 150, positions: [g5], confidence: 'high' },
  ],
  warnings: [],
});
```

- [ ] **Step 2: Verify the test fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-events.test.ts`

Expected: FAIL because `tab-events.ts` and `groupTabFretEvents` do not exist.

- [ ] **Step 3: Implement the minimum pure grouping.**

```ts
export interface TabFretEvent {
  page: number;
  measureNumber: number;
  order: number;
  x: number;
  positions: TabFretPosition[];
  confidence: 'high' | 'medium';
}

export function groupTabFretEvents(positions: TabFretPosition[]): TabFretEventResult {
  // 先按页和小节隔离，再按横向容差合并为事件列。
}
```

Use a documented x tolerance derived from the median adjacent position gap within each page/measure group. Sort event positions by `stringNumber`; sort event columns by `x`. Do not infer duration.

- [ ] **Step 4: Verify the test passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-events.test.ts`

Expected: PASS with exactly two ordered event columns.

### Task 2: Preserve Ambiguous Geometry as Diagnostics

**Files:**
- Modify: `src/features/toolbox/tab-events.ts`
- Modify: `src/features/toolbox/tab-events.test.ts`

**Interfaces:**
- Consumes: `groupTabFretEvents` from Task 1.
- Produces: medium-confidence events and warnings for duplicate strings or unstable columns.

- [ ] **Step 1: Write the failing ambiguity test.**

```ts
expect(result.events[0]).toMatchObject({ confidence: 'medium' });
expect(result.warnings).toEqual(['1 tab fret event has conflicting fret candidates on one string.']);
```

- [ ] **Step 2: Verify the test fails.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-events.test.ts`

Expected: FAIL because the initial grouping does not assess same-string conflicts.

- [ ] **Step 3: Add only conflict diagnostics.**

```ts
const hasStringConflict = new Set(event.positions.map((position) => position.stringNumber)).size !== event.positions.length;
```

If a column has two different fret values on the same string, retain all candidates, set event confidence to `medium`, and append the exact warning. Do not choose a fret or generate a musical note.

- [ ] **Step 4: Verify the test passes.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-events.test.ts`

Expected: PASS with a retained medium-confidence event and one warning.

### Task 3: Attach Events to the Toolbox Summary

**Files:**
- Modify: `src/features/toolbox/toolbox.types.ts`
- Modify: `src/features/toolbox/tab-analyzer.ts`
- Modify: `src/features/toolbox/tab-analyzer.test.ts`
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: `groupTabFretEvents(geometry.positions)`.
- Produces: `TabScoreAnalysis.fretEvents` and localized, read-only event count.

- [ ] **Step 1: Write failing analysis and page tests.**

```ts
expect(analyzeTabScore(snapshot).fretEvents).toHaveLength(3);
expect(screen.getByText('3 tab event columns located')).toBeInTheDocument();
```

- [ ] **Step 2: Verify both tests fail.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/ToolboxPage.test.tsx`

Expected: FAIL because `fretEvents` and its localized summary are absent.

- [ ] **Step 3: Implement summary-only integration.**

```tsx
<p>{analysis.fretEvents.length} {t('toolbox.fretEventsLocated')}</p>
```

Append event warnings to `analysis.warnings`. Keep `createMusicXml(analysis)` unchanged and do not add editing, playback or duration controls.

- [ ] **Step 4: Verify focused tests pass.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/ToolboxPage.test.tsx`

Expected: PASS; existing MusicXML tests still assert whole-measure rests.

### Task 4: Verify Scope and Record the Handoff

**Files:**
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/NEXT_TASKS.md`
- Modify: `docs/SESSION_HANDOFF.md`

- [ ] **Step 1: Run Toolbox tests and production build.**

Run: `$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build } }`

Expected: tests, TypeScript and Vite exit 0; record existing chunk-size warnings separately.

- [ ] **Step 2: Update handoff documents.**

Record exact verification output; explicitly state that event columns are geometric ordering only and do not represent rhythmic duration or generated MusicXML notes.
