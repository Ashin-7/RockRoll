# RockRoll UI 整体重构方案

> 评估日期：2026-07-20
> 评估范围：`src/` 全量 UI 层（样式、组件、路由、状态、可访问性、性能）
> 目标：在保持现有"录音棚/磁带"视觉语言的前提下，收敛设计令牌、补齐 UI 原语、统一响应式与状态覆盖、改善性能与可维护性。

---

## 一、项目现状速览

| 维度 | 现状 |
|---|---|
| 技术栈 | React 18 + TS + Vite + Supabase，**无 UI 库、无 Tailwind、无 CSS-in-JS**，纯 CSS + 设计令牌 |
| 架构 | `features/*` 按领域分目录、hash 路由、`I18nProvider` 国际化（1010 行 messages，扎实） |
| 样式规模 | `tokens.css` 20 行 + `global.css` 74 行 + 13 个 feature CSS 共 **4395 行** |
| UI 原语 | 仅 5 个：`Button / Field / FormSection / ActionBar / SearchableDropdown` |
| 设计语言 | 暗色"录音棚/磁带"主题：coal/wine/amber/paper，display 字体 Narrow，背景径向渐变 + 重复线纹理 |

---

## 二、问题诊断（按严重度排序）

### 🔴 P0 — 设计令牌体系不完整且被大量绕过

`tokens.css` 只定义了 8 个颜色、6 档间距、1 档圆角、1 档阴影、2 个字体。实际 CSS 里：

- **220 处 `rgba()` + 52 处 hex** 直接写死在 feature CSS 中，对比 `var(--*)` 仅 514 次
- `global.css` 第 31-38 行的 `button` 样式直接写 `linear-gradient(135deg, var(--color-wine), #3b1118)`，`#3b1118` 是未令牌化的色值
- 同一语义色被反复硬编码：`rgba(167,162,154,0.18)`（边框）、`rgba(242,169,59,0.24)`（琥珀强调）、`rgba(17,16,15,0.56)`（面板底）在 13 个文件里重复出现
- **没有** `--color-border`、`--color-border-strong`、`--color-panel-bg`、`--color-panel-bg-elevated`、`--color-amber-soft` 等语义层
- 间距只有 `1/2/3/4/6/8`，缺 `5/10/12/16`，导致 `clamp()` 和 `0.85rem`/`0.62rem` 等魔法值泛滥
- 圆角只有 `--radius-panel: 1.25rem`，于是出现 `calc(var(--radius-panel) * 1.4)`、`calc(var(--radius-panel) * 1.5)`、`0.5rem`、`0.75rem`、`1rem` 等并行体系

**后果**：换主题/做亮色模式/调一致性都要 13 个文件逐行改。

### 🔴 P0 — UI 原语严重缺失，页面各自造轮子

- 13/15 个页面直接写 `<button>`，只有 `ArchivePage` 用了 `ui-*` 原语
- **没有** `Panel / Card / Hero / SectionHeading / StatCard / EmptyState / LoadingState / ErrorState / Modal / Drawer / Table / Tabs / Badge / Tag / IconButton / Toast` 这些任何中后台都会反复用的组件
- "hero + 重复斜线纹理 + 径向渐变"模式在 9 个页面复制粘贴（`backstage-hero`、`songs-hero`、`albums-hero`、`archive-hero`…），`repeating-linear-gradient` 出现 9 次
- `signal-card / tape-card / draft-card / album-card / song-card` 本质都是"标题 + 副标题 + 右侧元信息"的同一卡片，却各写各的

**后果**：4395 行 CSS 里至少 40% 是重复模式；视觉一致性靠人肉对齐，已经出现 hero 字号 `clamp(3.2rem,8vw,7rem)` vs `clamp(2.6rem,6vw,5.25rem)` vs `clamp(3rem,6.4vw,5.6rem)` 三套并行。

### 🟠 P1 — 响应式断点不统一

21 个 `@media`，断点分布在 **720 / 760 / 860 / 900 / 980 / 1080 / 1100** 七个值上，没有统一的 `--bp-sm/md/lg` 令牌或 mixin。`AppShell` 在 760 折叠侧栏，但 `AlbumListPage` 在 760/900/1100 三档，`PracticeHistoryPage` 用 720/1080，`LibraryPage` 用 `min-width: 860`（反向）。

### 🟠 P1 — 状态与可访问性覆盖不均

- loading/empty/error 文案逻辑覆盖较好（23/15/21 处），但 **skeleton 只有 1 处**，绝大多数 loading 是文字"Loading…"，无骨架屏 → 布局抖动
- `prefers-reduced-motion` 仅 1 处（`AlbumListPage`），大量 `radial-gradient` 动效/`box-shadow` 闪烁未受控
- **无 `prefers-color-scheme: light`**，纯暗色，无主题切换
- `focus-visible` 30 处但分布不均，`global.css` 的 `button` 只在 `AppShell` 里补了 focus 样式
- 无 `<main>` 跳转链接（skip-link）、无 `aria-live` 区域用于 toast/异步错误

### 🟠 P1 — 性能与组件粒度

- **0 处 `React.memo`**，194 处 `useState/useEffect`
- `ArchivePage.tsx` **780 行**、`AlbumListPage.tsx` **579 行**、`PracticeHistoryPage.tsx` 495 行 —— 单文件承担列表+表单+详情+状态机
- 每个页面自己在 `useEffect` 里手写 fetch + isMounted + try/catch，**无 `useAsync / useQuery` 抽象**，无缓存，无 stale-while-revalidate
- hash 路由在 `App.tsx` 用大 switch + `getRouteForHash`，无懒加载（`React.lazy` 全 0 处），首屏加载全部 13 个页面

### 🟡 P2 — 路由与导航

- 自研 hash 路由能用但缺：嵌套路由、路由参数类型安全、`<Link>` 组件、active 状态自动同步（现在 `AppShell` 手动比对 `currentHash === item.href`，对 `#song/123` 这类详情页永远不亮）
- `App.tsx` 第 79-93 行的 page map 是静态对象，所有页面组件都会被求值（虽然 React 只渲染一个，但 import 已全量加载）

### 🟡 P2 — 其它

- `index.html` `<html lang="en">` 与 i18n 默认 `zh-CN` 不一致，且 `lang` 不会随 `setLocale` 切换
- `global.css` 用元素选择器给 `button/input` 全局加渐变背景，导致 `Button` 组件想换 variant 时必须用 `!important` 或高特异性选择器覆盖（目前靠 `.ui-button--primary` 类叠加，脆弱）
- 字体仅声明了 `Arial Narrow / Inter`，未实际加载 web font，`Inter` 在 Windows 上 fallback 到 Segoe UI，display 字体观感不一致

---

## 三、重构方案（分 4 期，按 ROI 排序）

### 第 1 期 · 设计令牌重建（1-2 天，最高优先）

**目标**：把 220+ rgba / 52 hex 收敛到语义令牌，为后续所有重构铺底。

1. 扩充 `tokens.css` 为分层结构：

   ```css
   :root {
     /* 原始色板 */
     --c-coal-900: #11100f; --c-coal-800: #22201f; --c-coal-700: #3a3633;
     --c-wine-600: #7b1e2b; --c-wine-700: #3b1118;
     --c-amber-400: #f2a93b;
     --c-paper-50: #f3ead8; --c-paper-300: #cdbf9f; --c-paper-400: #a7a29a;

     /* 语义层（页面只该用这层） */
     --color-bg: var(--c-coal-900);
     --color-bg-panel: rgba(17,16,15,0.72);
     --color-bg-panel-elevated: rgba(34,32,31,0.9);
     --color-border: rgba(167,162,154,0.18);
     --color-border-strong: rgba(242,169,59,0.32);
     --color-fg: var(--c-paper-50);
     --color-fg-muted: var(--c-paper-300);
     --color-fg-subtle: var(--c-paper-400);
     --color-accent: var(--c-amber-400);
     --color-accent-soft: rgba(242,169,59,0.14);
     --color-danger: #d44a3a;   /* 新增 */
     --color-success: #6ba368;  /* 新增 */

     /* 间距 12 档 */
     --space-1..12: 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 2.5 / 3 / 4 / 6 / 8 rem;

     /* 圆角 5 档 */
     --radius-sm/md/lg/xl/2xl: 0.375 / 0.5 / 0.75 / 1.25 / 1.75rem;

     /* 阴影 3 档 */
     --shadow-sm/md/stage;

     /* 字体 */
     --font-display: "Arial Narrow", "Roboto Condensed", sans-serif;
     --font-body: Inter, "Segoe UI", Arial, sans-serif;
     --font-mono: ui-monospace, "JetBrains Mono", monospace;  /* 新增，toolbox 用 */

     /* 断点（仅作文档，CSS 里用 @media 时统一引用这些值） */
     --bp-sm: 760px; --bp-md: 900px; --bp-lg: 1080px; --bp-xl: 1280px;
   }
   ```

2. 全局替换：
   - `rgba(167,162,154,0.18)` → `var(--color-border)`
   - `rgba(242,169,59,*)` 按透明度归到 `--color-accent-soft` / `--color-border-strong`
   - `rgba(17,16,15,*)` → `--color-bg-panel*`
3. `global.css` 的元素级 `button/input` 样式**降级为 reset**（只留 `font: inherit; color: inherit; background: none; border: 0`），视觉样式全部移到 `.ui-button` / `.ui-input` 类上，避免全局选择器与组件冲突
4. 新增 `[data-theme="light"]` 覆盖块，为第 4 期亮色模式预留

**验收**：`grep -rn "rgba(\|#[0-9a-fA-F]\{3,6\}" src --include=*.css` 仅剩 `tokens.css` 内的色板定义。

---

### 第 2 期 · UI 原语层建设（2-3 天）

**目标**：把 13 个页面里重复的 9 类模式抽成组件，CSS 行数砍掉 40%。

新增 `src/components/ui/`：

| 组件 | 替代现状 | 备注 |
|---|---|---|
| `Panel` | 9 处 hero/panel + `repeating-linear-gradient` | props: `variant: 'hero' \| 'panel' \| 'card'`, `as`, `tone` |
| `SectionHeading` | 13 处 `.eyebrow + h2` 组合 | props: `eyebrow`, `title`, `action` |
| `StatCard` | `signal-card / albums-hero__summary` | props: `label`, `value`, `detail` |
| `EntityCard` | `tape-card / draft-card / album-card / song-card` | props: `title`, `meta`, `status`, `action` |
| `EmptyState` | 散落的 `albums-message / songs-empty` | props: `icon?`, `title`, `description`, `action` |
| `LoadingState` + `Skeleton` | 23 处文字 Loading | `Skeleton` 已有 1 处，泛化成 `SkeletonText/SkeletonCard` |
| `ErrorState` | 21 处 error 文案 | props: `message`, `onRetry` |
| `Modal` / `Drawer` | 当前无，详情编辑全靠内联表单 | 基于 `<dialog>` 原生元素 |
| `Tabs` | `AuthPage` 的 signIn/signUp 手写切换 | 受控 + 受控 a11y |
| `Badge` / `Tag` | `songStatusMessageKeys` 渲染的状态标签 | props: `tone: 'planned'\|'learning'\|...` |
| `IconButton` | 散落的 `aria-label` 按钮 | 强制 `aria-label` |
| `DataTable` | `ArchivePage` / `PracticeHistoryPage` 的表格 | 列定义 + 虚拟化预留 |
| `Toast` + `ToastProvider` | 当前无 | `aria-live="polite"` |

配套：

- 每个原语独立 CSS 文件 `*.css`，使用第 1 期语义令牌，禁止再写 hex/rgba
- `index.ts` 统一导出，配 `ui.test.tsx` 快照/行为测试
- 把 13 个页面的 hero/panel/card 类名逐步替换为 `<Panel variant="hero">` 等，**每次替换一个页面 + 跑该页面测试**（符合 AGENTS.md "small reviewable diffs"）

**验收**：

- `grep -rln "<button" src/features --include=*.tsx` 降到 0
- feature CSS 总行数 < 2800

---

### 第 3 期 · 数据层与性能（2 天）

**目标**：消除 194 处手写 `useEffect+useState+isMounted`，引入查询抽象与代码分割。

1. 新增 `src/lib/useAsync.ts`（或引入 `@tanstack/react-query`，但项目当前零运行时依赖，建议先自研 60 行的 `useAsync` + `useAsyncResource`）
2. 每个页面把"加载详情/列表"换成 `const { data, isLoading, error, refetch } = useAsync(() => getXxx(id), [id])`，配合第 2 期的 `LoadingState/ErrorState/EmptyState`
3. `App.tsx` 改为 `React.lazy(() => import('./features/songs/SongListPage'))` + `<Suspense fallback={<PageSkeleton />}>`，首屏只加载当前路由
4. 路由从自研 hash 升级为 `React.lazy` 友好的轻量方案：保留 hash 路由但抽出 `useHashRoute()` hook，`<Link>` 组件自动 active；详情页 `#song/:id` 也能高亮父级 `#songs`
5. 拆分超大页面：`ArchivePage.tsx` 780 行 → `ArchivePage`（容器）+ `ArchiveList` + `ArchiveForm` + `ArchiveDetail`，每个 < 250 行
6. 对列表项 `EntityCard` 加 `React.memo` + 稳定 key，避免父组件 state 变更全量重渲染

**验收**：

- `ArchivePage.tsx` < 250 行
- Lighthouse 首屏 JS gzip < 80KB（当前全量打包估算 > 200KB）
- `React.memo` 出现 > 5 处

---

### 第 4 期 · 可访问性 + 主题 + 收尾（1-2 天）

1. **a11y**：
   - `AppShell` 顶部加 `<a className="skip-link" href="#main">跳到主内容</a>`，`<main id="main">`
   - 全局 `@media (prefers-reduced-motion: reduce)` 把 `radial-gradient` 动效、`box-shadow` 闪烁降级
   - `Toast` 用 `aria-live`；表单错误用 `aria-describedby` 关联到 `Field`（`Field` 已有 `hint`，扩展 `error` prop）
   - `I18nProvider` 切换 locale 时同步 `document.documentElement.lang`
   - 颜色对比度 audit：`--color-paper-muted (#cdbf9f)` on `--color-bg-panel` 约 7:1 达标，但 `--color-silver (#a7a29a)` on `rgba(34,32,31,0.72)` 约 4.5:1 刚过 AA，正文慎用
2. **亮色模式**：`[data-theme="light"]` 覆盖语义令牌，`AppShell` 加主题切换按钮（与语言切换并列），`localStorage` 持久化，默认跟随 `prefers-color-scheme`
3. **字体**：`index.html` 引入 Inter web font（或 `@fontsource/inter`），display 字体保留 Narrow fallback
4. **响应式统一**：所有 `@media` 断点收敛到 `--bp-sm/md/lg` 三档，`AppShell` 侧栏在 `--bp-md` 折叠成顶部抽屉
5. **文档**：`docs/` 下新增 `ui-system.md`，说明令牌层级、原语清单、新增页面的 UI 规范

---

## 四、优先级与排期总表

| 期 | 工作量 | 风险 | 收益 |
|---|---|---|---|
| 1 令牌重建 | 1-2 天 | 低（机械替换） | 🔴 决定后续所有工作能否推进 |
| 2 原语层 | 2-3 天 | 中（要逐页迁移+跑测试） | 🔴 CSS 砍 40%，一致性根治 |
| 3 数据/性能 | 2 天 | 中（动数据流） | 🟠 首屏性能、可维护性 |
| 4 a11y/主题 | 1-2 天 | 低 | 🟠 覆盖率与可用性 |

**总计 6-9 个工作日**，建议严格按 1→2→3→4 顺序，每期完成后 `npm test -- --run && npm run build` 验证（与 README 验证流程一致），每期一个 PR，符合 AGENTS.md "small reviewable diffs"。

---

## 五、不建议做的事

- ❌ 引入 Tailwind / styled-components / Emotion：项目纯 CSS + 令牌体系已成型，引入会推翻 4395 行 CSS 且与 AGENTS.md "match existing styling system" 冲突
- ❌ 引入 MUI / Ant Design：会带来第二套设计语言，与"录音棚"主题冲突，体积也不划算
- ❌ 一次性重写所有页面：违反 AGENTS.md "avoid sweeping refactors"，应逐页迁移
- ❌ 现在就上 react-router：hash 路由目前够用，第 3 期用 `React.lazy` + 自研 hook 即可，换路由库收益小风险大

---

## 六、关键量化指标（重构前 → 重构后目标）

| 指标 | 现状 | 目标 |
|---|---|---|
| feature CSS 总行数 | 4395 | < 2800 |
| `rgba()`/hex 硬编码数（feature CSS） | 272 | 0（仅 tokens.css） |
| UI 原语组件数 | 5 | ≥ 17 |
| 页面直接写 `<button>` 数 | 13 | 0 |
| `React.memo` 使用 | 0 | ≥ 5 |
| `React.lazy` 代码分割 | 0 | 13 个路由全懒加载 |
| 首屏 JS gzip | > 200KB（估算） | < 80KB |
| `ArchivePage.tsx` 行数 | 780 | < 250 |
| `@media` 断点种类 | 7 个 | 3 个（sm/md/lg） |
| `prefers-reduced-motion` 覆盖 | 1 处 | 全局 + 关键动效 |
| `prefers-color-scheme` / 主题切换 | 无 | 亮/暗双主题 |
| skip-link / `aria-live` | 无 | 全量覆盖 |
| `document.documentElement.lang` 同步 | 不随 locale 切换 | 自动同步 |

---

## 七、执行约束（来自 AGENTS.md）

- 小步可审阅的 diff，避免大爆炸式重构
- 每次编辑前先列出 3-6 条 bullet 计划
- 不臆造 API、配置、文件路径或项目约定，不确定时先搜索仓库
- 保持向后兼容，除非明确要求
- 改动与现有架构和代码风格保持一致
- 有测试就为行为变更补/改测试
- 优先类型安全与显式错误处理
- 验证流程：`npm test -- --run && npm run build`
