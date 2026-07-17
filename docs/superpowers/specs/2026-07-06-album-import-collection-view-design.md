# Album Import Collection View Design

## 背景

`/albums` 当前是手工 CRUD 专辑列表。后续专辑统一从导入链接进入资料库，页面需要从“手工新增专辑”转为“按导入集合分组的专辑浏览页”。

现有导入链路已经具备可复用数据：

- 每次链接导入的大标题：`archive_collections.title`
- 导入来源链接：`archive_collections.source_url`
- 专辑排名顺序：`archive_items.position`
- 专辑正式记录：`albums`
- 作者：`albums.artist_id -> artists.name`
- 封面、曲风、导入评语：`external_sources.raw_payload.metadata`

## 目标

1. 暂时屏蔽 `/albums` 的手工新增专辑操作。
2. `/albums` 变成按导入集合分组的专辑浏览页。
3. 每个集合内按导入链接的数据排名顺序展示专辑。
4. 专辑卡片展示封面、作者、发行年份、曲风、评语。
5. 新增曲风筛选入口，优先基于导入元数据里的 `styles` 做前端筛选。

## 排名保真原则

导入集合本质上是一份榜单或一种音乐类型百科，集合内顺序必须严格保留来源链接中的原始排名。

- 排序唯一依据是导入时写入 `archive_items.position` 的原始排名。
- 不允许按专辑标题、发行年份、更新时间、创建时间或曲风重新排序。
- 年份型榜单也必须保留来源排名：即使每个年份只选一张代表专辑，页面展示顺序仍以来源中的 `position` 为准，而不是重新按 `release_year` 排序。
- 如果 `position` 为空，这类条目只能排在已有排名条目之后。
- 前端 service 需要在读取后做一次本地排序兜底，避免数据库返回顺序变化影响榜单语义。

## 非目标

- 本轮不新增后台 worker。
- 本轮不新增 UI 框架。
- 本轮不创建新的数据库表。
- 本轮不把曲风正规化为 `genres` / `album_genres`。
- 本轮不迁移历史 JSON 元数据到正式字段。

## 数据方案

本轮使用已有表拼装：

1. 读取 `archive_collections`，按 `updated_at desc` 获取导入集合。
2. 读取这些集合下的 `archive_items`，只取 `entity_type = 'album'`，按 `collection_id, position` 排序。
3. 根据 `archive_items.entity_id` 读取 `albums` 和关联 `artists(name)`。
4. 根据 album id 读取 `external_sources` 中 `entity_type = 'album'` 的 `raw_payload.metadata`。
5. 在前端 service 中合并为 `AlbumCollectionSummary[]`。

## UI 方案

`/albums` 首屏保留总数摘要，但文案改为“通过导入链接收录”。

列表区域：

- 每个 `archive_collection` 是一个分组。
- 分组标题使用导入大标题。
- 分组副信息展示来源和来源 URL。
- 分组内专辑使用卡片展示。
- 卡片展示排名、封面、专辑名、作者、年代、曲风标签、评语。
- 无封面时显示“无封面”占位。

操作区域：

- 移除手工新增表单。
- 显示导入入口提示：请从导入收件箱使用链接导入。

筛选：

- 本轮先提供“全部曲风 / 指定曲风”的前端筛选。
- 曲风选项来自当前加载到的专辑元数据 `styles` 去重。

## 后续数据库演进

当导入展示稳定后，再考虑 migration：

- `albums.cover_url text`
- `album_styles` 或 `album_genres` 关联表
- 更精确的 album -> artist external id 映射

这些字段正规化后，列表查询可以减少对 `external_sources.raw_payload` 的依赖。

## 验证

- `npm test -- --run src/features/albums`
- 如改到导入逻辑，再跑 `npm test -- --run src/features/inbox`
- `npm run build`
