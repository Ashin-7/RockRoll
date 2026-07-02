# RockRoll 下一阶段任务

更新时间：2026-07-02

## 开发原则

- 不进行架构重构。
- 不引入新框架。
- 不引入 Zustand、Redux、TanStack 等大型依赖。
- 不开发 AI 功能。
- 不开发 Tauri。
- 不开发播放器。
- 保持 MVP 思维，优先补齐核心 CRUD。

## P0

### Practice Edit

目标：允许用户编辑已有练习记录。

建议范围：

- 新增 `updatePracticeSession` service。
- 复用现有 Practice 表单或抽取最小编辑表单状态。
- 保存后刷新练习历史与统计信息。
- 覆盖 service 与页面交互测试。

验收标准：

- 用户可以从练习历史进入编辑状态。
- 修改时长、BPM、关注点、反思、关联歌曲后可保存。
- 保存后列表与统计同步更新。

### Practice Delete

目标：允许用户删除已有练习记录。

建议范围：

- 新增 `deletePracticeSession` service。
- 页面提供删除入口与最小确认机制。
- 删除后刷新练习历史与统计信息。
- 覆盖删除成功、删除失败与空列表状态测试。

验收标准：

- 用户可以删除自己的练习记录。
- 删除操作受 RLS 保护。
- 删除后统计结果同步变化。

### Song Edit

目标：允许用户编辑歌曲基础信息。

建议范围：

- 新增 `updateSong` service。
- 在 Song Detail 或列表中提供最小编辑入口。
- 支持标题、状态、难度、发行年份、BPM、备注等现有 schema 字段。
- 覆盖 service 与页面测试。

验收标准：

- 用户可以编辑自己的歌曲。
- 保存后详情页和列表展示一致。
- 不影响 Practice 的 Song 关联读取。

### Song Delete

目标：允许用户删除歌曲。

建议范围：

- 新增 `deleteSong` service。
- 删除前确认。
- 明确关联 Practice 的表现：当前 schema 中 `practice_sessions.song_id` 为 `on delete set null`。
- 覆盖删除后列表刷新与详情不存在状态测试。

验收标准：

- 用户可以删除自己的歌曲。
- 删除歌曲后关联练习记录仍保留，歌曲显示为未知或无关联。
- 列表与详情页状态正确刷新。

## P1

### Artist CRUD

目标：补齐 Artist 的编辑与删除，形成完整管理闭环。

建议范围：

- 复用现有 Artist 列表、创建、详情读取能力。
- 新增 update/delete service。
- 保持 localStorage Demo Mode 与 Supabase 路径一致。

### Album CRUD

目标：建立 Album 基础管理能力。

建议范围：

- 新增 Album feature 页面、类型与 service。
- 使用现有 `albums` 表，不新增 schema，除非字段缺口被确认。
- 优先支持列表、创建、详情、编辑、删除。

## P2

### Media Library

目标：围绕媒体资产建立最小管理流程。

建议范围：

- 先管理 media metadata，不急于做复杂上传和播放器。
- 使用现有 `media_assets` 与 `media_links` 表。
- 支持按 Song / Practice / Artist / Album 关联媒体。

## 推荐执行顺序

1. Practice Delete。
2. Practice Edit。
3. Song Edit。
4. Song Delete。
5. Artist CRUD。
6. Album CRUD。
7. Media Library。

优先先做 Practice Delete，是因为它范围最小，却能验证删除确认、RLS、列表刷新、统计同步这些后续 CRUD 都会复用的页面模式。
