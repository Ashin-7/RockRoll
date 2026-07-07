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
- `/albums` 已按导入集合分组浏览，支持基于完整集合的曲风筛选。`/albums` 集合分类和曲风筛选控件已支持搜索，集合分类还支持本地手动排序。
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
- 公共数据匿名可读，禁止在 public row 中保存私密字段、真实账号信息、内部备注或 token。

## 下一步建议

建议下一轮优先处理：

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
