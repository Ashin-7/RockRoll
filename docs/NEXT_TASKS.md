# RockRoll 下一步任务

更新时间：2026-07-07

## 当前状态

本轮已经完成多项导入与资料库相关改动，并补上了重复导入时榜单评语不会回填到专辑列表的问题。

已完成或已推进的范围：

- Inbox 新增删除导入草稿能力，删除草稿时通过外键级联删除候选索引和 Review plan。
- Archive 集合列表修正来源展示：来源名称正常显示，存在 `sourceUrl` 时提供短链接。
- Archive 集合描述增加行数限制，避免长文本撑开列表。
- Albums 服务对大量 id 的 `.in()` 查询增加分块，缓解 `/albums` 的 `Bad Request`。
- Albums 已开始改为先加载榜单分类 / 集合标题，再按选中标题加载集合专辑。
- Albums 集合详情分页已从前端展示分页改为服务端请求分页：首屏只拉当前页 25 条 `archive_items`、对应 album rows 和 external metadata，同时用 Supabase count 保留总数显示。
- Albums 集合详情的大量 album / external metadata 分块查询已改为受限并发，并且两类查询并行启动，减少 496 条集合加载时的串行等待。
- Albums 曲风筛选已覆盖完整集合：曲风选项来自集合级 `availableStyles`，筛选后按完整集合 metadata 计算命中项，再只加载当前页详情。
- Inbox 正式提交导入时，如果 `archive_item` 已经导入过，会用新 Review plan 中的非空评语回填 `archive_items.note`，避免预览集合有评语、专辑列表仍显示“暂无笔记”。
- Anontraveler 预览修正档案条目 external id 生成：同一张专辑出现在不同榜单时，专辑实体可复用，但榜单条目会按 `versionId + position + albumExternalId` 保持独立，避免跨榜单被误去重。
- 针对 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f` 复核真实 API：预览 496 个条目无缺失；修正为即使来源 item 有 `_id`，`archive_item` external id 也必须带榜单命名空间，避免来源复用 item id 时入库阶段继续去重。
- 修复重复导入同一集合时触发 `archive_items_collection_id_entity_type_entity_id_key` 的问题：当新版 source id 没命中 external source，但同集合里已存在同一 album 的 archive item，会复用旧条目、回填 note，并补写新的 external source 映射。
- 修复大榜单提交只写入前 1000 条 Review plan 的问题：`commitPublicImportReviewPlan` 现在分页读取全部 `import_review_items`，避免 496 专辑榜单因 artist/album/review item 总数超过 1000 而只提交约 80 条 archive item。
- 已用只读 REST 查询确认 `5e9fb16311ee091e615c2a7f` 当前数据库集合确实只有 80 条 `archive_items`，页面显示 80 不是 Albums 页面二次去重，而是之前提交部分写入后的真实状态。
- Inbox 导入流程仍有待优化：步骤偏繁琐，生成计划后正式推送和导入数量需要继续排查。
- Inbox 页面已进一步简化为预览后一键完整导入：页面不再暴露草稿、候选索引和 Review plan，内部仍复用保存候选、生成计划、正式提交三步链路。
- Inbox 大批量导入已做服务层分块优化：候选保存、Review plan upsert、external source `.in()` 预取、import job 删除都按 200 条分块，降低 PostgREST `Bad Request` 和大响应等待风险。
- 针对分块后响应变慢的问题，候选保存、Review plan upsert 和 external source 分块预取已改为最多 3 路受限并发；保留 200 条分块上限，避免再次触发大请求。
- Review plan 生成阶段不再回传全部明细；一键导入页面只需要 plannedCount，正式提交阶段仍分页读取全部 Review plan。
- Archive 新增集合入口已改为支持 Anontraveler URL 预览导入：预览后展示数量与 3 条样例，允许导入前自定义标题和说明，再复用 Inbox 保存候选、生成 Review plan、正式提交的链路完整导入。
- Archive URL 导入预览样例已补充封面、年代、专辑类型和曲风，减少导入前需要跳转到专辑页核对的成本。
- Archive 仍保留手动新增 / 编辑集合能力作为备用入口；URL 导入按钮仍仅管理员可见。
- Archive 档案集合索引已调整为默认折叠的可展开卡片；展开后再显示说明、来源链接、打开集合、编辑和删除操作，避免集合较多或说明较长时首屏被表格撑开。
- Inbox 与 Archive 导入成功后都会展示导入摘要：preview 档案条目数、保存候选数、Review plan 确认项数和提交结果数，方便定位数量不一致发生在哪个阶段。

## 验证状态

本轮新增验证：

```powershell
npm test -- --run src/features/inbox/inbox.service.test.ts
npm test -- --run src/features/inbox/anontraveler.service.test.ts
npm test -- --run src/features/inbox
npm run build
```

结果：Inbox service 21 个用例通过；Anontraveler service 7 个用例通过；Inbox 6 个测试文件、49 个用例通过；生产构建通过。Vite 仍有既有 chunk size 警告。

补充验证：

```powershell
npm test -- --run src/features/albums
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
npm run build
git diff --check -- src/features/albums src/features/inbox src/features/archive src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：Albums 3 个测试文件、26 个用例通过；Inbox 5 个测试文件、36 个用例通过；Archive 3 个测试文件、20 个用例通过；生产构建通过。Vite 仍有既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

本轮补充验证：

```powershell
npm test -- --run src/features/inbox/inbox.service.test.ts
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm test -- --run src/features/archive
npm run build
git diff --check -- src/features/inbox src/features/albums src/features/archive src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：Inbox service 24 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、26 个用例通过；Archive 3 个测试文件、20 个用例通过；生产构建通过。Vite 仍有既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

验证中发现 Albums 懒加载后集合标题同时出现在下拉选项和页面标题中，导致测试文本查询歧义；已将断言改为查询集合标题 heading，未修改产品逻辑。

本轮 Archive URL 导入补充验证：

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、31 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

本轮共享导入结果摘要补充验证：

```powershell
npm test -- --run src/features/inbox/InboxPage.test.tsx
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
```

结果：InboxPage 5 个用例通过；ArchivePage 6 个用例通过；Inbox 5 个测试文件、39 个用例通过；Archive 3 个测试文件、21 个用例通过。

本轮 Archive 集合索引卡片化补充验证：

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/archive src/features/inbox src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Archive / Inbox / Albums 合计 11 个测试文件、91 个用例通过；生产构建通过。`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。浏览器截图检查因本机 Playwright 浏览器二进制缺失未完成，未执行 `npx playwright install`。

本轮 Albums 集合与曲风筛选控件补充验证：

```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums/AlbumListPage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
git diff --check -- src/features/albums/AlbumListPage.tsx src/features/albums/AlbumListPage.css src/features/albums/AlbumListPage.test.tsx docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：AlbumListPage 14 个用例通过；Albums 3 个测试文件、33 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。当前受限沙箱下直接运行 `npm test` 会因 Node 访问 `C:\Users\Ashin` 被拒绝，本轮改用工作区 `.tmp` 作为 HOME / TEMP 并直接调用本地 `node_modules` 命令。

仍需补充验证：

- 真实 Supabase 环境中，需要重新提交一次已导入榜单或执行数据修正，旧的 `archive_items.note` 才会被回填。
- 真实 Supabase 环境中，需要重新导入 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f`，确认正式写入的 `archive_items` 与预览 496 条一致。
- 真实 Supabase 环境中，需要用 `/archive` 新增集合 URL 导入入口跑一次同样的大榜单，确认自定义标题 / 说明能写入正式集合，且数量与 Inbox 入口一致。
- 当前该集合已有 80 条历史部分写入数据，因之前 Review plan / import job 已清空，需要重新预览、保存草稿、生成计划并提交，才能补齐剩余 archive item。
- 对已经生成过旧 archive item 的集合，重新提交导入计划时应不再报 `archive_items_collection_id_entity_type_entity_id_key`，并会补齐新的 external source 映射。
- Albums 集合标题懒加载、服务端分页、分块并发、全集合曲风筛选、集合搜索 / 本地排序、曲风搜索已通过 `src/features/albums` 自动化测试；仍建议在浏览器里做一次桌面 / 窄屏视觉检查，重点看按钮列表高度、滚动和窄屏布局。

## 当前最高优先级

自动化验证已完成；下一步优先做真实 Supabase 下 `/albums` 服务端分页和全集合曲风筛选耗时复测、Inbox / Archive 共享导入验证和一键导入状态追踪设计。

推荐命令：

```powershell
npm test -- --run src/features/albums
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
npm run build
```

预期处理：

- 如果 Albums 测试失败，优先修复懒加载引入的回归。
- 如果 Inbox 或 Archive 测试失败，只修复与本轮改动直接相关的问题。
- 如果构建失败，先处理 TypeScript 或 Vite 编译错误，不做无关重构。

## 下一个功能任务：验证共享导入与结果状态

目标：在真实 Supabase 环境验证 Inbox 与 Archive 两个入口的一键导入是否都能补齐大榜单，并确认分块优化后不再出现导入后 `Bad Request`。

建议排查顺序：

1. 对比匿名旅行者 preview 数量、保存到 `import_candidates` 的数量、Review plan 数量、正式写入 public rows 的数量。
2. 特别区分“专辑实体数量”和“榜单条目数量”：同一专辑可复用，但不同榜单里的条目必须分别进入 `archive_items`。
3. 判断 Review plan 数量增加是否来自 `artist`、`album`、`archive_collection`、`archive_item` 等不同实体类型的合计。
4. 确认重复点击生成计划是否会重复创建、更新或遗漏条目。
5. 检查生成计划后正式 push 到档案袋是否真的写入 `archive_collections` / `archive_items`，以及是否因权限、RLS 或外部来源映射冲突失败。
6. 使用 Archive URL 导入入口验证自定义标题 / 说明是否进入 `archive_collections`，同时不影响 external source 去重身份。
7. 记录导入摘要里的 preview / saved / planned / committed 数量，判断真实环境数量不一致发生在哪个阶段。
8. 如果真实环境仍出现部分失败，再补数据库级导入任务状态和失败恢复，减少重复点击和阶段不清的问题。
9. 如果真实环境仍慢，下一步考虑把正式提交迁移为数据库 RPC 或后台任务；当前 3 路并发只优化分块保存/预取阶段，不能消除前端逐条多表提交的网络往返。

建议先补测试：

- 一键导入内部保存的候选数量与 preview 映射数量一致。
- Review plan 数量按实体类型可解释。
- 重复生成计划不会产生重复不可控数据。
- commit 成功后档案袋集合可被读取。
- `/albums` 首屏集合详情只请求当前页 25 条数据，翻页时再请求下一页。
- `/albums` 曲风筛选对完整集合生效，翻页时保留当前曲风。

## 后续功能队列

1. `match_existing` 的最小手动匹配 UI / service。
2. 数据库级正式导入任务状态追踪和失败恢复，避免重复点击或部分失败后不清楚状态。
3. Review plan 明细展示专辑封面 / 点评 / 年代 / 风格，便于导入前检查。
4. 专辑封面与曲风正规化，例如 `albums.cover_url` 和 `album_styles` / `album_genres`。
5. 历史错绑作者数据修正方案：重新导入或单独 migration / SQL 修正。

## 推荐下一轮只读取

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/albums`
- `src/features/inbox`
- `src/features/archive`
- 如被权限或 schema 阻塞，再读取最小必要的 `supabase/migrations`

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
