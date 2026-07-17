# Practice History Mock MVP Design

## 目标

完成独立 `#practice` 页面，用本地 mock 展示最近练习记录，作为 Song 与 Practice 关联后的下一步前端闭环。

当前阶段仍保持 MVP Phase 1 / Practice First：

- 不接 Supabase。
- 不修改数据库和 migration。
- 不新增依赖。
- 不引入新的 UI 框架。
- 不做统计图表。

## 范围

新增一个 `PracticeHistoryPage`，展示最近练习记录列表。每条记录包含：

- 曲目标题
- 艺人
- 练习日期
- 练习时长
- BPM
- 练习重点
- 复盘摘要

页面通过 AppShell 导航进入，路由为 `#practice`。

## 架构

新增文件优先放在 `src/features/practice`：

- `practice.mock.ts`：本地 mock 练习记录。
- `PracticeHistoryPage.tsx`：展示练习历史。
- `PracticeHistoryPage.test.tsx`：覆盖渲染、空状态和 i18n 文案。
- 可按需新增 `PracticeHistoryPage.css`，样式靠近 feature。

修改现有文件：

- `src/app/routes.tsx`：增加 `practice` route。
- `src/app/shell/AppShell.tsx`：增加 Practice 导航项。
- `src/App.tsx`：渲染 `PracticeHistoryPage`。
- `src/i18n/messages.ts`：增加中英文文案。
- `docs/superpowers/docs/PROJECT_STATUS.md`：更新当前状态。

## 数据流

第一版只使用本地 mock：

```text
practice.mock.ts -> PracticeHistoryPage -> App route #practice
```

mock 记录可以直接包含曲目标题和艺人名称，避免在当前阶段建立跨 feature 数据查询或共享 store。后续接 Supabase 时，再由 `practice_sessions.song_id` 查询关联歌曲。

## UI 行为

- 默认展示最近练习记录。
- 每条记录作为简单列表项或卡片展示。
- 空数据时显示空状态文案。
- 支持英文和中文文案。

## 测试

新增测试覆盖：

- 默认渲染练习历史标题和至少一条 mock 记录。
- 显示曲目名、日期、时长、BPM、练习重点。
- 传入空记录时显示空状态。
- 中文 locale 下显示中文标题或空状态文案。

## 不做项

- 不新增 Supabase 查询。
- 不修改 `practice_sessions` 表结构。
- 不做新增/编辑/删除练习记录。
- 不做统计、筛选、分页、图表。
- 不从 Songs 页面跳转到 Practice History。
