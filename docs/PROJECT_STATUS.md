# RockRoll 项目状态

更新时间：2026-07-07

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

## 追加完成：Inbox 无草稿一键导入流程

完成范围：

- Inbox 导入页面改为只暴露 `URL 预览 -> 完整导入预览数据` 的主流程。
- 页面不再展示导入草稿列表、候选索引、保存草稿按钮、生成确认计划按钮、Review plan 表格和跳过 / 恢复操作。
- 预览成功后展示艺人、专辑、档案条目、跳过曲目的总数。
- 预览专辑样例限制为 3 张，避免大榜单预览撑开页面。
- 管理员点击完整导入时，前端内部仍按既有安全链路执行：保存候选草稿 -> 生成 Review plan -> 提交公共导入。
- 普通用户和匿名用户仍只能预览，不显示完整导入按钮。
- 提交成功后清空 URL 和预览，显示创建 / 匹配 / 跳过数量摘要。
- 服务层草稿、Review plan、正式提交能力保留，便于后续做状态追踪和失败补偿。

涉及文件：

- `src/features/inbox/InboxPage.tsx`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/inbox/InboxPage.candidate-index.test.tsx`（删除）
- `src/i18n/messages.ts`

验证：

```powershell
npm test -- --run src/features/inbox/InboxPage.test.tsx
npm test -- --run src/features/inbox
npm run build
```

结果：InboxPage 5 个用例通过；Inbox 5 个测试文件、36 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告。

补充验证：

```powershell
npm test -- --run src/features/albums
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
npm run build
git diff --check -- src/features/albums src/features/inbox src/features/archive src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：Albums 3 个测试文件、26 个用例通过；Inbox 5 个测试文件、36 个用例通过；Archive 3 个测试文件、20 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

本次验证中发现 Albums 懒加载后集合标题同时出现在下拉选项和页面标题中，导致测试文本查询歧义；已将 `AlbumListPage.test.tsx` 中对应断言收紧为 `heading` 查询，未修改产品逻辑。

## 追加完成：Inbox 大批量导入 Bad Request 与响应速度优化

完成范围：

- 定位导入后 `Bad Request` 的高风险来源：大榜单导入时，候选保存、Review plan 生成和 external source 预取会形成过大的 PostgREST 请求。
- `saveImportCandidatesDraft` 改为按 200 条分块写入 `import_candidates`，避免一次性上传过大 payload。
- `createImportReviewPlan` 改为按 200 条分块 upsert `import_review_items`，并且不再在生成阶段 `.select()` 回传全部 Review plan 明细。当前一键导入页面不需要这些明细，减少大响应和等待时间。
- `findPublicExternalEntityIdsByType` 对 `source_id in (...)` 改为 200 条分块查询，避免 URL 查询参数过长导致 PostgREST 400。
- 删除 import job 时也按 200 条分块执行 `.in('id', ...)`，避免后续多 job 清理时出现同类问题。
- 针对分块后响应变慢的问题，候选保存、Review plan upsert 和 external source 分块预取改为最多 3 路受限并发；保留 200 条分块上限，避免重新放大 PostgREST 请求。
- 新增大批量测试覆盖 401 条候选保存、803 条 Review plan 写入、401 条 external source 预取分块，以及 Review plan 分块写入不再串行排队。

涉及文件：

- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`

验证：

```powershell
npm test -- --run src/features/inbox/inbox.service.test.ts
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm test -- --run src/features/archive
npm run build
git diff --check -- src/features/inbox src/features/albums src/features/archive src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：Inbox service 24 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、26 个用例通过；Archive 3 个测试文件、20 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

## 追加进展：删除草稿、档案袋展示与专辑集合懒加载

完成范围：

- Inbox 新增删除导入草稿能力，删除 `import_jobs` 记录时依赖现有外键级联删除候选索引和 Review plan，不额外绕过 RLS。
- Inbox 页面增加删除草稿入口，用于清理错误、重复或不需要继续导入的草稿。
- Archive 集合列表的来源列改为展示来源名称，并在存在 `sourceUrl` 时提供短链接，避免长 URL 或长文案撑开列表。
- Archive 集合描述增加行数限制，降低首屏被长描述挤占的问题。
- Albums 服务对大量 album id 的 `.in()` 查询增加分块，避免 PostgREST URL 过长导致 `/albums` 出现 `Bad Request`。
- Albums 已开始改为先加载“榜单分类 / 集合标题”，再按用户选中的标题加载该集合专辑，减少一次性加载大量集合造成的请求和渲染压力。
- 修正 `/albums` 集合分页只在前端展示分页的问题：集合详情现在使用 Supabase `.range()` 按页读取 `archive_items`，首屏只加载当前页 25 条专辑及其 external metadata，同时保留 `count` 显示总数。
- Albums 集合详情中的 album rows 与 external metadata 分块查询改为受限并发，并且两类查询并行启动，避免 496 条集合加载时按 album 分块和 metadata 分块串行排队。
- Albums 曲风筛选已覆盖完整集合：页面使用集合级 `availableStyles` 生成下拉选项，选择曲风后按完整集合 metadata 过滤，再只加载筛选结果当前页的专辑详情。
- 正式提交导入时，若 `archive_item` 已存在且本次 Review plan 带有非空评语，会回填 `archive_items.note`，修复“预览集合有评语，导入后专辑列表显示暂无笔记”的重复导入场景。
- Anontraveler 预览修正无 `_id` 榜单条目的 external id 生成：同专辑跨不同榜单时，专辑实体仍复用，但榜单条目按 `versionId + position + albumExternalId` 独立保留，避免数量被误去重。
- 针对真实链接 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f` 继续修正：即使来源 item 有 `_id`，`archive_item` external id 也会带上榜单命名空间，避免不同榜单复用 item id 时被入库匹配为同一条目。
- 修复同一集合重复导入时触发 `archive_items_collection_id_entity_type_entity_id_key` 的问题：当新版 archive item source id 未命中旧 external source，但同集合已存在同一 album 条目时，提交会复用旧 `archive_items`、更新评语并补写新 external source 映射，不再重复插入。
- 修复大榜单正式提交只读取前 1000 条 Review plan 的问题：提交阶段现在分页读取全部 `import_review_items`，避免大型 Anontraveler 榜单只写入前段 artist/album 后，archive item 只剩少量被处理。
- 已只读核查真实数据：`5e9fb16311ee091e615c2a7f` 预览应有 496 条 album archive item，但当前 Supabase 集合中只有 80 条，属于旧提交部分写入后的数据库状态，不是 `/albums` 页面二次去重。

验证状态：

- 删除草稿、Archive 展示修正、Albums Bad Request 分块在本轮早些时候曾使用 Node 20 执行过相关测试和构建，结果通过。
- 评语回填修复已执行 `npm test -- --run src/features/inbox/inbox.service.test.ts`，结果 19 个用例通过。
- 同集合重复导入唯一约束修复已执行 `npm test -- --run src/features/inbox/inbox.service.test.ts`，结果 20 个用例通过。
- 大 Review plan 分页提交修复已执行 `npm test -- --run src/features/inbox/inbox.service.test.ts`，结果 21 个用例通过。
- 同专辑跨榜单条目去重修复已执行 `npm test -- --run src/features/inbox/anontraveler.service.test.ts`，结果 6 个用例通过。
- 针对来源 item `_id` 复用的补充测试已执行 `npm test -- --run src/features/inbox/anontraveler.service.test.ts`，结果 7 个用例通过。
- 已执行 `npm test -- --run src/features/inbox`，结果 6 个测试文件、49 个用例通过。
- 已执行 `npm run build`，生产构建通过；Vite 仍提示既有 chunk size 警告。
- Albums 服务端分页、分块并发与全集合曲风筛选已执行 `npm test -- --run src/features/albums`，结果 3 个测试文件、31 个用例通过。
- 已执行 `npm test -- --run src/features/inbox`，结果 5 个测试文件、39 个用例通过。
- 已执行 `npm test -- --run src/features/archive`，结果 3 个测试文件、20 个用例通过。
- 已执行 `npm run build`，生产构建通过；Vite 仍提示既有 chunk size 警告。

涉及文件：

- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`
- `src/features/inbox/InboxPage.tsx`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.css`
- `src/features/archive/ArchivePage.test.tsx`
- `src/features/albums/album.types.ts`
- `src/features/albums/albums.service.ts`
- `src/features/albums/albums.service.test.ts`
- `src/features/albums/AlbumListPage.tsx`
- `src/features/albums/AlbumListPage.test.tsx`
- `src/features/albums/AlbumListPage.css`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

## 追加完成：Archive 新增集合 URL 预览导入

完成范围：

- `/archive` 新增集合入口改为优先支持 Anontraveler 榜单 URL 预览导入。
- 输入 URL 后可先预览集合标题、说明、档案条目数、专辑数、跳过曲目数和前 3 条专辑样例。
- 预览专辑样例已展示封面、年代、专辑类型、曲风、作者、标题和评语，便于导入前快速判断数据质量。
- 预览成功后允许在导入前自定义集合标题与说明；自定义内容只覆盖 `archive_collections` 展示元数据，不改变来源 URL、external id 和去重身份。
- 管理员点击导入集合时，页面复用 Inbox 现有导入链路：保存候选 -> 生成 Review plan -> 正式提交公共导入。
- 普通用户和匿名用户仍不能执行导入写入；导入按钮只在管理员角色下展示。
- 手动新增 / 编辑集合能力保留为备用入口，避免丢失非 URL 来源集合的最小维护能力。
- 未新增数据库表，未新增 migration，未引入新的后端或 service role。

涉及文件：

- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.css`
- `src/features/archive/ArchivePage.test.tsx`
- `src/i18n/messages.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、31 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

## 追加完成：共享导入结果摘要

完成范围：

- Inbox 一键导入成功后新增导入摘要，展示 preview 档案条目数、保存候选数、Review plan 确认项数和最终提交结果数。
- Archive URL 导入成功后使用同一口径展示导入摘要，便于对比两个入口的数量差异。
- 摘要不改变导入链路，只读取现有 `saveImportCandidatesDraft.savedCount`、`createImportReviewPlan.plannedCount` 和 `commitPublicImportReviewPlan` 返回值。
- 这属于最小结果状态追踪：能定位数量差异出现在哪个阶段，但还不是数据库级任务状态或失败恢复机制。

涉及文件：

- `src/features/inbox/InboxPage.tsx`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.test.tsx`
- `src/i18n/messages.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：

```powershell
npm test -- --run src/features/inbox/InboxPage.test.tsx
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
```

结果：InboxPage 5 个用例通过；ArchivePage 6 个用例通过；Inbox 5 个测试文件、39 个用例通过；Archive 3 个测试文件、21 个用例通过。

## 追加完成：Archive 档案集合索引卡片化

完成范围：
- `/archive` 档案集合索引从横向表格改为可展开卡片。
- 集合卡片默认不展开，只在摘要行展示标题、来源和集合类型。
- 展开后显示集合说明、来源短链接、打开集合、编辑和删除操作。
- 保留原有集合详情跳转、编辑、删除和 URL 导入能力，不改动数据模型、后端接口或 RLS。

验证：
```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/archive src/features/inbox src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Archive / Inbox / Albums 合计 11 个测试文件、91 个用例通过；生产构建通过。`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。浏览器截图检查因本机 Playwright 浏览器二进制缺失未完成，未执行 `npx playwright install`。

## 追加完成：Albums 集合与曲风筛选控件优化

完成范围：
- `/albums` 集合分类从原生下拉框改为可搜索的集合按钮列表。
- 集合列表支持手动上移 / 下移排序；排序仅影响当前页面本地显示顺序，不改数据库顺序或后端接口。
- 点击集合项仍复用现有 `getAlbumCollectionById` 服务端分页加载逻辑，并在切换集合时重置曲风筛选。
- 曲风筛选从原生下拉框改为可搜索的现有曲风按钮列表，保留“全部曲风”入口。
- 控件动画使用轻量 CSS transition，并支持 `prefers-reduced-motion: reduce`，未引入新动画库或 UI 框架。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums/AlbumListPage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
git diff --check -- src/features/albums/AlbumListPage.tsx src/features/albums/AlbumListPage.css src/features/albums/AlbumListPage.test.tsx docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：AlbumListPage 14 个用例通过；Albums 3 个测试文件、33 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。当前受限沙箱下直接运行 `npm test` 会因 Node 访问 `C:\Users\Ashin` 被拒绝，因此本轮验证使用工作区 `.tmp` 作为 HOME / TEMP 并直接调用本地 `node_modules` 命令。

## 追加完成：弱化 Inbox 入口，统一 Archive 导入主路径

完成范围：
- 主导航 / 侧边栏已隐藏 Inbox / 收件箱入口，用户主路径聚焦到 Archive / 档案。
- `#inbox` hash route 保留，但不再打开完整导入页面，改为轻量停用提示页。
- 停用提示明确指向 `Archive / 档案 -> 新增集合` 进行 URL 导入。
- `src/features/inbox/InboxPage.tsx`、`inbox.service.ts`、`anontraveler.service.ts` 和相关测试全部保留。
- Archive 新增集合 URL 导入仍复用 Inbox 底层 service：preview -> candidates -> Review plan -> public commit。
- 未修改 Supabase migration，未修改 RLS，未使用 service role key，未新增依赖。
- 本次没有访问或抓取 `https://www.anontraveler.com/rank`，没有批量导入所有榜单。

Anontraveler 全榜单导入后续规划：
1. 榜单目录扫描：只保存榜单索引，不导入榜单条目。
2. 单榜单导入稳定化：确保 preview / candidates / review plan / committed 数量口径一致。
3. 批量队列导入：围绕 Archive 新增集合入口逐个榜单导入，支持失败记录、重试和幂等，暂不引入复杂 worker / 队列系统。

涉及文件：
- `src/app/shell/AppShell.tsx`
- `src/app/shell/AppShell.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/features/inbox/InboxDisabledPage.tsx`
- `src/i18n/messages.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/app
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/App.test.tsx
```

结果：`src/app` 3 个测试文件、13 个用例通过；`src/App.test.tsx` 4 个用例通过。完整 Archive / Inbox / Albums / build 验证见本轮最终验证记录。

## 追加完成：Anontraveler 榜单目录扫描最小能力

完成范围：
- 新增 Anontraveler 榜单目录索引类型，字段包含 `title`、`versionId`、`sourceUrl`、`itemCount`、`status`、`discoveredAt`、`lastImportedAt`。
- 新增目录状态：`pending`、`imported`、`failed`、`skipped`。
- 新增纯解析能力：从目录 HTML 中识别 `/rank/version/:id` 和 `/rank/rank/:id` 链接，生成待导入目录项。
- 新增合并去重能力：以 `versionId` 为唯一身份，重复扫描只更新标题、来源 URL 和可选数量，不覆盖已有导入状态、首次发现时间和最近导入时间。
- 新增轻量扫描函数，仅支持 `https://www.anontraveler.com/rank` 入口，并且只请求目录页一次。
- 本次未访问真实 `https://www.anontraveler.com/rank`，测试全部使用 mock HTML / mock fetch。
- 本次不导入榜单条目，不调用 candidates / Review plan / commit，不新增 worker / 队列，不新增依赖，不修改 migration 或 RLS。

后续进入单榜单导入的方式：目录项只提供 `sourceUrl`；用户仍需在 Archive / 档案 -> 新增集合中预览并确认后，复用现有单榜单导入链路完成导入。

涉及文件：
- `src/features/inbox/anontraveler.types.ts`
- `src/features/inbox/anontraveler.service.ts`
- `src/features/inbox/anontraveler.service.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox/anontraveler.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
```

结果：Anontraveler service 11 个用例通过；Inbox 5 个测试文件、43 个用例通过；Archive 3 个测试文件、21 个用例通过；Albums 3 个测试文件、33 个用例通过。

## 追加完成：Archive 新增集合串联 Anontraveler 目录选择

完成范围：
- Archive / 档案 -> 新增集合 的 URL 导入区域新增“扫描 Anontraveler 榜单目录”入口。
- 扫描固定入口 `https://www.anontraveler.com/rank`，复用现有 `scanAnontravelerRankDirectory`。
- 目录结果展示 title、itemCount 和 status。
- 用户选择某个榜单后，只把该项 `sourceUrl` 填入现有 Anontraveler URL 输入框。
- 选择目录项不会自动预览，不会自动导入，不会保存 candidates，不会生成 Review plan，不会 commit。
- 未落库，未修改 Supabase migration / RLS，未新增依赖或 worker / 队列。
- Archive 现有单榜单导入链路保持不变，用户仍需手动点击“预览集合”后再导入。

涉及文件：
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.css`
- `src/features/archive/ArchivePage.test.tsx`
- `src/i18n/messages.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
```

结果：ArchivePage 7 个用例通过。完整 archive / inbox / albums / build 验证见最终验证记录。

最终验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
git diff --check -- src/features/archive src/features/inbox src/features/albums src/app src/App.tsx src/App.test.tsx src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：Archive 3 个测试文件、22 个用例通过；Inbox 5 个测试文件、43 个用例通过；Albums 3 个测试文件、33 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

真实目录页验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; $outDir='.tmp\anontraveler-rank-verify'; node .\node_modules\typescript\bin\tsc src\features\inbox\anontraveler.service.ts --target ES2020 --module ES2020 --moduleResolution Node --lib DOM,DOM.Iterable,ES2020 --skipLibCheck --esModuleInterop --allowSyntheticDefaultImports --strict --outDir $outDir --noEmit false
node --input-type=module -e "const service = await import('./.tmp/anontraveler-rank-verify/anontraveler.service.js'); const requested = []; const originalFetch = globalThis.fetch; globalThis.fetch = async (url, options) => { requested.push({ url: String(url), accept: options?.headers?.accept ?? null }); return originalFetch(url, options); }; const items = await service.scanAnontravelerRankDirectory('https://www.anontraveler.com/rank', '2026-07-08T00:00:00.000Z'); console.log(JSON.stringify({ requestCount: requested.length, requested, count: items.length, samples: items.slice(0, 5), hasVersionIdAndSourceUrl: items.every((item) => Boolean(item.versionId && item.sourceUrl)) }, null, 2));"
```

结果：真实 `https://www.anontraveler.com/rank` 请求成功，请求次数为 1，且只请求目录页，未访问任何榜单详情页；当前 parser 解析数量为 0，前 5 条样例为空。因为本次严格只通过现有 `scanAnontravelerRankDirectory` 验证单次请求，未额外保存 HTML 正文；从结果可确认真实页面静态 HTML 中没有被当前 `<a href="/rank/version|rank/...">` 规则命中的目录项，下一步需要在仍只请求目录页一次的前提下捕获 HTML 结构，再按真实页面的数据承载方式最小修正 parser。

## 追加完成：Anontraveler 目录扫描改用真实目录 API

完成范围：
- 确认总榜单页目录数据来自 `https://www.anontraveler.com/api/rank/ranks/all/0`。
- `scanAnontravelerRankDirectory('https://www.anontraveler.com/rank')` 继续作为 Archive UI 的扫描入口，但内部只请求目录 API 一次。
- 从 `data.ranks` 映射目录项，字段使用 `_id` 作为 `versionId`，`title` 作为展示标题，`sourceUrl` 生成 `https://www.anontraveler.com/rank/rank/:id`。
- 本次不访问任何榜单详情页，不自动预览，不自动导入，不批量导入，不落库。
- 未修改 Supabase migration / RLS，未使用 service role key，未新增依赖。

真实 API 观察：
- 请求 URL：`https://www.anontraveler.com/api/rank/ranks/all/0`
- 请求次数：1
- 返回结构：`data.pages.total = 82`，`data.ranks` 当前页 10 条。
- 样例字段：`_id`、`title`、`desc`、`type`、`primary_img`、`ts_updated`、`styles`、`user_created`。
- 前 5 条标题：中国通俗音乐、日本音乐、荒岛余生、史上最佳泛重型专辑、土法炼钢。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox/anontraveler.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
```

结果：Anontraveler service 12 个用例通过；Inbox 5 个测试文件、44 个用例通过；Archive 3 个测试文件、22 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。

## 追加完成：Anontraveler 目录分页加载

完成范围：
- 新增目录分页结果类型，包含 `items`、`total`、`page`、`perPage`、`hasMore`。
- 新增 `scanAnontravelerRankDirectoryPage(page)`，按页请求 `https://www.anontraveler.com/api/rank/ranks/all/:page`。
- Archive 新增集合的目录扫描初始只加载 `/all/0`；点击“加载更多榜单”后逐页加载 `/all/1`、`/all/2`。
- 使用 API 返回的 `data.pages.total` 和 `perPage` 判断是否还有更多页。
- 追加目录项时按 `versionId` 去重，避免跨页重复显示。
- 加载完成后隐藏“加载更多榜单”。
- 用户选择目录项后仍只把 `/rank/rank/:id` 填入现有 URL 输入框。
- 不访问任何榜单详情页，不自动预览，不自动导入，不批量导入，不落库。
- 未修改 Supabase migration / RLS，未使用 service role key，未新增依赖。

验证：见本轮最终验证记录。

最终验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：Inbox 5 个测试文件、46 个用例通过；Archive 3 个测试文件、23 个用例通过；Albums 3 个测试文件、33 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。

## 追加完成：Archive 目录选择行为收束

完成范围：
- Archive 新增集合的 Anontraveler 目录选择现在只把榜单 URL 填入 URL 输入框。
- 选择目录项不再自动预览榜单详情，不会触发 candidates、Review plan 或正式导入。
- 选择新目录项时会清空旧预览、导入错误和导入摘要，避免把旧预览误认为当前选择结果。
- 这与当前产品路径保持一致：先扫描目录并选择 URL，再由用户明确点击“预览集合”。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：ArchivePage 8 个用例通过；Archive 3 个测试文件、23 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。已启动本地 Vite 服务并确认 `http://127.0.0.1:5173` 返回 200；Playwright 截图因本机缺少浏览器二进制未完成，未执行 `npx playwright install`。

## 追加完成：权限矩阵收口文档

完成范围：

- 新增 `docs/PERMISSIONS.md`，作为后续 CRUD / 导入 / RLS 收口的最小权限矩阵。
- 明确 `anon`、`authenticated user`、`admin` 三类角色的默认能力。
- 明确 Practice 和 Songs / 曲目是普通登录用户可维护的核心私有 CRUD。
- 明确除 Practice 和 Songs / 曲目外，资料库、导入、确认、提交、匹配、回填、批量处理等写操作默认仅管理员。
- 明确 Archive / 档案正式资料查询可 public 开放，但写入、导入和维护必须管理员。
- 同步 `AGENTS.md`，要求权限变更前必须更新 `docs/PERMISSIONS.md`。
- 本次只做文档和规则收口，未修改运行时代码、migration 或 RLS。

验证：

```powershell
git diff --check -- AGENTS.md docs/PERMISSIONS.md docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：通过，仅有 Windows LF/CRLF 换行提示。

## 已完成能力摘要

- Practice progress fields 已接入 Supabase。
- Practice 正式 UI 已在真实 Supabase session 下通过 CRUD 验证。
- Inbox 支持匿名旅行者单 URL 公开 JSON 预览。
- Inbox 支持把匿名旅行者预览候选保存到 Import Inbox 草稿表。
- Inbox 支持删除导入草稿，并通过级联删除候选索引和 Review plan。
- Inbox 支持生成 Import Review Plan。
- Inbox 支持 Review Plan 跳过 / 恢复 create。
- Inbox 支持 Review Plan 分页。
- 管理员可将 Review Plan 正式提交为匿名可读的公共资料。
- `/archive` 已限制长描述展示，并为来源提供短链接。
- `/archive` 新增集合支持通过 Anontraveler URL 预览后直接导入，并允许导入前自定义标题和说明。
- `/archive` 档案集合索引已从横向表格改为默认折叠的可展开卡片；展开后显示说明、来源链接、打开集合、编辑和删除操作，减少首屏信息拥挤。
- Inbox 与 Archive 导入成功后都会展示同一口径的导入摘要，便于排查 preview / saved candidates / review plan / commit 数量差异。
- `/albums` 已按导入集合分组浏览，支持基于完整集合的曲风筛选。`/albums` 集合分类和曲风筛选控件已改为紧凑下拉选择器，默认只显示当前值，展开后再搜索和选择。
- `/albums` 已支持导入集合内服务端分页；首屏只请求当前页专辑，并保持来源排名顺序。
- `/albums` 已增加大批量 id 查询分块，降低 Bad Request 风险。
- 重复提交已存在导入条目时，Inbox 会用新 Review plan 中的非空评语回填 `archive_items.note`。
- 同一专辑出现在不同 Anontraveler 榜单时，预览会生成不同的 `archive_item` external id，避免跨榜单条目被合并。
- Anontraveler 榜单条目 external id 始终带榜单命名空间，来源 item `_id` 不再作为全局去重键使用。
- 同一集合重复提交时，如果旧 `archive_items` 已存在，会通过 collection + album 兜底匹配并补新 external source 映射，避免唯一约束冲突。
- 正式提交导入会分页读取全部 Review plan，支持超过 Supabase 默认返回上限的大型榜单。

## 当前风险

- 新 migration 需要应用到目标 Supabase 环境后，公共可读和管理员导入策略才会生效。
- 需要手动将管理员用户设置为 `profiles.role = 'admin'`。
- 新增权限边界要求：除 Practice 和 Songs / 曲目外，所有涉及 CRUD、导入、确认、提交、匹配、回填、批量处理的入口，默认仅管理员可见、可触发、可通过 RLS；Archive / 档案正式资料查询可公共开放，但写入必须明确管理员权限。
- 后续新增或调整任何资料库 / 导入相关功能前，必须先确认 anon、authenticated user、admin 的权限矩阵，不能只做前端按钮隐藏。
- 当前正式导入仍是前端顺序写入，多表提交不是数据库事务；如中途失败，可能出现部分写入，需要后续补偿/状态追踪。
- 候选保存、Review plan 生成和 external source 预取已使用 3 路受限并发缓解分块后的网络等待；真正的大幅提速仍需要后续考虑 RPC / 后台任务，把多表提交从前端往返迁移到数据库侧。
- Albums 全集合曲风筛选当前复用 `external_sources.raw_payload.metadata.styles`，筛选时会轻量读取全集合 item ids 与 external metadata；后续如数据规模继续增大，应升级为正式曲风索引表或预聚合字段。
- 历史已导入但缺少评语的 `archive_items` 不会自动批量迁移，需要重新提交对应导入计划或后续执行一次数据修正。
- Inbox 页面操作已简化为预览后一键完整导入；但正式导入仍需在真实 Supabase 环境继续验证大榜单补齐、重复导入和部分失败状态。
- Archive URL 导入复用 Inbox 前端三步链路，因此也继承“前端多表写入不是事务”的部分失败风险；当前摘要只能辅助定位阶段数量，后续仍需要数据库级任务状态和失败恢复。
- 历史已导入且作者绑定错误的专辑不会被本次代码自动修复，需要重新导入或执行一次数据修正。
- `/albums` 集合页已优先展示导入元数据作者，但这只是显示修正；底层 `albums.artist_id` 如果已经错绑，仍需要重新导入或单独数据修正。
- 专辑到艺人的关联当前按 `metadata.artistName` 匹配艺人名称，后续如果来源能提供明确 artist external id，应升级为 album -> artist external id 映射。
- 专辑封面与曲风当前仍来自 `external_sources.raw_payload`，后续如果要作为正式可查询字段，需要补充 schema。
- `match_existing` 的 UI / service 仍未完整实现。
- AI 候选笔记补全已纳入后续评估，但当前项目规则禁止主动开发 AI；实现前必须先确认 provider、隐私边界、权限、额度、审计和用户确认流程。
- 公共数据匿名可读，禁止在 public row 中保存私密字段、真实账号信息、内部备注或 token。

## 下一步建议

建议下一轮优先处理：

0. 权限矩阵已新增到 `docs/PERMISSIONS.md`；下一步对照矩阵盘点 Archive / Albums / Library / Import 的 UI、service、RLS 和测试缺口，再按小步任务落地。
1. 在真实 Supabase 数据上重新提交一次用户提到的榜单，确认旧 `archive_items.note` 被回填后 `/albums` 不再显示“暂无笔记”。
2. 在真实 Supabase 数据上导入两个包含相同专辑的不同榜单，确认 `albums` 可复用但 `archive_items` 数量按榜单条目保留。
3. 重新导入 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f`，确认档案条目数量与预览 496 条一致。
4. 因该集合当前数据库只有 80 条历史部分写入数据，重新导入时需要重新生成 Review plan 后再提交，不能只刷新 `/albums`。
5. 对已经报过唯一约束的集合重新提交一次，确认不再出现 `archive_items_collection_id_entity_type_entity_id_key`。
6. 验证 Albums 懒加载和 Archive 相关测试；若失败，先修复回归，再继续新功能。
7. 在真实 Supabase 环境验证 Archive URL 导入入口：同一链接的预览数量、正式写入数量和 `/albums` 展示数量应一致。
8. 排查 Inbox / Archive 共享导入流程：确认数量不一致是预期的 Review plan 项类型增加，还是保存 / 生成 / 提交存在重复或漏写。
9. 基于当前导入摘要做真实环境复测；如果仍出现部分失败，再补数据库级任务状态和失败恢复。
10. `match_existing` 的最小手动匹配 UI / service。
11. 评估 AI 候选笔记补全：仅在缺少来源评语 / 条目备注 / 用户笔记时提供草稿候选，用户确认后才可写入；不得自动覆盖既有笔记，不得发送私密数据。

## 追加完成：Albums 工具栏下拉框简化

完成范围：
- `/albums` 专辑工具栏的集合分类和曲风筛选从常驻展开列表改为紧凑下拉选择器。
- 默认状态只展示当前选择值，展开后显示搜索框和选项列表。
- 移除集合分类里的 Up / Down 手动排序按钮，减少工具栏冗余和首屏占用。
- 保留集合搜索、曲风搜索、选择集合后加载当前集合、选择曲风后按完整集合筛选的既有行为。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums/AlbumListPage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：AlbumListPage 14 个用例通过；Albums 3 个测试文件、33 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。浏览器截图仍受本机 Playwright 浏览器二进制缺失限制。

## 追加完成：权限落地审计

完成范围：
- 新增 `docs/PERMISSIONS_AUDIT.md`，对照 `docs/PERMISSIONS.md` 盘点 Archive / Albums / Import 的 UI、service 和 RLS 缺口。
- 确认 ArchivePage 手动集合 CRUD、集合编辑 / 删除、ArchiveDetailPage 条目 CRUD、AlbumDetailPage 编辑 / 删除仍需要 admin 可见性收口。
- 确认 Archive / Albums 写入 service 仍主要检查登录或 demo session，缺少 admin guard。
- 确认 import_* 写入链路 service 和 RLS 基本已按 admin-only 收口，但读取链路仍建议补显式检查或测试。
- 确认现有 public library RLS 已支持 public read，但 `artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 仍允许普通用户写 private 行，和新矩阵“资料库 CRUD 默认 admin-only”不一致。
- 本次只更新文档和任务状态，未修改运行时代码、migration 或 RLS。

验证：
```powershell
git diff --check -- docs/PERMISSIONS.md docs/PERMISSIONS_AUDIT.md docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：通过，仅提示 Windows 下 LF/CRLF 换行转换。

## 追加完成：权限落地 P0

完成范围：
- ArchivePage 非 admin 不再显示手动集合 CRUD 表单、集合编辑按钮和集合删除按钮；URL 预览与目录选择仍可用于只读预览，正式导入按钮继续仅 admin 可见。
- ArchiveDetailPage 非 admin 只读展示档案集合条目，不再显示新增 / 编辑 / 删除 archive item 的表单和按钮。
- AlbumDetailPage 非 admin 只读展示专辑详情，不再显示编辑 / 删除专辑入口。
- Archive service 的 collection / item 写函数新增 admin guard；普通登录用户不能通过 service 写入 archive collection 或 archive item。
- Albums service 的 create / update / delete 写函数新增 admin guard；普通登录用户不能通过 service 写入 album。
- Inbox service 的 import candidates、import draft jobs、import review items 读取函数新增 admin guard，避免只依赖 RLS。
- 新增 migration `supabase/migrations/20260708064649_restrict_public_library_writes_to_admin.sql`，收紧 `artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 写入 policy 为 admin-only，同时保留既有 public read policy。
- Demo mode 仍保留本地演示写入能力；真实 Supabase 路径必须通过 admin guard 和 RLS。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive src/features/albums src/features/inbox
```

结果：Archive / Albums / Inbox 合计 11 个测试文件、113 个用例通过。

未执行：
- 未 apply / push 新 migration 到真实 Supabase 环境。
- 未做真实 Supabase 普通用户写入拒绝验证。

## 追加验证：Archive 页面 HTTP 可达

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js --host 127.0.0.1
Invoke-WebRequest -Uri http://127.0.0.1:5174/#archive -UseBasicParsing -TimeoutSec 5
```

结果：Vite 临时启动在 `http://127.0.0.1:5174/`，`/#archive` HTTP 返回 200，随后已停止 dev server。

未完成：当前会话没有可用 Browser 插件，项目也未安装 `playwright` 包；未执行目录扫描的真实点击 / 截图验证，未安装浏览器驱动。

## 追加完成：Archive 目录扫描真实浏览器验证

完成范围：
- 已安装 Playwright 并下载 Chromium 浏览器驱动。
- 使用 Chromium headless 打开 `http://127.0.0.1:5174/#archive`。
- 点击“Scan Anontraveler directory”，确认请求 `https://www.anontraveler.com/api/rank/ranks/all/0`。
- 点击“Load more ranks”，确认追加请求 `/api/rank/ranks/all/1`。
- 选择第一条榜单后，确认只填入 Anontraveler rank URL 输入框。
- 确认选择目录项不会自动预览、不会显示导入按钮、不会请求任何榜单详情页。
- 已补桌面和窄屏截图：`output/playwright/archive-directory-desktop.png`、`output/playwright/archive-directory-mobile.png`。

验证结果：
```json
{
  "firstCount": 10,
  "hasLoadMore": true,
  "optionCountAfterMore": 16,
  "urlValue": "https://www.anontraveler.com/rank/rank/644bca772bf0db963b0b5642",
  "hasPreviewTitle": false,
  "hasPreviewHeading": false,
  "importButtonVisible": false,
  "apiPages": ["/api/rank/ranks/all/0", "/api/rank/ranks/all/1"],
  "detailRequests": []
}
```

窄屏结果：`overflow = false`，扫描按钮和选择按钮均可见。
