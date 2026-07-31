# RockRoll 下一步任务

更新时间：2026-07-30

## 当前状态

本轮已经完成多项导入与资料库相关改动，并补上了重复导入时榜单评语不会回填到专辑列表的问题。

追加更新：Inbox / 收件箱不再作为当前用户主导入入口，主导航已隐藏 Inbox；`#inbox` 深链保留为停用提示页。当前导入主入口统一为 `Archive / 档案 -> 新增集合 -> URL 预览导入`。Inbox 底层 service 仍保留，继续供 Archive 导入流程复用。后续不要优先增强 Inbox 页面 UI。

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
- 已用只读查询复核 `5e9fb16311ee091e615c2a7f` 当前真实库状态：Anontraveler preview 为 496 个 album archive item；当前数据库目标集合已有 496 条 album `archive_items`、496 条 archive item external source 映射和 496 条集合内 album external source 映射。此前 80 条只是历史部分写入状态。
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
- Inbox 主导航入口已隐藏；访问 `#inbox` 会显示停用提示，并指向 Archive 新增集合进行 URL 导入。
- Archive 新增集合是当前用户主导入入口，Inbox service 仅作为旧入口底层能力 / 内部导入能力保留。
- 本次没有抓取 `https://www.anontraveler.com/rank`，没有批量导入所有榜单，没有新增依赖或复杂后台队列。
- 已新增 Anontraveler 榜单目录扫描的最小纯能力：解析 mock 目录 HTML、生成目录索引项、按 `versionId` 合并去重、只允许扫描 `/rank` 目录入口。
- 目录扫描当前只发现榜单索引，不导入榜单条目，不调用 candidates / Review plan / commit，不落库。
- Archive 新增集合 URL 导入区域已接入 Anontraveler 榜单目录选择入口；选择目录项只会填充现有 URL 输入框，不会自动预览、自动导入或落库。
- 已执行一次真实目录页验证：`https://www.anontraveler.com/rank` 请求成功且仅请求目录页 1 次，但当前 parser 解析数量为 0；下一步需要捕获真实 HTML 结构并最小修正 parser。
- 已确认真实目录数据源为 `https://www.anontraveler.com/api/rank/ranks/all/0`；Archive 目录扫描现改为只请求该 API 一次，并把 `data.ranks` 映射为可选择榜单 URL。
- Archive 目录扫描已支持分页加载：初始加载 `/all/0`，点击“加载更多榜单”后逐页请求 `/all/1`、`/all/2`，按 `versionId` 去重并根据 `data.pages.total` 判断是否还有更多。

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

- Archive 目录选择的桌面 / 窄屏浏览器截图仍需补做；本轮已启动 Vite 并确认本地页面 200，但 Playwright 浏览器二进制缺失，未执行 `npx playwright install`。
- 真实 Supabase 环境中，`5e9fb16311ee091e615c2a7f` 已只读验证为 496 条正式 `archive_items`，无需继续按 80 条历史状态补齐。
- 真实 Supabase 环境中，建议选择另一个未导入或可安全重复导入的榜单，继续验证 Archive URL 导入入口的自定义标题 / 说明、重复导入 note 回填、`Bad Request` 是否消失，以及数量摘要是否清晰。
- 对已经生成过旧 archive item 的集合，重新提交导入计划时应不再报 `archive_items_collection_id_entity_type_entity_id_key`，并会补齐新的 external source 映射。
- Albums 集合标题懒加载、服务端分页、分块并发、全集合曲风筛选、集合搜索 / 本地排序、曲风搜索已通过 `src/features/albums` 自动化测试；仍建议在浏览器里做一次桌面 / 窄屏视觉检查，重点看按钮列表高度、滚动和窄屏布局。

## 当前最高优先级

最新状态：权限矩阵和落地盘点已完成。`docs/PERMISSIONS.md` 是权限矩阵，`docs/PERMISSIONS_AUDIT.md` 是当前 UI、service、RLS 缺口清单。下一步不要重新盘点，直接按小步落地权限收口：先 UI 可见性，再 Archive / Albums service admin guard，最后 RLS migration。

追加完成：权限落地 P0 已完成代码侧收口。Archive / Albums 的非 admin 写入口已隐藏，Archive / Albums service 写函数已补 admin guard，Inbox import_* 读取函数已补 admin guard，并新增 admin-only public library 写入 migration。下一步优先做真实 Supabase migration apply 后的权限验证，或进入 Anontraveler 目录扫描的真实浏览器检查。

追加验证：Archive 页面已通过 Vite 临时服务确认 `/#archive` HTTP 200；由于当前会话没有 Browser 插件且项目未安装 `playwright` 包，目录扫描真实点击 / 截图验证仍待有浏览器工具时补做。

追加完成：Archive 目录扫描已完成 Playwright 真实浏览器验证。桌面和窄屏截图已保存到 `output/playwright/`；扫描第一页、加载更多、选择榜单只填 URL 均通过，未自动预览、未自动导入、未请求榜单详情页。

权限矩阵、权限落地盘点和权限落地 P0 已完成。不要重新盘点或重复做 UI/service/RLS 收口；下一步只保留真实 Supabase apply migration 后的权限验证。

真实权限验证顺序建议：先 apply admin-only public library 写入 migration，再用普通用户验证 Archive / Albums / import_* 写入被拒绝，最后用 admin 验证资料库维护和导入仍可用。

Archive 目录扫描已支持逐页加载目录 API，并且代码层面已收束为“选择榜单后只填 URL，不自动预览”。ArchivePage 自动化测试和 Playwright 真实浏览器验证已覆盖扫描第一页、加载更多、去重、选择后只填 URL，以及不触发 preview / candidates / Review plan / commit。Inbox 页面 UI 暂不作为优先增强对象。

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

当前本地可自动化部分已完成：导入成功摘要已覆盖 preview / saved / planned / committed 四段数量，`createImportReviewPlan` 现在额外返回按实体类型拆分的 `plannedCounts`，Inbox 与 Archive 成功摘要会展示计划明细。Albums 首屏服务端分页、翻页和完整集合曲风筛选已有测试覆盖。

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

本地覆盖状态：

- 已覆盖：一键导入内部保存候选、生成 Review plan、正式提交的摘要口径。
- 已覆盖：Review plan 数量按实体类型可解释。
- 已覆盖：重复生成计划使用 `user_id,source_name,source_id,entity_type` upsert，不产生重复不可控数据。
- 已覆盖：commit 成功后档案集合和条目可被 archive service 读取。
- 已覆盖：`/albums` 首屏集合详情只请求当前页 25 条数据，翻页时再请求下一页。
- 已覆盖：`/albums` 曲风筛选对完整集合生效，翻页时保留当前曲风。

## 后续功能队列

最新完成：P0 / P1 的本地代码与自动化测试项已完成。权限落地代码侧已完成；共享导入数量摘要和 planned 明细已完成；Albums 分页与完整集合曲风筛选已覆盖。

真实 Supabase 权限验证已完成：admin-only public library 写入 migration 已应用到 remote，RLS 探针确认普通 user 写入被拒绝、admin 写入可用且无测试数据残留。真实大榜单 `5e9fb16311ee091e615c2a7f` 已只读验证为 496 条正式 `archive_items`；下一步用另一个榜单验证跨榜单幂等、重复导入 note 回填和 `Bad Request` 是否消失。

0. Anontraveler 全榜单导入三阶段设计：先做榜单目录扫描，只保存榜单索引；再稳定单榜单导入数量口径；最后做围绕 Archive 新增集合入口的批量队列导入，支持失败记录、失败重试和重复导入幂等。
   - 已完成第一阶段的最小代码基础：目录 HTML 解析、目录项字段、状态枚举、`versionId` 去重合并和单页扫描函数。下一步不要直接批量导入，应先决定目录索引是暂存前端状态还是新增正式表。
   - Archive 新增集合 URL 导入区域已接入最小选择 UI；当前仅扫描目录、展示 title / itemCount / status，并把用户选择的 `sourceUrl` 填入现有输入框。
   - 真实目录页验证结果：请求成功、请求次数 1、未访问详情页，但解析数量为 0；需要先观察真实 HTML / hydration 数据结构，再修 parser。
   - 已修正目录扫描数据源：改用 `/api/rank/ranks/all/0` 的 `data.ranks`，当前只加载第一页 10 条，不自动翻页、不访问详情页。
   - 已支持用户点击“加载更多榜单”后逐页加载更多目录页；仍不自动访问详情页、不预览、不导入。
1. `match_existing` 最小手动匹配 UI 已完成。
   - 位于 `/archive`，仅管理员可见；只允许 artist / album Review item 匹配已有 public 实体。
   - 保持 Archive 一键导入主流程，Inbox 主入口仍停用。
   - 当前最小交互使用已有 public 实体 ID；如后续需要按名称搜索目标，应单独设计查询范围、分页和权限，不在当前 MVP 中扩展。
2. 数据库级正式导入任务状态追踪和失败恢复，避免重复点击或部分失败后不清楚状态。
3. Review plan 明细展示专辑封面 / 点评 / 年代 / 风格，便于导入前检查。
4. 专辑封面与曲风正规化，例如 `albums.cover_url` 和 `album_styles` / `album_genres`。
5. 历史错绑作者数据修正方案：重新导入或单独 migration / SQL 修正。
6. AI 候选笔记补全评估，不进入当前 MVP 主线。
   - 触发场景：`/albums` 中 album / archive item 没有来源评语、条目备注或用户笔记时，可提供“生成候选笔记”入口。
   - 推荐形态：只生成草稿候选，用户必须查看、编辑并确认后才写入正式笔记字段。
   - 数据边界：优先使用已公开的专辑标题、艺人名、年份、曲风、榜单上下文和来源 URL；禁止发送用户私密笔记、账号信息、token、cookie 或 service role key。
   - 写入边界：AI 不自动覆盖 `archive_items.note`、`albums.notes` 或用户已有笔记；必须保留来源评语回填作为优先数据路径。
   - 权限边界：匿名用户不能触发写入；如后续允许生成，应先确认管理员 / 登录用户权限、额度控制、失败状态和审计记录。
   - 实现前置：先完成真实导入数量验证、重复导入 note 回填、导入状态追踪；再单独设计 AI provider、环境变量、RLS 和测试策略。
   - 风险：AI 可能生成事实错误或风格化过度内容，必须作为“待确认候选”而不是可信音乐资料。

## 推荐下一轮只读取

- `docs/PERMISSIONS_AUDIT.md`

- `AGENTS.md`
- `docs/PERMISSIONS.md`
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
- 不要优先增强 Inbox 页面 UI。
- 不要把所有 Anontraveler 榜单一次性导入。
- 不要使用 service role key。
- 不要绕过 RLS。
- 不要让普通用户或匿名用户执行导入写入。
- 不要在 Practice 和 Songs / 曲目之外新增普通用户可操作的 CRUD，除非先明确权限矩阵并得到确认。

## 当前优先任务：完成 PDF 六线谱工具箱 MVP

已完成：
1. `#toolbox` 路由、导航、响应式页面壳和双语文案。
2. 纯 PDF 文件校验与电子六线谱结构分析核心。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-pdf-tab-musicxml.md` 的 Task 3 接入 `pdfjs-dist@4.10.38` 动态适配器。
2. 完成 Task 4 的 MusicXML 4.0 安全骨架生成。
3. 完成 Task 5 的分析摘要、警告和本地下载流程。
4. 用 `C:\Users\Ashin\Downloads\endless rain.pdf` 做只读验证，不复制进仓库、不上传。

本轮不要进入品位/节奏几何识别；先保证真实 PDF 快照和合法 MusicXML 骨架纵向链路可用。

## PDF 六线谱工具箱：阶段 1 已完成

- 已完成 Task 3：`pdfjs-dist@4.10.38` 动态本地 PDF 适配器、20 页限制、文本/矢量/图片快照归一化和资源释放。
- 已完成 Task 4：安全 MusicXML 4.0 骨架和 XML 解析验证；只输出 `.musicxml`，不生成 `.gp`。
- 已完成 Task 5：本地分析、摘要、警告、下载、失败恢复和 object URL 释放流程。
- 已完成 Task 6：`endless rain.pdf` 只读验证通过，得到 4 页、92 BPM、连续小节 1-18；原文件未进入仓库。

下一个建议任务（需单独设计后再开始）：仅针对清晰电子六线谱的字符串/品位几何定位。继续禁止节奏时值、连音、技巧符号、扫描件、专有 `.gp` 生成和任何上传/数据库改动。

## PDF 六线谱工具箱：字符串 / 品位几何定位已完成

- 已新增纯几何定位：六条近似等距字符串基线、`0` 至 `24` 品位、连续小节区间、`high` / `medium` 置信度和拒绝诊断。
- 已在分析摘要与页面中显示定位数量；MusicXML 不消费这些候选，仍保持安全休止骨架。
- 已覆盖可靠六弦系统、双位数品位、超范围数字、弦间歧义和小节边界候选。

下一步必须重新单独设计，不直接实现：如何把已定位的同一小节内候选按时间顺序建模。该任务仍禁止自动推断节奏时值、技巧符号、扫描件支持、上传、Supabase 改动和 `.gp` 生成。

## PDF 六线谱工具箱：小节内候选事件列已完成

- 已完成同页同小节候选的横向事件列分组、从左到右排序与同弦冲突诊断。
- `TabScoreAnalysis` 与页面会显示事件列数量；事件列仍只是几何顺序，不代表节奏、时值、音高、和弦或 MusicXML 音符。
- MusicXML 继续只输出安全休止骨架；未改动上传、PDF 适配器、Supabase 或依赖。

该旧建议已由后文“真实电子谱符号拓扑兼容设计”替代：首版不增加人工时值编辑器，而是只读取五线谱明确符号；仍禁止从横向距离猜测时值，并继续禁止扫描件、技巧识别、自动 `.gp` 生成、上传与数据库改动。

## Toolbox：矢量六线谱基线定位已完成

- PDF.js 操作列表中的水平矢量线段已用于识别六线谱系统；能合并同一基线的断续片段。
- `endless rain.pdf` 本地浏览器验证已定位 3 个系统、5 个字符串 / 品位候选、5 个事件列；不完整基线会降为中等置信度并提示复核。
- 不要把几何事件列自动转换成节奏、时值、音符或技巧，也不要生成 `.gp`。

该建议已被后文“真实电子谱符号拓扑兼容设计”替代：首版不提供人工时值编辑器，改为只读取五线谱中明确存在的路径拓扑或可靠音乐字体字形；无法确认时整小节回退。

推荐只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-pdf-tab-musicxml.md`
- `src/features/toolbox`
- `src/i18n/messages.ts`
- `package.json`

## Toolbox：真实电子谱符号拓扑兼容设计已完成

已完成设计：
- 采用矢量路径与可靠音乐字体字形双通道。
- 先规范化为系统内图元，再按拓扑关系识别符头、符干、共享连梁、符尾、附点和休止符。
- 明确支持复合子路径、跨绘制操作组合、倾斜 / 局部连梁、多符头共享符干和字形 / 路径冲突回退。
- 明确禁止根据 TAB 横向间距推断节奏；横坐标只用于归组、排序、小节归属和唯一配对。
- 任一事件不可靠或整小节容量不合法时，整个小节继续输出安全休止占位。

下一轮按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 从 Task 1 开始实施，先完成复合绘制形状提取，不要直接进入 MusicXML 或页面。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮约束：
- 不读取、复制或上传真实 PDF。
- 不修改 Supabase、依赖或项目架构。
- 不运行 `npm install`。
- 不根据 TAB 横向间距推断节奏。
- 不生成 `.gp`。
- 先写失败测试，再实现 Task 1；只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 1-2 已完成

已完成：
1. Task 1：复合绘制形状提取，保留图形状态、复合子路径、绘制方式、填充规则、线宽、变换后坐标和边界；现有 `lineSegments` 行为保持不变。
2. Task 2：保守音乐字体证据，只允许精确 SMuFL PUA 映射与精确字体族白名单产生可靠语义；未知 PUA 保留为 unknown，普通文本不进入音乐证据。

定向验证：`pdf.service.test.ts` 与 `tab-analyzer.test.ts` 共 12 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 3，先写失败测试，再实现五线谱与 TAB 系统唯一配对。
2. 只使用人工线段夹具，不读取真实 PDF。
3. 继续禁止根据 TAB 横向间距、相邻事件间距或小节宽度推断节奏。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮仍不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 8 已完成

已完成：
1. `TabScoreAnalysis` 已附加逐小节 `rhythmMeasures`，并保持缺少新可选快照字段时的向后兼容。
2. `tab-analyzer` 已按“配对系统 -> 规范化图元 -> 拓扑事件 -> 整小节结果”的依赖顺序完成编排。
3. 路径单通道、可靠字形单通道、双通道一致、双通道冲突、无配对系统和旧快照均有分析器测试。
4. 无可靠配对或无强节奏证据时保留安全休止骨架；有强证据但个别小节失败时保留逐小节简短原因。
5. 横坐标没有参与时值推断；全部测试只使用人工证据，没有读取真实 PDF。

定向验证：计划指定的 8 个纯分析文件共 78 个用例通过；完整 `src/features/toolbox` 共 11 个测试文件、88 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 9，先写失败测试，再让 MusicXML 只消费完整合法的 `recognized` 小节。
2. 任一 TAB 事件查找失败时必须让整个小节回退为既有休止占位；不得部分写入真实音符后补休止。
3. 保持 MusicXML 转义、标准调弦、文件名与下载行为不变；本轮先不修改页面 UI。
4. 不读取真实 PDF，不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮只运行 Toolbox 定向测试，不运行完整仓库测试或构建。

## Toolbox：明确节奏拓扑 Task 7 已完成

已完成：
1. 新增稳定的小节节奏输出契约和纯 `buildMeasureRhythmResults` 模块。
2. 非休止事件只有在同页容差内候选全部属于同一小节时，才与唯一最近的 TAB 事件列配对；跨小节候选、重复用列、漏列、并列最近或超出容差都会整小节回退。
3. 一个 TAB 列可保留多个弦 / 品位；明确休止事件的 `tabEventOrder` 固定为 `null`。
4. 使用三十二分音符整数单位严格校验全至十六分时值及一个附点，并覆盖精确、容量不足、容量超出、6/8 与不支持容量。
5. 中等置信度、缺失事件、配对歧义或容量不等时不保留部分候选，返回空事件的整小节回退。
6. 时值完全沿用 Task 6 的明确拓扑 / 可靠字形结果；横向容差只选择 TAB 列和辅助小节归属。
7. 全部测试使用人工节奏与 TAB 事件夹具，没有读取真实 PDF。

定向验证：Task 7 与事件列共 2 个测试文件、16 个用例通过；完整 `src/features/toolbox` 共 11 个测试文件、82 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 8，先写分析器失败测试，再按既定依赖顺序接入五线谱 / TAB 配对、图元规范化、拓扑识别和小节结果。
2. 无可靠配对系统、无强节奏证据或任一小节回退时，保留既有安全休止骨架和简短诊断；不要提前修改 MusicXML 序列化或页面 UI。
3. 继续保证横坐标只用于归组、排序、小节归属和 TAB 列唯一配对，绝不决定时值。
4. 不读取真实 PDF，不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮只运行 Toolbox 定向测试，不运行完整仓库测试或构建。

## Toolbox：明确节奏拓扑 Task 6 已完成

已完成：
1. 路径强拓扑与可靠字形语义一致时融合为唯一事件并保留来源；冲突时不选边。
2. 可靠字形支持全至十六分休止；仅有包围框相似的路径休止保持诊断，不伪装成强证据。
3. 一个附点只有在右侧、垂直兼容并满足事件侧 / 候选点侧双向唯一时才附着。
4. 两枚候选点、断音点歧义、完整字形缺少可靠附点锚点、未知字形、不支持结构和重叠声部会降级或拒绝。
5. 横坐标只服务局部符号关系和排序，没有根据 TAB 或相邻事件间距推断节奏。
6. 全部测试使用人工图元与字形夹具，没有读取真实 PDF。

定向验证：`src/features/toolbox` 共 10 个测试文件、68 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 7，先写失败测试，再新增整小节节奏结果模块。
2. 非休止节奏事件只允许与同页同小节的唯一 TAB 事件列配对；横向容差只选择列，绝不决定时值。
3. 使用三十二分音符整数单位严格校验小节容量；任一事件为 `medium`、配对歧义或容量不等时整小节回退。
4. 不在 Task 7 提前接入分析器、MusicXML 或页面状态。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮仍不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 5 已完成

已完成：
1. 新增 `RhythmDuration` 与纯 `recognizeRhythmTopology` 结果契约。
2. 在同页同系统内建立连接、相交、包含、对齐和从属关系，先解析符头 / 符干，再解析梁组和符尾。
3. 支持路径与可靠字形全 / 二分 / 四分音符、共享符干、共享倾斜梁、两层梁、局部次梁，以及路径 / 字形单双符尾。
4. 每根符干只计算自身明确相接的梁层或符尾；无关近邻不会改变时值。
5. 横坐标只用于事件排序，没有使用 TAB 横向间距、事件间距或小节宽度推断时值。
6. 全部测试只使用人工规范化图元和配对系统夹具，没有读取真实 PDF。

定向验证：`rhythm-topology.test.ts` 与 `notation-primitives.test.ts` 共 2 个测试文件、21 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 6，先写失败测试，再实现路径 / 字形强证据冲突融合、可靠休止符和一个附点的局部唯一附着。
2. 未知字形、两枚候选点、断音点歧义和不支持结构只能产生中等置信度或诊断，不得直接确定可导出时值。
3. 继续禁止使用 TAB 横向间距、相邻事件间距或小节宽度推断节奏。
4. 不在 Task 6 提前实现整小节容量、MusicXML 或页面集成。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮仍不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 3 已完成

已完成：
1. 新增五线谱与 TAB 系统配对契约和纯几何模块。
2. 只接受恰好五条、近水平、近等长且等距的五线谱；拒绝四线、六线和不均匀间距。
3. 只配对同页下方、横向重叠至少 80%、垂直距离受五线谱间距约束且最近候选唯一的 TAB 系统。
4. 全部测试只使用人工线段夹具，没有读取真实 PDF，也没有从 TAB 横向间距推断节奏。

定向验证：`staff-tab-alignment.test.ts` 与 `tab-staff-geometry.test.ts` 共 11 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 4，先写失败测试，再实现系统内证据规范化图元。
2. 只使用人工路径、字形和配对系统夹具，不读取真实 PDF。
3. 保留源坐标供 TAB 配对使用；不得通过 TAB 横向间距、相邻事件间距或小节宽度推断节奏。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`

下一轮仍不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## 当前 Toolbox 任务索引（2026-07-17）

- 明确节奏拓扑 Task 1-8 已完成；以本文“Toolbox：明确节奏拓扑 Task 8 已完成”章节为当前状态。
- 下一个任务是 Task 9：先写失败测试，再让 MusicXML 只消费完整合法的 `recognized` 小节；任一 TAB 事件查找失败时整小节回退。
- Task 9 不修改页面 UI，不读取真实 PDF，不修改 Supabase，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 9 已完成

已完成：
1. MusicXML 使用 `divisions = 8`，支持全、二分、四分、八分、十六分时值与一个附点。
2. 完整合法的 `recognized` 小节会输出显式音符 / 休止、标准调弦 pitch、string / fret technical notation；同一 TAB 列的额外位置使用 `<chord/>`。
3. 任一非休止事件无法唯一解析 TAB 列、TAB 列没有有效品位、事件不再高置信、小节容量不匹配或附点数量非法时，整小节回退为既有 measure rest，不做部分写入。
4. 分析阶段与运行时回退的小节编号会出现在 MusicXML credit；既有 XML 转义、调弦、文件名和下载调用保持不变。
5. 全部测试使用人工分析结果，没有读取真实 PDF；本轮未修改页面 UI、Supabase、依赖或锁文件，未运行 `npm install`，未生成 `.gp`。

定向验证：MusicXML 1 个测试文件、6 个用例通过；最终 Toolbox 定向套件共 9 个测试文件、86 个用例通过。

下一步只执行：
1. 按 `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md` 的 Task 10，先写页面失败测试，再显示已检查、recognized 和 fallback 小节数量及逐小节简短状态。
2. 页面必须明确提示 fallback 小节会导出为休止占位；保持既有下载按钮条件，不增加编辑、播放、动画或新 UI 框架。
3. 不重新修改 Task 9 的 MusicXML 语义，不读取真实 PDF，不修改 Supabase、依赖或项目架构，不运行 `npm install`，不生成 `.gp`。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `src/features/toolbox`
- `src/i18n/messages.ts`

下一轮只运行 Toolbox 定向测试，不运行完整仓库测试或构建。

## 当前 Toolbox 任务索引（2026-07-17，Task 9 后）

- 明确节奏拓扑 Task 1-9 已完成；以本文“Toolbox：明确节奏拓扑 Task 9 已完成”章节为当前状态。
- 下一个任务是 Task 10：页面显示逐小节识别 / 回退统计、状态和混合导出提示。
- Task 10 不读取真实 PDF，不修改 Supabase，不运行 `npm install`，不生成 `.gp`，只运行 Toolbox 定向测试。

## Toolbox：明确节奏拓扑 Task 10-11 已完成

已完成：
1. 页面显示已检查、`recognized`、`fallback` 小节数量、逐小节文字状态和简短回退原因。
2. 存在 fallback 小节时明确提示 MusicXML 会使用整小节休止占位；下载按钮启用条件保持不变。
3. 中英文文案同步，未新增编辑、播放、动画或 UI 框架，未改变 Task 9 MusicXML 语义。
4. 最终构建修复了 `notation-primitives.ts` 的既有 TypeScript 曲线命令类型收窄问题，没有改变曲线采样运行时行为。
5. 明确节奏拓扑计划 Task 1-11 全部完成；Toolbox 定向测试 11 个文件、95 个用例通过，生产构建通过。
6. 全部自动化验证只使用人工夹具，没有读取、复制或上传真实 PDF；未修改 Supabase、依赖或锁文件，未运行 `npm install`，未生成 `.gp`。

当前结论：
- 计划定义的 Toolbox MVP / 明确节奏拓扑阶段已经开发完成。
- 它不是通用完整转谱器：连音组、延音线、跨小节连梁、装饰音、多声部、技巧、扫描件、播放、人工编辑和直接 `.gp` 仍明确不支持。
- 真实电子谱兼容性和 Guitar Pro 8 打开结果尚未做端到端验收，不能仅凭人工夹具宣称所有真实 PDF 均可转换。

下一步建议：
1. 如继续 Toolbox，先由用户明确授权一次浏览器本地只读真实 PDF 验收，并手工确认导出的 MusicXML 可由 Guitar Pro 8 打开；不得复制、上传或提交 PDF。
2. 验收若发现具体兼容问题，先补人工最小失败夹具，再修复，不扩大到当前不支持符号。
3. 如不进行真实文件验收，停止扩展 Toolbox，返回 Archive / Import 主线。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `src/features/toolbox`
- `src/i18n/messages.ts`

不要扫描整个仓库，不运行 `npm install`，不做架构重构。未经用户明确授权，不读取真实 PDF 或进行 Guitar Pro 8 手工验收。

## 当前 Toolbox 任务索引（2026-07-17，Task 11 后）

- 明确节奏拓扑 Task 1-11 已完成；以本文“Toolbox：明确节奏拓扑 Task 10-11 已完成”章节为当前状态。
- 下一步是可选的真实文件端到端验收，不是继续自动扩功能；如不验收则回到 Archive / Import 主线。

## 当前任务索引（2026-07-17，导入验证反馈后）

- 用户确认现有 Archive / Import 实际测试暂无明显问题。停止重复执行真实导入验证，也不要仅为预防性需求新增数据库级任务状态、RPC、worker 或批量队列。
- 若后续重新出现 `Bad Request`、阶段数量不一致、备注未回填、重复数据或部分提交，再恢复导入诊断，并记录 `preview`、`saved`、`planned`、计划类型明细与 `committed`。
- 下一项推荐功能：Review plan 明细展示专辑封面、来源点评、年代与风格，方便管理员在正式提交前检查。
- 实施时保持 `Archive / 档案 -> 新增集合` 为主入口，不恢复 Inbox 主导航，不改变既有一键导入提交时机、`match_existing` 语义或 admin-only 权限模型。
- 先写页面失败测试，再做最小 UI；优先复用现有 Review plan 数据与组件。除非现有数据契约确实缺字段，否则不修改 Supabase、migration 或 RLS。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `src/features/archive`
- `src/features/inbox`
- `src/i18n/messages.ts`

下一轮不要扫描整个仓库，不运行 `npm install`，不引入新 UI 框架，只运行 Archive / Inbox 定向测试。

## 当前任务索引（2026-07-17，Review plan 明细完成后）

- 已完成 Review plan 专辑来源明细：管理员在 `/archive` 手动加载现有计划后，可查看专辑封面、来源点评、发行年份与风格。
- 明细复用 `import_review_items.review_payload.metadata`，没有新增数据库字段、查询链路、任务状态、RPC、worker 或批量队列。
- Archive 主入口、Inbox 停用导航、一键导入提交时机、artist / album `match_existing` 语义和 admin-only 权限均保持不变。
- Archive / Inbox 定向测试共 8 个文件、83 个用例通过；未运行完整仓库测试、构建或真实导入。

下一步建议：
1. 不要重新执行真实导入，也不要自动恢复数据库级任务状态 / RPC / worker 设计；只有真实失败再次出现时才恢复诊断。
2. 如继续 Archive / Import，可单独确认是否进入既有队列的“专辑封面与曲风正规化”。该任务涉及 schema / migration，开始前必须重新明确最小数据模型、兼容性和权限影响；默认不修改数据库。
3. 如暂不做数据正规化，可停在当前稳定点，不追加 Review plan 分页、搜索或新提交步骤。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `src/features/archive`
- `src/features/inbox`
- `src/i18n/messages.ts`

不要扫描整个仓库，不运行 `npm install`，不恢复 Inbox 主导航，不改变一键导入或 `match_existing` 语义。若未明确确认封面 / 曲风正规化的数据模型，不修改 Supabase。

## 当前任务索引（2026-07-17，专辑封面与曲风正式字段化完成后）

- 已新增本地 additive migration：`albums.cover_url text` 与 `albums.styles text[] not null default '{}'::text[]`；没有回填旧数据，也没有应用远端。
- 新建专辑写正式字段；Albums 与 Archive 正式字段优先、raw payload 回退；旧专辑无需重复导入。
- 手动 `match_existing`、external source 自动复用、一键导入提交时机、Review plan、数量口径、Inbox 导航与 admin-only 权限保持不变。
- Archive / Inbox / Albums 回归 12 个测试文件、125 个用例通过；Node 20 下生产构建通过。

下一步建议：
1. 若用户明确授权远端变更，先只审查并应用 `20260717073327_add_album_cover_and_styles.sql`，再执行 anon / 普通用户 / admin 最小角色探针；不得打印密钥或使用 service role 绕过 RLS。
2. 远端 migration 未应用前，不部署依赖新列的代码。
3. 不自动回填旧专辑，不重复真实导入；如未来需要回填，单独设计 admin-only、幂等任务。
4. 不建立曲风字典、别名、翻译或 `album_styles` 关系表，除非出现明确查询需求。

推荐下一轮只读取：
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `supabase/migrations/20260717073327_add_album_cover_and_styles.sql`
- `src/features/archive/archive.service.ts`
- `src/features/albums/albums.service.ts`
- `src/features/inbox/album-metadata.ts`
- `src/features/inbox/inbox.service.ts`

不要扫描整个仓库，不运行 `npm install`，不执行真实导入、自动回填或远端 migration；远端 apply 与角色探针必须先取得用户明确授权。

## 当前任务索引（2026-07-17，Web MVP 上线计划确认后）

已确认产品与权限边界：

- 注册保持开放；新账号默认普通用户，管理员只允许人工授予。
- 资料库写入、导入、提交、匹配、回填和批量处理仅管理员可见、可触发，并必须由 service 与 RLS / RPC 拒绝非管理员请求。
- 当前只屏蔽艺人列表并暂停其开发；不顺带修改其他导航。
- Practice、Archive、Toolbox 是后续产品主线；Archive 继续作为导入主入口，Inbox 不恢复主导航。

### P0：上线前必须完成

1. Auth 冒烟：注册、邮箱确认、登录、退出、找回密码；确认新账号角色为 `user`，且客户端不能把自己提升为 `admin`。
2. 三角色权限验收：分别验证 `anon`、普通用户、管理员的页面可见性、public 读取、私有 Practice / Songs 隔离和资料库写入结果。
3. 管理员入口验收：非管理员看不到资料库新增、编辑、删除、导入、Review plan、Commit、Match existing、回填及批处理入口；直接调用对应 service / Data API 仍被拒绝并显示不泄露内部信息的权限提示。
4. 数据与环境预检：确认生产 schema / migration 与待部署代码一致，核对 Supabase Auth 站点地址和重定向 URL，确认前端只使用公开客户端密钥且没有暴露 service role。
5. 最小回归与构建：优先运行 Auth、Practice、Archive 和 Toolbox 定向测试，再执行一次生产构建；不重复真实导入。
6. 预览环境冒烟：验证注册、登录、Practice 私有 CRUD、Archive public 读取、管理员入口可见性和非管理员越权拒绝。

### 上线阶段

1. **预检**：冻结本次部署范围，记录当前 commit、数据库 migration 状态、环境变量清单和回滚版本。
2. **预览部署**：使用与生产相同的 Supabase 项目配置完成 P0 冒烟；不导入真实榜单，不修改一键导入或 `match_existing` 语义。
3. **生产部署**：先部署前端，再检查首页、注册登录、Practice、Archive 和 Toolbox；数据库只允许执行已确认且与代码匹配的 additive migration。
4. **观察期**：个人使用 24-72 小时，关注认证邮件、权限拒绝、浏览器错误和 Supabase 用量；没有实际滥用时保持开放注册。
5. **回滚**：前端异常时回退到上一稳定部署；additive schema 保留，不做破坏性回滚或删除字段。

### P1：上线后迭代

1. 优先完善 Practice 核心闭环及其历史/统计，但保持用户数据严格隔离。
2. Archive 仅做阅读体验和现有管理员维护流程的小步改进，不恢复 Inbox 主导航，不扩张导入语义。
3. Toolbox 真实 PDF / Guitar Pro 8 验收仍需用户另行授权；未授权时不读取真实 PDF。
4. 艺人列表继续屏蔽且不开发；其他模块是否屏蔽或收束需单独确认。
5. 仅在出现垃圾注册、邮件投递或额度问题后，再评估 CAPTCHA、自定义 SMTP、速率限制或关闭注册。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- 当前 P0 验收涉及的最小 feature / 配置文件

不要扫描整个仓库，不运行 `npm install`，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 `match_existing` 语义。开始部署、远端写入或角色探针前，先明确本轮授权范围。

## 当前任务索引（2026-07-17，Toolbox 几何兼容移植完成后）

- 已在当前 Toolbox 架构中补齐短横线伪影过滤、稀疏 TAB 行覆盖拒绝、6.6 TAB 弦距配对边界和英文单数摘要。
- 没有整体合并旧 `codex/toolbox-explicit-rhythm`，也没有移植其 `rhythm-symbols` 实现。
- 新增行为完成 RED / GREEN 验证；完整 Toolbox 为 11 个测试文件、100 个用例通过，生产构建通过。
- 旧 Toolbox 工作树和分支仍保留，删除属于后续独立清理操作，必须再次得到用户明确确认。

下一步建议：

1. 合并并推送 `codex/toolbox-geometry-compat`。
2. 推送后只读确认 `main`、新分支和旧工作树状态，再由用户决定是否删除旧工作树 / 旧分支。
3. 清理完成后返回 Web MVP 上线 P0：Auth 冒烟与 anon / 普通用户 / admin 三角色权限验收。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- 仅在复核 Toolbox 时读取 `src/features/toolbox` 与 `src/i18n/messages.ts`

不要读取真实 PDF，不运行 `npm install`，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 `match_existing` 语义。

## 当前任务索引（2026-07-20，上线收尾预检后）

已完成：

- Toolbox 几何兼容已合并并推送，远程只保留默认分支 `main`。
- 旧 Toolbox 增量已保存为本地提交 `abd8218`，工作树继续保留。
- `.playwright-cli/` 已加入忽略规则，`dist/` 未被跟踪；工作区只剩本轮待提交文档与 `.gitignore` 修改。
- 上线相关 29 个测试文件、284 个用例通过，生产构建通过。
- 已只读确认专辑正式字段、Albums RLS / policy、运行环境目标和公开 Auth 设置。

### P0：下一步只执行

1. **Migration history 对齐决策**：已把本地文件纯重命名为 `20260717073327_add_album_cover_and_styles.sql` 以匹配远端；SQL 与哈希未变，没有重复执行 DDL。
2. **Auth 策略决策**：当前开放注册且 `email_autoconfirm = true`。确认 Web MVP 是接受注册后自动确认，还是关闭自动确认并验收邮件确认链路。
3. **真实 Auth 冒烟**：按确认策略验证注册、登录、退出、找回密码和重定向 URL；不得记录真实密码、token 或 cookie。
4. **三角色权限探针**：验证 anon public read、普通用户私有 Practice / Songs 隔离和资料库写入拒绝、admin 现有维护入口；探针数据必须可识别、最小化并清理，不执行真实榜单导入。
5. **预览部署冒烟**：完成以上 P0 后再部署预览环境；不改变 Inbox、导入提交时机或 `match_existing` 语义。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `supabase/migrations/20260717073327_add_album_cover_and_styles.sql`
- `src/features/auth`
- 三角色探针涉及的最小 Practice / Songs / Archive service 与测试文件

不要运行 `npm install`，不要重复真实导入，不恢复 Inbox 主导航，不开发艺人列表，不读取真实 PDF。远端 Auth 配置、测试账号、角色探针、migration 文件或部署发生变化前，先明确具体影响范围。

## 当前任务索引（2026-07-20，migration / RLS / 匿名页面验收后）

已完成：

- 本地专辑 migration 已纯重命名为远端版本号 `20260717073327`；SQL 与哈希未变，没有执行远端 DDL、repair 或 push。
- Supabase anon / 普通用户 / admin 的 8 项事务内 RLS 探针全部通过，rollback 后没有测试数据残留。
- Guest 浏览器确认 Archive 可公开读取 14 个既有榜单；没有触发预览、目录扫描或真实导入。
- 已修复 Archive 管理区的 UI 可见性：anonymous / user 均看不到新增、URL 预览导入、目录扫描、编辑、删除、Review plan 与 Match existing；admin 行为和既有导入语义不变。
- `docs/PERMISSIONS.md` 已把 URL 预览导入与目录扫描明确收紧为 admin-only；Archive 3 个测试文件、31 个用例和 production build 通过。
- Auth 保持开放注册与邮箱自动确认，远端配置未变。

### P0：下一步只执行

1. **实现找回密码最小闭环**：推荐包含未登录页发送重置邮件，以及恢复链接建立 session 后设置新密码；不引入新依赖，不修改 Supabase schema / RLS。
2. **清理无效测试入口**：评估移除或仅在明确 demo 配置下显示“Anonymous test login”，因为远端已禁用匿名登录；不得改变正常注册和密码登录。
3. **真实 Auth 冒烟**：使用用户确认的测试邮箱验证注册、自动确认、密码登录、退出、找回密码与重定向；不得记录密码、token 或 cookie，测试账号残留需先约定。
4. **普通用户 / admin 页面冒烟**：补齐已登录角色的页面可见性验证；不执行真实榜单导入。
5. **最小回归与构建**：Auth / Practice / Archive / Toolbox 定向测试与 production build 通过后，再进入预览部署。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `src/features/auth`
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.test.tsx`

不要运行 `npm install`，不要重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 `match_existing`，不开发艺人列表，不读取真实 PDF。找回密码行为和真实测试邮箱需确认后再继续。

## 当前任务索引（2026-07-20，Auth 找回密码闭环完成后）

已完成：

- Auth 已实现发送密码恢复邮件、PKCE 回链 session 和设置新密码的最小闭环。
- 未知邮箱使用统一成功提示，避免暴露账号是否存在。
- 无效的“Anonymous test login”页面入口已移除；现有注册、登录、Magic Link 与确认邮件重发保持兼容。
- 权限文档已明确密码更新只作用于恢复 session 对应账号，不扩大管理员或普通用户的资料库权限。
- Auth / Supabase 客户端 43 个用例、production build 和本地页面冒烟通过。

### P0：下一步只执行

1. **确认 Redirect URLs**：只读核对预览与生产站点的 `/#auth` 是否已加入 Supabase Auth Redirect URLs；如需修改远端配置，先说明具体地址与影响并取得确认。
2. **真实 Auth 冒烟**：用户提供测试邮箱与账号清理约定后，验证注册、自动确认、密码登录、退出、找回密码和恢复链接；不得记录密码、token 或 cookie。
3. **普通用户 / admin 页面冒烟**：验证资料库写入、导入、匹配和批处理入口仍仅管理员可见；不执行真实榜单导入。
4. **预览部署**：以上验收完成后再部署预览环境，并验证 public Archive 与用户私有 Practice / Songs 隔离。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `src/features/auth`
- 角色页面冒烟涉及的最小 Archive / Practice / Songs 文件

不要运行 `npm install`，不要重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 `match_existing`，不开发艺人列表，不读取真实 PDF。远端 Auth 配置、真实邮件、测试账号或部署发生外部状态变化前，必须先确认范围与清理方式。

## 当前任务索引（2026-07-20，P0 真实 Auth 与角色页面验收后）

已完成：

- Supabase Redirect URLs 已只读核对；当前只有 localhost，远端未修改。
- 普通测试账号 `1757182755@qq.com` 的真实注册、登录、退出、找回密码与 PKCE 恢复闭环通过，账号保留并已退出。
- 普通账号 profile 自动初始化为 `user`，不能覆盖管理员；普通账号与 `15779799065@163.com` 管理员身份均已远端只读确认。
- Guest、普通用户、管理员的 Archive 页面入口验收完成；未执行真实导入或任何管理员写操作。
- 已修复管理员退出后旧权限控件暂留的问题；Auth 身份变化会重新挂载当前页面。
- App / Auth / Practice / Archive / Toolbox / Supabase 定向回归 22 个文件、205 个用例通过，production build 通过。

### P0：下一步只执行

1. **确认部署地址**：取得预览与生产站点的准确 origin，拟定对应 `/#auth` Redirect URLs；修改 Supabase 远端配置前再次确认。
2. **预览部署冒烟**：验证注册/登录/恢复回链、Practice 与 Songs 私有隔离、Archive public read、管理员入口和非管理员越权拒绝；不执行真实榜单导入。
3. **Guest 表单决策**：确认未登录时 Songs / Practice 新增表单是否应隐藏。当前数据库权限安全，但 UI 仍展示表单；如处理，先补页面失败测试再做最小可见性调整。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/PERMISSIONS.md`
- `src/features/auth`
- 预览部署或 Guest 表单验收涉及的最小文件

不要运行 `npm install`，不要重复真实 Auth 或真实导入，不恢复 Inbox 主导航，不改变一键导入或 `match_existing`，不开发艺人列表，不读取真实 PDF。远端 Redirect URLs 或部署发生变化前必须先确认准确地址和影响范围。

## 当前任务索引（2026-07-20，UI 重构分支整理后）

已完成：

- `ui/tokens-rebuild` 已 rebase 到本地最新 `main`，包含完整 Auth P0 基线且无冲突。
- 第 1 期设计令牌重建已完成。
- 第 2 期已新增 `Panel`、`SectionHeading`、`StatCard`，并迁移 Songs hero、AlbumDetail 与 ArchiveDetail 的部分重复 UI。
- UI 方案文档只保留在 UI 分支的正式提交中；两边未提交成果均已独立保存。

下一步只执行：

1. 为 `Panel`、`SectionHeading`、`StatCard` 补最小行为/渲染测试，确认 `as`、heading level 与结构约束。
2. 继续第 2 期时每次只迁移一个页面；优先完成当前 AlbumDetail / ArchiveDetail 的 Button 样式核对，再选择下一个 hero/panel 重复最明显的页面。
3. 在 UI 分支合并前单独审查 `@testing-library/dom` 直接声明与 lockfile 漂移，避免把无关 Vite/Vitest 间接版本升级带入 `main`。
4. 继续使用 Node 20 做 UI 定向测试和 production build；不运行 `npm install`。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/UI_REFACTOR_PLAN.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/styles`
- `src/components/ui`
- 当前准备迁移的单个 feature 页面及测试

不要扫描整个仓库，不引入 UI 框架，不恢复 Inbox 主导航，不改变导入或权限语义。

## 当前任务索引（2026-07-20，UI 第 2 期首个页面切片后）

已完成：

- `Panel`、`SectionHeading`、`StatCard` 的最小 DOM / 可访问性合约测试。
- `@testing-library/dom` 直接依赖与 lockfile 无关漂移清理。
- Songs hero 的共享样式归属收口。
- Album Detail hero 的 `Panel` / `SectionHeading` 迁移与结构回归。

下一步只执行：

1. 按 `docs/UI_REFACTOR_PLAN.md` 继续第 2 期，每次迁移一个页面。
2. 下一页优先处理 `ArchiveDetailPage` 的 hero / panel 重复样式；先补结构失败测试，再迁移共享原语，不改变 Archive 权限或导入行为。
3. 为该页面运行定向测试、production build，并在可用数据条件下补桌面与窄屏视觉冒烟。

推荐下一轮只读取：

- `AGENTS.md`
- `docs/UI_REFACTOR_PLAN.md`
- 三份状态 / 交接文档
- `src/components/ui`
- `src/features/archive/ArchiveDetailPage.tsx`
- `src/features/archive/ArchiveDetailPage.css`
- `src/features/archive/ArchiveDetailPage.test.tsx`

不要运行 `npm install`，不要修改 Supabase、Auth、导入、Inbox 导航、一键导入或 `match_existing`，不要开发艺人列表。

## 当前任务索引（2026-07-20，Archive Detail hero 迁移后）

已完成：

- Albums 集合与曲风下拉选项不再被全局裸按钮兼容样式覆盖。
- Archive Detail hero 已迁移到 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- 真实公开 Archive Detail 只读浏览器冒烟通过，没有水平溢出。

下一步只执行：

1. 按 UI 第 2 期继续一次迁移一个页面。
2. 优先迁移 `AlbumListPage` hero 与 summary 到 `Panel` / `StatCard`，保留刚修复的两个筛选下拉和现有集合加载行为。
3. 先补结构失败测试，再做最小 JSX / CSS 替换，运行 Albums 与 UI 原语回归及 production build。

推荐下一轮只读取 `src/components/ui` 与 `src/features/albums/AlbumListPage.{tsx,css,test.tsx}`；不要修改 Supabase、Auth、导入或权限语义，不运行 `npm install`。

## 当前任务索引（2026-07-20，Album List hero / summary 迁移后）

已完成：

- `AlbumListPage` hero / summary 已迁移到 `Panel` / `StatCard`，结构测试完成先红后绿。
- Albums 集合与曲风筛选修复、集合加载、分页及说明展开行为保持不变。
- Albums + UI 原语 4 个测试文件、46 个用例与 production build 通过；桌面和移动端只读视觉冒烟通过。

下一步只执行：

1. 先审查当前 `main` 未提交 UI 切片，避免夹带范围外改动；未经用户要求不要提交或推送。
2. 继续 UI 第 2 期时仍每次只迁移一个页面，并从 `docs/UI_REFACTOR_PLAN.md` 选择下一个重复 hero / panel 最明显的页面。
3. 下一页继续先补结构失败测试，再做最小 JSX / CSS 替换；不要改变业务数据流、权限或导入语义。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、`src/components/ui` 与选定的单个页面及测试；不要运行 `npm install`。

## 当前任务索引（2026-07-20，Backstage hero 迁移后）

已完成：

- Backstage 左侧 hero 已迁移到 `Panel` / `SectionHeading`，右侧 amp panel 和下方内容保持不变。
- Backstage + UI 原语 2 个测试文件、8 个用例及 production build 通过。
- `/#backstage` 桌面和移动端只读视觉冒烟通过，无横向溢出。

下一步只执行：

1. 按 TDD 只把 `BackstagePage` 的 3 个 `signal-card` 迁移到既有 `StatCard`。
2. 保留 `archiveSignals` 数据结构、三列/单列响应式布局、文字内容和顺序，不迁移 tape / draft cards，不修改任何业务数据流。
3. 先补结构失败测试，再做最小 JSX / CSS 替换，运行 Backstage + UI 原语定向测试、production build 和只读视觉冒烟。

推荐下一轮只读取三份状态 / 交接文档、`src/components/ui/StatCard.*` 与 `src/features/backstage/BackstagePage.{tsx,css,test.tsx}`；不要运行 `npm install`。

## 当前任务索引（2026-07-22，Backstage signal cards 迁移后）

已完成：

- 3 个 `signal-card` 已迁移到共享 `StatCard`，结构测试完成先红后绿。
- `archiveSignals` 数据、文字和顺序保持不变；桌面三列、移动端单列布局均已验证。
- Backstage + UI 原语 2 个测试文件、8 个用例、production build 与只读视觉冒烟通过。

下一步只执行：

1. 先审查当前 `main` 未提交 UI 切片，避免夹带范围外改动；未经用户要求不要提交或推送。
2. 按 TDD 只把 Backstage 的两组 `.section-heading` 标题组合迁移到既有 `SectionHeading`，保留 tape / draft cards 的结构、数据和布局。
3. 不新增 `EntityCard`，不修改 amp panel、业务数据流、权限或导入语义；运行 Backstage + UI 原语定向测试、production build 和只读视觉冒烟。

推荐下一轮只读取三份状态 / 交接文档、`src/components/ui/SectionHeading.*` 与 `src/features/backstage/BackstagePage.{tsx,css,test.tsx}`；不要运行 `npm install`。

## 当前任务索引（2026-07-22，Backstage section headings 迁移与提交后）

已完成：

- Backstage hero、3 个 signal cards、recent tapes / import inbox 两组标题均已迁移到既有共享显示原语。
- tape / draft cards、数据、顺序和响应式布局保持不变；未新增 `EntityCard`。
- 当前提交分支为 `codex/ui-phase-2-slices`；本地 `main` 与既有 `ui/tokens-rebuild` worktree 未被强行切换或清理。

下一步只执行：

1. 先核对 `codex/ui-phase-2-slices` 与本地 `main` 的提交关系；未经用户要求不要推送、合并或删除 worktree。
2. 如继续 UI 第 2 期，从计划中选择一个尚未迁移的单页面，只处理一个重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、选定页面及对应共享原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Song Detail hero 迁移后）

已完成：

- `SongDetailPage` hero 已迁移到既有 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- 状态标签、编辑 / 删除动作、数据加载、编辑表单和窄屏布局保持不变；未新增 `EntityCard`。
- Songs + UI 原语 4 个测试文件、31 个用例及 production build 通过；本地无歌曲详情数据，视觉验收未伪造。

下一步只执行：

1. 保持在 `codex/ui-phase-2-slices`，先核对本次未提交 Song Detail 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，再从计划中选择一个尚未迁移的单页面，只处理一个重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、`src/features/songs/SongDetailPage.{tsx,css,test.tsx}`（核对未提交切片）以及下一页对应共享原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Practice History hero 迁移后）

已完成：

- 已核对并保留未提交的 Song Detail hero 切片，没有夹带范围外源码。
- `PracticeHistoryPage` hero 已迁移到既有 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- 练习数据流、登录态、表单、统计、筛选、排序与 CRUD 行为保持不变；未新增 `EntityCard`。
- Songs、Practice History 与 UI 原语共 5 个测试文件、42 个用例、production build 及桌面 / 窄屏只读视觉冒烟通过。

下一步只执行：

1. 保持在 `codex/ui-phase-2-slices`，先核对 Song Detail 与 Practice History 两个未提交切片；未经用户要求不要提交、推送或合并。
2. UI 第 2 期仍一次只迁移一个页面，从计划中选择下一个未迁移的重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、两个未提交页面切片及下一页对应共享原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Toolbox hero 迁移后）

已完成：

- 已核对并保留未提交的 Song Detail 与 Practice History hero 切片，没有夹带范围外源码。
- `ToolboxPage` hero 已迁移到既有 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- PDF 本地分析、导出、错误处理、节奏状态与响应式 workbench 行为保持不变；未新增 `EntityCard`。
- 累计未提交切片定向测试共 4 个文件、31 个用例、production build 及 Toolbox 桌面 / 窄屏只读视觉冒烟通过。

下一步只执行：

1. 保持在 `codex/ui-phase-2-slices`，先核对 Song Detail、Practice History 与 Toolbox 三个未提交切片；未经用户要求不要提交、推送或合并。
2. UI 第 2 期仍一次只迁移一个页面，从计划中选择下一个未迁移的重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、三个未提交页面切片及下一页对应共享原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Library hero 迁移后）

已完成：

- 已核对并保留 Song Detail、Practice History 与 Toolbox 三个未提交 hero 切片。
- `LibraryPage` hero 已迁移到既有 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- 媒体统计、CRUD、加载状态、表单、表格与响应式工作区行为保持不变；未新增 `EntityCard`。
- 累计未提交切片与 UI 原语共 5 个测试文件、39 个用例、production build、差异检查及 Library 桌面 / 窄屏只读视觉冒烟通过。

下一步只执行：

1. 保持在 `codex/ui-phase-2-slices`，先核对四个未提交切片；未经用户要求不要提交、推送或合并。
2. 按 TDD 只把 `LibraryPage` 的 3 个 `.library-signals article` 迁移到既有 `StatCard`，保留统计数据、文字、顺序与响应式布局。
3. 不迁移 Library 表单 / 表格，不新增 `EntityCard`，不改变媒体 CRUD、Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`src/components/ui/StatCard.*` 与 `src/features/library/LibraryPage.{tsx,css,test.tsx}`；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Library 统计卡与 Artist List hero 迁移后）

已完成：

- `LibraryPage` 的 3 个统计卡已迁移到既有 `StatCard`，统计数据、文字、顺序与桌面/窄屏布局保持不变。
- `ArtistListPage` hero / summary 已迁移到 `Panel`、`SectionHeading`、`StatCard`；新增艺人表单、加载和表格行为保持不变。
- 当前未提交页面与 UI 原语共 6 个测试文件、45 个用例、production build、差异检查及 Library 桌面/窄屏视觉冒烟通过。
- 当前分支仍为 `codex/ui-phase-2-slices`，没有提交、推送或合并。

下一步只执行：

1. 先核对当前未提交 UI 切片，避免夹带范围外改动；未经用户要求不要提交、推送或合并。
2. 按 TDD 只迁移 `ArtistDetailPage` hero 到既有 `Panel` / `SectionHeading`，保留编辑/删除按钮、表单、数据加载和路由行为。
3. 不迁移按钮体系，不新增 `EntityCard`，不修改 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`src/components/ui/Panel.*`、`src/components/ui/SectionHeading.*` 与 `src/features/artists/ArtistDetailPage.{tsx,css,test.tsx}`；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Artist Detail hero 迁移后）

已完成：

- `ArtistDetailPage` hero 已迁移到既有 `Panel` / `SectionHeading`，结构测试完成先红后绿。
- 编辑 / 删除、编辑表单、加载、保存和返回艺人列表行为保持不变；未新增 `EntityCard`。
- Artist Detail 目标测试 6 个用例、production build 与目标文件差异检查通过。
- 当前分支仍为 `codex/ui-phase-2-slices`；所有 UI 切片仍未提交、推送或合并。

下一步只执行：

1. 先核对当前未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 按 TDD 只把 `ArtistDetailPage` 的三个 `.artist-detail-panel` 只读信息面板迁移到既有 `Panel variant="card"`，保留标题、正文、顺序与三列 / 单列响应式布局。
3. 不迁移 `.artist-detail-grid`、编辑表单或按钮体系，不新增 `EntityCard`，不改变数据加载、CRUD、Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`src/components/ui/Panel.tsx`、`src/components/ui/Panel.css` 与 `src/features/artists/ArtistDetailPage.{tsx,css,test.tsx}`；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Artist Detail 只读信息面板迁移后）

已完成：

- Timeline、Notes、Related 三个只读信息面板已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 标题、正文、顺序及桌面三列 / 窄屏单列布局保持不变；统计网格、编辑表单和按钮体系未修改。
- Artist Detail 目标测试 6 个用例及 production build 通过；当前分支仍为 `codex/ui-phase-2-slices`，切片尚未提交或推送。

下一步只执行：

1. 先核对当前累积未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中明确选择一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Album Detail 只读信息面板迁移后）

已完成：

- Album Detail 的 Archive notes / Related 两个只读面板已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 标题、正文、顺序及桌面两列 / 窄屏单列布局保持不变；统计网格、编辑表单、按钮和权限判断未修改。
- Album Detail 与共享 UI 共 2 个测试文件、11 个用例及 production build 通过；当前分支仍为 `codex/ui-phase-2-slices`，切片尚未提交或推送。

下一步只执行：

1. 先核对当前累积未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Practice History 统计区域 Panel 迁移后）

已完成：

- Practice Statistics 外层区域已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 五项统计数据、`dl/dt/dd` 语义、顺序及五列 / 单列布局保持不变；统计项卡片和 Practice 业务行为未修改。
- `Panel` 补充 `aria-labelledby` 类型以保留原有标题关联；Practice History 与共享 UI 共 2 个测试文件、18 个用例及 production build 通过。
- 当前分支仍为 `codex/ui-phase-2-slices`，全部 UI 切片尚未提交或推送。

下一步只执行：

1. 先核对当前累积未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Toolbox workbench 双面板迁移后）

已完成：

- Toolbox workbench 输入 / 输出面板已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- `section` / `aside` 语义、各自背景、响应式内边距及两列 / 单列布局保持不变；本地 PDF 分析和导出流程未修改。
- Toolbox 与共享 UI 共 2 个测试文件、13 个用例、production build 及桌面 / 窄屏只读视觉冒烟通过。
- 当前分支仍为 `codex/ui-phase-2-slices`，全部 UI 切片尚未提交或推送。

下一步只执行：

1. 先核对当前累积未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Song Detail Notes / Related 双面板迁移后）

已完成：

- Song Detail 的 Notes / Related 两个只读内容块已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 标题、正文、顺序、Related `aside` 语义及两列 / 单列布局保持不变；元数据、编辑表单和歌曲 CRUD 未修改。
- Song Detail 与共享 UI 共 2 个测试文件、14 个用例及 production build 通过；因缺少可访问详情数据，未伪造视觉验收。
- 当前分支仍为 `codex/ui-phase-2-slices`，全部 UI 切片尚未提交或推送。

下一步只执行：

1. 先核对当前累积未提交 UI 切片，未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Backstage amp Panel 迁移后）

已完成：

- 上一批 UI 切片已提交并推送为 `6dc1720`；当前分支跟踪 `origin/codex/ui-phase-2-slices`。
- Backstage amp article 已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- amp 数据、`dl/dt/dd` 语义、强边框颜色、设备纹理、meter 及桌面 / 窄屏布局保持不变。
- Backstage 与共享 UI 共 2 个测试文件、8 个用例、production build 及桌面 / 窄屏只读视觉冒烟通过。

下一步只执行：

1. 先核对本轮尚未提交的 Backstage amp 小切片；未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个新的单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一单页面切片及对应共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，UI 第 2 期分支本地合并后）

已完成：

- `codex/ui-phase-2-slices` 最新提交 `82abfd0` 已推送远端，并 fast-forward 合并到本地 `main`。
- 合并后的全量测试 45 个文件、391 个用例通过；production build 通过。
- 本地 `main` 尚未推送 `origin/main`，远端功能分支保留。

下一步只执行：

1. 如需同步 GitHub 主分支，先复核本地 `main` 领先 `origin/main` 的全部提交范围，再由用户明确确认是否推送。
2. 如继续 UI 第 2 期开发，从最新 `main` 创建新的 `codex/` 功能分支，不直接在 `main` 累积新切片。
3. 继续保持一次一个单页面小切片、先 RED 后 GREEN，不新增 `EntityCard`，不修改受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关目录；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Song List 列表外壳 Panel 迁移后）

已完成：

- 已从最新本地 `main` 创建 `codex/ui-phase-2-panels`。
- Song List 的 `song-board` 外层已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 列表语义、可访问名称、表头、歌曲卡片与创建 / 加载行为保持不变。
- Song List 与共享 UI 共 2 个测试文件、13 个用例及 production build 通过；空数据页面的桌面 / 窄屏只读冒烟无横向溢出。

下一步只执行：

1. 先核对 `codex/ui-phase-2-panels` 当前未提交切片；未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个单页面小切片，一次只迁移一种重复 hero / panel / heading 样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Practice History 筛选标题 SectionHeading 迁移后）

已完成：

- Practice History 筛选区标题已迁移到既有 `SectionHeading as="h2"`，结构测试完成先红后绿。
- 标题文字、层级、筛选布局与 `aria-labelledby` 关联保持不变；练习数据、筛选行为和 CRUD 未修改。
- Practice History 与共享 UI 共 2 个测试文件、18 个用例通过；累计五个定向测试文件、47 个用例、production build 与目标差异检查通过。Guest 空数据下筛选区不渲染，因此未伪造目标视觉验收。
- 当前分支 `codex/ui-phase-2-panels` 累计 Song List、Toolbox、Album List 与 Practice History 四张未提交切片。

下一步只执行：

1. 先核对当前累计四张未提交 UI 切片；未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个页面的小切片，不继续扩大 Practice History 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Toolbox 输出标题 SectionHeading 迁移后）

已完成：

- Toolbox 输出面板的 eyebrow + `h2` 已迁移到既有 `SectionHeading as="h2"`，结构测试完成先红后绿。
- 标题文字、层级、输出面板布局和业务行为保持不变；输入面板及动态 Rhythm 区域未修改。
- Toolbox 与共享 UI 共 2 个测试文件、13 个用例、production build 及桌面 / 窄屏视觉冒烟通过。
- 当前分支 `codex/ui-phase-2-panels` 累计 Song List 列表外壳与 Toolbox 输出标题两张未提交切片。

下一步只执行：

1. 先核对当前累计两张未提交 UI 切片；未经用户要求不要提交、推送或合并。
2. 如继续 UI 第 2 期，从计划中选择另一个页面的小切片，不继续扩大 Toolbox 范围，一次只迁移一种重复样式。
3. 继续先 RED 后 GREEN，不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-22，Album List hero 标题 SectionHeading 迁移后）

已完成：

- Album List hero 的 eyebrow + `h1` 已迁移到既有 `SectionHeading as="h1"`，结构测试完成先红后绿。
- 标题文字、层级、字号、间距和响应式 hero 布局保持不变；集合加载、筛选、分页与权限行为未修改。
- 累计页面与共享 UI 共 4 个测试文件、36 个用例、production build、目标差异检查及 Album List 桌面 / 窄屏视觉冒烟通过。
- 当前分支 `codex/ui-phase-2-panels` 累计 Song List、Toolbox 与 Album List 三张未提交切片。

下一步只执行：

1. 先核对当前累计三张未提交 UI 切片；未经用户要求不要提交、推送或合并。
2. 当前累计切片已达到三张，建议开启新对话后再从 UI 计划选择新的单页面小切片，不继续扩大 Album List 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变 Supabase、Auth、导入、权限、Inbox 导航、一键导入或 `match_existing`。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Backstage 内容列 Panel 迁移后）

已完成：

- Backstage 的 Recent tapes / Import inbox 两个内容列外壳已迁移到既有 `Panel variant="card"`，结构测试完成先红后绿。
- 标题、mock 数据、文章语义、内部卡片与响应式布局保持不变；未触碰 CRUD、service、Supabase 或权限范围。
- 累计 6 个定向测试文件、48 个用例、production build 与目标差异检查通过。
- `/#backstage` 桌面 / 窄屏只读视觉冒烟通过：目标 Panel 保持两列 / 单列，无横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计 Song List、Toolbox、Album List、Practice History 与 Backstage 五张未提交切片。

下一步只执行：

1. 先核对当前累计五张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数已达到会话交接阈值，下一轮再从 UI 计划选择新的单页面小切片，不继续扩大 Backstage 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Album Detail 元数据 StatCard 迁移后）

已完成：

- Album Detail 的发行年份、专辑类型与艺人三项只读元数据已迁移到既有 `StatCard`，结构测试完成先红后绿。
- 数据、文案、顺序、三列 / 单列布局与页面视觉规格保持不变；未触碰数据加载、编辑 / 删除权限、CRUD、service、Supabase 或 RLS。
- 累计 7 个定向测试文件、52 个用例和 production build 通过。
- Guest 环境下目标数据未渲染，控制台无 warning / error，但未伪造目标视觉验收。
- 当前分支 `codex/ui-phase-2-panels` 累计六张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计六张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个页面的小切片，不继续扩大 Album Detail 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Library 分区标题 SectionHeading 迁移后）

已完成：

- Library 的 `Library sections` 二级标题已迁移到既有 `SectionHeading as="h2"`，结构测试完成先红后绿。
- 标题文字、层级、分类卡顺序与响应式布局保持不变；未触碰表单、CRUD、service、Supabase 或权限范围。
- 累计 8 个定向测试文件、60 个用例和 production build 通过。
- `/#library` 桌面 / 窄屏只读视觉冒烟通过：标题与分类卡对齐正常，无横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计七张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计七张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个页面的小切片，不继续扩大 Library 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Song Detail 元数据 StatCard 迁移后）

已完成：

- Song Detail 的难度、发行年份与 BPM 三项只读元数据已迁移到既有 `StatCard`，结构测试完成先红后绿。
- 数据、文案、顺序、三列 / 单列布局与页面视觉规格保持不变；未触碰加载、编辑 / 删除、CRUD、service、Supabase 或权限范围。
- 累计 9 个定向测试文件、67 个用例和 production build 通过。
- Guest 环境没有可渲染的歌曲详情数据，未伪造目标统计卡的浏览器视觉验收。
- 当前分支 `codex/ui-phase-2-panels` 累计八张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计八张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个页面的小切片，不继续扩大 Song Detail 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Auth 页面标题 SectionHeading 迁移后）

已完成：

- Auth 页面的 eyebrow + `h1` 已迁移到既有 `SectionHeading as="h1"`，结构测试完成准确的先红后绿。
- 标题文案、层级及认证状态、表单、按钮、回调与 Supabase 调用保持不变。
- 累计 10 个定向测试文件、85 个用例和 production build 通过。
- `/#auth` 桌面 / 窄屏只读视觉冒烟通过：共享标题清晰、页面无横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计九张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计九张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个页面的小切片，不继续扩大 Auth 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变受限业务范围。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Artist Detail 编辑标题 SectionHeading 迁移后）

已完成：

- Artist Detail 编辑表单的 eyebrow + `h2` 已迁移到既有 `SectionHeading as="h2"`，结构测试完成准确的先红后绿。
- 标题文案、层级、未保存提示、表单字段与 Artist 加载 / 保存 / 删除行为保持不变。
- 原计划评估的统计卡仍保留 `dl/dt/dd` 原生语义，没有为本切片扩展 `StatCard`。
- 累计 11 个定向测试文件、91 个用例和 production build 通过；本轮未执行浏览器视觉验收。
- 当前分支 `codex/ui-phase-2-panels` 累计十张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个页面的小切片，不继续扩大 Artist Detail 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md` 与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Artist List 新增表单标题 SectionHeading 迁移后）

已完成：

- Artist List 新增表单的 eyebrow + `h2` 已迁移到既有 `SectionHeading as="h2"`，结构测试完成准确的先红后绿。
- 标题文案、层级、字号、窄屏布局、表单字段及 Artist 加载 / 创建行为保持不变。
- 累计 12 个定向测试文件、97 个用例和 production build 通过。
- `ArtistListPage` 当前未挂载到 App，`#artists` 会回退 Backstage，因此未伪造目标视觉验收，也未扩大到路由改动。
- 当前分支 `codex/ui-phase-2-panels` 累计十一张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十一张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Artist List 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 集中收口执行记录（2026-07-31，UI Phase 2 现有原语安全迁移）

已完成：

- 按一次迭代完成全部剩余安全切片的要求，集中完成 7 个实际挂载页面、十三类 `Panel / SectionHeading / StatCard` 迁移。
- 目标范围包括 Song List、Archive、Practice、Song Detail、Album Detail、Artist Detail 与 Library；数据、路由、权限、导入和业务行为保持不变。
- RED 阶段 9 个目标结构断言准确失败；GREEN 后 7 个页面测试文件、56 个用例通过。
- 累计 15 个定向测试文件、123 个用例和 production build 通过。
- `#songs / #archive / #practice / #library` 桌面与窄屏视觉冒烟通过；Detail 页因 Guest 无真实数据，仅由定向测试覆盖。
- 当前分支 `codex/ui-phase-2-panels` 累计三十一张未提交 UI 切片；现有三种共享原语的安全机械迁移已收口。

下一步只执行：

1. 先统一审查当前三十一张未提交 UI 切片及工作区范围；未经用户明确要求，不提交、推送或合并。
2. 与用户确认是否将累计 UI Phase 2 变更提交并推送当前分支；只提交确认范围，避免夹带无关改动。
3. 如不进行 Git 同步，返回 Archive / Import 主线；不要继续把 Auth、管理员 CRUD 或业务实体卡片机械迁移到现有原语。
4. 若未来继续 UI Phase 2 的新原语工作，需单独设计并取得用户确认；继续禁止默认新增 `EntityCard` 或进行架构重构。

推荐下一轮只读取三份状态 / 交接文档、当前分支状态和本轮修改的 7 个页面目录；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，31 张 UI 切片统一审查后）

已完成：

- 31 张记录切片已逐文件统一审查；29 张可保留。
- Album Detail 与 Song Detail 的元数据 `StatCard` 迁移因破坏 `dl / dt / dd` 定义列表语义而撤回，其余标题和 Panel 迁移保持。
- 数据、路由、权限、导入、CRUD、Supabase 与 RLS 行为未改变。
- 修复后累计 15 个定向测试文件、123 个用例通过；未运行 `npm install`。
- 远端默认分支与本地 tracking 事实均指向 `main`。

下一步只执行：

1. 将已审 UI 成果提交并纳入本地 `main`，不推送。
2. 由用户确认旧 `codex/toolbox-explicit-rhythm` 的互斥实现是保留分支还是选择性移植；确认前不整体合并。
3. 只有在相关提交已纳入且 worktree 无占用后，才删除其余本地分支。
4. 整合完成后运行定向 Toolbox / UI 验证、production build 与 `git diff --check`。

## 当前任务索引（2026-07-31，Archive Detail 条目索引标题 SectionHeading 迁移后）

已完成：

- 实际挂载到 `#archive/:id` 的条目索引标题已迁移到既有 `SectionHeading as="h2"`，结构测试完成准确的先红后绿。
- 标题文案、层级、可访问关联、分页、数据加载、角色判断与管理员 Archive item CRUD 行为保持不变。
- 累计 15 个定向测试文件、122 个用例和 production build 通过。
- Guest 环境没有可进入的 Archive collection 详情，目标标题未完成浏览器视觉验收；控制台无 warning / error，未伪造结论。
- 当前分支 `codex/ui-phase-2-panels` 累计十六张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十六张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Archive Detail 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由或假数据。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Inbox Disabled hero Panel 迁移后）

已完成：

- 实际挂载到 `#inbox` 的禁用说明页 hero 已迁移到既有 `Panel variant="hero"`，结构测试完成准确的先红后绿。
- 标题、说明、Archive 链接、导入入口禁用状态与 Inbox 专属背景保持不变；未触碰权限或导入行为。
- 累计 13 个定向测试文件、103 个用例和 production build 通过。
- `/#inbox` 桌面 / 窄屏只读视觉冒烟通过：目标 hero 无截断或横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计十二张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十二张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Inbox 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-30，Practice Statistics 标题 SectionHeading 迁移后）

已完成：

- 实际挂载到 `#practice` 的 Practice Statistics 标题已迁移到既有 `SectionHeading as="h2"`，结构测试完成准确的先红后绿。
- 标题文案、层级、可访问关联、统计定义列表、数据加载与 Practice CRUD 行为保持不变。
- 累计 13 个定向测试文件、103 个用例和 production build 通过。
- 本地预览服务无法在当前桌面环境启动，本轮未完成浏览器视觉冒烟，也未伪造视觉结论。
- 当前分支 `codex/ui-phase-2-panels` 累计十三张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十三张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Practice History 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，Archive hero Panel 迁移后）

已完成：

- 实际挂载到 `#archive` 的 Archive hero 已迁移到既有 `Panel as="header" variant="hero"`，结构测试完成准确的先红后绿。
- 标题、集合计数、header 语义、响应式布局及 Archive 角色判断、管理员入口、CRUD 与导入行为保持不变。
- 累计 14 个定向测试文件、115 个用例和 production build 通过。
- `/#archive` 桌面 / 窄屏 Guest 只读视觉冒烟通过：目标 hero 无截断或横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计十四张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十四张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Archive 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，Song List 新增表单标题 SectionHeading 迁移后）

已完成：

- 实际挂载到 `#songs` 的新增表单标题已迁移到既有 `SectionHeading as="h2"`，结构测试在校正文案查询后完成准确的先红后绿。
- 标题文案、层级、字号、表单字段、提交逻辑与五列 / 单列响应式布局保持不变；未触碰 Archive 或权限敏感业务范围。
- 累计 14 个定向测试文件、116 个用例和 production build 通过。
- `/#songs` 桌面 / 窄屏 Guest 只读视觉冒烟通过：目标标题无截断、页面无横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计十五张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十五张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Song List 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，Album List 集合容器 Panel 迁移后）

已完成：

- 实际挂载到 `#albums` 的集合容器已迁移到既有 `Panel as="section" variant="card"`，结构测试完成准确的先红后绿。
- `<section>` 语义、集合标题、来源、描述展开、数量、专辑列表、分页、筛选与数据加载行为保持不变。
- 累计 15 个定向测试文件、122 个用例和 production build 通过。
- `/#albums` 桌面与窄屏页面均无横向溢出，控制台无 warning / error；Guest 环境没有渲染集合数据，目标 Panel 未完成真实内容视觉验收。
- 当前分支 `codex/ui-phase-2-panels` 累计十七张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十七张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Album List 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由或假数据。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，Inbox Disabled hero 标题 SectionHeading 迁移后）

已完成：

- 实际挂载到 `#inbox` 的禁用说明页 hero 标题已迁移到既有 `SectionHeading as="h1"`，结构测试完成准确的先红后绿。
- 标题文案、层级、Inbox 禁用说明、Archive 链接、hero Panel 与响应式布局保持不变；未触碰导入或权限行为。
- 累计 15 个定向测试文件、122 个用例和 production build 通过。
- `/#inbox` 桌面与窄屏只读视觉冒烟通过：标题和描述无截断、页面无横向溢出，控制台无 warning / error。
- 当前分支 `codex/ui-phase-2-panels` 累计十八张未提交 UI 切片。

下一步只执行：

1. 先核对当前累计十八张未提交 UI 切片；未经用户明确要求，不提交、推送或合并。
2. 当前累计切片和修改文件数继续超过会话交接阈值；下一轮再从 UI 计划选择另一个实际挂载页面的小切片，不继续扩大 Inbox Disabled 范围。
3. 继续先 RED 后 GREEN，一次只迁移一种重复样式；不新增 `EntityCard`，不改变权限敏感业务行为，也不为视觉验收临时新增路由或假数据。

推荐下一轮只读取三份状态 / 交接文档、`docs/UI_REFACTOR_PLAN.md`、当前路由映射的最小相关片段与下一任务相关组件、样式、测试和共享 UI 原语；不要扫描整个仓库，不运行 `npm install`。

## 当前任务索引（2026-07-31，UI Phase 2 现有原语安全迁移最终收口）

已完成：

- 一次迭代完成 7 个实际挂载页面、十三类剩余 `Panel / SectionHeading / StatCard` 安全迁移。
- RED 阶段 9 个目标断言准确失败；GREEN 后 7 个页面测试文件、56 个用例通过。
- 累计 15 个定向测试文件、123 个用例和 production build 通过。
- 可直达页面桌面 / 窄屏视觉冒烟通过；Detail 页因 Guest 无真实数据，仅由定向测试覆盖。
- 当前分支累计三十一张未提交 UI 切片；现有三种共享原语的安全机械迁移已收口。

下一步只执行：

1. 统一审查当前分支与三十一张未提交 UI 切片。
2. 与用户确认是否提交、推送；未经明确要求不执行 Git 同步。
3. 如暂不进行 Git 同步，返回 Archive / Import 主线。
4. 新原语或 Auth / 管理员 CRUD / 业务实体卡片迁移必须单独设计确认。

推荐下一轮只读取三份状态 / 交接文档、当前分支状态和本轮修改的 7 个页面目录；不要扫描整个仓库，不运行 `npm install`。
