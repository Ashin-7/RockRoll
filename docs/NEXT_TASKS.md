# RockRoll 下一阶段任务

更新时间：2026-07-02

## 开发原则

- 不进行架构重构。
- 不引入新的 UI 框架或状态管理库。
- 不开发 AI、播放器、桌面端或高级统计。
- 保持 MVP 思维，优先补齐核心 CRUD 与可维护数据模型。
- 默认采用增量修改，不做仓库级分析。

## 会话读取范围

继续当前项目时，默认只读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- 当前任务相关目录

不要默认扫描整个仓库。只有当前任务被阻塞且必须确认未知实现时，才补充读取最小必要文件。

## P0

当前 P0 CRUD 本地实现状态：

- [x] Practice Edit
- [x] Practice Delete
- [x] Song Edit
- [x] Song Delete
- [x] P0 CRUD 最终复核与提交
- [x] Supabase Schema 稳定化复核

## P1

### Artist CRUD

状态：已完成并提交。

### Album CRUD

状态：已完成并提交。

### Archive 管理 MVP

状态：已完成本地增量实现，待提交。

已完成范围：

- Archive Collection 列表与创建。
- Archive Collection 详情。
- 手动添加 Album 类型 Archive Item。
- Supabase 与本地 Demo Mode 双路径。
- `#archive/:id` 路由。

未完成范围：

- Archive Item 编辑与删除。
- Artist / Song 类型条目的 UI 输入。
- 与 Album 列表的选择器联动。
- 匿名旅行者正式导入代码。
- 外部来源映射表扩展。

## P2

### Media Library

目标：围绕媒体资产建立最小管理流程。

建议范围：

- 先管理 media metadata，不急于做复杂上传和播放器。
- 使用现有 `media_assets` 与 `media_links` 表。
- 支持按 Song / Practice / Artist / Album 关联媒体。

### 匿名旅行者导入预览 MVP

目标：基于 `docs/IMPORT_ANONTRAVELER.md` 做单 URL、低频、只读公开 JSON 的导入预览。

前置条件：

- Archive MVP 已具备 Collection / Item 基础模型。
- 仍不写批量抓取，不绕过登录，不读取私人数据。

建议范围：

- 输入一个匿名旅行者公开 URL。
- 请求一次 version JSON API。
- 生成 Artist / Album / Archive Item 预览。
- 用户确认前不写入数据库。
- Song 暂时跳过。

## 推荐执行顺序

1. Archive MVP 收尾复核与提交。
2. Media Library。
3. 匿名旅行者导入预览 MVP。

当前建议先完成 Archive MVP 的提交，再开启新对话处理 Media Library。
