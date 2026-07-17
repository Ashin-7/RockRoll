# Hide Artist List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 RockRoll 主导航和列表路由中屏蔽艺人列表，同时保留艺人详情、艺人数据及 Archive/Albums/导入关联。

**Architecture:** 通过现有 hash 路由表控制列表页可达性，不引入功能开关或占位页面。移除 `#artists` 路由与 `ArtistListPage` 的生产映射后，旧列表链接沿用未知路由回退到 Backstage；`#artist/:id` 详情路由保持不变。

**Tech Stack:** React 18、TypeScript、Vitest、Testing Library、Vite

## Global Constraints

- 只屏蔽艺人列表；保留艺人详情和其他现有导航、路由。
- 不删除 `src/features/artists` 中的实现或测试。
- 不修改 Supabase、migration、RLS、policy、权限文档或任何数据库数据。
- 不改变 Archive、Albums、导入、一键导入或 `match_existing` 语义。
- 不新增依赖，不运行 `npm install`。
- 保留工作区中与本任务无关的既有修改和未跟踪文件。

---

### Task 1: 屏蔽艺人列表入口与路由

**Files:**
- Modify: `src/app/shell/AppShell.test.tsx`
- Modify: `src/app/routes.test.tsx`
- Modify: `src/app/shell/AppShell.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/App.tsx`
- Create: `docs/superpowers/plans/2026-07-17-hide-artist-list.md`

**Interfaces:**
- Consumes: `getRouteForHash(hash: string): AppRoute`、`AppShell` 的现有主导航、`#artist/:id` 详情 hash。
- Produces: 不含 `#artists` 的主导航和路由表；`#artists` 返回现有默认路由 `backstage`；`#artist/:id` 仍返回 `artistDetail`。

- [x] **Step 1: 先修改测试表达屏蔽行为**

在 `src/app/shell/AppShell.test.tsx` 的主导航测试中，用以下断言替换当前“Artists 存在”的断言：

```tsx
expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Artists' })).toBeNull();
```

在 `src/app/routes.test.tsx` 的已知路由测试中删除 `#artists` 列表断言，并新增独立用例：

```tsx
it('blocks the artist list route while preserving artist detail', () => {
  expect(getRouteForHash('#artists')).toBe('backstage');
  expect(getRouteForHash('#artist/artist-1')).toBe('artistDetail');
});
```

- [x] **Step 2: 运行测试并确认 RED**

Run:

```powershell
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/app/shell/AppShell.test.tsx src/app/routes.test.tsx
```

Expected: FAIL；主导航仍能找到 Artists，且 `getRouteForHash('#artists')` 仍返回 `artists`。

- [x] **Step 3: 完成最小生产实现**

在 `src/app/shell/AppShell.tsx` 的 `navItems` 中删除：

```tsx
{ href: '#artists', labelKey: 'nav.artists' },
```

在 `src/app/routes.tsx` 中从 `AppRoute` 联合类型删除：

```tsx
| 'artists'
```

并从 `routes` 映射删除：

```tsx
'#artists': 'artists',
```

保留下列详情路由分支和 `getArtistIdForHash`：

```tsx
if (hash.startsWith('#artist/')) {
  return 'artistDetail';
}
```

在 `src/App.tsx` 中删除列表页 import：

```tsx
import { ArtistListPage } from './features/artists/ArtistListPage';
```

并从页面映射删除：

```tsx
artists: <ArtistListPage />,
```

保留 `ArtistDetailPage` import、`artistDetail` 页面映射与 `getArtistIdForHash` 调用。

- [x] **Step 4: 运行定向测试并确认 GREEN**

Run:

```powershell
C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/app/shell/AppShell.test.tsx src/app/routes.test.tsx
```

Expected: 2 个测试文件、10 个用例通过，退出码 0。

- [x] **Step 5: 运行生产构建**

Run:

```powershell
$node20Directory = 'C:\Users\Ashin\AppData\Local\nvm\v20.20.2'; $env:PATH="$node20Directory;$env:PATH"; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\npm.cmd run build
```

Expected: TypeScript 与 Vite 构建通过，退出码 0；允许保留既有的主 chunk 体积警告。

- [x] **Step 6: 检查限定范围 diff**

Run:

```powershell
git diff --check -- src/App.tsx src/app/routes.tsx src/app/routes.test.tsx src/app/shell/AppShell.tsx src/app/shell/AppShell.test.tsx docs/superpowers/plans/2026-07-17-hide-artist-list.md
```

Expected: 无空白错误；Windows 下仅允许出现 LF 转 CRLF 提示。

- [x] **Step 7: 提交本任务文件**

```powershell
git add -- src/App.tsx src/app/routes.tsx src/app/routes.test.tsx src/app/shell/AppShell.tsx src/app/shell/AppShell.test.tsx docs/superpowers/plans/2026-07-17-hide-artist-list.md
git commit -m "feat: hide artist list"
```

提交前再次运行 `git status --short`，不得包含已有的专辑设计文档改动或 `.playwright-cli` 文件。
