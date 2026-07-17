# RockRoll 会话交接

更新时间：2026-07-07

## 本轮完成内容

追加：已新增 `docs/PERMISSIONS_AUDIT.md`，完成权限落地盘点。当前缺口已按 UI、service、RLS 拆分：Archive / Albums 的写入口需要 admin 可见性与 service guard，public library 表的写策略还需要后续 migration 收紧为 admin-only，import_* 写入链路基本已具备 admin 约束但仍建议补测试。

追加：权限落地 P0 已完成代码侧收口。ArchivePage、ArchiveDetailPage、AlbumDetailPage 非 admin 不再显示资料库写入口；Archive / Albums service 写函数已补 admin guard；Inbox import_* 读取函数已补 admin guard；新增 `20260708064649_restrict_public_library_writes_to_admin.sql` 收紧 public library 表写入 policy 为 admin-only。

追加：已临时启动 Vite 并确认 `http://127.0.0.1:5174/#archive` HTTP 返回 200；当前会话没有 Browser 插件且项目未安装 `playwright` 包，因此未完成目录扫描真实点击 / 截图验证，未安装浏览器驱动。

追加：Playwright 已安装并完成 Archive 目录扫描真实浏览器验证。桌面与窄屏截图位于 `output/playwright/archive-directory-desktop.png` 和 `output/playwright/archive-directory-mobile.png`；验证结果确认扫描第一页、加载更多、选择榜单只填 URL，不自动预览、不自动导入、不请求榜单详情页。

追加：已新增 `docs/PERMISSIONS.md`，完成 MVP 阶段最小权限矩阵收口。该文档明确 `anon`、`authenticated user`、`admin` 三类角色；Practice 和 Songs / 曲目为普通登录用户私有 CRUD；Archive public 查询开放；其余资料库、导入、确认、提交、匹配、回填、批量处理默认管理员。

本轮继续围绕匿名旅行者导入、档案袋和专辑资料库做增量修正。

核心结果：

- Inbox 新增删除导入草稿功能，删除 `import_jobs` 时依赖现有外键级联删除候选索引和 Review plan。
- Archive 集合列表来源列修正为正常展示来源名称，并在存在来源 URL 时显示短链接。
- Archive 集合描述增加行数限制，避免长描述把列表撑得过大。
- Albums 服务对大量 id 的 `.in()` 查询增加分块，降低 `/albums` 因 URL 查询参数过长出现 `Bad Request` 的风险。
- Albums 已开始实现按“榜单分类 / 集合标题”懒加载：先加载集合标题，再按选中的标题加载对应专辑。
- 修正 Albums 集合内分页只做前端展示分页的问题：集合详情现在按页请求 `archive_items`，首屏只加载当前页 25 条专辑及对应 metadata，总数通过 Supabase count 保留。
- Albums 集合详情的大量 album / external metadata 分块查询已改为 3 路受限并发，并且 album rows 与 metadata rows 并行启动。
- Albums 曲风筛选已覆盖完整集合：曲风选项来自集合级 `availableStyles`，选择曲风后用完整集合 metadata 计算命中项，再只加载当前页详情。
- 修复重复导入已存在榜单条目时，Review plan 中的新评语没有回填到 `archive_items.note` 的问题；这会导致预览集合有评语，但专辑列表显示“暂无笔记”。
- 修复无 `_id` 榜单条目使用 album id 作为 `archive_item` external id 的问题；同专辑跨不同榜单时，现在会生成不同榜单条目 id，不再把不同榜单里的相同专辑误合并。
- 针对 `https://www.anontraveler.com/rank/version/5e9fb16311ee091e615c2a7f` 进一步修正：来源 item `_id` 也不再作为全局去重键，`archive_item` external id 始终带榜单命名空间。
- 修复同一集合重复导入时的 `archive_items_collection_id_entity_type_entity_id_key`：当旧 archive item 已存在但新 source id 尚未映射时，会按 collection + album 复用旧条目、更新 note，并补新 external source 映射。
- 修复大型 Review plan 提交只读前 1000 条的问题：`commitPublicImportReviewPlan` 现在分页读取全部确认项，避免大榜单只写入少量 archive item。
- 已再次核查真实数据：`5e9fb16311ee091e615c2a7f` 当前 Supabase 集合已有 496 条 album `archive_items`，与 Anontraveler preview 496 条一致；80 条只是历史部分写入状态，不应再作为当前待补齐依据。
- 用户反馈 Inbox 导入流程仍有 bug：步骤繁琐，生成计划后档案袋未成功 push 或数量不对，下一轮需要优先排查。
- 已确认并实现新的 Inbox 主流程：页面只保留 URL 预览和管理员一键完整导入，草稿、候选索引、Review plan 不再暴露给用户。
- 修复导入后 `Bad Request` 的高风险请求模式：候选保存、Review plan upsert、external source `.in()` 预取和 import job 删除均改为 200 条分块。
- 针对分块后响应变慢的问题，候选保存、Review plan upsert 和 external source 分块预取改为最多 3 路受限并发；保留 200 条分块上限，避免重新放大 PostgREST 请求。
- Review plan 生成阶段不再 `.select()` 回传全部明细，减少大榜单生成计划时的大响应和等待时间。
- 已实现 Archive 新增集合 URL 预览导入：输入 Anontraveler 榜单 URL 后先确认数量和 3 条样例，允许自定义集合标题 / 说明，再复用 Inbox 保存候选、生成 Review plan、正式提交的链路写入公共资料。
- Archive URL 导入预览样例现在展示封面、年代、专辑类型、曲风、作者、标题和评语。
- Archive 手动新增 / 编辑集合仍保留为备用入口；URL 导入写入仍限制为管理员角色。
- Archive 档案集合索引已从横向表格调整为默认折叠的可展开卡片；展开后显示说明、来源链接、打开集合、编辑和删除操作，减少集合列表在首屏的占用。
- 已给 Inbox 与 Archive 的导入成功结果增加同一口径摘要：preview 档案条目数、保存候选数、Review plan 确认项数和提交结果数。下一轮真实环境验证时优先记录这四个数字。
- Albums 集合分类控件已从原生下拉框改为可搜索按钮列表，并支持本地手动上移 / 下移排序；曲风筛选控件已改为可搜索的现有曲风按钮列表，保留全部曲风入口。
- 主导航已隐藏 Inbox / 收件箱入口，`#inbox` 深链保留但显示停用提示。
- 当前用户主导入入口统一为 `Archive / 档案 -> 新增集合 -> URL 预览导入`。
- Inbox 底层 service、`InboxPage` 和 Review plan / commit 逻辑全部保留，继续供 Archive 导入流程复用。
- 文档已记录 Anontraveler 全榜单导入三阶段：榜单目录扫描、单榜单导入稳定化、批量队列导入。
- 本轮没有抓取 `https://www.anontraveler.com/rank`，没有批量导入所有榜单，没有新增依赖、migration、RLS 或复杂后台队列。
- 追加实现 Anontraveler 榜单目录扫描最小能力：目录项类型、状态枚举、mock HTML 目录解析、`versionId` 去重合并和只请求 `/rank` 一次的扫描函数。
- 目录扫描当前只发现榜单索引，不导入榜单条目，不调用 candidates / Review plan / commit，不落库。
- Archive 新增集合 URL 导入区域已串联 Anontraveler 榜单目录选择入口；用户选择榜单后只填入现有 URL 输入框，不自动预览、不自动导入、不保存目录状态。
- 已完成真实目录页单次请求验证：`https://www.anontraveler.com/rank` 请求成功且只请求目录页 1 次，当前 parser 解析数量为 0。
- 已确认目录 API 为 `https://www.anontraveler.com/api/rank/ranks/all/0`；Archive 目录扫描现在只请求该 API 一次，映射当前页 `data.ranks` 为可选择榜单 URL。
- Archive 目录扫描已支持分页加载：初始 `/all/0`，点击“加载更多榜单”后逐页请求 `/all/1`、`/all/2`，按 `versionId` 去重，加载完隐藏按钮。
- Archive 目录选择行为已收束：用户选择榜单后只把 URL 填入输入框，不自动预览、不自动保存 candidates、不生成 Review plan、不提交导入；用户仍需明确点击“预览集合”。
- 选择新目录项时会清空旧预览、导入错误和导入摘要，避免旧状态误导当前选择。

## 修改文件列表

本次权限审计新增 / 更新：
- `docs/PERMISSIONS_AUDIT.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

本次权限落地新增 / 更新：
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.test.tsx`
- `src/features/archive/ArchiveDetailPage.tsx`
- `src/features/archive/ArchiveDetailPage.test.tsx`
- `src/features/archive/archive.service.ts`
- `src/features/archive/archive.service.test.ts`
- `src/features/albums/AlbumDetailPage.tsx`
- `src/features/albums/AlbumDetailPage.test.tsx`
- `src/features/albums/albums.service.ts`
- `src/features/albums/albums.service.test.ts`
- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`
- `supabase/migrations/20260708064649_restrict_public_library_writes_to_admin.sql`

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
- `src/i18n/messages.ts`
- `src/features/albums/album.types.ts`
- `src/features/albums/albums.service.ts`
- `src/features/albums/albums.service.test.ts`
- `src/features/albums/AlbumListPage.tsx`
- `src/features/albums/AlbumListPage.test.tsx`
- `src/features/albums/AlbumListPage.css`
- `src/app/shell/AppShell.tsx`
- `src/app/shell/AppShell.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/features/inbox/InboxDisabledPage.tsx`
- `src/features/inbox/anontraveler.types.ts`
- `src/features/inbox/anontraveler.service.ts`
- `src/features/inbox/anontraveler.service.test.ts`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_STATUS.md`
- `docs/SESSION_HANDOFF.md`

本次交接文档更新涉及：

- `docs/PERMISSIONS.md`
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

Archive URL 导入补充验证：

```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/inbox
npm test -- --run src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Inbox 5 个测试文件、39 个用例通过；Albums 3 个测试文件、31 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。

共享导入结果摘要补充验证：

```powershell
npm test -- --run src/features/inbox/InboxPage.test.tsx
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/inbox
npm test -- --run src/features/archive
```

结果：InboxPage 5 个用例通过；ArchivePage 6 个用例通过；Inbox 5 个测试文件、39 个用例通过；Archive 3 个测试文件、21 个用例通过。

Archive 集合索引卡片化补充验证：
```powershell
npm test -- --run src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive
npm test -- --run src/features/archive src/features/inbox src/features/albums
npm run build
git diff --check -- src/features/archive src/features/inbox src/features/albums src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：ArchivePage 6 个用例通过；Archive 3 个测试文件、21 个用例通过；Archive / Inbox / Albums 合计 11 个测试文件、91 个用例通过；生产构建通过。`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。浏览器截图检查因本机 Playwright 浏览器二进制缺失未完成，未执行 `npx playwright install`。

Albums 集合与曲风筛选控件补充验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums/AlbumListPage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
git diff --check -- src/features/albums/AlbumListPage.tsx src/features/albums/AlbumListPage.css src/features/albums/AlbumListPage.test.tsx docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md
```

结果：AlbumListPage 14 个用例通过；Albums 3 个测试文件、33 个用例通过；生产构建通过。Vite 仍提示既有 chunk size 警告；`git diff --check` 通过，仅提示 Windows 下 LF/CRLF 换行转换。当前受限沙箱下直接运行 `npm test` 会因 Node 访问 `C:\Users\Ashin` 被拒绝，本轮改用工作区 `.tmp` 作为 HOME / TEMP 并直接调用本地 `node_modules` 命令。

Inbox 入口弱化补充验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/app
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/App.test.tsx
```

结果：`src/app` 3 个测试文件、13 个用例通过；`src/App.test.tsx` 4 个用例通过。完整 Archive / Inbox / Albums / build 验证见本轮最终验证。

Anontraveler 目录扫描补充验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox/anontraveler.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/albums
```

结果：Anontraveler service 11 个用例通过；Inbox 5 个测试文件、43 个用例通过；Archive 3 个测试文件、21 个用例通过；Albums 3 个测试文件、33 个用例通过。

Archive 目录选择 UI 补充验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
```

结果：ArchivePage 7 个用例通过。完整 Archive / Inbox / Albums / build 验证见本轮最终验证。

本轮最终验证：
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

结果：真实目录页请求成功；请求次数 1；请求 URL 为 `https://www.anontraveler.com/rank`，Accept 为 `text/html`；未访问任何榜单详情页；当前 parser 解析数量 0，前 5 条样例为空。

目录 API 数据源验证与接入：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\.tmp\analyze-anontraveler-ranks-api.mjs
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox/anontraveler.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { node .\node_modules\vite\bin\vite.js build }
```

结果：`/api/rank/ranks/all/0` 请求成功，返回 `data.pages.total = 82`、`data.ranks` 当前页 10 条；Anontraveler service 12 个用例通过；Inbox 5 个测试文件、44 个用例通过；Archive 3 个测试文件、22 个用例通过；TypeScript build 与 Vite production build 通过。

目录分页加载验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/inbox/anontraveler.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; node .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
```

结果：Anontraveler service 14 个用例通过；ArchivePage 8 个用例通过。完整 inbox / archive / albums / build 验证见本轮最终验证。

Archive 目录选择行为收束验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive/ArchivePage.test.tsx
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：ArchivePage 8 个用例通过；Archive 3 个测试文件、23 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。已启动本地 Vite 服务并确认 `http://127.0.0.1:5173` 返回 200；Playwright 截图因本机缺少浏览器二进制未完成，未执行 `npx playwright install`。

本轮最终验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/inbox
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/archive
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/albums
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=(Resolve-Path .\.tmp).Path; $env:TEMP=(Resolve-Path .\.tmp).Path; $env:TMP=(Resolve-Path .\.tmp).Path; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\typescript\bin\tsc -b; if ($LASTEXITCODE -eq 0) { C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vite\bin\vite.js build }
```

结果：Inbox 5 个测试文件、46 个用例通过；Archive 3 个测试文件、23 个用例通过；Albums 3 个测试文件、33 个用例通过；TypeScript build 与 Vite production build 通过。Vite 仍提示既有 chunk size 警告。

当前未完成验证：

- 真实 Supabase 环境中，建议导入两个包含相同专辑的不同榜单，确认 `archive_items` 数量按榜单条目保留。
- `5e9fb16311ee091e615c2a7f` 已只读验证为 496 条正式 `archive_items`，与预览一致；后续无需再围绕该链接做 80 -> 496 补齐验证。
- 真实 Supabase 环境中，建议选择另一个未导入或可安全重复导入的榜单，从 `/archive` 新增集合入口验证自定义标题 / 说明、重复导入 note 回填、`Bad Request` 是否消失，以及数量摘要是否清晰。
- 对已报过唯一约束的集合，建议重新提交一次导入计划，确认不会再触发 `archive_items_collection_id_entity_type_entity_id_key`。
- Albums 按集合标题懒加载、服务端分页、分块并发、全集合曲风筛选、集合搜索 / 本地排序、曲风搜索已通过 `src/features/albums` 自动化测试；仍建议做浏览器桌面 / 窄屏视觉检查。

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

- 新增全局权限边界：除 Practice 和 Songs / 曲目外，所有 CRUD、导入、确认、提交、匹配、回填、批量处理入口默认仅管理员可见可操作；Archive 正式资料查询可以 public 开放，但写入必须由管理员权限和 RLS 保证。
- 后续任何资料库 / 导入相关功能开发前，必须先写清楚 anon、authenticated user、admin 的权限矩阵，不能只靠前端隐藏按钮。
- Albums 懒加载与新筛选控件已通过自动化测试；仍有桌面 / 窄屏浏览器视觉检查风险未覆盖，尤其是集合按钮列表和曲风按钮列表在真实数据量下的滚动表现。
- Inbox 导入数量不一致需要拆分排查：preview candidates、saved candidates、Review plan items、commit 后 public rows 的口径可能不同。
- Review plan 数量可能包含 artist、album、archive_collection、archive_item 多种实体，不能直接和候选专辑数量等同。
- 同一专辑跨不同榜单时，专辑实体应复用，但档案条目不能按专辑去重；后续排查数量时必须分开看 `albums` 和 `archive_items`。
- Anontraveler 来源 item `_id` 也可能不足以代表“某榜单中的某一条”；导入去重应使用带榜单命名空间的 archive item source id。
- 同集合重复导入时，需要允许新版 source id 与旧 archive item 建立映射；兜底匹配范围只能是同一个 archive collection + 同一个 album，不能跨榜单合并。
- 大型 Review plan 会超过 Supabase 默认返回上限，提交阶段必须分页读取；否则 artist/album 会占掉前 1000 条，archive item 只会部分写入。
- 重复导入已存在榜单时，代码现在会回填非空评语；但历史数据不会自动迁移，需要用户重新提交导入计划或后续补 SQL 修正。
- 生成计划后档案袋未成功 push 可能来自权限 / RLS、commit 流程失败、external source 冲突、或 UI 未刷新。
- Inbox 一键导入目前仍复用前端顺序三步提交链路；页面摘要能帮助定位数量差异阶段，但还不能恢复部分失败。
- Inbox 页面已从主导航隐藏，后续不要优先增强 Inbox 页面 UI；如果需要恢复旧入口，应先确认产品主路径是否仍以 Archive 新增集合为准。
- 目录扫描解析依赖 Anontraveler 目录页 HTML 结构，后续真实接入前需要确认实际页面是否能稳定提供榜单链接、标题和数量；当前测试未访问真实 URL。
- 真实目录页已确认可访问，但当前 parser 未命中目录项；最小修复前需要先保存 / 观察一次目录 HTML 或 hydration 数据结构。
- 目录扫描现在支持按用户点击逐页加载目录 API；仍不自动访问任何榜单详情页，不预览、不导入、不落库。
- 目录扫描当前没有持久化，刷新后状态不会保留；下一步应先决定前端暂存还是新增正式表，再讨论 migration / RLS。
- Archive 目录选择 UI 只负责填入 URL；用户仍需手动点击预览和导入，避免误触发批量导入。
- Archive 目录选择的自动化行为已验证；真实桌面 / 窄屏截图仍缺失，原因是本机 Playwright 浏览器二进制缺失。
- Archive URL 导入复用同一条前端顺序三步链路，因此数据库级任务状态、部分失败恢复和耗时优化应作为共享能力处理，避免两个入口各自修一遍。
- 分块优化降低了 PostgREST 大请求导致 `Bad Request` 的风险，但正式提交仍是前端逐条多表写入，大榜单速度仍可能受网络往返和 RLS 检查影响。
- 受限并发已经缓解候选保存、Review plan 生成和 external source 预取的串行等待；如果真实环境仍慢，根因大概率在正式提交阶段的前端多表往返，需要评估 RPC / 后台任务。
- Albums 全集合曲风筛选当前复用 `external_sources.raw_payload.metadata.styles`，筛选时会轻量读取全集合 item ids 与 external metadata；后续如果集合规模继续增长，建议升级为正式曲风索引表或预聚合字段。
- AI 候选笔记补全已作为后续评估项记录：只能生成待确认草稿，不能自动覆盖既有笔记或 public row，且实现前必须确认 provider、隐私、权限、额度和审计策略。
- 当前正式导入仍是前端顺序多表写入，不是数据库事务；中途失败会有部分写入风险。

## 下一轮推荐任务

最新状态：P0 / P1 的本地代码、自动化测试项和真实 Supabase 权限验证已完成。下一轮不要重复做 UI/service/RLS 收口；优先做真实大榜单导入验证，或在真实导入仍失败时进入 P2 的数据库级导入任务状态追踪。

真实 Supabase 权限验证已完成：`20260708064649` 已应用到 remote，RLS 探针确认普通 user 写入 artist / archive_collection 被拒绝，admin 写入 artist / album / archive_collection / archive_item / external_source 可用，探针 rollback 后无测试数据残留。


优先级 0：真实大榜单导入验证。

- `5e9fb16311ee091e615c2a7f` 已完成只读验证：preview 496，saved 931，planned 1428，真实库 committed 侧 collection 1 / archive_items 496。
- 下一步选择另一个未导入或可安全重复导入的榜单，记录 Archive 导入摘要：preview、saved、planned、planned breakdown、committed，并验证 repeated import 的 matched / note 回填。

优先级 1：数据库级导入任务状态追踪和失败恢复。

- 在真实导入验证仍出现部分失败、重复点击或阶段不清时，再设计最小数据库级状态字段 / 表。
- 先记录失败阶段、错误信息、可重试范围和幂等键，不要直接上后台 worker。

优先级 2：验证 Inbox 一键导入流程。

注意：Inbox 页面入口已停用，验证应优先通过 Archive 新增集合 URL 导入入口完成；Inbox service 测试仍保留，用于确保底层能力不回归。

- 复现用户提到的“生成计划后档案袋没有成功 push”。
- 使用 `/archive` 新增集合 URL 导入入口复测同一链接，确认自定义标题 / 说明和数量结果。
- 记录两个入口导入成功后的摘要：preview、saved、planned、committed 四个数字。
- 使用两个包含同一专辑的不同榜单，验证专辑复用但档案条目分别保留。
- 不再使用 `5e9fb16311ee091e615c2a7f` 作为补齐验证对象；该链接当前真实库已为 496 条。
- 使用另一个大榜单重新生成 Review plan 后提交，确认超过 1000 条确认项时 commit 仍会分页读取全部项目。
- 重试已报唯一约束的提交路径，确认同集合同专辑会复用旧 archive item 并补映射。
- 对比一键导入内部各阶段数量口径。
- 查清是否是数据没有写入、写入后列表未刷新、权限失败，还是 Review plan 数量本来包含多实体。
- 在确认根因后，补正式结果状态追踪，避免部分失败后用户看不清导入阶段。

优先级 3：继续 `match_existing`。

- 在导入流程稳定后，再做最小手动匹配 UI / service。

优先级 4：AI 候选笔记补全评估。

- 仅作为后续评估，不在当前 MVP 主线实现。
- 触发场景是 `/albums` 显示“暂无笔记”且没有来源评语 / 条目备注 / 用户笔记。
- 推荐设计是生成候选草稿，用户编辑确认后再写入。
- 实现前必须先处理真实导入 note 回填和导入状态追踪，避免用 AI 掩盖数据导入缺失。

## 下一轮推荐提示词

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PERMISSIONS.md
- docs/PERMISSIONS_AUDIT.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- src/features/albums
- src/features/inbox
- src/features/archive
- src/app/shell/AppShell.tsx
- src/App.tsx
- 如涉及权限或 schema，再读取最小必要的 supabase/migrations

P0 / P1 的本地代码与自动化测试项已完成。不要重新做权限 UI/service/RLS 收口。
优先处理 docs/NEXT_TASKS.md 中的真实大榜单导入数量验证；权限验证不要重复做。
如果没有真实 Supabase 管理员账号或无法 apply migration，则进入 P2：数据库级导入任务状态追踪和失败恢复的最小设计。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
不要引入新的 UI 框架。
不要自建完整后端。
不要做批量抓取、转码、队列或后台 worker。
不要优先增强 Inbox 页面 UI。
不要把所有 Anontraveler 榜单一次性导入。
不要使用 service role key。
不要绕过 RLS。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：新榜单导入正常与 `match_existing` service 基础

- 用户已确认新的真实榜单导入正常；当前不需要因历史部分失败提前建设数据库级失败恢复、后台队列或 worker。
- 已新增 `matchImportReviewItem`，仅允许管理员手动匹配 artist / album Review item 到同类型已有 public 实体。
- service 会验证 Review item 实体类型和目标 public 实体存在性；不支持 archive collection / archive item 手动匹配，避免跨榜单误合并。
- 匹配成功后写入 `planned_action = 'match_existing'` 和 `target_entity_id`，后续沿用现有 commit 逻辑复用正式实体并补 external source 映射。
- Inbox service 定向测试通过：1 个测试文件、31 个用例。
- 下一步是确定最小手动匹配 UI 的位置。优先保持 Archive 一键导入不变，不恢复 Inbox 主入口；如无法在不破坏主流程的情况下接入，应先做短设计再实施。

## 追加交接：`match_existing` 最小 UI 已接入

- `/archive` 现在有仅管理员可见的手动匹配区；加载既有 Review item 后，只显示 artist / album。
- 管理员输入已有 public 实体 ID 即可执行 `match_existing`，archive collection / archive item 不会展示或匹配。
- URL 预览和 Archive 一键导入链路没有变化，Inbox 主入口继续停用。
- 本轮修改：`src/features/archive/ArchivePage.tsx`、`src/features/archive/ArchivePage.css`、`src/features/archive/ArchivePage.test.tsx`、三个状态文档。
- 定向验证：`ArchivePage.test.tsx` 10 个用例通过。
- 后续如要改善体验，可单独设计目标 artist / album 名称搜索；当前不要把该能力扩展为 Inbox 页面或改变一键导入时机。

## 追加交接：PDF 六线谱工具箱阶段 1

- 用户已确认：先支持类似 `endless rain.pdf` 的清晰电子六线谱；全程浏览器本地处理；输出 `.musicxml`，再由 Guitar Pro 8 另存为 `.gp`。
- 已提交设计与实施计划，提交为 `06caa1f docs: plan local PDF tab toolbox`。
- 已完成计划 Task 1：`#toolbox` 路由、导航、App 接入、中英文页面和响应式谱架工作台样式。
- 已完成计划 Task 2：`validatePdfFile`、`analyzeTabScore` 和类型；拒绝非 PDF、超过 20 MB、扫描件及无可靠小节序列的文件。
- 定向验证：路由/壳/App/ToolboxPage 共 4 个测试文件、15 个用例通过；分析器 1 个测试文件、5 个用例通过。
- 尚未修改 `package.json` / lockfile，尚未安装 PDF.js，尚未生成 MusicXML。
- 下一轮只读取：`AGENTS.md`、三个状态文档、上述设计/计划、`src/features/toolbox`、`src/app/routes.tsx`、`src/app/shell/AppShell.tsx`、`src/App.tsx`、`src/i18n/messages.ts`、`package.json`。
- 下一步从计划 Task 3 开始：安装锁定的 `pdfjs-dist@4.10.38`，先写失败测试，再实现动态 PDF 快照适配器。

## 追加交接：Toolbox 显式节奏符号识别与安全回退

- 已完成基于标准谱表矢量图形的显式节奏符号识别；节奏来自音符头、符干、符尾/符杠、休止符和附点，不使用 TAB 事件横向间距推断时值。
- 音符与休止符均支持五种基础时值：全音符、二分音符、四分音符、八分音符、十六分音符；每个事件最多支持一个附点。
- 小节只有在符号可唯一配对、TAB 事件可完整映射且总时值与拍号一致时标为 recognized；任何缺失、冲突、歧义或不闭合都会让整小节 fallback。
- fallback 不输出部分识别结果，而是按当前拍号写入等长全小节休止占位，并在 MusicXML 警告摘要中列出对应小节。
- Node.js `v20.20.2` 验证命令与结果：`npm test -- --run src/features/toolbox`，10 个测试文件、119 个用例全部通过；`npm run build`，TypeScript 与 Vite production build 通过，保留既有 `index` chunk 超过 500 kB 的提示；brief 指定的 scoped `git diff --check` 通过。
- 本轮未读取、复制、上传或提交任何真实 PDF；没有访问本地 `endless rain.pdf`。未修改 Supabase，未生成 `.gp` 文件。
- 仍不支持 tuplets、ties、techniques、scans、playback、manual editing 和 `.gp` 直接生成；这些能力不得被当前 MusicXML 输出状态暗示为已支持。
- 已知非阻塞问题：英文单数节奏摘要显示 `1 measures checked`，属于 grammar minor，不影响功能。
- 后续如需真实样例验证，必须先由用户明确授权，仅在本地只读处理，不复制到仓库、不上传。

建议同步到原工作区时，优先保留本段标题“Toolbox 显式节奏符号识别与安全回退”及以上能力边界、验证数字和隐私声明；原工作区三个状态文档如更新更晚，只追加本段，不覆盖较新内容。

## 追加交接：Toolbox 真实样例几何兼容

- 修复英文单数摘要：`1 measure checked`。
- `tab-staff-geometry.ts` 现在过滤低覆盖横线和相对过短的谱内记号，真实样例的 TAB 系统从 3 个中置信度误候选改善为 8 个高置信度系统。
- `staff-tab-alignment.ts` 同样过滤短横线，并把支持的最大垂直间距从 6 调整为 7 个谱线间距；真实样例得到 3 个可靠五线谱/TAB 配对。
- 本地只读样例最终结果：18 个小节均进入校验，但符号拓扑无法唯一配对，所以 0 ready / 18 fallback；安全回退符合“不推断节奏”的边界。
- 验证：Toolbox 10 个测试文件、134 个用例通过；TypeScript 与 Vite production build 通过。
- 未复制或上传 PDF，未修改 Supabase，未生成 `.gp`，未提交 Git。
