# RockRoll 项目状态

更新时间：2026-07-06

## 当前阶段

RockRoll 处于 MVP Phase 1，当前策略仍是 Practice First。

匿名旅行者导入进入新的公共资料库模型：导入后的正式资料面向匿名访问公开可读，但导入、确认计划和正式提交仅允许管理员执行。

## 本轮完成：公共可读资料库与管理员正式导入 MVP

完成范围：

- 新增管理员角色模型：`profiles.role`，默认 `user`，支持 `admin`。
- 新增 `public.is_public_library_admin(user_id uuid)`，用于 RLS 判断管理员权限。
- 给 `artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 增加 `visibility`，默认 `private`。
- 调整 RLS：`visibility = 'public'` 的正式资料与外部来源映射允许 `anon` / `authenticated` 读取。
- 正式资料和公共外部来源映射的 public 写入仅允许管理员；普通用户不能创建 public 数据。
- 导入工作流表 `import_jobs`、`import_candidates`、`import_drafts`、`import_review_items` 收紧为管理员私有操作。
- 新增 `getCurrentUserImportRole`，从 `profiles.role` 判断当前导入权限。
- 新增 `commitPublicImportReviewPlan`，按 Review plan 顺序将确认项写入公共正式资料：Artist -> Album -> Archive Collection -> Archive Item。
- 正式导入写入 `visibility = 'public'`，并写入 `external_sources.visibility = 'public'` 作为去重映射。
- `skip` 项不会导入；已有公共 external source 会复用，不重复创建。
- Inbox Review plan 增加前端分页，每页 25 条。
- 仅管理员显示 `Commit public import` 按钮；普通用户和匿名用户不显示。
- 未使用 service role key，未绕过 RLS，未做批量抓取、转码、队列或后台 worker。

修改文件：

- `supabase/migrations/20260706034529_public_library_admin_import.sql`
- `src/features/inbox/inbox.types.ts`
- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`
- `src/features/inbox/InboxPage.tsx`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/inbox/InboxPage.css`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：

```powershell
npm test -- --run src/features/inbox
npm run build
```

结果：`src/features/inbox` 4 个测试文件、28 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示 chunk 超过 500 kB，这是既有打包体积提示，不影响本轮功能。

未执行：

- 未执行真实 Supabase 远程写入验证。
- 未执行 migration apply / push。
- 未启动浏览器做本轮视觉截图；本轮主要是权限、service 和分页行为，已用 UI 测试覆盖。

## 追加完成：专辑按导入集合浏览

完成范围：

- `/albums` 暂时屏蔽手动新增专辑表单，专辑入口统一指向导入收件箱。
- `/albums` 改为按导入集合分组展示；每个导入集合使用 `archive_collections.title` 作为大标题。
- 集合内专辑按照 `archive_items.position` 排序。
- 排序必须严格保留来源链接原始排名；年份型榜单也不按发行年份重新排序。
- 专辑卡片展示排名、封面、作者、发行年份、曲风和导入评语。
- 封面、曲风、评语优先从 `external_sources.raw_payload.metadata` 读取；没有导入元数据时回退到条目备注或专辑 notes。
- 新增曲风筛选，当前基于已加载专辑的导入元数据 `styles` 做前端筛选。
- 未新增数据库表，未新增 migration。

设计文档：

- `docs/superpowers/specs/2026-07-06-album-import-collection-view-design.md`

验证：

```powershell
npm test -- --run src/features/albums
```

结果：`src/features/albums` 3 个测试文件、17 个用例通过。

## 追加完成：专辑作者绑定修复与集合内分页

完成范围：

- 修复正式导入专辑时作者被统一绑定到第一位艺人的问题。
- 正式提交现在按专辑导入元数据里的 `artistName` 匹配已创建或已匹配的艺人 ID；匹配不到时保持 `artist_id = null`，不再用第一个艺人兜底。
- `/albums` 每个导入集合增加 25 张 / 页的分页，分页只切片展示，不改变集合内原始排名顺序。
- 分页文案显示当前展示范围与总数，例如“显示第 1-25 张，共 26 张专辑”。
- 恢复 `src/i18n/messages.ts` 为正常 UTF-8 中文文案，并补齐专辑分页与档案条目分页文案。

验证：

```powershell
npm test -- --run src/features/inbox/inbox.service.test.ts
npm test -- --run src/features/albums/AlbumListPage.test.tsx
npm test -- --run src/features/inbox src/features/albums
npm run build
git diff --check -- src/features/inbox/inbox.service.ts src/features/inbox/inbox.service.test.ts src/features/albums/AlbumListPage.tsx src/features/albums/AlbumListPage.test.tsx src/features/albums/AlbumListPage.css src/i18n/messages.ts
```

结果：Inbox / Albums 相关 7 个测试文件、56 个用例通过；生产构建通过。Vite 仍提示 chunk 超过 500 kB，这是既有打包体积提示。`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

## 追加完成：专辑页排版整理与错绑作者显示修正

完成范围：

- `/albums` 页面重排为紧凑资料库视图：顶部工具栏、集合摘要、分页控制、专辑行式索引分层展示。
- 长来源 URL 不再直接撑开页面，改为“查看来源 / Open source link”短链接。
- 集合描述限制展示行数，避免长文案把首屏挤乱。
- 专辑卡片改为行式布局：排名、封面、标题/作者/年代/曲风、评语分列展示；窄屏下自动堆叠。
- 专辑集合页优先使用导入元数据里的 `artistName` 展示作者，缓解历史数据中 `albums.artist_id` 已经错绑导致的作者显示错误。

验证：

```powershell
npm test -- --run src/features/albums
npm test -- --run src/features/inbox/inbox.service.test.ts
npm run build
```

结果：Albums 相关 3 个测试文件、19 个用例通过；Inbox service 16 个用例通过；生产构建通过。Vite 仍提示 chunk 超过 500 kB。

## 已完成能力摘要

- Practice progress fields 已接入 Supabase。
- Practice 正式 UI 已在真实 Supabase session 下通过 CRUD 验证。
- Inbox 支持匿名旅行者单 URL 公开 JSON 预览。
- Inbox 支持把匿名旅行者预览候选保存到 Import Inbox 草稿表。
- Inbox 支持生成 Import Review Plan。
- Inbox 支持 Review Plan 跳过 / 恢复 create。
- Inbox 支持 Review Plan 分页。
- 管理员可将 Review Plan 正式提交为匿名可读的公共资料。
- `/albums` 已按导入集合分组浏览，支持按曲风筛选。
- `/albums` 已支持导入集合内分页，并保持来源排名顺序。

## 当前风险

- 新 migration 需要应用到目标 Supabase 环境后，公共可读和管理员导入策略才会生效。
- 需要手动将管理员用户设置为 `profiles.role = 'admin'`。
- 当前正式导入仍是前端顺序写入，多表提交不是数据库事务；如中途失败，可能出现部分写入，需要后续补偿/状态追踪。
- 历史已导入且作者绑定错误的专辑不会被本次代码自动修复，需要重新导入或执行一次数据修正。
- `/albums` 集合页已优先展示导入元数据作者，但这只是显示修正；底层 `albums.artist_id` 如果已经错绑，仍需要重新导入或单独数据修正。
- 专辑到艺人的关联当前按 `metadata.artistName` 匹配艺人名称，后续如果来源能提供明确 artist external id，应升级为 album -> artist external id 映射。
- 专辑封面与曲风当前仍来自 `external_sources.raw_payload`，后续如果要作为正式可查询字段，需要补充 schema。
- `match_existing` 的 UI / service 仍未完整实现。
- 公共数据匿名可读，禁止在 public row 中保存私密字段、真实账号信息、内部备注或 token。

## 下一步建议

建议开启新对话，优先处理：

1. `match_existing` 的最小手动匹配 UI / service。
2. 正式导入结果状态追踪，避免重复点击或部分失败后不清楚状态。
3. 正规化专辑封面与曲风字段，例如 `albums.cover_url` 和 `album_styles` / `album_genres`。
4. Review plan 明细展示 metadata，便于管理员导入前检查封面、点评、年代和风格。
