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

### P0 收尾建议

目标：确认本地 P0 CRUD 修改可提交。

建议读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/practice`
- `src/features/songs`

建议范围：

- 快速复核 Practice / Song Edit / Delete 的实现与测试。
- 如用户允许，运行相关 feature 测试。
- 如准备提交，先确认 `git status`，只提交本轮相关文件。

## P1

### Artist CRUD

目标：补齐 Artist 的编辑与删除，形成完整管理闭环。

状态：已完成并提交。

建议读取：

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `src/features/artists`

建议范围：

- 复用现有 Artist 列表、创建与详情读取能力。
- 新增 update / delete service。
- Supabase 与本地 Demo Mode 路径保持一致。
- 删除前提供确认交互。
- 只运行 Artist 相关测试；如果没有相关测试，说明未运行原因。

### Album CRUD

目标：建立 Album 基础管理能力。

状态：已完成本地增量实现，待提交。

建议范围：

- 使用现有 `albums` 表，不主动新增 schema，除非字段缺口被明确确认。
- 优先支持列表、创建、详情、编辑、删除。
- 不引入新依赖，不做架构重构。

### 下一个推荐任务：Archive 管理

目标：明确 Archive 实体与基础管理流程。

建议范围：

- 先补齐最小 CRUD。
- 暂不开发复杂文件管理、播放器或高级统计。

## P2

### Media Library

目标：围绕媒体资产建立最小管理流程。

建议范围：

- 先管理 media metadata，不急于做复杂上传和播放器。
- 使用现有 `media_assets` 与 `media_links` 表。
- 支持按 Song / Practice / Artist / Album 关联媒体。

## 推荐执行顺序

1. Archive 管理。
2. Media Library。

当前建议先开启新对话，从 Archive 管理开始，避免继续扩大当前上下文。
