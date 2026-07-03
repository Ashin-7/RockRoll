# RockRoll 会话交接

## 本轮补充：Media Link Edit / Delete

### 完成内容

- Library 媒体资产列表的 Linked entity 单元格增加 Edit link / Delete link 操作。
- 点击 Edit link 会在当前 link 行内打开小型编辑表单。
- 编辑提交只更新 media link 的关联对象类型与关联对象 ID。
- 点击 Delete link 会删除指定 media link 并刷新媒体资产列表。
- Supabase 与 Demo Mode 均支持 media link 编辑 / 删除。
- 补充英文与中文 i18n 文案。
- 补充 Media service 与 Library page 测试。

### 修改文件

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/library/LibraryPage.css`
- `src/features/library/LibraryPage.test.tsx`
- `src/features/library/LibraryPage.tsx`
- `src/features/library/media.service.test.ts`
- `src/features/library/media.service.ts`
- `src/features/library/media.types.ts`
- `src/i18n/messages.ts`

### 验证命令和结果

```powershell
npm test -- --run src/features/library
npm run build
```

结果：
- Library 测试通过：2 个测试文件、16 个用例。
- 构建通过。

环境说明：
- 使用本机已有 Node `v20.20.2` 的 npm 完成验证。
- 未运行 `npm install`。

### 未完成事项

- Archive Collection 编辑 / 删除尚未实现。
- 正式导入写库尚未实现。
- 文件上传、播放器、预览器仍未实现。

### 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关 feature 目录

继续 docs/NEXT_TASKS.md 中的下一个任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

更新时间：2026-07-03

## 本轮补充：Archive Item Edit / Delete

### 完成内容

- Archive collection detail 的条目行增加 Edit / Delete 操作。
- 点击 Edit 会回填表单，并切换到 Item / edit 模式。
- 编辑提交会更新条目的 entity、展示标题、排序、备注、外部来源与外部 ID。
- 点击 Delete 会删除条目并刷新当前 collection。
- Supabase 与 Demo Mode 均支持 archive item 编辑 / 删除。
- 补充英文与中文 i18n 文案。
- 补充 Archive service 与 Archive detail page 测试。

### 修改文件

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/archive/ArchiveDetailPage.css`
- `src/features/archive/ArchiveDetailPage.test.tsx`
- `src/features/archive/ArchiveDetailPage.tsx`
- `src/features/archive/archive.service.test.ts`
- `src/features/archive/archive.service.ts`
- `src/features/archive/archive.types.ts`
- `src/i18n/messages.ts`

### 验证命令和结果

```powershell
npm test -- --run src/features/archive
npm run build
```

结果：
- Archive 测试通过：3 个测试文件、14 个用例。
- 构建通过。

环境说明：
- 默认 shell 起始为 Node `v8.17.0`，Vitest 会因 ESM 入口报 `Unexpected token import`。
- 已切换到本机已有 Node `v20.20.2` 完成验证。
- 未运行 `npm install`。

### 未完成事项

- Archive Collection 编辑 / 删除尚未实现。
- Media Link 独立编辑 / 删除尚未实现。
- 正式导入写库尚未实现。
- 文件上传、播放器、预览器仍未实现。

### 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关 feature 目录

继续 docs/NEXT_TASKS.md 中的下一个任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

更新时间：2026-07-03

## 本轮补充：Media Asset Edit / Delete

### 完成内容

- Library 媒体资产行增加 Edit / Delete 操作。
- 点击 Edit 会回填表单，并切换到 Media / edit 模式。
- 编辑提交会更新媒体资产字段，并替换可选实体关联。
- 点击 Delete 会删除媒体资产并刷新列表。
- Supabase 与 Demo Mode 均支持编辑 / 删除。
- 补充英文与中文 i18n 文案。
- 补充 Library 页面与 media service 测试。

### 修改文件

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/library/LibraryPage.css`
- `src/features/library/LibraryPage.test.tsx`
- `src/features/library/LibraryPage.tsx`
- `src/features/library/media.service.test.ts`
- `src/features/library/media.service.ts`
- `src/features/library/media.types.ts`
- `src/i18n/messages.ts`

### 验证命令和结果

```powershell
npm test -- --run src/features/library
npm run build
```

结果：
- 2 个测试文件通过。
- 12 个测试用例通过。
- 构建通过。

### 未完成事项

- 真实文件上传尚未实现。
- 播放器 / 预览器尚未实现。
- Media Link 独立编辑 / 删除尚未实现。
- Archive Item 编辑 / 删除尚未实现。

### 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关 feature 目录

继续 docs/NEXT_TASKS.md 中的下一个任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

更新时间：2026-07-03

## 本轮补充：Inbox / Library CRUD UI Pattern

### 完成内容

- Inbox 首页补齐后台式指标区、Import workflow 分区、Preview output 分区和候选导入行列表。
- Inbox Anontraveler 预览结果补充 Preview collection 与 Album samples 展示。
- Library 首页补齐 Assets filed / Linked assets / Media types 指标区。
- Library 媒体创建表单调整为 Asset identity / Storage profile / Optional link 分区。
- Library 媒体资产列表调整为 Asset / Media type / Storage / Linked entity / Notes 行列表。

### 修改文件

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/inbox/InboxPage.css`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/inbox/InboxPage.tsx`
- `src/features/library/LibraryPage.css`
- `src/features/library/LibraryPage.test.tsx`
- `src/features/library/LibraryPage.tsx`

### 验证命令和结果

```powershell
npm test -- --run src/features/inbox src/features/library
```

结果：
- 6 个测试文件通过。
- 19 个测试用例通过。

### 未完成事项

- Media Asset 编辑 / 删除已在后续任务完成。
- 正式导入写库尚未实现。
- Archive Item 编辑 / 删除尚未实现。

### 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关 feature 目录

继续 docs/NEXT_TASKS.md 中的下一个任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

更新时间：2026-07-03

## 本轮补充：Practice Supabase Progress Fields

### 完成内容

- 新增 migration：`practice_sessions` 补充 `goal_duration_minutes`、`completion_percent`、`tags`。
- Practice service 的 Supabase 查询映射目标时长、完成度和标签。
- Practice service 的 Supabase 创建与更新写入目标时长、完成度和标签。
- 补充 Practice service 测试，覆盖 Supabase list/create/update 字段映射。
- 修复 `src/features/songs/songs.service.ts` 中 Demo Mode 旧数据默认值合并导致的 TypeScript 重复字段构建错误。
- 安装 Supabase CLI `2.109.0` 到用户本地目录，并加入用户 PATH。
- 安装 Docker Desktop `4.80.0`。
- 使用本地 Supabase Postgres 容器手动应用项目 migrations，并验证 Practice progress fields migration。
- 链接远程 Supabase 项目 `ubijnnfqlasqlwqbazfa`。
- 执行 `supabase db push` 将 5 个本地 migrations 应用到远程项目。
- 远程验证新增字段、check 约束、有效插入和非法值拒绝，并清理测试数据。

### 修改文件

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/practice/practice.service.ts`
- `src/features/practice/practice.service.test.ts`
- `src/features/songs/songs.service.ts`
- `supabase/migrations/20260703095000_add_practice_progress_fields.sql`

### 稳定区说明

- 原因：Practice 前端与 Demo Mode 已支持目标时长、完成度和标签，P0 数据闭环需要真实 Supabase 持久化。
- 风险：远程 Supabase 已完成 migration 应用与字段/约束验证；后续仍需避免提交任何 token、数据库密码或本机 CLI 配置。
- 替代方案：继续只保留 Demo Mode 字段，但线上保存会丢失新增信息。
- 影响范围：`practice_sessions` 兼容新增字段、Practice service 字段映射；额外修复 Songs Demo Mode 旧数据补默认值的构建错误。

### 验证命令和结果

```powershell
npm test -- --run src/features/practice
```

结果：
- 4 个测试文件通过。
- 24 个测试用例通过。

```powershell
node -v
npm -v
```

结果：
- Node.js：`v20.20.2`。
- npm：`10.8.2`。

```powershell
npm test -- --run src/features/songs
npm test -- --run
npm run build
```

结果：
- Songs 测试通过：3 个测试文件、23 个用例。
- 完整测试通过：31 个测试文件、146 个用例。
- 构建通过。

```powershell
supabase --version
docker run --rm hello-world
```

结果：
- Supabase CLI：`2.109.0`。
- Docker 基础容器运行通过。

```powershell
supabase start
```

结果：
- 本地 Supabase Postgres 已启动。
- DB URL：`postgresql://postgres:postgres@127.0.0.1:54322/postgres`。

```powershell
supabase db reset --local --no-seed
```

结果：
- 本机返回 `error running container: exit 139`，未能完整应用项目 migrations。
- 后续改用本地 Postgres 容器 `psql` 手动验证 migrations。

```powershell
# 对每个 migration：docker exec -i supabase_db_RcokRoll psql -v ON_ERROR_STOP=1 -U postgres -d postgres
```

结果：
- 所有项目 migrations 手动应用成功。
- `20260703095000_add_practice_progress_fields.sql` 应用成功。

本地数据库验证结果：
- `practice_sessions.goal_duration_minutes` 存在，类型为 integer，允许 null。
- `practice_sessions.completion_percent` 存在，类型为 integer，允许 null。
- `practice_sessions.tags` 存在，类型为 text[]，not null，默认值为 `'{}'::text[]`。
- `practice_sessions_goal_duration_minutes_check` 存在。
- `practice_sessions_completion_percent_check` 存在。
- 插入包含 `goal_duration_minutes = 45`、`completion_percent = 80`、`tags = array['rhythm','bends']` 的练习记录成功。
- 插入 `completion_percent = 120` 被 check 约束拒绝，符合预期。

```powershell
supabase projects list
supabase link --project-ref ubijnnfqlasqlwqbazfa
supabase migration list --linked
supabase db push
```

结果：
- CLI 已登录并能读取远程项目。
- 当前仓库已链接远程项目 `ubijnnfqlasqlwqbazfa`。
- `supabase db push` 成功应用 5 个本地 migrations 到远程项目。
- `supabase migration list --linked` 显示本地与远程 migration 版本一致。

远程数据库验证结果：
- `practice_sessions.goal_duration_minutes`、`completion_percent`、`tags` 存在。
- `tags` 默认值为 `'{}'::text[]`。
- 目标时长与完成度 check 约束存在。
- 插入包含新增字段的练习记录成功。
- 插入非法 `completion_percent = 120` 被 check 约束拒绝。
- 远程验证用测试数据已清理。

未运行：
- `npm install`

原因：
- 本轮未修改依赖或 lockfile，不运行 `npm install`。

### 未完成事项

- `supabase db reset --local --no-seed` 在本机仍返回 exit 139；已用手动 `psql` 应用 migrations 绕过并验证 SQL。
- 当前工作区还有 Inbox / Library 等既有未提交改动；提交前需要确认是否纳入同一提交。
- 不要提交 Supabase token、数据库密码或本机 CLI 配置。

### 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前需要处理的相关目录

当前 Practice Supabase Progress Fields 已完成本地代码、测试、构建、本地 Docker Postgres migration 手动验证，以及远程 Supabase migration 应用与验证。
继续确认提交范围，或进入下一个任务。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

更新时间：2026-07-03
