# 匿名旅行者数据导入评估

更新时间：2026-07-06

目标页面：

<https://www.anontraveler.com/rank/version/65f3e6194e5b897fbb0a7bfa>

## 当前结论

RockRoll 当前不建议立刻自建完整后端。

现有 React + Supabase 架构可以支撑匿名旅行者数据导入 MVP，也可以支撑图片、视频、音频等媒体资产的基础导入。下一步重点不是替换后端，而是把导入流程设计成可预览、可确认、可回滚、可分批的管线。

推荐路线：

1. Supabase-first。
2. Import Inbox-first。
3. Media metadata-first。
4. Worker later。

短期继续使用 Supabase Database + Supabase Storage + RLS。中期如需轻量服务端逻辑，再考虑 Supabase Edge Functions。后期当数据量、转码、队列、重试需求明确后，再补独立 import worker 或自建后端服务。

## 用户确认后正式导入设计评估

当前结论：暂不直接实现写入 `artists` / `albums` / `archive` / `media_assets` 的正式导入按钮。

原因：

- 现有 `import_jobs` + `import_candidates` 已能保存 Import Inbox 草稿，但 `import_candidates` 仍偏“候选摘要”，不足以承载用户确认、匹配结果、跳过原因和正式写入追踪。
- `ImportEntityType` 当前只有 `artist` / `album` / `song`，匿名旅行者预览中的 Archive Collection / Archive Item 还没有进入候选类型模型。
- 当前缺少稳定的外部来源映射能力；如果直接按名称写正式库，重复导入同一匿名旅行者页面时容易产生重复 Artist / Album / Archive。
- 用户确认后的正式导入需要每条正式数据继续绑定真实 Supabase `user_id`，并依赖各正式表自己的 RLS policy，不应使用 service role key 或绕过 RLS。

建议采用两阶段确认模型：

1. Review Plan
   - 从 `import_candidates` 和匿名旅行者预览 payload 生成“导入计划”。
   - 对每个 Artist / Album / Archive Collection / Archive Item 标记动作：`create`、`match_existing`、`skip`。
   - 只展示计划和冲突，不写正式资料库。

2. Commit Confirmed Plan
   - 用户明确确认后再写正式表。
   - 写入顺序建议为 Artist -> Album -> Archive Collection -> Archive Item -> Media metadata。
   - 每一步都写入当前真实用户的 `user_id`，并让 RLS 正常校验。
   - 写入后记录外部来源映射，避免重复导入。

MVP 最小状态建议：

- `draft`：已保存到 Import Inbox，尚未进入确认计划。
- `reviewing`：已生成计划，等待用户确认匹配 / 跳过。
- `ready`：用户已确认可写入正式库。
- `imported`：正式写入完成。
- `skipped`：用户跳过。
- `failed`：正式写入失败，需要展示错误并允许重试。

当前最小可执行下一步不是正式写库，而是先补“外部来源映射与确认计划”的设计 / 数据落点。

推荐新增或确认的能力：

- 外部来源映射：记录 `user_id`、`source_name`、`source_id`、`entity_type`、`entity_id`、`source_url`。
- 确认计划：记录每条候选的目标动作、匹配到的正式实体 ID、用户跳过原因、失败信息。
- 幂等约束：同一用户下 `source_name + source_id + entity_type` 不应重复映射到多个正式实体。
- RLS：映射表与确认计划表都必须按 `user_id = auth.uid()` 隔离，正式导入失败时只修对应 policy，不绕过 RLS。

## 外部来源映射与幂等导入策略

当前结论：复用已有 `external_sources`，不新增第二张外部来源映射表。

原因：

- `external_sources` 已包含 `user_id`、`entity_type`、`entity_id`、`source_name`、`source_id`、`source_url`、`raw_payload`，职责与外部来源映射一致。
- 原唯一约束是 `user_id + source_name + source_id`，同一个外部 ID 如果后续同时映射到 Archive Collection / Archive Item / Media Asset 会被过早阻塞。
- MVP 更适合把幂等键收窄为 `user_id + source_name + source_id + entity_type`，避免同一用户同一外部实体类型重复映射到多个正式实体。

本轮新增 migration：

- 扩展 `external_sources.entity_type`，允许 `archive_collection`、`archive_item`、`media_asset`。
- 调整 `external_sources` 唯一约束为 `user_id + source_name + source_id + entity_type`。
- 新增 `import_review_items` 作为确认计划落点。

`import_review_items` 的定位：

- 只记录导入计划，不写正式资料库。
- 可承接 `import_candidates` 之外的 Archive Collection / Archive Item / Media metadata 计划项。
- 每条计划绑定 `user_id`、`import_job_id`、可选 `import_candidate_id`、`source_name`、`source_id`、`entity_type`。
- `planned_action` 最小支持 `create`、`match_existing`、`skip`、`failed`。
- `target_entity_id` 仅在用户选择匹配已有正式实体或正式写入成功后使用。
- `review_payload` 保存生成计划时需要的轻量上下文，不作为长期正式资料库。

幂等策略：

1. 保存 Inbox 草稿：仍写 `import_jobs` + `import_candidates`，允许用户重复预览，但后续生成计划时按来源键收敛。
2. 生成确认计划：对同一用户的 `source_name + source_id + entity_type` 使用唯一约束避免重复计划项。
3. 用户确认正式写入：正式表写入成功后，再写 `external_sources` 映射。
4. 重复导入同一来源：优先读取 `external_sources` 命中既有正式实体；未命中时读取 `import_review_items` 复用尚未提交的计划。

RLS / 权限策略：

- `import_review_items` 启用 RLS。
- select / update / delete 限制为 `user_id = auth.uid()`。
- insert / update 还要求引用的 `import_jobs` 属于当前用户；如有关联 `import_candidate_id`，候选也必须属于当前用户且同属该 import job。
- 新表显式 `grant select, insert, update, delete to authenticated`，避免 Supabase 新建 public 表未自动暴露到 Data API 时前端不可访问。

暂不做：

- 不做批量抓取。
- 不做转码、缩略图、波形分析。
- 不做后台队列或 worker。
- 不做 service role key 前端写入。
- 不把匿名旅行者专辑榜条目强行写成 Song。

## 现有页面与接口观察

目标页面存在公开 JSON / XHR 接口，当前不需要引入 Scrapling 或浏览器爬虫。

已观察到的接口：

| 请求 | 方法 | 说明 |
| --- | --- | --- |
| `/api/user/do_refresh` | GET | 未登录状态返回 `{"data":[],"rstno":-1}`，不应依赖登录态。 |
| `/api/rank/version/65f3e6194e5b897fbb0a7bfa` | GET | 目标版本页核心数据，包含文章、版本条目与专辑数据。 |
| `/api/rank/versions_related/65f3e6194e5b897fbb0a7bfa/5e9f0f6711ee090e6b7069d5` | POST | 相关版本分页列表，非当前 MVP 核心。 |
| `/api/rank/rank/5e9f0f6711ee090e6b7069d5` | GET | 主榜单数据，包含榜单信息和 items。 |

目标版本接口返回的核心结构包括：

- `data.article`：版本文章信息，例如标题、正文、作者、主榜单、发布时间、更新时间、风格。
- `data.items`：版本条目，观察到约 310 条；字段包括 `_id`、`title`、`content`、`score`、`main_artist_id`、`album_id`、`main_rank_id`、`rank_order`、`main_album`。
- `main_album`：专辑详情，包含 `title`、`title_cn_simp`、`primary_img`、`year`、`album_type`、`artists`、`styles`、`relate_styles`、`rating_anon` 等。

当前判断：页面内容可由 JSON API 直接获得，优先使用 API 响应结构评估导入，不建议从 DOM 文本反解析。

## 是否需要 Scrapling

当前不建议引入 Scrapling。

原因：

- 已有公开 JSON API，字段结构比 DOM 文本稳定。
- RockRoll 当前强调 MVP、少依赖、少重构。
- 目标页面不是必须绕过登录、验证码或私有数据访问的场景。

仅在以下情况再评估 Scrapling：

- JSON API 消失或字段严重缩水。
- 关键字段只存在于渲染后的 DOM。
- 后续需要批量评估多个公开页面，而普通 API / HTML 方式无法覆盖。

## 合规与请求策略

后续实现导入时应遵守：

- 只导入公开页面中未登录即可访问的数据。
- 不使用 Cookie、Token、私有接口或绕过登录。
- 不高频请求；建议手动触发单页导入。
- 单次只请求目标 version API，必要时再请求 rank API。
- 不抓取图片二进制；MVP 只保存来源图片 URL 或跳过图片。
- 保留来源 URL、外部 ID、导入时间，便于追踪和删除。
- 导入前展示预览，让用户确认将创建或匹配哪些 Artist / Album / Archive。

## 推荐导入架构

匿名旅行者导入不应该让前端直接把外部数据写入正式资料库。

推荐采用分层管线：

1. Import Batch
   - 记录一次导入任务。
   - 保存来源、状态、总数、成功数、失败数、创建者、创建时间。

2. Import Items / Inbox
   - 每条外部数据先进入候选区。
   - 保留原始 payload、解析后的字段、匹配结果、错误信息。
   - 不直接污染正式 songs / artists / albums / media_assets。

3. Preview / Review
   - 用户查看候选数据。
   - 可确认、跳过、修正、合并重复项。

4. Commit
   - 分批 upsert 到正式表。
   - 正式写入 artists、albums、archive_collections、archive_items、media_assets 等。

5. Audit / Retry
   - 每条导入记录保留状态。
   - 失败项可以重试。
   - 已导入项可以追踪来源。

## 推荐导入状态

导入项建议至少包含以下状态：

- `pending`：已进入 Inbox，尚未解析或匹配。
- `matched`：已找到可能匹配的正式数据。
- `ready`：用户确认可写入正式库。
- `imported`：已写入正式库。
- `skipped`：用户跳过。
- `failed`：导入失败，可查看错误并重试。

## 去重与幂等原则

大数据量导入最重要的是幂等，而不是一次性写入速度。

建议每条外部数据保留：

- `source`：例如 `anontraveler`。
- `external_id`：外部系统 ID。
- `source_url`：来源链接。
- `checksum`：可选，用于文件或 payload 去重。
- `normalized_title`：用于标题匹配。
- `raw_payload`：原始数据快照。

正式库写入时，应尽量使用 `source + external_id` 或用户确认后的匹配关系避免重复导入。

## 字段映射建议

### Artist

来源字段：

- `main_artist_id._id`
- `main_artist_id.name`
- `main_album.artists[]`

建议映射：

| 匿名旅行者字段 | RockRoll 字段 | 说明 |
| --- | --- | --- |
| `main_artist_id.name` | `artists.name` | 主艺人名，作为优先匹配键。 |
| `main_artist_id._id` | 外部来源映射 | 不建议塞进业务字段。后续应进入外部来源映射表。 |
| `main_album.artists[].name` | `artists.name` | 多艺人专辑可补充创建或匹配协作艺人。 |
| 风格 / 国家信息 | 暂不映射 | 当前 Artist 字段较少，先不扩大 schema。 |

当前 RockRoll Artist 字段较少，建议只创建或匹配艺人名称。外部 ID、来源 URL、原始风格信息不适合长期塞进 `notes`，除非后续确认没有外部来源映射表。

### Album

来源字段：

- `main_album._id`
- `main_album.title`
- `main_album.title_cn_simp`
- `main_album.year`
- `main_album.album_type`
- `main_album.primary_img`
- `main_album.styles[]`
- `item.content`
- `item.rank_order`

建议映射：

| 匿名旅行者字段 | RockRoll 字段 | 说明 |
| --- | --- | --- |
| `main_album.title` | `albums.title` | 专辑原名，作为主要标题。 |
| `main_artist_id.name` / `main_album.artists[0].name` | `albums.artist_id` | 先匹配或创建 Artist，再关联主艺人。 |
| `main_album.year` | `albums.release_year` | 可直接映射年份。 |
| `main_album.album_type` | `albums.album_type` | 转换到 RockRoll 当前枚举；未知值默认 `album` 并记录风险。 |
| `item.content` | `albums.notes` | 可作为导入说明，建议加来源前缀。 |
| `main_album.styles[]` | 暂不直接映射 | 当前 Album 没有 genre/style 字段。可暂存到 notes 或等待 Genre 能力明确。 |
| `main_album.primary_img` | `media_assets.source_url` | 不建议直接加到 Album schema；应进入媒体资产候选。 |

去重建议：

- 第一优先：外部来源映射表中的 `source = anontraveler` + `external_id = main_album._id`。
- MVP 临时方案：同一用户下按 `artist_id + title + release_year` 软匹配。
- 不建议只按标题匹配，因为同名专辑和重录版本风险较高。

### Song

目标页面是专辑榜 / 专辑版本页，不是歌曲榜或曲目页。

建议：

- 不从该页面自动创建 Song。
- 不把专辑条目强行映射为 Song。
- 如果后续匿名旅行者存在歌曲榜或曲目 API，再单独评估 Song 导入。

### Archive

该页面更像“来源集合 / 榜单上下文”，适合进入 Archive Collection / Archive Item。

建议映射：

| 匿名旅行者字段 | Archive 方向 | 说明 |
| --- | --- | --- |
| `article._id` | 外部来源 ID | 表示具体版本页。 |
| `article.title` | 集合标题 | 例如榜单标题。 |
| `article.content` | 集合说明 | 页面作者说明和更新记录。 |
| 目标 URL | 来源 URL | 用于追踪来源。 |
| `article.styles[]` / `rank.info.styles[]` | 风格标签候选 | 等 Genre / Archive 标签能力明确后再映射。 |
| `item.rank_order` | 集合内排序 | 保存条目顺序，不覆盖 Album 本身属性。 |
| `item.content` | 集合内备注 | 更像榜单条目注释，不等同 Album notes。 |

轻量模型建议：

- Archive Collection：来源页面、标题、说明、来源类型、导入时间。
- Archive Item：`collection_id`、`entity_type`、`entity_id`、`rank_order`、`source_note`、`external_item_id`。

## 图片、视频、音频导入原则

媒体文件不应该存进 Postgres 字段。

推荐：

- Supabase Storage 或未来私有对象存储保存文件。
- Postgres 只保存 metadata、storage path、关联关系、状态。
- bucket 默认私有。
- 前端使用真实 Supabase session 上传。
- 不在前端暴露 service role key。

统一使用 `media_assets` 管理：

- `image`
- `video`
- `audio`
- `score`
- `guitar_pro`
- `document`

媒体资产建议逐步支持：

- `id`
- `user_id`
- `media_type`
- `title`
- `storage_path`
- `source_url`
- `mime_type`
- `file_size`
- `duration_seconds`
- `width`
- `height`
- `checksum`
- `notes`
- `created_at`
- `updated_at`

MVP 阶段：

- 支持外链 metadata 导入。
- 支持手动上传图片 / 音频 / 视频到 Storage。
- 建立 media asset 与 song / artist / album / archive item 的关联。
- 不做转码。
- 不做波形分析。
- 不做缩略图生成。

中期：

- 增加文件大小限制。
- 增加 MIME 类型校验。
- 增加简单 thumbnail / poster 字段。
- 增加导入失败重试。

后期：

- 独立 worker 生成视频 poster、音频 waveform、缩略图。
- 支持断点续传。
- 支持批量后台导入。
- 支持私有云对象存储替换 Supabase Storage。

## 大数据量应对原则

为避免后期数据量变大后重做架构，当前设计应遵守：

- 所有用户数据表必须有 `user_id`。
- 所有用户数据表必须按 `auth.uid()` 做 RLS。
- 列表必须分页，不做全量读取。
- 导入必须分批，不做一次性大事务。
- 外部数据必须先进入 Inbox。
- 正式写入必须支持幂等。
- 媒体文件只存对象存储路径。
- 大文件处理不放在前端主线程。
- 长任务最终交给 Edge Function 或 worker。

## 是否需要自建后端

短期不需要。

以下条件出现后，再考虑自建后端或独立导入 worker：

- 单次导入数据量达到几十万首歌或上百万条元数据。
- 需要页面关闭后仍继续执行长时间导入任务。
- 需要后台任务队列、失败重试、断点续传、速率限制。
- 需要隐藏外部 API key、cookie、私密 token。
- 需要抓取外部站点并做反爬、限速、缓存。
- 需要视频转码、音频波形分析、音频指纹、封面缩略图生成。
- Supabase Edge Functions 的运行时间、内存、依赖或并发限制不够。
- Private Cloud First 进入自部署阶段，需要把导入 worker 跑在自己的服务器、NAS 或私有云环境。

在这些条件出现前，完整自建后端属于提前复杂化。

## 推荐导入流程

预览 MVP 已采用前两步：

1. 输入匿名旅行者公开 URL，解析 `rank/version/:versionId`。
2. 请求 `/api/rank/version/:versionId`，只读取公开 JSON。
3. 在 RockRoll 内生成预览：将创建的 Artist、Album、跳过的 Song、待归档的 Archive 集合。
4. 用户确认后执行导入，记录来源 ID 和冲突处理结果。

当前已完成：

- Inbox 内单 URL 预览表单。
- 只读公开 JSON API。
- Artist / Album / Archive Item 预览。
- Song 跳过提示。
- 用户确认前不写入数据库。

当前未完成：

- 正式导入写库。
- Artist / Album 去重确认。
- Archive Collection / Item 写入。
- 外部来源映射表。
- 媒体资源写入 Storage。

## 冲突策略

- Artist：同名匹配，冲突时让用户选择已有项或新建。
- Album：优先按外部 ID 匹配；无外部 ID 表时按 artist + title + year 预匹配。
- Song：当前来源跳过。
- Archive：在 Archive 实体落地前只做预览，不写入。
- Media：MVP 仅保存外链或 metadata，不自动下载二进制。

## 当前下一步

不要直接进入完整导入系统开发。

建议先继续完成真实 Supabase session 下的 Practice CRUD UI 验证。原因：

- Auth + RLS + 当前用户 CRUD 是后续所有导入能力的基础。
- 如果 Practice 正式 UI 还没有跑通，导入系统写入正式库会放大问题。
- 导入数据最终也必须绑定真实用户并通过 RLS。

Practice 真实 CRUD UI 验证通过后，再进入匿名旅行者导入 MVP。

## 匿名旅行者导入 MVP 建议范围

第一版只做：

- 导入一份小型匿名旅行者 JSON / CSV。
- 数据进入 Inbox preview。
- 用户确认后写入正式库。
- 图片先支持外链或手动上传。
- 视频 / 音频先建立 metadata 和 Storage path。
- 每条数据绑定当前真实 Supabase user id。
- 全程使用 RLS。

第一版不做：

- 自动大规模抓取。
- 视频转码。
- 音频波形。
- 音频指纹。
- 自动去重合并复杂策略。
- 自建后端。
- 自建任务队列。

## 风险

- API 未公开文档化，字段可能变化。
- 专辑标题、中文标题、罗马化标题的选择需要产品决策。
- `rank_order` 在不同接口中语义可能不完全一致，版本接口更贴近目标页面展示。
- 当前 RockRoll 没有外部来源映射表，长期去重会受限。
- 当前 Album 没有封面、风格、多艺人关系字段，部分来源数据只能暂缓或进入 notes / media_assets。

## 建议下一步

短期继续保持“预览先行”。正式导入前建议先补外部来源映射表，或确认临时去重策略，再实现用户确认后的 Artist / Album / Archive / Media 写入。
