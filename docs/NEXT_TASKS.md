# RockRoll 下一阶段任务

## 本轮完成：Practice Supabase Progress Fields

状态：已完成本地代码映射、完整测试、构建、本地 Docker Postgres 手动验证，并已推送到远程 Supabase 项目完成验证。

完成范围：
- 新增 `practice_sessions.goal_duration_minutes`。
- 新增 `practice_sessions.completion_percent`。
- 新增 `practice_sessions.tags`。
- Practice service 读取、创建、更新均映射目标时长、完成度和标签。
- 修复 `src/features/songs/songs.service.ts` 中 Demo Mode 旧数据默认值合并导致的 TypeScript 重复字段构建错误。
- 安装 Supabase CLI `2.109.0` 到用户本地目录并加入用户 PATH。
- 安装 Docker Desktop `4.80.0`。
- 链接远程 Supabase 项目 `ubijnnfqlasqlwqbazfa`。
- 执行 `supabase db push`，将 5 个本地 migrations 应用到远程 Supabase。
- 远程验证 Practice progress fields 的字段、约束、有效插入和非法值拒绝。
- 清理远程验证用测试数据。
- 不包含标签管理器、标签统计、高级搜索或 UI 重构。

验证：
- `npm test -- --run src/features/practice`
- 结果：4 个测试文件、24 个用例通过。
- `node -v`：`v20.20.2`。
- `npm -v`：`10.8.2`。
- `npm test -- --run src/features/songs`
- 结果：3 个测试文件、23 个用例通过。
- `npm test -- --run`
- 结果：31 个测试文件、146 个用例通过。
- `npm run build`
- 结果：通过。
- `supabase --version`
- 结果：`2.109.0`。
- `docker run --rm hello-world`
- 结果：通过。
- 本地 Docker Postgres 手动应用 `supabase/migrations/*.sql`
- 结果：全部成功，包括 `20260703095000_add_practice_progress_fields.sql`。
- `supabase db push`
- 结果：远程成功应用 `0001_initial_schema.sql`、`20260702143722_stabilize_practice_song_schema.sql`、`20260702153000_create_archive_collections.sql`、`20260702162000_stabilize_media_links.sql`、`20260703095000_add_practice_progress_fields.sql`。
- `supabase migration list --linked`
- 结果：本地与远程 5 个 migration 版本一致。
- 远程字段查询
- 结果：`goal_duration_minutes`、`completion_percent`、`tags` 存在，`tags` 默认值为 `'{}'::text[]`。
- 远程约束查询
- 结果：目标时长和完成度 check 约束存在。
- 远程插入包含新增字段的练习记录
- 结果：成功。
- 远程插入非法 `completion_percent = 120`
- 结果：被 check 约束拒绝，符合预期。
- 远程测试数据清理
- 结果：成功。

剩余事项：
- `supabase db reset --local --no-seed` 在本机仍返回 `error running container: exit 139`；已用本地 Postgres 容器 `psql` 手动应用 migrations 验证 SQL。
- 如需要合并当前阶段，先确认工作区中 Inbox / Library 等既有改动是否一并纳入本次提交。
- 不要提交 Supabase token、数据库密码或本机 CLI 配置。

下一轮建议只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- 如需继续 Practice，只读取 `src/features/practice`、`src/i18n/messages.ts` 和 `supabase/`
- 如需处理提交范围，再读取 `git status` 中相关文件

更新日期：2026-07-03
