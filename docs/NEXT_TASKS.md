# RockRoll 下一步任务

更新时间：2026-07-06

## 本轮完成：公共可读资料库与管理员正式导入 MVP

状态：已完成，并已通过 Inbox 相关测试与生产构建验证。

完成范围：

- 使用 `profiles.role` 增加管理员角色模型，默认 `user`，管理员为 `admin`。
- 新增 `public.is_public_library_admin(user_id uuid)` 供 RLS 判断管理员。
- 给 `artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 增加 `visibility`。
- `visibility = 'public'` 的正式资料允许匿名访问读取。
- 正式资料 public 写入和导入流程仅管理员可执行。
- `import_jobs`、`import_candidates`、`import_drafts`、`import_review_items` 收紧为管理员私有操作。
- 新增 `commitPublicImportReviewPlan`，将 Review plan 中的 create / match_existing / skip 按规则提交到正式资料库。
- 正式导入写入 `visibility = 'public'`，并写入 `external_sources.visibility = 'public'`。
- Inbox Review plan 增加 25 条 / 页的前端分页。
- 仅管理员显示 `Commit public import`。
- 未使用 service role key，未绕过 RLS。

## 追加完成：专辑按导入集合浏览

状态：已完成，并已通过 Albums 相关测试。

完成范围：

- `/albums` 不再展示手动新增专辑表单。
- `/albums` 以 `archive_collections` 为导入集合分组展示专辑。
- 集合内专辑按照 `archive_items.position` 排序。
- 排序严格保留来源链接原始排名；年份型榜单也不得按发行年份重新排序。
- 专辑卡片展示封面、作者、发行年份、曲风、导入评语。
- 新增按曲风筛选，当前基于 `external_sources.raw_payload.metadata.styles` 做前端筛选。
- 本轮未新增 migration。

设计文档：

- `docs/superpowers/specs/2026-07-06-album-import-collection-view-design.md`

验证：

```powershell
npm test -- --run src/features/albums
```

结果：3 个测试文件、17 个用例通过。

## 追加完成：专辑作者绑定修复与集合内分页

状态：已完成，并已通过 Inbox / Albums 相关测试与生产构建验证。

完成范围：

- 修复正式导入时所有专辑作者都绑定到第一位艺人的问题。
- 正式导入专辑现在按 `review_payload.metadata.artistName` 匹配艺人名称，不再用第一位艺人作为兜底。
- `/albums` 在每个导入集合内部增加 25 张 / 页分页。
- 分页不改变集合内原始排名，只切换当前展示范围。
- 修复并恢复 `src/i18n/messages.ts` 中文文案编码，补齐分页文案。

验证：

```powershell
npm test -- --run src/features/inbox src/features/albums
npm run build
```

结果：7 个测试文件、56 个用例通过；生产构建通过。Vite 有 chunk size 警告，不影响本轮功能。

注意：历史已经导入且作者绑定错误的数据不会被代码自动改正，需要重新导入或单独执行数据修正。

## 追加完成：专辑页排版整理与错绑作者显示修正

状态：已完成，并已通过 Albums / Inbox service 相关测试与生产构建验证。

完成范围：

- `/albums` 重排为更紧凑的资料库视图，降低首屏拥挤感。
- 长来源 URL 收起为短链接，避免撑开集合标题区。
- 集合说明限制展示行数。
- 专辑条目改为行式索引布局，保留排名、封面、作者、年代、曲风、评语。
- 集合页优先展示导入元数据里的 `artistName`，用于修正历史错绑作者在列表页的显示。

验证：

```powershell
npm test -- --run src/features/albums
npm test -- --run src/features/inbox/inbox.service.test.ts
npm run build
```

结果：Albums 相关 3 个测试文件、19 个用例通过；Inbox service 16 个用例通过；生产构建通过。

注意：列表页显示已优先使用导入元数据作者，但底层 `albums.artist_id` 如果已经错绑，仍建议清理后重新导入。

验证：

```powershell
npm test -- --run src/features/inbox
npm run build
```

结果：`src/features/inbox` 4 个测试文件、28 个用例通过；生产构建通过。Vite 有 chunk size 警告，不影响本轮功能。

## 管理员初始化

应用 migration 后，需要手动把管理员账号设置为 admin：

```sql
update public.profiles
set role = 'admin'
where id = '<你的用户 uuid>';
```

## 当前最高优先级

推荐任务：`match_existing` 的最小手动匹配 UI / service。

目标：

- 仅管理员可操作。
- 最小支持把单条计划从 `create` 标记为 `match_existing`。
- 允许管理员手动输入 `target_entity_id`。
- 恢复为 `create` 时清空 `target_entity_id`。
- 正式提交时 `match_existing` 不创建正式资料，只写公共 `external_sources` 映射。
- 错误时展示 RLS / permission 信息。

备选任务：

- 正式导入状态追踪，避免重复点击或部分失败后不清楚状态。
- Review plan 明细展示专辑封面 / 点评 / 年代 / 风格。
- 专辑封面与曲风正规化：新增正式字段或关联表，减少对 `external_sources.raw_payload` 的依赖。

## 推荐执行顺序

1. 只读取本文件、`docs/PROJECT_STATUS.md`、`docs/SESSION_HANDOFF.md`、`src/features/inbox`。
2. 如涉及权限或 schema，再读取：
   - `supabase/migrations/20260706023655_add_import_review_items.sql`
   - `supabase/migrations/20260706034529_public_library_admin_import.sql`
3. 继续采用 TDD：先补最小 service / UI 测试，再实现。
4. 完成后运行：

```powershell
npm test -- --run src/features/inbox
npm run build
```

## 下一轮建议只读取

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/inbox`
- 如被当前任务阻塞，再读取最小必要的 `supabase/migrations`

## 不要做

- 不要扫描整个仓库。
- 不要运行 `npm install`。
- 不要做架构重构。
- 不要引入新的 UI 框架。
- 不要自建完整后端。
- 不要做批量抓取、转码、队列、后台 worker。
- 不要使用 service role key。
- 不要绕过 RLS。
- 不要让普通用户或匿名用户执行导入写入。
