# Toolbox Geometry Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将旧工作树中已验证的谱线几何兼容边界最小移植到当前 Toolbox 架构，并修复英文单数摘要。

**Architecture:** 保留当前 `notation-primitives + rhythm-topology` 节奏架构，只在谱线候选生成和五线谱/TAB 配对层过滤明显伪横线。所有行为先由人工几何夹具失败测试锁定，不读取真实 PDF。

**Tech Stack:** React 18、TypeScript、Vitest、Testing Library、Vite。

## Global Constraints

- 不运行 `npm install`，复用现有依赖。
- 不读取、复制或上传真实 PDF，不生成 `.gp`。
- 不修改 Supabase、Archive、Inbox、导入语义或 `match_existing`。
- 不整体合并或 cherry-pick `codex/toolbox-explicit-rhythm`。
- 只修改当前 Toolbox 几何、页面文案、测试和本计划文件。

---

### Task 1: TAB 谱线候选过滤

**Files:**
- Modify: `src/features/toolbox/tab-staff-geometry.test.ts`
- Modify: `src/features/toolbox/tab-staff-geometry.ts`

**Interfaces:**
- Consumes: `PdfLineSegment[]`
- Produces: 现有 `findTabStaffSystems(segments): TabStaffSystem[]`，签名不变

- [ ] **Step 1: 写失败测试**

新增两个真实函数测试：短横线位于六条弦线之间时仍找到正确系统；六行只有两端稀疏片段时返回空数组。

```ts
it('ignores short horizontal notation artifacts between string rows', () => {
  const segments = [
    segment(100), segment(105, 110, 115), segment(110),
    segment(115, 80, 90), segment(120), segment(130), segment(140), segment(150),
  ];
  expect(findTabStaffSystems(segments)).toEqual([
    expect.objectContaining({ stringYs: [100, 110, 120, 130, 140, 150] }),
  ]);
});

it('rejects coincidental rows with sparse horizontal coverage', () => {
  const segments = [100, 110, 120, 130, 140, 150].flatMap((y) => [
    segment(y, 50, 70), segment(y, 230, 250),
  ]);
  expect(findTabStaffSystems(segments)).toEqual([]);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `node node_modules/vitest/vitest.mjs --run src/features/toolbox/tab-staff-geometry.test.ts`
Expected: 两个新用例因伪候选未过滤而失败。

- [ ] **Step 3: 最小实现**

为合并后的横向行保存区间覆盖率；过滤覆盖率低于 `0.8` 或跨度低于本页最大跨度 `0.15` 的行，再执行现有六线系统判定。保留当前断裂行测试允许的 30 单位间隙。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `node node_modules/vitest/vitest.mjs --run src/features/toolbox/tab-staff-geometry.test.ts`
Expected: 6 个用例全部通过。

### Task 2: 五线谱伪影过滤与配对距离

**Files:**
- Modify: `src/features/toolbox/staff-tab-alignment.test.ts`
- Modify: `src/features/toolbox/staff-tab-alignment.ts`

**Interfaces:**
- Consumes: `PdfLineSegment[]` 与 `TabStaffSystem[]`
- Produces: 现有 `findPairedStaffSystems(...)`，签名不变

- [ ] **Step 1: 写失败测试**

新增短横线夹在标准五线谱之间仍能配对的测试；新增标准谱底线到 TAB 顶线距离为 `6.6 * averageStringGap` 时允许配对的边界测试。

```ts
it('ignores short horizontal notation artifacts between standard staff rows', () => {
  const segments = [line(40), line(42, 110, 115), line(45), line(48, 80, 90), line(50), line(55), line(60)];
  expect(findPairedStaffSystems(segments, [tabSystem()])).toEqual([
    expect.objectContaining({ standardLineYs: [40, 45, 50, 55, 60] }),
  ]);
});

it('accepts the supported 6.6 TAB-gap separation', () => {
  const tab = tabSystem([126, 136, 146, 156, 166, 176]);
  expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [tab])).toHaveLength(1);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `node node_modules/vitest/vitest.mjs --run src/features/toolbox/staff-tab-alignment.test.ts`
Expected: 新增伪影和 6.6 间距用例失败。

- [ ] **Step 3: 最小实现**

在标准谱候选前过滤跨度低于本页最大跨度 `0.15` 的行；配对距离上限取现有 `12 * averageStaffGap` 与兼容边界 `7 * averageStringGap` 的较大值，保留既有行为并支持已知布局。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `node node_modules/vitest/vitest.mjs --run src/features/toolbox/staff-tab-alignment.test.ts`
Expected: 9 个用例全部通过。

### Task 3: 英文单数摘要与最终验证

**Files:**
- Modify: `src/features/toolbox/ToolboxPage.test.tsx`
- Modify: `src/features/toolbox/ToolboxPage.tsx`
- Modify: `src/i18n/messages.ts`

**Interfaces:**
- Consumes: `rhythmMeasures.length`
- Produces: 数量为 1 时显示 `1 checked measure`，其他数量保持现有文案

- [ ] **Step 1: 写失败测试**

新增只有一个节奏小节的页面用例，断言 `1 checked measure`，且不存在 `1 checked measures`。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node node_modules/vitest/vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx`
Expected: 找不到单数文案。

- [ ] **Step 3: 最小实现**

新增 `toolbox.rhythmCheckedOne`，英文值为 `checked measure`，中文保持 `个小节已检查`；页面按数量是否为 1 选择 key。

- [ ] **Step 4: 运行定向与完整验证**

Run:

```powershell
node node_modules/vitest/vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts
node node_modules/vitest/vitest.mjs --run src/features/toolbox
npm run build
git diff --check -- src/features/toolbox src/i18n/messages.ts docs/superpowers/plans/2026-07-17-toolbox-geometry-compat.md
```

Expected: 定向测试、完整 Toolbox 回归和生产构建通过；仅允许既有 chunk size 警告。

- [ ] **Step 5: 提交并合并**

```powershell
git add -- src/features/toolbox src/i18n/messages.ts docs/superpowers/plans/2026-07-17-toolbox-geometry-compat.md
git commit -m "fix: preserve toolbox geometry compatibility"
```

在 `main` 合并后重复完整 Toolbox 测试和生产构建，再推送 `main`。旧 `codex/toolbox-explicit-rhythm` 工作树与分支保持不动。
