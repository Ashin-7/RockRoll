# RockRoll 权限落地审计

更新时间：2026-07-08

## 审计目标

对照 `docs/PERMISSIONS.md`，盘点当前 Archive / Albums / Import 相关 UI、service 和 Supabase RLS 的落地差距。本文只记录缺口和下一步小任务，不重新设计权限矩阵。

核心判断：

- Practice 和 Songs / 曲目仍是普通登录用户可维护的私有 CRUD。
- 除 Practice 和 Songs / 曲目外，资料库 CRUD、导入、确认、提交、匹配、回填、批量处理默认管理员可见、可操作。
- Archive / Albums 等正式资料可以 public 读取，但写入必须由 admin 约束，不能只靠前端隐藏入口。

## 当前总体结论

| 层级 | 当前状态 | 结论 |
| --- | --- | --- |
| UI | Archive 集合和条目、Album 详情仍存在普通用户可见的编辑 / 删除 / 新增入口 | 需要优先收口为 admin 可见 |
| Service | Archive / Albums 写函数多数只检查登录或 demo session，不检查 admin | 需要补 admin role check 和测试 |
| RLS | public read 已覆盖；import_* 已 admin-only；但 artists / albums / archive / external_sources 仍允许普通用户写 private 行 | 需要新增 migration 收紧资料库写入模型 |
| Import | 写入、生成 Review plan、commit、更新 review action 已有 service admin check，RLS 也限制 admin | 主要补读接口显式检查或测试 |
| Demo mode | Archive / Albums service 在 demo session 下仍允许本地 CRUD | 需要决定 demo 是模拟 admin，还是也遵守 admin-only |

## UI 缺口

| 范围 | 当前行为 | 矩阵要求 | 下一步 |
| --- | --- | --- | --- |
| `src/features/archive/ArchivePage.tsx` 集合卡片 | 编辑 / 删除集合按钮直接渲染 | Archive collection CRUD 仅 admin 可见可操作 | 用 `importRole === 'admin'` 包裹编辑 / 删除按钮，并补非 admin 不显示测试 |
| `src/features/archive/ArchivePage.tsx` 手动集合表单 | 手动新增 / 编辑集合表单直接渲染 | 手动维护 public archive collection 仅 admin | 非 admin 隐藏手动 CRUD 表单；URL 预览可以保留，导入按钮继续 admin-only |
| `src/features/archive/ArchiveDetailPage.tsx` 条目操作 | 新增 / 编辑 / 删除 archive item 表单与按钮直接渲染 | Archive item CRUD 仅 admin | 页面加载 admin role，非 admin 只读展示条目 |
| `src/features/albums/AlbumDetailPage.tsx` 专辑操作 | 编辑 / 删除专辑按钮和编辑表单直接渲染 | Albums CRUD 仅 admin | 加 admin role gate，非 admin 只读专辑详情 |
| `src/features/albums/AlbumListPage.tsx` 专辑列表 | 当前主要是 public browse，下拉筛选已是只读 | 符合 public 查询方向 | 保持只读；若后续新增写入口必须先 admin gate |
| `src/features/inbox/InboxPage.tsx` | 主导航已隐藏，旧入口停用；底层导入入口主要由 Archive 复用 | 导入写入仅 admin | 保持停用状态，不优先增强 Inbox UI |

## Service 缺口

| 范围 | 当前行为 | 风险 | 下一步 |
| --- | --- | --- | --- |
| `archive.service.ts` `createArchiveCollection` / `updateArchiveCollection` / `deleteArchiveCollection` | 只要求 Supabase session 或 demo session | 普通登录用户仍可触发 archive collection 写入 | 在 service 写函数入口调用 `getCurrentUserImportRole()` 或共享 admin guard；补普通用户拒绝测试 |
| `archive.service.ts` `addArchiveItem` / `updateArchiveItem` / `deleteArchiveItem` | 只要求登录 / demo，未显式检查 admin | 普通登录用户仍可触发 archive item 写入 | 同上，补 archive item 写入拒绝测试 |
| `albums.service.ts` `createAlbum` / `updateAlbum` / `deleteAlbum` | 只要求 Supabase session 或 demo session | 普通登录用户仍可触发 album 写入 | 加 admin guard；补普通用户不能写 album 的 service 测试 |
| `inbox.service.ts` 写入链路 | `saveImportCandidatesDraft`、`deleteImportDraftJob`、`createImportReviewPlan`、`commitPublicImportReviewPlan`、`updateImportReviewItemAction` 已检查 admin | 方向正确 | 保持；补回归测试确保非 admin 被拒绝 |
| `inbox.service.ts` 读取链路 | `listImportDraftJobs`、`listImportCandidates`、`listImportReviewItems` 未显式检查 admin | 依赖 RLS；UI 停用后风险较低，但 service 语义不够明确 | 可以补显式 admin check 或至少补 RLS/service mock 测试，避免普通用户读取 import_* |
| Demo mode | Archive / Albums demo session 可写 | demo 行为和新权限矩阵未明确 | 建议：demo 仅用于本地演示时模拟 admin；若不是 admin demo，则资料库写入也应拒绝 |

## Supabase / RLS 缺口

已检查 migration：

- `supabase/migrations/20260702153000_create_archive_collections.sql`
- `supabase/migrations/20260706034529_public_library_admin_import.sql`

| 表 / 能力 | 当前 RLS | 矩阵要求 | 结论 |
| --- | --- | --- | --- |
| `profiles.role` | 默认 `user`，`is_public_library_admin(user_id)` 通过 `profiles.role = 'admin'` 判断 | admin 权限来源明确 | 基础可用；仍需真实环境设置管理员 |
| `artists` | public 可读；owner 可写 private；admin 可写 public | Artists CRUD 默认 admin-only | 需新 migration 收紧普通用户写 private artist 的能力，或明确私有 artist 是否属于 Songs 例外 |
| `albums` | public 可读；owner 可写 private；admin 可写 public | Albums CRUD 默认 admin-only | 需新 migration 收紧 ordinary user album 写入 |
| `archive_collections` | public 可读；owner 可写 private；admin 可写 public | Archive CRUD admin-only | 需新 migration 收紧 ordinary user archive collection 写入 |
| `archive_items` | public 可读；owner 可写 private；admin 可写 public | Archive item CRUD admin-only | 需新 migration 收紧 ordinary user archive item 写入 |
| `external_sources` | public 可读；owner 可写 private；admin 可写 public | External source CRUD admin-only | 需新 migration 收紧 ordinary user external source 写入 |
| `import_jobs` / `import_candidates` / `import_drafts` | `for all` admin + owner | admin-only | 基本符合 |
| `import_review_items` | select / insert / update / delete 均 admin + owner，UPDATE 有 `USING` 和 `WITH CHECK` | admin-only | 基本符合 |

RLS 下一步建议：

1. 新增 migration，不修改历史 migration。
2. 将 `artists`、`albums`、`archive_collections`、`archive_items`、`external_sources` 的写策略收紧为 admin-only，或先明确是否仍保留普通用户 private artist/album 的兼容需求。
3. UPDATE policy 必须同时保留 `USING` 和 `WITH CHECK`。
4. public SELECT policy 保持 `visibility = 'public'`。
5. 如需要保留 Songs 私有 CRUD，不要误改 `songs` / `practice` 相关 RLS。

## 建议落地顺序

1. UI 第一刀：隐藏 ArchivePage 集合手动 CRUD、集合编辑 / 删除、ArchiveDetailPage 条目 CRUD、AlbumDetailPage 编辑 / 删除。
2. Service 第二刀：给 Archive / Albums 写函数补 admin guard，并补普通用户拒绝测试。
3. Import 回归：补 `inbox.service.ts` 非 admin 无法写入和无法读取 import_* 的测试。
4. RLS 第三刀：新增 migration 收紧 public library 表写策略，只保留 admin 写入。
5. Demo mode 决策：决定 demo session 是否模拟 admin，并在 service 测试里固定行为。

## 暂不处理

- 不开发 AI 候选笔记补全，仅保留为后续评估。
- 不新增后台队列、RPC 或批量导入。
- 不恢复 Inbox 页面作为主入口。
- 不改 Practice / Songs 的私有 CRUD 权限。
