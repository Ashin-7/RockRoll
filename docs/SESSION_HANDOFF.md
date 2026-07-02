# RockRoll 会话交接

更新时间：2026-07-02

## 本轮完成内容

- 补充 `AGENTS.md`：
  - 默认只读取最小必要上下文。
  - 禁止默认扫描整个仓库。
  - 限制 `npm install`、完整测试与仓库级分析。
  - 增加多轮迭代会话切换规则。
- 完成 P0 CRUD 本地增量实现：
  - Practice Delete
  - Practice Edit
  - Song Edit
  - Song Delete
- 完成 Supabase Schema 稳定化复核：
  - 新增 `songs` / `practice_sessions` 的 `updated_at` 自动刷新触发器。
  - 收紧 `practice_sessions` insert/update RLS，限制 `song_id` 只能引用当前用户自己的歌曲。
- 更新交接文档：
  - `docs/PROJECT_STATUS.md`
  - `docs/NEXT_TASKS.md`
  - `docs/SESSION_HANDOFF.md`

## 修改文件列表

文档：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

Supabase：

- `supabase/migrations/20260702143722_stabilize_practice_song_schema.sql`

Practice：

- `src/features/practice/PracticeHistoryPage.css`
- `src/features/practice/PracticeHistoryPage.test.tsx`
- `src/features/practice/PracticeHistoryPage.tsx`
- `src/features/practice/PracticeSessionForm.tsx`
- `src/features/practice/practice.mock.ts`
- `src/features/practice/practice.service.test.ts`
- `src/features/practice/practice.service.ts`

Songs：

- `src/features/songs/SongDetailPage.css`
- `src/features/songs/SongDetailPage.test.tsx`
- `src/features/songs/SongDetailPage.tsx`
- `src/features/songs/song.types.ts`
- `src/features/songs/songs.service.test.ts`
- `src/features/songs/songs.service.ts`

## 验证命令和结果

本轮尝试运行：

```powershell
npm test -- --run src/features/practice
npm test -- --run src/features/songs
```

结果：

- 两条命令均在 Vitest 启动阶段失败。
- 当前 Node.js 为 `v8.17.0`，Vitest 入口 `node_modules/vitest/vitest.mjs` 使用 ESM `import`，Node 8 无法解析。
- 本轮未进入 Practice / Songs 测试用例执行阶段。

本轮已执行轻量校验：

```powershell
git diff --check
supabase --version
```

结果：

- `git diff --check` 未发现空白错误。
- 当前环境未安装 Supabase CLI，无法执行本地 migration lint 或迁移演练。

未运行：

```powershell
npm install
npm test -- --run
npm run build
```

原因：

- 本轮未修改依赖或 lockfile，不运行 `npm install`。
- 用户要求节省 token 和避免完整测试，本轮未运行完整测试与构建。
- 如需重新验证，需先确认是否允许使用兼容当前 Vite/Vitest 工具链的 Node 版本。

## 当前分支状态

- 当前分支：`feature/mvp-foundation`
- 跟踪分支：`origin/feature/mvp-foundation`
- P0 CRUD 收尾改动已完成复核，准备提交到当前分支。

## 未完成事项

- Practice / Song 新增 UI 文案存在硬编码英文，后续可按 i18n 策略统一处理。
- 完整测试与构建尚未运行。
- Supabase migration 尚未在真实 Supabase 实例上执行验证。

## 下一轮推荐任务

建议先做：Artist CRUD。

之后再进入：Album CRUD。

## 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- src/features/artists

继续 docs/NEXT_TASKS.md 中的 Artist CRUD。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
只运行与 Practice / Songs 相关的测试；如需要完整测试或构建，请先说明原因。
完成后中文总结。
```
