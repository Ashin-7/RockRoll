# RockRoll 会话交接

更新时间：2026-07-20

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

## 追加交接：Toolbox 明确节奏拓扑 Task 10-11

本轮完成：
- 页面新增节奏检查摘要，显示已检查、`recognized`、`fallback` 数量，以及逐小节状态和简短回退原因。
- fallback 小节明确提示会导出为整小节休止占位；已有下载按钮条件保持不变。
- 中英文状态文案已补齐；未增加编辑、播放、动画或新 UI 框架，未重新修改 Task 9 的 MusicXML 语义。
- 生产构建发现 `notation-primitives.ts` 对曲线命令的既有 TypeScript 收窄失败；以明确 `curve` 类型守卫修复，现有曲线行为测试保持通过。
- 明确节奏拓扑实施计划 Task 1-11 已全部完成。时值只来自明确拓扑或可靠音乐字形，任何小节不能完整安全确认时整体回退。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

本轮修改文件：
- `src/features/toolbox/ToolboxPage.tsx`
- `src/features/toolbox/ToolboxPage.css`
- `src/features/toolbox/ToolboxPage.test.tsx`
- `src/features/toolbox/notation-primitives.ts`
- `src/i18n/messages.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
$node20Directory = 'C:\Users\Ashin\AppData\Local\nvm\v20.20.2'; $env:PATH="$node20Directory;$env:PATH"; npm run build
git diff --check -- src/features/toolbox src/i18n/messages.ts docs/PROJECT_STATUS.md docs/NEXT_TASKS.md docs/SESSION_HANDOFF.md docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
```

结果：Toolbox 11 个测试文件、95 个用例通过；Node 20 下 TypeScript / Vite 构建通过。首次构建命令因 PATH 中默认 Node 8.17.0 在启动 TypeScript 前失败，确认根因后只在构建进程内将 Node 20.20.2 置于 PATH 首位。最终构建保留既有主应用 chunk 超过 500 kB 警告；范围 diff 无空白错误，仅有 LF 转 CRLF 提示。

当前风险与边界：
- 自动化结果全部来自人工证据夹具；尚未用真实 PDF 和 Guitar Pro 8 验证端到端兼容性。
- 连音组、延音线、跨小节连梁、装饰音、多声部重叠、演奏技巧、扫描件、播放、人工时值编辑和直接 `.gp` 输出仍明确不支持。
- 这些限制属于已确认的 MVP 产品边界；计划内 Task 1-11 没有未完成实现。

下一轮建议：
- 如用户要继续验证 Toolbox，必须先明确允许浏览器本地只读指定真实 PDF，并由用户配合确认 Guitar Pro 8 打开结果；不得复制、上传或提交 PDF。
- 若没有真实文件验收授权，停止扩展 Toolbox，返回 Archive / Import 主线。

下一轮提示词：

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关目录

Toolbox 明确节奏拓扑 Task 1-11 已完成。
如继续 Toolbox，请先确认是否允许浏览器本地只读真实 PDF 和 Guitar Pro 8 手工验收；未经允许不要读取、复制或上传真实 PDF。
否则继续 docs/NEXT_TASKS.md 中的 Archive / Import 主线任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 9

本轮完成：
- MusicXML 已从纯休止骨架升级为混合安全导出：只消费完整合法的 `recognized` 小节，其余小节继续输出既有 measure rest。
- `divisions = 8`，全 / 二分 / 四分 / 八分 / 十六分与一个附点均有精确 duration / type；显式休止不会查找 TAB 列。
- 非休止事件按页码、小节号和 `tabEventOrder` 唯一解析高置信 TAB 列，并输出标准调弦 pitch、string / fret technical notation；同列额外位置使用 `<chord/>`。
- 任一 TAB 引用缺失、重复、空列、非法品位、置信度失效或容量不完整时，整个小节回退，不会先写局部真实音符再补休止。
- 运行时会拒绝 `dots` 不是 0 / 1 的事件；测试也覆盖容量不足、重复 TAB 匹配和低置信位置的整小节原子回退。
- 分析阶段 fallback 与运行时 lookup 回退的小节编号都会加入 MusicXML credit。
- 没有修改页面 UI，没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/tab-analyzer.ts`
- `src/features/toolbox/tab-analyzer.test.ts`
- `src/features/toolbox/musicxml.service.ts`
- `src/features/toolbox/musicxml.service.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/musicxml.service.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/notation-primitives.test.ts src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/musicxml.service.test.ts
```

结果：MusicXML 1 个测试文件、6 个用例通过；最终 Toolbox 定向套件 9 个测试文件、86 个用例通过，退出码均为 0。未运行完整仓库测试、构建或真实 PDF 验证。

风险：
- 真实音符导出仍只由人工分析结果夹具验证，没有读取真实 PDF，也没有在 Guitar Pro 8 中手工打开验证。
- 页面尚未展示逐小节 recognized / fallback 状态或混合导出说明；Task 10 尚未开始。

未完成事项：
- Task 10：页面显示节奏检查统计、逐小节状态和 fallback 休止占位提示。
- Task 11：最终 Toolbox 定向验证、构建和交接；是否允许真实 PDF / Guitar Pro 8 手工验证需由用户另行确认。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox
- src/i18n/messages.ts

按明确节奏拓扑计划继续 Task 10，先写页面失败测试，再显示已检查、recognized、fallback 小节数量、逐小节状态和 fallback 休止占位提示。
保持既有下载按钮条件，不增加编辑、播放、动画或新 UI 框架；不要重新修改 Task 9 的 MusicXML 语义。
不要读取、复制或上传真实 PDF，不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 8

本轮完成：
- `TabScoreAnalysis` 新增 `rhythmMeasures`，分析器会为每个已识别小节编号输出 `recognized` 或 `fallback`。
- `tab-analyzer` 已按配对系统、规范化图元、拓扑识别、整小节验证的依赖顺序完成接入。
- 路径与可靠字形可以分别独立识别；双通道一致时融合，强证据冲突时不选边并回退。
- 缺少新快照可选字段、找不到可靠五线谱 / TAB 配对或没有强节奏证据时，继续保留既有安全休止骨架。
- 只有已有强事件但某个小节失败时，才追加该小节的简短原因，避免把候选误当作可导出结果。
- 横坐标只用于归组、排序、小节归属和 TAB 列唯一配对，没有决定时值。
- 没有读取、复制或上传真实 PDF，没有修改 MusicXML、页面 UI、Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/tab-analyzer.ts`
- `src/features/toolbox/tab-analyzer.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/tab-analyzer.test.ts src/features/toolbox/tab-events.test.ts src/features/toolbox/tab-geometry.test.ts src/features/toolbox/tab-staff-geometry.test.ts src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/notation-primitives.test.ts src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/rhythm-measures.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：8 个纯分析测试文件、78 个用例通过；完整 Toolbox 11 个测试文件、88 个用例通过，退出码均为 0。未运行完整仓库测试、构建或真实 PDF 验证。

风险：
- `musicxml.service.ts` 尚未消费 `rhythmMeasures`，因此当前下载结果仍是安全休止骨架。
- 页面尚未显示逐小节识别 / 回退状态；Task 10 仍未开始。
- 当前端到端分析链只由人工证据夹具验证，未做真实 PDF 兼容验证。

未完成事项：
- Task 9：只把完整合法的 recognized 小节序列化为 MusicXML，任一 lookup 失败时整小节回退。
- Task 10：页面显示识别 / 回退统计和原因。
- Task 11：最终 Toolbox 定向验证、构建和交接。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 9，先写失败测试，再让 MusicXML 只序列化完整合法的 recognized 小节；任一 TAB 事件查找失败时整小节回退为既有休止占位。
本轮不要修改页面 UI，不读取真实 PDF，不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 3

本轮完成：
- 新增 `PairedStaffSystem` 与 `findPairedStaffSystems`，识别恰好五条的五线谱并与下方唯一最近 TAB 系统配对。
- 覆盖四线 / 六线拒绝、间距不均、跨页、横向重叠不足 80%、垂直距离过大和最近候选并列等拒绝条件。
- 配对只使用系统上下关系、五线谱间距和横向覆盖；没有使用 TAB 事件横向间距推断节奏。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/staff-tab-alignment.ts`
- `src/features/toolbox/staff-tab-alignment.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/staff-tab-alignment.test.ts src/features/toolbox/tab-staff-geometry.test.ts
```

结果：2 个测试文件、11 个用例通过。未运行完整测试或构建。

未完成事项：
- 明确节奏计划 Task 4：把配对系统内的路径与字形证据规范化为局部图元。
- Task 5 及后续拓扑识别、整小节验证、MusicXML 和页面集成均未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 4，先写失败测试并实现系统内证据规范化图元。
不得根据 TAB 横向间距推断节奏。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 1-2

本轮完成：
- `PdfDocumentSnapshot.vectorShapes` 已保留 PDF.js 复合绘制形状，覆盖多子路径、连续建路、曲线、矩形、闭合、fill / eoFill / stroke / fillStroke、线宽、save / restore、`endPath` 和资源释放。
- `PdfDocumentSnapshot.musicGlyphs` 已加入保守音乐字体证据；精确字体族白名单和精确 SMuFL PUA 映射共同决定 reliable，其他 PUA 为 unknown，普通文本不产生证据。
- 现有六线谱 `lineSegments` 与普通标题、速度、小节分析保持兼容。
- 没有读取、复制或上传真实 PDF，没有使用 TAB 横向间距推断节奏，没有修改 Supabase 或依赖，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/pdf.service.ts`
- `src/features/toolbox/pdf.service.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/pdf.service.test.ts src/features/toolbox/tab-analyzer.test.ts
```

结果：2 个测试文件、12 个用例通过。未运行完整测试或构建。

未完成事项：
- 明确节奏计划 Task 3：五线谱与 TAB 系统配对。
- Task 4 及后续规范化图元、拓扑识别、整小节验证、MusicXML 和页面集成均未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 3，先写失败测试并实现五线谱与 TAB 系统唯一配对。
不得根据 TAB 横向间距推断节奏。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
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

## 追加交接：PDF 六线谱工具箱 Task 3-6 已完成

- `pdfjs-dist@4.10.38` 已加入 `package.json` 与 lockfile；`pdf.service.ts` 动态加载 PDF.js，在浏览器本地读取并释放文档，不上传或保存 PDF。
- `musicxml.service.ts` 只导出安全的 MusicXML 4.0 骨架：标准六弦调弦、TAB 谱表、拍号/速度、正确的小节数与休止符占位。不会生成 `.gp`，也不会声称已识别音符。
- Toolbox 页面已可选择 PDF、本地分析、查看摘要/警告、下载 MusicXML，并覆盖错误恢复和 object URL 释放。
- 真实只读样本 `C:\Users\Ashin\Downloads\endless rain.pdf` 验证：4 页、6307 个非图片绘图操作、0 图片对象、标题 `endless rain`、92 BPM、小节 1-18；拍号未以文本形式出现，所以安全回退至 4/4 并显示警告。XML 解析器验证通过，Guitar Pro 8 手工打开验证尚未执行。
- 本轮文件：`package.json`、`package-lock.json`、`src/features/toolbox/*`（新增 PDF/MusicXML service 及测试，更新页面/分析器）、`src/i18n/messages.ts`、三个状态文档。
- 验证：`npm test -- --run src/features/toolbox src/app/routes.test.tsx src/app/shell/AppShell.test.tsx src/App.test.tsx`，7 文件 27 用例通过；`npm run build` 通过；`git diff --check` 通过。Vite 仍有既有主包超过 500 kB 警告。

下一轮只读取：`AGENTS.md`、`docs/PROJECT_STATUS.md`、`docs/NEXT_TASKS.md`、`docs/SESSION_HANDOFF.md`、Toolbox 设计/计划、`src/features/toolbox`、`src/i18n/messages.ts`、`package.json`。如继续功能，先单独设计“字符串/品位几何定位”，不要开始节奏、技巧或 `.gp` 生成。

## 追加交接：Toolbox 字符串 / 品位几何定位

- 已新增 `src/features/toolbox/tab-geometry.ts` 与测试：从已归一化的 `PdfTextItem` 坐标中识别六条近似等距的字符串基线，并输出 `TabFretPosition`。
- 结果仅包含页码、小节号、弦序、品位、坐标与 `high` / `medium` 置信度；品位范围限定为 `0` 至 `24`。
- 跨弦歧义、超范围数字和小节边界候选会保留诊断信息，不会伪装为高置信度结果。
- `tab-analyzer` 只将候选加入摘要，`ToolboxPage` 只显示数量；`musicxml.service.ts` 未改动，依旧输出休止骨架，未识别节奏、技巧或 `.gp`。
- 本轮验证：Node 20.20.2 下 Toolbox 5 个测试文件、17 个用例通过；`tsc -b` 与 Vite production build 通过。Vite 仍有既有 >500 kB chunk 警告。
- 未读取、复制或上传 `endless rain.pdf`；没有 Supabase、依赖或 PDF 适配器改动。
- 如继续，先只设计“候选在小节内的时序模型”；不得直接进入节奏时值、技巧符号、扫描件或 `.gp` 生成。

## 追加交接：Toolbox 小节内候选事件列

- 已新增 `src/features/toolbox/tab-events.ts` 与测试：只将同页同小节的 `TabFretPosition` 按横向位置分组为从左到右的 `TabFretEvent`。
- 每列包含原始候选、代表 `x` 坐标、顺序和置信度；不会把列解释为节奏、时值、音高或和弦。
- 同一事件列内同一弦出现不同品位时，事件降为 `medium`，保留所有候选并输出诊断警告。
- `tab-analyzer` 已附加 `fretEvents`，页面只增加数量展示；MusicXML 仍忽略事件列并导出整小节休止骨架。
- 本轮验证：Node 20.20.2 下 Toolbox 6 个测试文件、19 个用例通过；`tsc -b` 与 Vite production build 通过。Vite 仍有既有 >500 kB chunk 警告。
- 本轮没有读取、复制或上传 `endless rain.pdf`，没有 Supabase、依赖、PDF 适配器、节奏识别、技巧识别或 `.gp` 改动。
- 该旧建议已由后文“真实电子谱符号拓扑兼容设计”替代：首版不增加人工时值编辑器，只读取五线谱明确符号；仍禁止从横向事件列自动推断时值。

## 追加交接：Toolbox 矢量六线谱基线定位

- 已在 `pdf.service.ts` 从 PDF.js operator list 提取变换后的水平路径线段；所有处理仍在浏览器本地，PDF 不上传、不持久化。
- 新增 `tab-staff-geometry.ts`：逐页合并断续水平线段，以六条近似等距的基线定位 `TabStaffSystem`；其中一条较短时可保留为 `medium`，避免数字切断线条导致整组丢失。
- `tab-geometry.ts` 会优先采用匹配的矢量系统定位稀疏品位文本；中等系统产生独立复核警告，不再误称为小节边界问题。
- `TabScoreAnalysis` 与 Toolbox 页面已显示六线谱系统数量；`musicxml.service.ts` 未改，仍输出安全的整小节休止骨架。
- 本地浏览器只读验证 `C:\Users\Ashin\Downloads\endless rain.pdf`：4 页、18 小节、92 BPM、3 个系统、5 个位置、5 个事件列；未上传或复制 PDF，未下载 MusicXML。
- 定向验证：Node 20.20.2 下 `src/features/toolbox` 7 个测试文件、26 个用例通过；浏览器本地流程通过。未执行全仓构建，以遵守用户限定读取范围。

该交接建议已被下方“真实电子谱符号拓扑兼容设计”替代：首版不提供人工时值编辑器，只识别五线谱明确符号；仍不得根据横坐标猜测节奏，也不做技巧识别、扫描件、Supabase 改动、PDF 上传或直接 `.gp` 生成。

## 追加交接：Toolbox 真实电子谱符号拓扑兼容设计

本轮完成：
- 修订 Toolbox 阶段 5 设计，将节奏识别从固定矢量外形模板升级为“矢量路径拓扑 + 可靠音乐字体字形”双通道。
- 设计统一的规范化图元与系统内拓扑关系，兼容复合子路径、多个绘制操作组成一个符号、共享 / 倾斜连梁、局部次梁、多符头共享符干和多种空心符头表达。
- 定义强拓扑、强字形和弱证据等级；未知字形不能决定时值，字形与路径冲突时整小节回退。
- 定义横坐标用途边界：只允许归组、排序、小节归属和 TAB 列唯一配对，禁止用 TAB 间距推断节奏。
- 重写明确节奏实施计划，拆为复合绘制形状、音乐字体证据、五线谱 / TAB 配对、规范化图元、节奏拓扑、整小节验证、分析集成、MusicXML、页面状态和交接 11 个任务。

修改文件：
- `docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md`
- `docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

未修改：
- `src/features/toolbox`
- Supabase、RLS、migration、依赖和锁文件
- 真实 PDF 与 MusicXML / `.gp` 输出

验证：
- 本轮仅修改设计、计划和状态文档，因此未运行测试或构建。
- 后续实施从计划 Task 1 开始，先以人工 PDF.js operator 夹具验证复合绘制形状，不读取真实 PDF。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划从 Task 1 开始，先写失败测试并实现复合绘制形状提取。
不得根据 TAB 横向间距推断节奏。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 4

本轮完成：
- 新增 `notation-primitives.ts`，将配对五线谱系统内的路径与字形证据转换为 contour、segment、可靠 glyph 和 unknown glyph。
- 复合路径按空间连通关系分组；嵌套轮廓保留 containment / hole 候选，Bézier 接触使用按谱线间距缩放的自适应几何容差。
- 开放线性 `stroke` / `fill-stroke` 规范化为 segment，未知线宽保持 `uncertain`。
- 图元必须完整且唯一归属同页一个配对五线谱系统；跨 TAB 区域、跨系统或归属歧义时拒绝。
- 输出 bounds 保持源坐标；没有根据 TAB 横向间距推断节奏，没有开始音符时值识别。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/notation-primitives.ts`
- `src/features/toolbox/notation-primitives.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/notation-primitives.test.ts
```

结果：1 个测试文件、11 个用例通过，退出码 0。未运行完整测试或构建。

风险：
- `notation-primitives.ts` 当前 566 行，超过项目建议规模；本轮保持 Task 4 文件边界，没有为拆分而新增抽象。
- 当前只使用人工路径、字形和配对系统夹具验证，未做真实 PDF 验证。
- 系统归属和曲线接触采用保守容差；不确定证据会被拒绝或降级，不会直接成为可导出节奏。

未完成事项：
- Task 5：符头、符干、共享 / 倾斜连梁、局部次梁和单 / 双符尾的关系优先拓扑。
- Task 6 及后续休止符 / 附点、整小节验证、分析集成、MusicXML 和页面状态均未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 5，先写失败测试并实现符头、符干、连梁和符尾的关系优先拓扑。
时值只能来自明确拓扑关系或可靠音乐字形，不得根据 TAB 横向间距推断节奏。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 5

本轮完成：
- 新增 `RhythmDuration`、`RhythmTopologyEvent`、`RhythmTopologyResult` 与 `recognizeRhythmTopology`。
- 同页同系统内先建立 `touches`、`intersects`、`contains`、`aligned-with`、`incident-to` 关系，再解析符头、符干、梁组和符尾。
- 路径证据支持孔洞、嵌套轮廓、闭合描边轮廓、实心符头、共享符干、共享倾斜梁、两层梁和局部次梁。
- 可靠音乐字形可直接提供全 / 二分 / 四分 / 八分 / 十六分音符语义；可靠字形或路径符尾仍必须与符干端部明确相接。
- 每根符干独立计算实际连接的梁层 / 符尾；附近但不连接的梁不会改变时值。
- 横坐标只用于事件排序；没有使用 TAB 横向间距、相邻事件间距、平均间距或小节宽度推断节奏。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/rhythm-topology.ts`
- `src/features/toolbox/rhythm-topology.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/rhythm-topology.test.ts src/features/toolbox/notation-primitives.test.ts
```

结果：2 个测试文件、21 个用例通过，退出码 0。未运行完整测试或构建。

风险：
- `rhythm-topology.ts` 当前 579 行，超过项目建议规模；本轮保持 Task 5 单模块边界，没有提前拆分抽象。
- 当前只使用人工图元和配对系统夹具验证，未做真实 PDF 验证。
- Task 6 的路径 / 字形冲突融合、休止符、附点和不支持结构诊断尚未实现；当前结果还没有接入整小节或 MusicXML。

未完成事项：
- Task 6：双通道冲突融合、全至十六分休止符和一个附点的唯一局部附着。
- Task 7 及后续整小节容量、分析集成、MusicXML 和页面状态均未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 6，先写失败测试，再实现路径 / 字形强证据冲突融合、可靠休止符和一个附点的唯一局部附着。
时值只能来自明确拓扑关系或可靠音乐字形，不得根据 TAB 横向间距推断节奏。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 6

本轮完成：
- 同一局部事件的路径强拓扑与可靠音乐字形语义一致时融合为一个事件，并保留双方来源 ID；时值或音符 / 休止类型冲突时不选边、不输出事件。
- 可靠音乐字形支持全、二分、四分、八分和十六分休止；未知字形不能决定时值。
- 仅有闭合、填充和包围框尺寸的路径休止无法证明真实轮廓拓扑，因此保持诊断，不提升为高置信休止。
- 一个可靠附点只在事件右侧、垂直兼容、事件侧候选唯一且候选点侧事件唯一时附着；两枚候选、断音点歧义或完整字形缺少可靠附点锚点时降为 `medium`。
- 同一局部横坐标的多声部无论纵向距离多远都会拒绝；装饰音尺寸、疑似延音线和未消费路径保持诊断。
- 横坐标只用于五线谱系统内局部融合、事件排序和附点右侧关系，没有使用 TAB 横向间距、相邻事件间距、平均间距或小节宽度推断节奏。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/rhythm-topology.ts`
- `src/features/toolbox/rhythm-topology.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：10 个测试文件、68 个用例通过，退出码 0。未运行完整仓库测试、构建或真实 PDF 验证。

风险：
- `rhythm-topology.ts` 当前 962 行，超过项目建议规模；Task 7 应新建独立小节模块，不继续扩张拓扑模块。
- 路径休止只有在后续图元契约能保留可验证轮廓结构签名后才能安全支持；当前回退优先于包围框猜测。
- 当前结果仍未接入整小节容量、TAB 唯一配对、分析器或 MusicXML。

未完成事项：
- Task 7：把高 / 中置信拓扑事件与 TAB 事件列唯一配对，并严格校验整小节容量。
- Task 8 及后续分析集成、MusicXML 和页面状态均未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 7，先写失败测试，再实现节奏事件与 TAB 事件列唯一配对、三十二分音符整数容量校验和整小节回退。
时值只能来自 Task 6 已确认的明确拓扑关系或可靠音乐字形；横向容差只能选择 TAB 列，不得决定时值。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 追加交接：Toolbox 明确节奏拓扑 Task 7

本轮完成：
- 新增 `RecognizedRhythmEvent` / `MeasureRhythmResult` 稳定契约和独立 `rhythm-measures.ts`，没有继续扩张 Task 6 的拓扑模块。
- 非休止事件只有在同页容差内候选全部属于同一请求小节时，才选择其中唯一最近的 TAB 列；跨小节候选、同列重复使用、TAB 漏列、并列最近或无法定位都会使整个小节回退。
- 一个 TAB 事件列可保留多个弦 / 品位；明确休止事件不绑定 TAB 列，输出 `tabEventOrder: null`。
- 三十二分音符整数容量为：全 32、二分 16、四分 8、八分 4、十六分 2；一个附点增加基础时值的一半。容量无法整数表示、总量不足或超出都会回退。
- 只有高置信节奏 / TAB 事件、非休止事件与 TAB 列一一配对、没有漏列且容量精确的小节可以输出 `recognized`；回退小节清空候选事件。
- 时值和附点直接复制 Task 6 结果；横坐标只用于选列和辅助小节归属，没有根据 TAB 间距、相邻事件间距、平均间距或小节宽度推断时值。
- 没有读取、复制或上传真实 PDF，没有修改 Supabase、依赖或锁文件，没有运行 `npm install`，没有生成 `.gp`。

修改文件：
- `src/features/toolbox/toolbox.types.ts`
- `src/features/toolbox/rhythm-measures.ts`
- `src/features/toolbox/rhythm-measures.test.ts`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
```powershell
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox/rhythm-measures.test.ts src/features/toolbox/tab-events.test.ts
$env:HOME=(Resolve-Path .\.tmp).Path; $env:USERPROFILE=$env:HOME; $env:TEMP=$env:HOME; $env:TMP=$env:HOME; C:\Users\Ashin\AppData\Local\nvm\v20.20.2\node.exe .\node_modules\vitest\vitest.mjs --run src/features/toolbox
```

结果：2 个定向测试文件、16 个用例通过；完整 Toolbox 11 个测试文件、82 个用例通过，退出码均为 0。未运行完整仓库测试、构建或真实 PDF 验证。

风险：
- 当前输入契约没有小节线边界或配对系统几何；休止事件只有在同页仅有一个请求小节时才保留，否则整小节回退。
- `rhythm-measures.ts` 当前 372 行，超过项目建议规模；职责仍集中于小节归属、TAB 配对和容量验证，Task 8 不应继续向该文件加入分析器编排。
- 当前结果尚未接入分析器、MusicXML 或页面状态。

未完成事项：
- Task 8：把配对系统、规范化图元、拓扑事件和 Task 7 小节结果按依赖顺序接入 `tab-analyzer`，并保留安全骨架回退。
- Task 9-11：MusicXML、页面状态与最终定向验证仍未开始。

下一轮提示词：

```text
继续 RockRoll Toolbox 开发。
只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/superpowers/specs/2026-07-14-toolbox-pdf-tab-musicxml-design.md
- docs/superpowers/plans/2026-07-14-toolbox-explicit-rhythm-symbols.md
- src/features/toolbox

按明确节奏拓扑计划继续 Task 8，先写失败测试，再把配对系统、规范化图元、拓扑识别和整小节结果按依赖顺序接入 tab-analyzer。
无可靠配对系统、无强节奏证据或任一小节失败时保留既有安全休止骨架和简短诊断；本轮不要修改 MusicXML 或页面 UI。
时值只能来自 Task 6 的明确拓扑关系或可靠音乐字形；横向坐标只能用于归组、排序、小节归属和 TAB 列唯一配对，不得决定时值。
不要读取、复制或上传真实 PDF。
不修改 Supabase，不运行 npm install，不生成 .gp。
只运行 Toolbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前交接索引（2026-07-17，Task 11 后）

- 当前有效交接为本文“追加交接：Toolbox 明确节奏拓扑 Task 10-11”章节；计划 Task 1-11 已完成。
- 下一步是可选的真实 PDF / Guitar Pro 8 端到端验收；未经用户明确授权不得读取真实 PDF。若不验收，则返回 Archive / Import 主线。

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关目录

Toolbox 明确节奏拓扑 Task 1-11 已完成。
如继续 Toolbox，请先确认是否允许浏览器本地只读真实 PDF 和 Guitar Pro 8 手工验收；未经允许不要读取、复制或上传真实 PDF。
否则继续 docs/NEXT_TASKS.md 中的 Archive / Import 主线任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前交接索引（2026-07-17，导入验证反馈后）

本轮完成：
- 用户确认现有 Archive / Import 实际测试暂无明显问题；真实导入不再是当前阻塞项。
- 没有再次写入 Supabase，也没有把用户手工结论伪装成自动化测试或精确阶段计数。
- 下一项推荐功能收束为 Review plan 明细可读性：管理员提交前查看专辑封面、来源点评、年代与风格。
- 数据库级任务状态、RPC、worker 与批量队列保持延后；只有真实失败再次出现时才恢复导入诊断。
- Toolbox Task 1-11 仍已完成；真实 PDF / Guitar Pro 8 验收保持可选且需要另行授权。

修改文件：
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

验证：
- 本轮仅修改状态文档，未运行代码测试或构建。
- 当前分支为 `main`，跟踪 `origin/main`；原有 `.playwright-cli` 未跟踪文件未修改。

下一轮提示词：

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- src/features/archive
- src/features/inbox
- src/i18n/messages.ts

现有 Archive / Import 实际测试暂无明显问题，不要重复执行真实导入，也不要新增数据库任务状态、RPC、worker 或批量队列。
继续 Review plan 明细展示任务：保持 Archive 为主入口和 admin-only 权限，先写页面失败测试，再最小展示专辑封面、来源点评、年代与风格。
不要恢复 Inbox 主导航，不改变一键导入提交时机或 match_existing 语义，不扫描整个仓库，不运行 npm install，不引入新 UI 框架。
只运行 Archive / Inbox 定向测试，完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-17，Review plan 明细完成后）

- `/archive` 管理员 Review plan 已展示专辑封面、来源点评、发行年份与风格；复用现有 `review_payload.metadata`，没有新增查询或写入。
- Archive 主入口、Inbox 停用导航、一键导入提交时机、artist / album `match_existing` 和 admin-only 权限均未改变。
- 修改：`ArchivePage.tsx/.css/.test.tsx`、`inbox.types.ts`、`inbox.service.ts/.test.ts`、`messages.ts` 及三份状态 / 交接文档。
- 验证命令：Node 20 下 `vitest --run src/features/archive src/features/inbox`，以及限定范围 `git diff --check`。
- Archive / Inbox 定向测试为 8 个文件、83 个用例通过；未执行真实导入、完整测试或构建。
- 风险：Review plan 仍一次读取管理员的全部 Review item，并沿用 artist / album 过滤；未新增分页或搜索。
- 下一轮不要重复本任务。若继续专辑封面与曲风正规化，先确认最小 schema、migration、兼容性与 admin-only 权限影响；未确认前不修改 Supabase。

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- src/features/archive
- src/features/inbox
- src/i18n/messages.ts

Review plan 专辑封面、来源点评、年代与风格明细已完成，Archive / Inbox 定向测试 83 个用例通过。
不要重复真实导入，不恢复 Inbox 主导航，不改变一键导入提交时机或 match_existing 语义，不新增数据库任务状态、RPC、worker 或批量队列。
如继续专辑封面与曲风正规化，先明确最小 schema、migration、兼容性与 admin-only 权限影响；未确认前不要修改 Supabase。
不要扫描整个仓库，不运行 npm install，不引入新 UI 框架。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-17，专辑封面与曲风正式字段化完成后）

本轮完成：
- 通过 Supabase CLI 生成 `supabase/migrations/20260717073327_add_album_cover_and_styles.sql`，只增加 `albums.cover_url` 和 `albums.styles`；未应用远端。
- 新导入专辑在现有单次 insert 中写正式封面与曲风，同时保留 external source raw payload。
- Albums 与 Archive 使用正式字段优先、raw payload 回退；Albums 完整集合曲风读取保持 200 条分块和最多 3 路并发，Archive 正式元数据按 200 条分块且无 N+1。
- 手动 `match_existing` 与已有来源自动复用不会更新目标专辑正式字段。
- public-read/admin-only write 权限沿用现有 Albums grants/RLS；没有新增 policy，`docs/PERMISSIONS.md` 未修改。
- 没有真实导入、历史回填、远端 apply、角色探针、Inbox 主导航恢复、依赖安装或语义扩张。

本任务新增 / 修改：
- `supabase/migrations/20260717073327_add_album_cover_and_styles.sql`
- `src/features/inbox/album-metadata.ts`
- `src/features/inbox/album-metadata.test.ts`
- `src/features/inbox/inbox.service.ts`
- `src/features/inbox/inbox.service.test.ts`
- `src/features/albums/albums.service.ts`
- `src/features/albums/albums.service.test.ts`
- `src/features/archive/archive.service.ts`
- `src/features/archive/archive.service.test.ts`
- `docs/superpowers/specs/2026-07-17-album-cover-styles-normalization-design.md`
- `docs/superpowers/plans/2026-07-17-album-cover-styles-normalization.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

分支与既有修改：
- 当前分支为 `codex/album-cover-styles-normalization`，普通检出目录。
- 建立分支时已存在 Review plan 明细任务留下的 `ArchivePage.tsx/.css/.test.tsx`、`inbox.types.ts`、`messages.ts` 与状态文档修改；本任务保留且未回退这些改动。

验证：
- 核心 service / normalizer：4 个测试文件、66 个用例通过。
- Archive / Inbox / Albums 回归：12 个测试文件、125 个用例通过。
- Node 20 下 `tsc -b && vite build` 通过；Vite 仍有既有主 chunk 超过 500 kB 警告。
- migration 内容、既有 Albums grants/RLS 与限定范围 `git diff --check` 已静态核对；无空白错误，仅有 LF 转 CRLF 提示。
- 默认 Node 8 无法解析当前 TypeScript CLI；验证时仅临时把既有 Node 20 目录置于当前进程 PATH，没有修改系统环境或安装依赖。

风险与下一步：
- 远端 migration 尚未应用，因此不能先部署依赖新列的代码。
- 远端 apply、anon / 普通用户 / admin 角色探针必须由用户另行明确授权；不得使用 service role 绕过 RLS。
- 不自动回填旧专辑，不重复真实导入；旧数据继续依赖 raw payload 回退。

下一轮提示词：

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- supabase/migrations/20260717073327_add_album_cover_and_styles.sql
- src/features/archive/archive.service.ts
- src/features/albums/albums.service.ts
- src/features/inbox/album-metadata.ts
- src/features/inbox/inbox.service.ts

专辑封面与曲风正式字段化代码已完成，本地 migration 尚未应用远端。
不要重复真实导入，不自动回填旧专辑，不恢复 Inbox 主导航，不改变一键导入或 match_existing 语义，不运行 npm install。
如需应用远端 migration 或执行 anon / 普通用户 / admin 角色探针，必须先得到我的明确授权；未授权时只做只读审查。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-17，Web MVP 上线计划确认后）

本轮确认：

- 注册保持开放；新账号默认普通用户，不能自行升级为管理员。管理员只允许数据库侧人工授予。
- 资料库新增、编辑、删除、导入、Review plan、Commit、Match existing、回填和批处理仅管理员可见；前端隐藏、service guard、Supabase RLS / RPC 三层必须一致。
- public Archive 等正式资料继续按既有策略只读开放；普通用户只维护自己的 Practice 和 Songs / 曲目。
- 当前只屏蔽艺人列表并暂停开发，不继续调整其他导航；Archive 仍是导入主入口，Inbox 不恢复主导航。
- 首发门槛改为 Auth 冒烟、三角色权限验收、生产构建、环境与重定向配置核对和预览部署冒烟。关闭注册、CAPTCHA 与自定义 SMTP 不是首发阻塞项。
- 本轮只修改 `docs/PROJECT_STATUS.md`、`docs/NEXT_TASKS.md`、`docs/SESSION_HANDOFF.md` 与 `docs/PERMISSIONS.md`；没有修改业务代码、Supabase 或依赖，没有执行真实导入、测试、构建、远端写入或部署。

当前工作区：

- 分支：`main`，跟踪 `origin/main`，当前 ahead 2。
- 既有专辑正规化设计文档修改与 `.playwright-cli` 未跟踪文件未改动。

下一轮提示词：

```text
继续 RockRoll Web MVP 上线准备。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- 当前 P0 验收涉及的最小 feature / 配置文件

注册保持开放，新账号必须默认为普通用户且不能自行升级管理员。
资料库写入、导入、提交、匹配、回填和批处理入口仅管理员可见，并由 service 与 Supabase RLS / RPC 拒绝非管理员请求。
先执行 docs/NEXT_TASKS.md 的 P0 Auth 冒烟与三角色权限验收计划；开始远端写入、角色探针或部署前先说明具体影响范围。
不要重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 match_existing 语义，不开发艺人列表，不扫描整个仓库，不运行 npm install。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-17，Toolbox 几何兼容移植完成后）

本轮完成：

- 只读审计确认旧 `codex/toolbox-explicit-rhythm` 不能整体合并，并发现其未提交的真实样例兼容增量。
- 从当前 `main` 创建 `codex/toolbox-geometry-compat`，按 TDD 最小移植短横线过滤、稀疏覆盖拒绝、6.6 TAB 弦距配对边界和英文单数摘要。
- 当前节奏架构、MusicXML、安全整小节回退、Archive / Inbox、导入与权限语义均未改变。
- 没有读取真实 PDF，没有修改 Supabase，没有运行 `npm install`。

修改文件：

- `src/features/toolbox/tab-staff-geometry.ts`
- `src/features/toolbox/tab-staff-geometry.test.ts`
- `src/features/toolbox/staff-tab-alignment.ts`
- `src/features/toolbox/staff-tab-alignment.test.ts`
- `src/features/toolbox/ToolboxPage.tsx`
- `src/features/toolbox/ToolboxPage.test.tsx`
- `src/i18n/messages.ts`
- `docs/superpowers/plans/2026-07-17-toolbox-geometry-compat.md`
- 三份状态 / 交接文档

验证：

- RED：5 个新增用例全部因缺少对应行为而失败。
- GREEN：定向 3 个测试文件、20 个用例通过。
- 回归：Toolbox 11 个测试文件、100 个用例通过。
- `npm run build` 通过，仅保留既有 chunk size 警告。
- 限定范围 `git diff --check` 通过，仅提示 Windows LF / CRLF 转换。

未完成事项：

- 提交、合并并推送 `codex/toolbox-geometry-compat`。
- 旧 `codex/toolbox-explicit-rhythm` 工作树和分支继续保留；完成推送后必须由用户明确确认，才能执行删除。

下一轮提示词：

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- 当前任务相关的最小目录

Toolbox 几何兼容最小移植已完成：短横线过滤、稀疏覆盖拒绝、6.6 TAB 弦距边界和英文单数摘要。
先确认 codex/toolbox-geometry-compat 已合并推送；旧 codex/toolbox-explicit-rhythm 工作树未经明确确认不得删除。
之后继续 Web MVP 上线 P0 的 Auth 冒烟与三角色权限验收。
不要读取真实 PDF，不运行 npm install，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 match_existing 语义。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-20，Web MVP 上线收尾预检后）

本轮完成：

- 清理 Git 状态：新增 `.playwright-cli/` 忽略规则，确认 `dist/` 未跟踪，确认专辑设计文档没有内容差异。
- `%SystemDrive%/` 下只有 2 个误写搜狗缓存文件，已被忽略；删除被本机安全策略拒绝，磁盘目录仍保留。
- Node 20 下 Auth、Practice、Archive、Toolbox、Albums、Inbox 共 29 个测试文件、284 个用例通过；生产构建通过，仅有既有 chunk size 警告。
- Supabase 只读核对确认专辑正式列与 Albums RLS / admin-only 写策略已经在远端生效；没有执行 migration、DDL、角色探针或真实导入。
- 已确认 migration history 曾存在版本不一致：远端 `20260717073327`、本地原为 `20260717064514`，名称和 SQL 完全相同；后续已纯重命名本地文件完成对齐。
- 公开 Auth 设置显示注册开放、邮箱 provider 启用、匿名登录关闭、邮箱自动确认开启。未创建测试账号，未修改远端 Auth 配置。
- GitHub 默认分支和远程分支清理已完成；本轮开始时 `main` 对齐 `origin/main`，创建收尾提交后将暂时领先 1 个提交，是否推送待用户确认。旧 `codex/toolbox-explicit-rhythm` 成果已提交为 `abd8218`，仍仅保存在本地。

本轮修改：

- `.gitignore`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`

未完成事项：

1. 由用户确认是否把本地专辑 migration 文件重命名为远端版本号；不得重复 apply SQL。
2. 由用户确认开放注册采用自动确认还是邮箱确认。
3. 确认后再执行真实 Auth 冒烟、三角色权限探针和预览部署；这些步骤会产生外部状态，需先说明账号、数据与清理范围。

下一轮提示词：

```text
继续 RockRoll Web MVP 上线 P0。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- supabase/migrations/20260717073327_add_album_cover_and_styles.sql
- src/features/auth
- 当前权限探针涉及的最小 feature / service / test 文件

上线收尾预检已通过：29 个测试文件、284 个用例及生产构建通过。
远端与本地专辑 migration 版本现均为 20260717073327，SQL 完全一致；不要重复 apply、repair 或执行远端 DDL。
Auth 当前开放注册且邮箱自动确认开启；先确认是否保持自动确认，再执行真实注册、登录、退出、找回密码和三角色权限探针。
不要运行 npm install，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 match_existing，不开发艺人列表，不读取真实 PDF。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-20，P0 migration / RLS / 匿名页面验收后）

本轮完成：

- 本地 `20260717064514_add_album_cover_and_styles.sql` 已纯重命名为 `20260717073327_add_album_cover_and_styles.sql`，SQL 与 SHA-256 未变；未修改远端 migration history，未执行 DDL、repair 或 push。
- linked Supabase 的 8 项 anon / user / admin RLS 探针全部通过；所有临时 profile 角色变化和探针数据位于同一事务并已 rollback，独立复核无残留。
- Guest 浏览器确认 Archive 公开读取 14 个已导入榜单正常；没有扫描目录、预览或提交任何导入。
- 修复 `ArchivePage` 管理区可见性：anonymous / user 现在看不到新增集合、URL 预览、目录扫描、编辑、删除、Review plan 与 Match existing；admin 路径、一键导入和 `match_existing` 语义未变。
- `docs/PERMISSIONS.md` 已同步 URL 预览导入与目录扫描的 admin-only 边界。
- Archive 3 个测试文件、31 个用例通过；production build 通过，仅保留既有 chunk size 警告；没有运行 `npm install`。
- Auth 保持开放注册、邮箱 provider、自动确认与禁用匿名登录，远端配置未变。代码审查与页面冒烟确认当前没有找回密码入口，仍显示无效的“Anonymous test login”。

本轮修改：

- `supabase/migrations/20260717073327_add_album_cover_and_styles.sql`（由旧时间戳纯重命名）
- `src/features/archive/ArchivePage.tsx`
- `src/features/archive/ArchivePage.test.tsx`
- `docs/PERMISSIONS.md`
- 三份状态 / 交接文档

未完成事项：

1. 确认并实现 Auth 找回密码最小闭环：发送重置邮件 + 恢复链接建立 session 后设置新密码。
2. 确认是否移除“Anonymous test login”或仅在明确 demo 配置下显示。
3. 用户提供或确认可用测试邮箱及测试账号残留清理方式后，再做真实注册 / 登录 / 退出 / 找回密码冒烟；不得记录密码、token 或 cookie。
4. 补普通用户与 admin 的浏览器页面可见性冒烟，再运行 Auth / Practice / Archive / Toolbox 定向回归与生产构建。

下一轮提示词：

```text
继续 RockRoll Web MVP 上线 P0。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- src/features/auth
- src/features/archive/ArchivePage.tsx
- src/features/archive/ArchivePage.test.tsx

Migration 名称已与远端 20260717073327 对齐，没有执行远端 SQL；三角色 RLS 探针 8/8 通过且无残留；Guest Archive 可读取 14 个榜单，管理入口已经全部隐藏。
下一步先确认 Auth 找回密码完整闭环和无效匿名测试登录入口的处理，再按 TDD 实现。真实邮件冒烟前必须确认测试邮箱与账号清理方式。
不要运行 npm install，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 match_existing，不开发艺人列表，不读取真实 PDF。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。

## 当前有效交接（2026-07-20，Auth 找回密码闭环完成后）

本轮完成：

- Auth service 新增 `sendPasswordResetEmail` 与 `updatePassword`；Auth 状态订阅现在保留 Supabase 事件，以识别 `PASSWORD_RECOVERY`。
- Supabase 浏览器客户端启用 PKCE flow；重置邮件回跳地址为当前 origin 的 `/#auth`，兼容现有 hash 路由。
- Auth 页面新增忘记密码发送页和恢复 session 下的新密码确认表单，成功提示不暴露账号存在性；无效匿名测试登录入口已移除。
- 注册、密码登录、Magic Link、确认邮件重发、测试邮箱填充和既有退出流程保持不变；未修改 schema、migration、RLS、远端 Auth 配置或依赖。
- `docs/PERMISSIONS.md` 已明确自助密码恢复不提供管理员代改能力，也不影响资料库 admin-only 写权限。
- Auth / Supabase 客户端 3 个测试文件、43 个用例通过；production build 通过；本地 `#auth` 浏览器冒烟通过且无控制台错误。
- 没有运行 `npm install`、发送真实邮件、创建真实账号、执行真实导入、恢复 Inbox 主导航、修改一键导入或 `match_existing`。

本轮修改：

- `src/features/auth/AuthPage.tsx`
- `src/features/auth/AuthPage.test.tsx`
- `src/features/auth/auth.service.ts`
- `src/features/auth/auth.service.test.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase.test.ts`
- `docs/PERMISSIONS.md`
- 三份状态 / 交接文档

未完成事项：

1. 只读确认预览与生产 `/#auth` 是否已列入 Supabase Redirect URLs；变更远端配置前需再次确认。
2. 用户提供测试邮箱并确认账号残留清理方式后，再做真实注册 / 登录 / 退出 / 找回密码冒烟。
3. 补普通用户与 admin 的浏览器页面可见性验收；不得执行真实榜单导入。
4. P0 通过后再进入预览部署。

下一轮提示词：

```text
继续 RockRoll Web MVP 上线 P0。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- docs/PERMISSIONS.md
- src/features/auth
- 当前角色页面冒烟涉及的最小文件

Auth 找回密码最小闭环已完成：发送恢复邮件、PKCE 回链、PASSWORD_RECOVERY 设置新密码；匿名测试登录页面入口已移除。
先只读确认预览与生产 /#auth Redirect URLs，再约定测试邮箱和账号清理方式后执行真实 Auth 冒烟；远端配置变化前必须明确确认。
资料库写入、导入、匹配和批处理仍仅管理员可见、可触发；不要运行 npm install，不重复真实导入，不恢复 Inbox 主导航，不改变一键导入或 match_existing，不开发艺人列表，不读取真实 PDF。
完成后中文总结。
```

建议开启新对话，并粘贴以上提示词继续。
