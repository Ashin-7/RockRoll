# RockRoll 会话交接

更新时间：2026-07-07

## 本轮完成内容

本轮继续围绕匿名旅行者导入、档案袋和专辑资料库做增量修正。

核心结果：

- Inbox 新增删除导入草稿功能，删除 `import_jobs` 时依赖现有外键级联删除候选索引和 Review plan。
- Archive 集合列表来源列修正为正常展示来源名称，并在存在来源 URL 时显示短链接。
- Archive 集合描述增加行数限制，避免长描述把列表撑得过大。
- Albums 服务对大量 id 的 `.in()` 查询增加分块，降低 `/albums` 因 URL 查询参数过长出现 `Bad Request` 的风险。
- Albums 已开始实现按“榜单分类 / 集合标题”懒加载：先加载集合标题，再按选中的标题加载对应专辑。
- 修正 Albums 集合内分页只做前端展示分页的问题：集合详情现在按页请求 `archive_items`，首屏只加载当前页 25 条专辑及对应 metadata，总数通过 Supabase count 保留。
- Albums 集合详情的大量 album / external metadata 分块查询已改为 3 路受限并发，并且 album rows 与 metadata rows 并行启动。
- 修复重复导入已存在榜单条目时，Review plan 中的新评语没有回填到 `archive_items.note` 的问题；这会导致预览集合有评语，但专辑列表显示“暂无笔记”。
- 修复无 `_id` 榜单条目使用 album id 作为 `archive_item` external id 的问题；同专辑跨不同榜单时，现在会生成不同榜单条目 id，不再把不同榜单里的相同专辑误合并。
- 针对 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f` 进一步修正：来源 item `_id` 也不再作为全局去重键，`archive_item` external id 始终带榜单命名空间。
- 修复同一集合重复导入时的 `archive_items_collection_id_entity_type_entity_id_key`：当旧 archive item 已存在但新 source id 尚未映射时，会按 collection + album 复用旧条目、更新 note，并补新 external source 映射。
- 修复大型 Review plan 提交只读前 1000 条的问题：`commitPublicImportReviewPlan` 现在分页读取全部确认项，避免大榜单只写入少量 archive item。
- 已核查真实数据：`5e9fb16311ee091e615c2a7f` 当前 Supabase 集合只有 80 条 `archive_items`，不是 `/albums` 页面二次去重，而是旧提交部分写入后的结果。
- 用户反馈 Inbox 导入流程仍有 bug：步骤繁琐，生成计划后档案袋未成功 push 或数量不对，下一轮需要优先排查。
- 已确认并实现新的 Inbox 主流程：页面只保留 URL 预览和管理员一键完整导入，草稿、候选索引、Review plan 不再暴露给用户。
- 修复导入后 `Bad Request` 的高风险请求模式：候选保存、Review plan upsert、external source `.in()` 预取和 import job 删除均改为 200 条分块。
- 针对分块后响应变慢的问题，候选保存、Review plan upsert 和 external source 分块预取改为最多 3 路受限并发；保留 200 条分块上限，避免重新放大 PostgREST 请求。
- Review plan 生成阶段不再 `.select()` 回传全部明细，减少大榜单生成计划时的大响应和等待时间。

## 修改文件列表

本轮业务改动涉及：

- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`
- `src/features/inbox/inbox.service.ts`（本轮分块优化）
- `src/features/inbox/InboxPage.tsx`
- `src/features/inbox/InboxPage.test.tsx`
- `src/features/inbox/InboxPage.candidate-index.test.tsx`（删除）
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.css`
- `src/features/archive/ArchivePage.test.tsx`
- `src/features/albums/album.types.ts`
- `src/features/albums/albums.service.ts`
- `src/features/albums/albums.service.test.ts`
- `src/features/albums/AlbumListPage.tsx`
- `src/features/albums/AlbumListPage.test.tsx`
- `src/features/albums/AlbumListPage.css`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_STATUS.md`
- `docs/SESSION_HANDOFF.md`

本次交接文档更新涉及：

- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

注意：工作区还有此前公共资料库、管理员导入、Albums 分组展示、作者显示修正等相关改动；不要误删或回滚。

## 验证命令和结果

本轮早些时候曾在 Node 20 下执行过相关验证：

```powershell
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
npm test -- --run src/features/albums
npm run build
```

已知结果：

- 删除草稿相关 Inbox 测试通过。
- Archive 来源展示与描述限制相关测试通过。
- Albums Bad Request 分块相关测试通过。
- 当时生产构建通过，Vite 仍有既有 chunk size 警告。

本轮补充验证：

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

结果：Inbox service 24 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、29 个用例通过；Archive 3 个测试文件、20 个用例通过；生产构建通过。Vite 仍有既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

验证中发现 Albums 懒加载后集合标题同时出现在下拉选项和页面标题中，导致测试文本查询歧义；已将 `AlbumListPage.test.tsx` 中对应断言改为 heading 查询，未修改产品逻辑。

当前未完成验证：

- 真实 Supabase 环境中，需要重新提交一次已导入榜单或单独执行数据修正，旧 `archive_items.note` 才会出现新增评语。
- 真实 Supabase 环境中，建议导入两个包含相同专辑的不同榜单，确认 `archive_items` 数量按榜单条目保留。
- 建议重新导入 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f`，确认档案条目数量与预览 496 条一致。
- 当前该集合只有 80 条历史部分写入数据，需重新预览、保存草稿、生成 Review plan 并提交，才能补齐剩余 `archive_items`。
- 对已报过唯一约束的集合，建议重新提交一次导入计划，确认不会再触发 `archive_items_collection_id_entity_type_entity_id_key`。
- Albums 按集合标题懒加载、服务端分页和分块并发已通过 `src/features/albums` 自动化测试；仍建议做浏览器桌面 / 窄屏视觉检查。

下一轮推荐先执行：

```powershell
npm test -- --run src/features/inbox/inbox.service.test.ts
npm test -- --run src/features/inbox/anontraveler.service.test.ts
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm test -- --run src/features/archive
npm run build
```

## 当前风险

- Albums 懒加载已通过自动化测试；仍有桌面 / 窄屏浏览器视觉检查风险未覆盖。
- Inbox 导入数量不一致需要拆分排查：preview candidates、saved candidates、Review plan items、commit 后 public rows 的口径可能不同。
- Review plan 数量可能包含 artist、album、archive_collection、archive_item 多种实体，不能直接和候选专辑数量等同。
- 同一专辑跨不同榜单时，专辑实体应复用，但档案条目不能按专辑去重；后续排查数量时必须分开看 `albums` 和 `archive_items`。
- Anontraveler 来源 item `_id` 也可能不足以代表“某榜单中的某一条”；导入去重应使用带榜单命名空间的 archive item source id。
- 同集合重复导入时，需要允许新版 source id 与旧 archive item 建立映射；兜底匹配范围只能是同一个 archive collection + 同一个 album，不能跨榜单合并。
- 大型 Review plan 会超过 Supabase 默认返回上限，提交阶段必须分页读取；否则 artist/album 会占掉前 1000 条，archive item 只会部分写入。
- 重复导入已存在榜单时，代码现在会回填非空评语；但历史数据不会自动迁移，需要用户重新提交导入计划或后续补 SQL 修正。
- 生成计划后档案袋未成功 push 可能来自权限 / RLS、commit 流程失败、external source 冲突、或 UI 未刷新。
- Inbox 一键导入目前仍复用前端顺序三步提交链路，后续需要补结果状态追踪和部分失败恢复。
- 分块优化降低了 PostgREST 大请求导致 `Bad Request` 的风险，但正式提交仍是前端逐条多表写入，大榜单速度仍可能受网络往返和 RLS 检查影响。
- 受限并发已经缓解候选保存、Review plan 生成和 external source 预取的串行等待；如果真实环境仍慢，根因大概率在正式提交阶段的前端多表往返，需要评估 RPC / 后台任务。
- Albums 服务端分页后，曲风筛选当前只覆盖已加载页；如需对整个 496 条集合做曲风筛选，需要服务端筛选或专门的聚合索引。
- 当前正式导入仍是前端顺序多表写入，不是数据库事务；中途失败会有部分写入风险。

## 下一轮推荐任务

优先级 1：真实导入验证。

- 用真实 Supabase 重新导入 `5e9fb16311ee091e615c2a7f`，确认 archive item 数量能从历史 80 补齐到预览 496。
- 确认 200 条分块 + 3 路受限并发后导入不再显示 `Bad Request`，并记录真实环境下预览、生成计划、正式提交三个阶段的耗时。
- 重试已报唯一约束的集合，确认重复导入会复用旧 archive item 并补 external source 映射。
- 用两个包含相同专辑的不同榜单验证：专辑实体可复用，榜单条目必须分别保留。

优先级 2：验证 Inbox 一键导入流程。

- 复现用户提到的“生成计划后档案袋没有成功 push”。
- 使用两个包含同一专辑的不同榜单，验证专辑复用但档案条目分别保留。
- 使用 `5e9fb16311ee091e615c2a7f` 验证真实大榜单导入数量。
- 重新生成该链接的 Review plan 后提交，确认 58 页确认项全部被 commit 读取。
- 重试已报唯一约束的提交路径，确认同集合同专辑会复用旧 archive item 并补映射。
- 对比一键导入内部各阶段数量口径。
- 查清是否是数据没有写入、写入后列表未刷新、权限失败，还是 Review plan 数量本来包含多实体。
- 在确认根因后，补正式结果状态追踪，避免部分失败后用户看不清导入阶段。

优先级 3：继续 `match_existing`。

- 在导入流程稳定后，再做最小手动匹配 UI / service。

## 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- src/features/albums
- src/features/inbox
- src/features/archive
- 如涉及权限或 schema，再读取最小必要的 supabase/migrations

先处理 docs/NEXT_TASKS.md 中的最高优先级：验证当前 Albums / Inbox / Archive 改动。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
不要引入新的 UI 框架。
不要自建完整后端。
不要做批量抓取、转码、队列或后台 worker。
不要使用 service role key。
不要绕过 RLS。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。
