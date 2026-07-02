# 匿名旅行者数据导入评估

更新时间：2026-07-02

目标页面：

https://www.anontraveler.com/rank/version/65f3e6194e5b897fbb0a7bfa

## 结论

- 目标页存在公开 JSON XHR 接口，当前不需要 Scrapling。
- 页面内容可由 JSON API 直接获得，优先使用 API 响应结构评估导入，不建议从 DOM 文本反解析。
- 本次只做导入方案评估，不写正式导入代码，不保存全量外部数据。
- 不绕过登录、不读取私人数据；页面在未登录状态下仍返回公开榜单 JSON。
- 若后续实现导入，应先做手动触发、低频、可预览、可回滚的 MVP 导入流程。

## Network 观察结果

使用浏览器打开目标页时观察到以下 JSON / XHR 请求：

| 请求 | 方法 | 说明 |
| --- | --- | --- |
| `/api/user/do_refresh` | GET | 未登录状态返回 `{"data":[],"rstno":-1}`，不应依赖登录态。 |
| `/api/rank/version/65f3e6194e5b897fbb0a7bfa` | GET | 目标版本页核心数据，包含文章、版本条目与专辑数据。 |
| `/api/rank/versions_related/65f3e6194e5b897fbb0a7bfa/5e9f0f6711ee090e6b7069d5` | POST | 相关版本分页列表，非本次导入核心。 |
| `/api/rank/rank/5e9f0f6711ee090e6b7069d5` | GET | 主榜单数据，包含榜单信息与 items。 |

页面标题为“泛摇滚领域坐标专辑 - 经典摇滚年代篇”。目标版本接口返回的核心结构包括：

- `data.article`：版本文章信息，如标题、正文、作者、主榜单、发布时间、更新时间、风格。
- `data.items`：版本条目，观察到约 310 条；字段包括 `_id`、`title`、`content`、`score`、`main_artist_id`、`album_id`、`main_rank_id`、`rank_order`、`main_album`。
- `main_album`：专辑详情，包含 `title`、`title_cn_simp`、`primary_img`、`year`、`album_type`、`artists`、`styles`、`relate_styles`、`rating_anon` 等。
- 主榜单接口的 `data.items` 观察到约 100 条，适合辅助理解主榜单维度，但目标页版本数据更贴近当前页面展示。

## 是否需要 Scrapling

当前不建议引入 Scrapling。

原因：

- 已有公开 JSON API，字段结构比 DOM 文本稳定，能减少解析误差。
- RockRoll 当前阶段强调 MVP、少依赖、少重构；引入 Scrapling 会增加维护成本。
- 目标页不是需要复杂浏览器反爬、验证码、登录态或私有数据访问的场景。

仅在以下情况再评估 Scrapling：

- JSON API 消失或返回字段严重缩水。
- 页面关键字段只存在于渲染后的 DOM，且 DOM 结构频繁变化。
- 后续需要批量评估多个公开页面，而普通 API/HTML 方式已无法稳定覆盖。

## 合规与请求策略

后续如果实现导入，应遵守这些边界：

- 只导入公开页面中未登录即可访问的数据。
- 不使用 Cookie、Token、私有接口或绕过登录。
- 不高频请求；建议手动触发单页导入，单次只请求目标 version API，必要时再请求 rank API。
- 不抓取图片二进制；只保存来源图片 URL 或完全跳过图片。
- 保留来源 URL、外部 ID、导入时间，便于追踪和删除。
- 导入前展示预览，让用户确认将创建或匹配哪些 Artist / Album。

## 字段映射方案

### Artist

来源字段：

- `main_artist_id._id`
- `main_artist_id.name`
- `main_album.artists[]`

建议映射：

| 匿名旅行者字段 | RockRoll Artist 字段 | 说明 |
| --- | --- | --- |
| `main_artist_id.name` | `artists.name` | 主艺人名，作为优先匹配键。 |
| `main_artist_id._id` | 暂无直接字段 | 不建议塞进业务字段；后续可考虑外部来源映射表。 |
| `main_album.artists[].name` | `artists.name` | 多艺人专辑可补充创建或匹配协作艺人。 |
| 风格 / 国家信息 | 暂不映射 | 当前 API 样例未稳定提供国家，RockRoll Artist 只有 `country`、年份和 notes。 |

当前 RockRoll Artist 字段较少，建议只创建或匹配艺人名称。外部 ID、来源 URL、原始风格信息不适合长期放入 `notes`，除非后续确认没有外部来源映射表。

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

| 匿名旅行者字段 | RockRoll Album 字段 | 说明 |
| --- | --- | --- |
| `main_album.title` | `albums.title` | 专辑原名，作为主要标题。 |
| `main_artist_id.name` / `main_album.artists[0].name` | `albums.artist_id` | 先匹配或创建 Artist，再关联主艺人。 |
| `main_album.year` | `albums.release_year` | 可直接映射年份。 |
| `main_album.album_type` | `albums.album_type` | 需要转换到 RockRoll 当前枚举：`album`、`ep`、`live`、`compilation`。未知值默认 `album` 并记录风险。 |
| `item.content` | `albums.notes` | 可作为导入说明，建议加来源前缀。 |
| `main_album.styles[]` | 暂不直接映射 | 当前 Album 没有 genre/style 字段。可暂存到 notes，或等 Archive/Genre 能力明确后再映射。 |
| `main_album.primary_img` | 暂不直接映射 | 当前 Album 类型没有封面字段；不建议新增 schema。 |

去重建议：

- 第一优先：外部来源映射表中的 `source = anontraveler` + `external_id = main_album._id`。
- MVP 临时方案：同一用户下按 `artist_id + title + release_year` 软匹配。
- 不建议只按标题匹配，因为同名专辑和重录版本风险较高。

### Song

目标页面是“专辑榜 / 专辑版本页”，不是歌曲榜或曲目页。

建议：

- 不从该页面自动创建 Song。
- 不把专辑条目强行映射为 Song。
- 如果后续匿名旅行者存在歌曲榜或曲目 API，再单独评估 Song 导入。

可预留的未来映射：

| 匿名旅行者字段 | RockRoll Song 字段 | 说明 |
| --- | --- | --- |
| 歌曲标题字段 | `songs.title` | 当前页面未提供。 |
| 歌曲艺人字段 | 未来 Song-Artist 关联 | 当前 RockRoll Song 列表还未稳定暴露 artist_id 输入。 |
| 年份 / 说明 | `songs.release_year` / `songs.notes` | 仅适用于歌曲来源，不适用于本专辑榜。 |

### Archive

当前 RockRoll Archive 只有 `artists`、`albums`、`genres` 计数摘要，尚未形成可导入的 Archive 实体。

建议把匿名旅行者页面视为“来源集合 / 榜单上下文”，等 Archive 管理能力明确后再落库：

| 匿名旅行者字段 | Archive 方向 | 说明 |
| --- | --- | --- |
| `article._id` | 外部来源 ID | 表示具体版本页。 |
| `article.title` | 集合标题 | 如“泛摇滚领域坐标专辑 - 经典摇滚年代篇”。 |
| `article.content` | 集合说明 | 页面作者说明和更新记录。 |
| `article.url` / 目标 URL | 来源 URL | 用于追踪来源。 |
| `article.styles[]` / `rank.info.styles[]` | 风格标签 | 当前可作为未来 Genre / Archive 标签候选。 |
| `item.rank_order` | 集合内排序 | 保存条目顺序，不应覆盖 Album 本身属性。 |
| `item.content` | 集合内备注 | 更像“榜单条目注释”，不一定等同 Album notes。 |

如果 Archive 先做 MVP，可以考虑一个轻量模型：

- Archive Collection：来源页面、标题、说明、来源类型、导入时间。
- Archive Item：collection_id、entity_type、entity_id、rank_order、source_note、external_item_id。

这会比把榜单信息塞进 Album/Song notes 更干净，但需要后续 schema 决策；当前不建议在本评估任务里新增。

## 推荐导入流程

预览 MVP 已采用以下前两步：

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

冲突策略：

- Artist：同名匹配，冲突时让用户选择已有项或新建。
- Album：优先按外部 ID 匹配；无外部 ID 表时按 artist + title + year 预匹配。
- Song：当前来源跳过。
- Archive：在 Archive 实体落地前只做预览，不写入。

## 风险

- API 未公开文档化，字段可能变化。
- 专辑标题、中文标题、罗马化标题的选择需要产品决策。
- `rank_order` 在不同接口中语义不完全一致，版本接口更贴近目标页面展示。
- 当前 RockRoll 没有外部来源映射表，长期去重会受限。
- 当前 Album 没有封面、风格、多艺人关系字段，部分来源数据只能暂缓或进入 notes。

## 建议下一步

短期继续保持“预览先行”。正式导入前建议先补外部来源映射表或确认临时去重策略，再实现用户确认后的 Artist / Album / Archive 写入。
