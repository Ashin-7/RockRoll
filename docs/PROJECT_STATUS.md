# RockRoll 项目状态

更新时间：2026-07-20

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
- 已只读核查真实数据：`5e9fb16311ee091e615c2a7f` 预览应有 496 条 album archive item；历史曾出现 Supabase 集合只有 80 条的部分写入状态，当前复核已补齐为 496 条正式 `archive_items`，不是 `/albums` 页面二次去重。

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
3. `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f` 已只读验证为 496 条正式 `archive_items`；后续不要再把 80 条当作当前状态。
4. 选择另一个未导入或可安全重复导入的榜单，继续验证重复导入 note 回填、`Bad Request` 是否消失，以及 created / matched / skipped 摘要是否清晰。
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

## 追加完成：共享导入计划数量明细

完成范围：
- `createImportReviewPlan` 返回值新增 `plannedCounts`，按 `artist`、`album`、`archive_collection`、`archive_item`、`song`、`media_asset` 拆分 Review plan 数量。
- Inbox 与 Archive 的一键导入成功摘要追加计划明细，避免 `planned` 数量大于 preview 时无法判断差异来自哪类实体。
- 该改动不改变导入链路、写入顺序、RLS 或 commit 行为，只补充结果状态可解释性。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox src/features/archive src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：Archive / Albums / Inbox 合计 11 个测试文件、113 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。

当前 P0 / P1 状态：
- P0 权限落地已完成真实 Supabase 验证：`20260708064649_restrict_public_library_writes_to_admin.sql` 已应用到 linked remote，public library 相关表 RLS 已启用，普通 user 写入被 RLS 拒绝，admin 写入探针通过且已 rollback。
- P1 共享导入数量口径的本地可自动化覆盖已完成：preview / saved / planned / committed 摘要、planned 按实体类型拆分、Albums 服务端分页与完整集合曲风筛选均有测试。
- 真实大榜单 `5e9fb16311ee091e615c2a7f` 已完成只读验证：Anontraveler preview 为 496 个 album archive item；按当前映射 saved candidates 为 931（435 artist + 496 album），planned review items 为 1428（435 artist + 496 album + 1 archive_collection + 496 archive_item）；真实 Supabase 目标 collection 当前已有 496 条 album `archive_items`，已不再是历史 80 条部分写入状态。
- 真实大榜单补齐数量已确认；重复导入的 note 回填和 `Bad Request` 写入复测仍建议用另一个未导入或可安全重复验证的榜单继续验证。

真实 Supabase 权限验证：
```powershell
supabase db push --linked --dry-run
supabase db push --linked --yes
supabase migration list --linked
supabase db query --linked --file .tmp\verify-public-library-policies.sql
```

结果：`20260708064649` 已出现在 remote migration history；`artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 均启用 RLS；旧 owner/private 写入 policy 未残留为写入入口；事务内 RLS 探针显示普通 user 插入 artist / archive_collection 被 `42501` 拒绝，admin 插入 artist / album / archive_collection / archive_item / external_source 均通过；探针最终 rollback，确认测试数据残留为 0。

## 追加完成：`match_existing` service 基础

完成范围：
- 用户已确认新的真实榜单导入正常，当前不提前建设数据库级失败恢复或后台任务。
- 新增 `matchImportReviewItem`，允许管理员把 artist / album Review item 手动绑定到同类型的已有 public 正式实体。
- 匹配前会读取 Review item 的真实实体类型，并验证目标 public 实体仍存在；不允许手动匹配 archive collection / archive item，避免跨榜单误合并。
- 匹配成功后更新 `planned_action = 'match_existing'`、`target_entity_id`，并清空旧 skip / error 状态；后续 commit 继续复用已有正式实体并补 external source 映射。
- 非管理员、目标不存在、Review item 不存在或实体类型不支持时明确失败，不修改 Review item。
- 本次没有新增 migration，没有改变 Archive 一键导入主流程，也没有恢复 Inbox 页面入口。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox/inbox.service.test.ts
```

结果：Inbox service 1 个测试文件、31 个用例通过。

## 追加完成：`match_existing` 最小管理员 UI

完成范围：
- 在 `/archive` 增加仅管理员可见的手动匹配区；Inbox 主入口继续保持停用。
- 该区读取既有 Review item，只展示 artist / album，明确排除 archive collection / archive item。
- 管理员填入已有 public 实体 ID 后，调用既有 `matchImportReviewItem`；匹配完成后显示已匹配目标。
- Archive 的 URL 预览与“一键导入”主流程、提交时机和权限模型均未改变。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
```

结果：ArchivePage 1 个测试文件、10 个用例通过。

## 进行中：本地 PDF 六线谱工具箱（阶段 1）

已完成：
- 新增 `#toolbox` 路由、主导航入口和中英文页面壳。
- 文件输入明确仅在浏览器本地处理，不上传 Supabase。
- 新增纯函数 PDF 校验与电子六线谱分析核心：20 MB 限制、扫描件拒绝、标题/速度/连续小节编号提取、默认拍号和未识别音符警告。
- 分析器可区分样例中的 8pt 灰色小节编号与 10pt 品位数字；当前尚未接入真实 PDF.js 读取。
- 设计与实施计划：`docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`、`docs/superpowers/plans/2026-07-14-toolbox-pdf-tab-musicxml.md`。

下一阶段：
- 新增并锁定 `pdfjs-dist@4.10.38`，动态读取本地 PDF 为规范化快照。
- 实现安全 MusicXML 骨架与页面下载流程。
- 使用本地 `endless rain.pdf` 验证 4 页、92 BPM、小节 1-18；原始 PDF 不进入仓库。

## 追加完成：本地 PDF 六线谱工具箱 MVP 纵向链路

完成范围：
- 新增锁定的 `pdfjs-dist@4.10.38`，通过 Toolbox 内部动态适配器在浏览器本地读取 PDF；未上传、未持久化原始文件。
- 适配器限制 20 页，归一化 PDF.js 文本、矢量绘图和图片对象数据，提取可见的 `n/n` 拍号文本，并在完成后释放 PDF 文档资源。
- 新增 MusicXML 4.0 安全骨架：标准六弦 E-A-D-G-B-E 调弦、TAB 谱表、速度与拍号、精确小节数量和整小节休止符占位；不会输出专有 `.gp` 或伪造音符识别。
- Toolbox 页面已完成“选择 -> 本地分析 -> 摘要/警告 -> 下载 MusicXML”流程，下载链接使用后立即释放 object URL；失败后可换文件重试。
- 修正真实 PDF 坐标系的读取方向：小节编号按同页从上到下排序，避免把 `endless rain.pdf` 误判为只有 `1, 2` 小节。

只读样本验证：
- 使用 `C:\Users\Ashin\Downloads\endless rain.pdf`，未复制或上传至仓库。
- 结果：4 页、6307 个非图片绘图操作、0 个图片对象、标题 `endless rain`、92 BPM、连续小节 1-18。
- 样本拍号不是可提取文本，因此遵循安全策略使用 4/4 并保留拍号未识别警告。
- 生成的 MusicXML 已经由 XML 解析器成功读取；未执行 Guitar Pro 8 人工打开验证。

验证：7 个测试文件、27 个用例通过；TypeScript 与 Vite production build 通过。Vite 仍提示既有主包超过 500 kB，PDF.js 额外生成独立 worker 资源；本轮未作无关拆包重构。

## 追加完成：Toolbox 字符串 / 品位几何定位

完成范围：
- 新增纯 `tab-geometry.ts`：仅使用 PDF 文本项坐标和既有连续小节编号，在六条近似等距的字符串基线中定位 `0` 至 `24` 的品位文本。
- 定位结果包含页码、小节号、弦序、品位、坐标和 `high` / `medium` 置信度；相邻小节边界上的候选保留为 `medium` 并提示复核。
- 超出品位范围或无法唯一归属到字符串的候选不会写入结果，改为诊断警告。
- `TabScoreAnalysis` 与 Toolbox 页面仅展示定位数量和警告；MusicXML 仍输出阶段 1 的整小节休止骨架，不产生音符、节奏、技巧或 `.gp`。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：Toolbox 5 个测试文件、17 个用例通过；TypeScript 与 Vite production build 通过。Vite 仍提示既有主包超过 500 kB。遵循本轮读取范围，未重新读取、复制或上传真实 PDF 样本。

## 追加完成：Toolbox 小节内候选事件列

完成范围：
- 新增纯 `tab-events.ts`，将同页同小节的已定位弦/品位候选按横向坐标归类为从左到右的事件列。
- 每个事件列保留原始候选集合、代表横坐标、列内顺序和 `high` / `medium` 置信度；不会把事件列解释为节拍、时值、音高、和弦或可播放音符。
- 同一事件列内同一弦存在不同品位时，保留全部候选、降为 `medium` 并给出警告。
- 分析摘要与页面增加事件列数量；MusicXML 继续忽略事件列并输出安全休止骨架。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：Toolbox 6 个测试文件、19 个用例通过；TypeScript 与 Vite production build 通过。Vite 仍提示既有主包超过 500 kB。本轮未读取、复制或上传真实 PDF 样本。

## 追加完成：Toolbox 矢量六线谱基线定位

完成范围：
- PDF.js 本地快照新增矢量路径中的水平线段；图形变换在浏览器本地还原后再参与分析，PDF 文件不会上传或写入仓库。
- 新增六线谱系统定位：按页合并同一横线的断续片段，识别六条近似等距的基线，并以 `high` / `medium` 标记可靠度。
- 对“其中一条基线被数字分割而较短”的电子谱保留中等置信度系统，而不是直接丢弃；页面与分析摘要新增系统数量和独立复核警告。
- 字符串 / 品位候选可优先使用矢量基线，因此不再要求每根弦都必须有可提取数字文本；MusicXML 仍只生成休止骨架。

本地样本验证：
- 仅在浏览器本地选择 `C:\Users\Ashin\Downloads\endless rain.pdf`，未上传、复制或下载生成文件。
- 得到 4 页、18 小节、92 BPM、3 个六线谱系统、5 个字符串 / 品位位置和 5 个几何事件列。
- 样本仍显示 1 个小节边界候选和 1 个中等置信度谱线系统的复核警告；未进行节奏、技巧或 `.gp` 识别 / 生成。

验证：Node 20.20.2 下 `src/features/toolbox` 7 个测试文件、26 个用例通过；已在本地浏览器完成上述样本流程验证。为遵守本轮限定读取范围，未额外执行全仓构建。

## 追加完成：Toolbox 真实电子谱符号拓扑兼容设计

本轮仅完成设计与实施计划修订，尚未实现节奏识别代码。

设计结论：
- 节奏证据采用“绘制路径拓扑 + 可靠音乐字体字形”双通道，不再假设一条 PDF 路径等于一个音符。
- 路径证据保留复合子路径、闭合、填充规则、绘制方式、可用线宽、变换后坐标和边界；现有六线谱 `lineSegments` 行为保持不变。
- 两类证据先按五线谱间距规范化为局部图元，再通过连接、相交、包含、对齐和从属关系建立拓扑图。
- 支持共享 / 倾斜连梁、局部次梁、单 / 双符尾、多符头共享符干，以及空心符头的孔洞、嵌套轮廓、描边轮廓和可靠字形表达。
- 横坐标只用于图元归组、事件排序、小节归属和 TAB 事件列唯一配对；禁止根据 TAB 横向间距、平均间距或小节宽度推断节奏。
- 字形与路径冲突、未知字形、中等置信度、不支持结构、TAB 配对歧义或小节容量不合法时，整个小节回退为既有整小节休止占位。
- 支持范围仍限定为全、二分、四分、八分、十六分音符 / 休止符和一个附点；连音组、延音线、跨小节连梁、装饰音、多声部、技巧、扫描件、播放、人工时值编辑和 `.gp` 不在范围内。

文档：
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`

验证：
- 本轮为文档与计划变更，未运行测试或构建。
- 已检查文档范围；未读取、复制或上传真实 PDF，未修改 Supabase、依赖或 `src/features/toolbox`，未生成 `.gp`。

## 追加完成：Toolbox 明确节奏拓扑 Task 1-2

完成范围：
- Task 1 已在 PDF.js 本地快照中保留复合绘制形状：多子路径、连续建路、曲线、矩形、闭合状态、填充规则、绘制方式、线宽、变换后坐标和边界。
- 绘制形状只在 paint 操作发生时输出；`endPath` 丢弃未绘制路径，save / restore 同时恢复变换与线宽。
- 现有 `lineSegments` 提取保持独立，未把线段结果复用为音乐符号证据。
- Task 2 已补充文本字体标识、字体族和音乐字形证据；仅精确 SMuFL PUA 映射与精确字体族白名单组合可产生 `reliable` 语义。
- 未知私有区字符和近似字体族只保留为 `unknown`，普通文本不会成为音乐证据。
- 本轮没有根据 TAB 横向间距推断节奏，没有读取真实 PDF，没有修改 Supabase、依赖或锁文件，也没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-2 已完成；Task 3 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/pdf.service.test.ts src/features/toolbox/tab-analyzer.test.ts
```

结果：2 个测试文件、12 个用例通过。按本轮约束未运行完整测试、构建或真实 PDF 验证。

风险：`pdf.service.ts` 已承载文本、矢量路径和字形适配职责；后续若继续明显增长再按既有计划评估拆分，本轮不做架构重构。

## 追加完成：Toolbox 明确节奏拓扑 Task 3

完成范围：
- 新增 `PairedStaffSystem` 契约与纯 `staff-tab-alignment.ts`，从人工线段证据中检测恰好五条、近水平、近等长且等距的五线谱系统。
- 配对前排除已识别 TAB 的六条基线；四线、六线、间距不均的候选均拒绝。
- 只接受同页、位于五线谱下方、横向重叠不少于较短系统宽度 80%、且垂直距离不超过 12 个五线谱间距的最近 TAB 系统；最近候选并列时拒绝配对。
- 横坐标只用于系统覆盖判断，没有根据 TAB 横向间距、事件间距或小节宽度推断节奏。
- 未读取、复制或上传真实 PDF，未修改 Supabase、依赖或锁文件，未运行 `npm install`，未生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-3 已完成；Task 4 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/tab-staff-geometry.test.ts
```

结果：2 个测试文件、11 个用例通过。按本轮约束未运行完整测试、构建或真实 PDF 验证。

风险：配对阈值目前只由人工线段夹具验证，保持保守拒绝策略；真实 PDF 适配留待用户明确允许的后续本地只读验证。

## 追加完成：Toolbox 明确节奏拓扑 Task 4

完成范围：
- 新增内部 `NotationPrimitive` 联合类型与 `normalizeNotationEvidence`，把配对五线谱系统内的绘制路径和音乐字形证据规范化为 `contour`、`segment`、`glyph`、`unknown-glyph`。
- 复合绘制形状只按空间断开的子路径组拆分；嵌套、接触或相交的子路径保留在同一 contour，并结合填充规则、包含关系和绕组方向保留孔洞证据。
- 纯描边与带描边通道的开放线性路径会成为 segment；线宽缺失或不可靠时保持 `uncertain`，不会提升为强音乐证据。
- 可靠 SMuFL 字形保留明确语义，未知字形只生成 `unknown-glyph` 诊断图元。
- 所有局部几何阈值按配对系统的 `averageStaffGap` 缩放；输出 bounds 保持 PDF 原始坐标，不改写后续 TAB 配对坐标。
- 图元必须完整且唯一地归属同页一个配对五线谱系统；跨入 TAB 区域、跨系统或归属不唯一时保守拒绝。
- Bézier 曲线使用谱线间距容差驱动的自适应展平，接触曲线保组，明确断开的曲线仍拆分。
- 本轮没有识别音符或时值，没有根据 TAB 横向间距推断节奏，没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-4 已完成；Task 5 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/notation-primitives.test.ts
```

结果：1 个测试文件、11 个用例通过。按本轮约束未运行完整测试、构建或真实 PDF 验证。

风险：`notation-primitives.ts` 当前 566 行，几何职责仍内聚但超过项目建议规模；Task 5 接入前先保持稳定，不在本轮拆分。当前行为只由人工路径、字形和配对系统夹具验证，系统归属采用保守拒绝策略。

## 追加完成：Toolbox 明确节奏拓扑 Task 5

完成范围：
- 新增稳定的 `RhythmDuration` 类型、`RhythmTopologyEvent` / `RhythmTopologyResult` 契约和纯 `recognizeRhythmTopology`。
- 在同页同一配对五线谱系统内建立 `touches`、`intersects`、`contains`、`aligned-with`、`incident-to` 关系；不跨系统连接图元。
- 支持路径空心 / 实心符头、可靠整音符字形、符干唯一连接、多符头共享一根符干，以及孔洞、嵌套轮廓和闭合描边轮廓表达的空心符头。
- 先建立连梁组，再按每根符干实际相接的梁层独立判定八分 / 十六分音符；共享倾斜主梁和局部次梁不会把其他符干的层数复制过来。
- 支持与符干端部明确相接的路径或可靠字形单 / 双符尾；附近但不连接的梁不会改变时值。
- 时值只来自明确拓扑或可靠音乐字形；横坐标只用于事件输出排序，没有读取 TAB 横向间距、相邻事件间距或小节宽度。
- 本轮未实现 Task 6 的双通道冲突融合、休止符和附点，也未进入整小节容量、MusicXML 或页面集成。
- 未读取、复制或上传真实 PDF，未修改 Supabase、依赖或锁文件，未运行 `npm install`，未生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-5 已完成；Task 6 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/notation-primitives.test.ts
```

结果：2 个测试文件、21 个用例通过。按本轮约束未运行完整测试、构建或真实 PDF 验证。

风险：`rhythm-topology.ts` 当前 579 行，关系解析职责仍内聚但超过项目建议规模；本轮保持计划文件边界，不为拆分而提前抽象。当前行为只由人工图元和配对系统夹具验证。

## 追加完成：Toolbox 明确节奏拓扑 Task 6

完成范围：
- 同一五线谱系统内的强拓扑与可靠音乐字形会按局部位置融合；语义一致时合并为一个事件并保留双方来源 ID，时值或音符 / 休止属性冲突时不选边、不输出可导出事件。
- 未知字形不会决定时值；装饰音尺寸、未消费路径、疑似延音线、两枚附点候选、断音点歧义和重叠声部都会诊断或降为 `medium`。
- 可靠音乐字形支持全、二分、四分、八分和十六分休止。当前 `NotationPrimitive` 没有可验证的轮廓结构签名，因此仅凭闭合、填充和包围框相似的路径休止不会提升为强证据。
- 一个可靠附点只有在事件右侧、垂直兼容、对事件唯一且候选点也只兼容一个事件时才设置 `dots: 1`；完整音符 / 休止字形没有可靠附点锚点时保守降为 `medium`。
- 同一局部横坐标的多个强事件无论音高距离多远都按不支持的重叠声部拒绝。
- 横坐标只用于五线谱符号的局部融合、事件排序和附点右侧关系；没有读取 TAB 事件、TAB 横向间距、相邻事件间距、平均间距或小节宽度来推断时值。
- 本轮没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-6 已完成；Task 7 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：10 个测试文件、68 个用例通过，退出码 0。另检查 `rhythm-topology.ts` 与测试文件，无行尾空白。按用户约束未运行构建或真实 PDF 验证。

风险：`rhythm-topology.ts` 当前 962 行，明显超过项目建议规模但仍保持计划指定的单模块边界；Task 7 会新建独立小节模块，不应继续扩大该文件。路径休止在图元层缺少真实轮廓结构签名前继续回退，不能用包围框近似补齐。

## 追加完成：Toolbox 明确节奏拓扑 Task 7

完成范围：
- 新增稳定的 `RecognizedRhythmEvent` / `MeasureRhythmResult` 契约和纯 `buildMeasureRhythmResults` 小节模块，没有继续扩张 Task 6 的拓扑识别器。
- 非休止节奏事件只有在同页容差内的候选全部属于同一请求小节时，才选择其中唯一最近的 TAB 事件列；跨小节候选、同列重复使用、存在未配对 TAB 列或最近列并列时，整个小节回退。
- 一个 TAB 事件列可保留多个弦 / 品位位置；节奏模块只绑定事件列顺序，不拆分和弦候选。
- 明确休止事件使用 `tabEventOrder: null`；当输入契约没有小节线几何时，只允许归入同页唯一请求小节，不在多个小节之间猜测最近归属。
- 小节容量统一使用三十二分音符整数单位：全音符 32、二分 16、四分 8、八分 4、十六分 2，一个附点增加基础时值的一半；支持容量必须能由三十二分音符整数表示。
- 只有全部节奏 / TAB 事件为高置信度、所有非休止事件与 TAB 列一一配对、没有漏列且事件总容量精确等于拍号容量时返回 `recognized`；其余情况返回空事件的整小节 `fallback`。
- 输出时值和附点直接沿用 Task 6 结果；横向容差只选择 TAB 列和辅助小节归属，从未参与时值判定。
- 本轮未接入分析器、MusicXML 或页面状态，未读取、复制或上传真实 PDF，未修改 Supabase、依赖或锁文件，未运行 `npm install`，未生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-7 已完成；Task 8 尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/tab-events.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：Task 7 与事件列测试共 2 个测试文件、16 个用例通过；完整 Toolbox 共 11 个测试文件、82 个用例通过，退出码均为 0。按用户约束未运行完整仓库测试、构建或真实 PDF 验证。

风险：当前 Task 7 输入契约没有小节线边界或配对系统几何，因此休止事件的小节归属保持保守；同页存在多个请求小节时直接回退。`rhythm-measures.ts` 当前 372 行，超过项目建议规模，但职责仍限于小节归属、列配对和容量校验；本轮不为缩短文件而引入额外抽象。

## 追加完成：Toolbox 明确节奏拓扑 Task 8

完成范围：
- `TabScoreAnalysis` 新增稳定的 `rhythmMeasures`，旧快照缺少 `lineSegments`、`vectorShapes` 或 `musicGlyphs` 时仍返回逐小节安全回退结果。
- `tab-analyzer` 已按依赖顺序串联五线谱 / TAB 配对、证据图元规范化、节奏拓扑识别和整小节容量验证。
- 分析器保留路径单通道、可靠字形单通道和双通道一致融合；强路径与强字形冲突时不选边，相关小节继续回退。
- 找不到可靠配对系统或最终没有任何 `recognized` 小节时，继续保留既有整小节休止骨架警告；仅剩 `medium` 事件也不会误报为可安全识别。
- 内部图元 / 拓扑 / 小节诊断会先去重并最多暴露 5 条，超出数量只追加汇总，避免真实电子谱产生无界 warnings。
- 横坐标只继续用于图元归组、排序、小节归属和 TAB 列唯一配对，没有参与时值判定。
- 全部新增覆盖使用人工线段、路径、字形和文本夹具；没有读取、复制或上传真实 PDF。
- 本轮没有修改 MusicXML、页面 UI、Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-8 已完成；Task 9 尚未开始，MusicXML 仍输出既有安全休止骨架。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/notation-primitives.test.ts src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/rhythm-measures.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：计划指定的 8 个纯分析测试文件、78 个用例通过；完整 Toolbox 11 个测试文件、88 个用例通过，退出码均为 0。按用户约束未运行完整仓库测试、构建或真实 PDF 验证。

风险：当前只完成分析结果接入，`musicxml.service.ts` 尚未消费 `rhythmMeasures`，页面也尚未显示识别 / 回退状态。端到端分析测试仍使用人工证据夹具；真实 PDF 兼容性留待用户明确允许的后续只读验证。

## 追加完成：Toolbox 明确节奏拓扑 Task 9

完成范围：
- MusicXML `divisions` 调整为 8，按全 32、二分 16、四分 8、八分 4、十六分 2 序列化明确时值，一个附点增加基础时值的一半。
- 只有唯一的 `recognized` 小节结果、非空高置信事件、精确小节容量和全部可解析 TAB 引用同时成立时，才输出真实音符或显式休止。
- 非休止事件必须按页码、小节号和事件顺序唯一找到高置信 TAB 列；TAB 列为空、重复、缺失、包含非法或不一致品位时，整小节直接回退为既有 measure rest，不输出局部真实事件。
- 同一 TAB 列的第一个弦 / 品位输出普通音符，后续位置使用 `<chord/>`；每个音符包含标准调弦加品位计算的 pitch 及 string / fret technical notation。
- 显式休止符保持自身时值和一个可选 `<dot/>`，不查找 TAB 列；运行时回退小节与分析阶段 fallback 小节都会写入 MusicXML credit 的小节编号列表。
- 运行时只接受 `dots = 0 | 1`；非法附点数量、容量不匹配、重复 TAB 匹配或低置信位置都会整小节回退。
- 标题 / 警告 XML 转义、标准六弦调弦、速度、拍号、文件名和页面现有下载调用保持不变。
- 本轮没有修改页面 UI，没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 明确节奏计划 Task 1-9 已完成；Task 10 页面状态尚未开始。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/musicxml.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/notation-primitives.test.ts src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/musicxml.service.test.ts
```

结果：MusicXML 1 个测试文件、6 个用例通过；最终 Toolbox 定向套件 9 个测试文件、86 个用例通过，退出码均为 0。按用户约束未运行完整仓库测试、构建或真实 PDF 验证。

风险：真实音符导出目前只由人工 `rhythmMeasures` / `fretEvents` 夹具验证，尚未用真实 PDF 或 Guitar Pro 8 手工验证；页面仍未展示逐小节 recognized / fallback 状态，留给 Task 10。

## 追加完成：Toolbox 明确节奏拓扑 Task 10-11

完成范围：
- 页面新增紧凑的节奏检查区，显示已检查、`recognized`、`fallback` 小节数量，以及逐小节文字状态和简短回退原因。
- 页面明确提示 fallback 小节会导出为整小节休止占位；已有下载按钮条件保持为“已有分析结果且当前未分析中”。
- 中英文文案已同步；没有新增编辑、播放、动画或 UI 框架，也没有重新修改 Task 9 的 MusicXML 序列化语义。
- 最终生产构建发现并修复了 `notation-primitives.ts` 的既有 TypeScript 联合类型收窄问题；只增加明确的 `curve` 类型守卫，曲线采样算法和运行时结果不变。
- 明确节奏拓扑实施计划 Task 1-11 已全部完成。时值只来自明确符号拓扑或可靠音乐字形语义，TAB 横向距离从未用于推断时值。
- 支持全、二分、四分、八分、十六分音符 / 休止符和一个附点；只有整小节高置信、TAB 配对唯一且容量精确时导出真实事件，否则整小节原子回退。
- 本轮没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

当前状态：
- 分支：`feature/mvp-foundation`，普通检出目录；工作区原有其他未提交改动保持不动。
- 计划内的 Toolbox 明确节奏识别、混合安全导出与页面状态均已完成；下一步不是继续扩功能，而是由用户明确授权后进行真实 PDF 浏览器本地只读验收和 Guitar Pro 8 手工打开验证，或返回 Archive / Import 主线。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
$node20Directory = 'C:\Users\Ashin\AppData\Local\nvm\v20.20.2'; $env:PATH="$node20Directory;$env:PATH"; npm run build
git diff --check -- src/features/toolbox src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
```

结果：Toolbox 11 个测试文件、95 个用例通过；TypeScript 与 Vite 生产构建通过。构建保留既有的主应用 chunk 超过 500 kB 警告；范围 diff 无空白错误，仅有工作区 LF 转 CRLF 提示。

剩余边界：尚未用真实 PDF / Guitar Pro 8 做端到端验收；仍按设计不支持连音组、延音线、跨小节连梁、装饰音、多声部重叠、演奏技巧、扫描件、播放、人工时值编辑和直接 `.gp` 输出。这些是当前产品边界，不是 Task 1-11 的遗漏。

## 追加状态：真实导入当前无明显问题

- 用户确认现有 Archive / Import 导入流程在当前实际测试中没有发现明显问题；该结论来自用户手工测试，本轮没有再次执行真实 Supabase 写入，也没有补造精确的 `preview` / `saved` / `planned` / `committed` 数字。
- 真实导入数量与失败恢复不再作为当前阻塞项。除非后续再次出现 `Bad Request`、数量不一致、备注未回填、重复写入或部分提交，否则暂不新增数据库级任务状态、RPC、后台 worker 或队列系统。
- Archive / Import 后续推荐进入既有队列中的 Review plan 明细可读性：在不改变一键导入提交时机和权限模型的前提下，为管理员展示专辑封面、点评、年代与风格，便于提交前检查。
- Toolbox 明确节奏拓扑 Task 1-11 仍为已完成；真实 PDF / Guitar Pro 8 验收保持可选，未经明确授权不读取真实 PDF。
- 当前分支为 `main`，跟踪 `origin/main`。工作区原有 `.playwright-cli` 未跟踪文件保持不动。

本轮仅更新状态文档，没有修改业务代码、Supabase、依赖或锁文件，因此未运行测试或构建。

## 追加完成：Archive Review plan 专辑来源明细

- `/archive` 现有管理员 Review plan / 手动匹配区域已补充专辑封面、来源点评、发行年份与风格展示；无封面时沿用现有占位文案。
- `listImportReviewItems` 继续使用原有查询，只把 `review_payload.metadata` 中已有的 `coverUrl`、`note`、`releaseYear`、`styles` 和艺人名映射到页面摘要，没有新增请求或数据库字段。
- Review plan 区域仍只对管理员可见，service 的 admin guard 保持不变；现有 artist / album 手动匹配范围与 `match_existing` 语义未改变。
- Archive 仍是一键导入主入口；没有恢复 Inbox 主导航，没有改变生成 Review plan 后立即提交的既有时机。
- 没有执行真实导入，没有修改 Supabase、migration、RLS、RPC、worker、任务状态、批量队列、依赖或锁文件。
- 先新增页面与 service 失败测试，分别确认页面缺少专辑明细、映射层丢弃 metadata，再完成最小实现。

当前状态：
- 分支：`main`；限定范围内保留已有未提交文档改动，并叠加本轮代码、测试和文案修改。
- `docs/PERMISSIONS.md` 权限矩阵未变化，无需修改。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx src/features/inbox/inbox.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive src/features/inbox
git diff --check -- src/features/archive src/features/inbox src/i18n/messages.ts
```

结果：首轮 GREEN 为 2 个测试文件、43 个用例通过；Archive / Inbox 定向回归为 8 个测试文件、83 个用例通过；范围 diff 无空白错误，仅有工作区 LF 转 CRLF 提示。未运行完整仓库测试、构建或真实导入。

风险：Review plan 仍沿用现有手动加载与 artist / album 过滤，一次读取当前管理员可见的全部 Review item；本轮没有新增分页、搜索或提交前暂停步骤。

## 追加完成：专辑封面与曲风正式字段化

- 新增 CLI 生成的 additive migration：`supabase/migrations/20260717064514_add_album_cover_and_styles.sql`，仅增加 `albums.cover_url text` 与 `albums.styles text[] not null default '{}'::text[]`。
- 新导入专辑在原有单次 album insert 中写入清洗后的正式字段：封面去除首尾空格并把空值写为 `null`；曲风去除首尾空格、过滤空值并按首次出现顺序做区分大小写的精确去重。
- `external_sources.raw_payload` 继续保存来源原文；手动 `match_existing` 和已有 external source 自动复用均不更新目标专辑正式字段。
- Albums 集合卡片、完整集合曲风选项与筛选采用正式字段优先、raw payload 回退；正式曲风按 200 条分块、最多 3 路并发读取。
- Archive 集合详情按 200 条分块读取正式专辑封面与曲风，禁止逐条 N+1；发行年份和来源点评继续沿用 raw payload。
- `albums` 新列继承现有 public-read 与 admin-only write grants/RLS，没有新增 policy、grant、RPC、trigger、索引或回填任务，`docs/PERMISSIONS.md` 无需修改。
- Archive 主入口、Inbox 停用导航、一键导入提交时机、Review plan、导入数量口径和 artist / album `match_existing` 语义均未改变。
- 未执行真实导入、历史数据回填、远端 migration apply、角色探针或 `npm install`。

当前状态：
- 分支：`codex/album-cover-styles-normalization`，普通检出目录；分支保留开始本任务前已有的 Review plan 明细相关未提交修改。
- migration 只存在于本地。远端应用前不能先部署依赖新列的前端代码；远端 apply 与 anon / user / admin 角色探针需要用户另行明确授权。

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox/album-metadata.test.ts src/features/inbox/inbox.service.test.ts src/features/albums/albums.service.test.ts src/features/archive/archive.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive src/features/inbox src/features/albums
$node20Directory = 'C:\Users\Ashin\AppData\Local\nvm\v20.20.2'; $env:PATH="$node20Directory;$env:PATH"; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\npm.cmd run build
git diff --check -- supabase/migrations src/features/archive src/features/inbox src/features/albums docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md docs/superpowers/specs/2026-07-17-album-cover-styles-normalization-design.md docs/superpowers/plans/2026-07-17-album-cover-styles-normalization.md
```

结果：核心 4 个测试文件、66 个用例通过；Archive / Inbox / Albums 回归 12 个测试文件、125 个用例通过；Node 20 下 TypeScript 与 Vite production build 通过。Vite 保留既有主 chunk 超过 500 kB 警告；范围 diff 无空白错误，仅提示 Windows 下 LF 转 CRLF。

## 追加决策：Web MVP 开放注册与上线边界

- 首发继续采用 Web MVP + Supabase，不引入桌面壳、新后端、任务队列或新依赖。
- 注册入口保持开放。新注册账号必须默认为普通 `user`，不能自行修改 `profiles.role`，管理员只能由数据库侧人工授予。
- 开放注册不扩大资料库权限：资料库新增、编辑、删除、导入、提交、匹配、回填和批量处理入口仅管理员可见，service guard 与 Supabase RLS / RPC 必须同时拒绝非管理员调用。
- 匿名用户和普通用户可按既有策略读取明确 public 的 Archive 等正式资料；普通用户只在 Practice 和 Songs / 曲目范围维护自己的私有数据。
- 产品主线聚焦 Practice、Archive 和 Toolbox。当前导航变更仍仅限屏蔽艺人列表，艺人列表暂不开发；没有继续屏蔽其他模块，也没有恢复 Inbox 主导航。
- CAPTCHA、自定义 SMTP 和关闭注册不作为首发阻塞项；邮箱确认、登录、退出和找回密码链路仍需在上线前完成冒烟验证。若实际出现垃圾注册或邮件额度问题，再启用对应防护。
- 上线前 P0 门槛是三角色权限验收、Auth 冒烟、生产构建、部署环境变量与 Supabase 重定向配置核对，以及生产只读/私有数据隔离验证。
- 本轮仅更新计划与权限文档，没有修改业务代码、Supabase、migration、依赖或锁文件，没有执行真实导入、测试、构建或部署。

当前工作区：

- 分支为 `main`，相对 `origin/main` ahead 2。
- 既有专辑正规化设计文档修改与 `.playwright-cli` 未跟踪文件保持不动，不纳入本轮文档修改。

## 追加完成：Toolbox 谱线几何兼容最小移植

- 从当前 `main` 新建 `codex/toolbox-geometry-compat` 工作树分支，没有整体合并旧 `codex/toolbox-explicit-rhythm`。
- TAB 六线谱候选新增横向区间覆盖率与本页相对跨度过滤：覆盖率低于 80% 或跨度低于本页最大跨度 15% 的行不参与六线谱判定。
- 标准五线谱候选同样过滤相对过短的横线，避免谱内记号把五条正式谱线拆散。
- 五线谱/TAB 配对距离同时保留现有 `12 * averageStaffGap` 边界，并加入 `7 * averageStringGap` 兼容边界，覆盖已确认的 6.6 TAB 弦距布局。
- Toolbox 节奏摘要在数量为 1 时使用英文单数 `1 checked measure`；复数与中文文案保持现有语义。
- 全部新增行为先通过失败测试确认 RED，再完成最小实现；没有移植旧节奏识别器。
- 未读取、复制或上传真实 PDF，未生成 `.gp`，未修改 Supabase、Archive、Inbox、导入流程、依赖或锁文件，未运行 `npm install`。

验证：

```powershell
node node_modules/vitest/vitest.mjs --run src/features/toolbox/ToolboxPage.test.tsx src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts
node node_modules/vitest/vitest.mjs --run src/features/toolbox
npm run build
git diff --check -- src/features/toolbox src/i18n/messages.ts docs/superpowers/plans/2026-07-17-toolbox-geometry-compat.md
```

结果：RED 阶段 5 个新增用例全部按预期失败；GREEN 阶段定向 3 个文件、20 个用例通过；完整 Toolbox 11 个文件、100 个用例通过；TypeScript 与 Vite production build 通过。构建仅保留既有主 chunk 超过 500 kB 警告。

剩余事项：旧 `codex/toolbox-explicit-rhythm` 工作树仍包含未提交历史成果，必须等本分支合并并推送后再由用户明确确认是否删除。

## 追加完成：Web MVP 上线收尾预检（2026-07-20）

- `codex/toolbox-geometry-compat` 已合并并推送到 `main`；GitHub 默认分支已改为 `main`，远程旧 `feature/mvp-foundation` 已删除。
- 旧 `codex/toolbox-explicit-rhythm` 的 10 个未提交文件已保存为本地提交 `abd8218`；该分支与工作树继续保留，未合并、未推送、未删除。
- `.playwright-cli/` 已加入 `.gitignore`；`dist/` 没有被 Git 跟踪。专辑正规化设计文档的工作树哈希与索引哈希一致，确认只是伪修改后恢复干净，没有制造无内容提交。
- 仓库内字面路径 `%SystemDrive%/` 仅包含 2 个搜狗输入法误写缓存文件（约 22.3 MB），现有 `.gitignore` 已忽略；本机安全策略拒绝删除命令，目录仍保留但不影响 Git。
- 使用既有 Node 20 运行 Auth、Practice、Archive、Toolbox、Albums、Inbox 定向回归：29 个测试文件、284 个用例通过。
- `tsc -b && vite build` 通过；仅保留既有主 chunk 超过 500 kB 警告。没有运行 `npm install`、完整仓库测试、真实导入或真实 PDF 验收。
- Supabase linked 项目状态为 `ACTIVE_HEALTHY`；运行环境 URL 与 linked 项目一致，前端 anon key 已配置，未发现前端或本地 service role key。
- 远端已存在 `albums.cover_url text` 与 `albums.styles text[] not null default '{}'::text[]`，Albums RLS 已启用，public read 与 admin-only insert / update / delete policy 保持生效。
- 远端 migration history 为 `20260717073327_add_album_cover_and_styles`，仓库文件为 `20260717064514_add_album_cover_and_styles.sql`；两者 SQL 内容完全一致，但版本号不一致。上线前不得直接 `db push`，需先确认是否将本地文件名对齐远端版本。
- Supabase Auth 当前保持开放注册、邮箱 provider 启用、匿名登录关闭，但 `email_autoconfirm = true`；因此当前不会发生邮箱确认流程。是否保持自动确认或改为邮箱确认，需要在真实 Auth 冒烟前由用户确认。

当前上线 P0 阻塞项：

1. 确认 migration history 对齐方案；未确认前不修改 `supabase/`、不 apply migration。
2. 确认注册采用自动确认还是邮箱确认；未确认前不修改远端 Auth 配置。
3. 随后执行真实注册 / 登录 / 退出 / 找回密码和 anon / 普通用户 / admin 三角色权限探针；这些操作会创建测试账号或短暂写入测试数据，执行前需再次明确范围。
