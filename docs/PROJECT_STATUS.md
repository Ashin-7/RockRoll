# RockRoll 项目状态

更新时间：2026-07-02

## 当前项目阶段

MVP Foundation

当前目标是稳定 MVP 基础能力，优先补齐 Song 与 Practice 的基础 CRUD，并保持 Supabase Schema、路由、Demo Mode 与测试体系可持续迭代。

## 已完成模块

- Auth：支持 Magic Link、匿名测试登录、登出、session 读取与 auth 状态监听；未配置 Supabase 时可进入本地 Demo Mode。
- Songs：支持歌曲列表、歌曲创建、歌曲详情读取、Supabase 数据读取写入与本地 Demo Mode。
- Practice：支持创建练习记录、查看练习历史、基础统计信息、Song 关联、Supabase 写入读取与本地 Demo Mode。
- 基础路由：基于 hash route 的页面切换已覆盖 Auth、Songs、Song Detail、Artists、Artist Detail、Practice、Archive、Library、Inbox、Backstage。
- Demo Mode：缺少 Supabase 环境变量时，Auth、Songs、Practice 等核心流程可使用 localStorage 进行本地演示。
- Supabase 接入：已建立基础 schema、RLS 策略、Supabase client、Auth session 与核心 feature service。

## 部分完成模块

- Song Detail：已支持详情读取与展示，尚未支持编辑、删除、艺人/专辑/风格关联维护。
- Artist：已支持艺人列表、创建与详情读取，尚未形成完整 CRUD 与歌曲/专辑关联管理。
- Archive：已有页面与 service 雏形，尚未形成完整档案管理流程。
- Library：已有页面与 media service/types 雏形，尚未接入完整媒体资产管理流程。
- Inbox：已支持 import candidates 读取与 MusicBrainz service 雏形，尚未完成候选确认、入库、冲突处理与外部元数据完整导入链路。

## 未开始模块

- 媒体管理：尚未实现文件上传、存储路径管理、媒体关联与预览流程。
- 元数据导入：尚未实现外部候选确认入库、批量导入与冲突处理闭环。
- 成长分析：尚未实现长期趋势、目标达成、曲目成长档案等分析能力。
- AI 功能：当前阶段不开发。

## 当前技术栈

- React
- TypeScript
- Vite
- Supabase
- Vitest
- Testing Library

## 当前架构原则

- Private Cloud First：默认围绕个人私有云数据与 Supabase RLS 设计。
- Feature First：业务逻辑优先放在对应 feature 内，公共能力确认后再进入 lib。
- Simple First：MVP 阶段优先保持实现直接、可读、易验证。
- Long-term Maintainability：避免提前引入复杂状态管理、桌面端、AI 或播放器等非当前核心能力。

## 当前 MVP 优先级

### P0

- Song CRUD 完整化：补齐编辑、删除，并保持列表/详情刷新一致。
- Practice CRUD 完整化：补齐编辑、删除，并保持统计信息与历史列表同步。
- Supabase Schema 稳定化：确认 songs、practice_sessions、artists、albums、media/import 相关字段是否满足 MVP，后续变更只新增 migration。

### P1

- Artist 管理：补齐 Artist CRUD 与详情页基础操作。
- Album 管理：补齐 Album 列表、创建、详情、编辑、删除。
- Archive 管理：明确档案实体与基础管理流程。

### P2

- 文件管理：围绕 media_assets/media_links 做最小文件元数据管理。
- 外部元数据导入：完善 import_candidates 到正式实体的确认入库流程。

## Practice 模块状态评估

当前完成度：约 45%。

已具备能力：

- 创建练习记录。
- 查看练习记录。
- 基础统计信息。
- 与 Song 的最小关联。
- Supabase 与本地 Demo Mode 双路径。

主要缺口：

- 编辑练习记录。
- 删除练习记录。
- 筛选与排序。
- 标签。
- 目标时长。
- 完成度。

推荐开发顺序：

1. Practice Delete：范围小，能先打通危险操作确认、删除后刷新列表与统计的基础模式。
2. Practice Edit：复用现有表单输入，补齐 update service、编辑状态与保存后刷新。
3. Practice Filter / Sort：先做日期、歌曲、状态类最小筛选排序，不引入复杂查询框架。
4. Practice Goal Duration：在 schema 稳定后再加入目标时长，避免早期字段反复变动。
5. Practice Completion：依赖目标时长或明确完成规则后再实现。
6. Practice Tags：等练习记录字段稳定后再设计，避免过早引入多对多结构。

## 验证要求

本阶段结束任务前优先运行：

```powershell
npm test -- --run
npm run build
```

如涉及依赖安装或 lockfile 校验，先运行：

```powershell
npm install
```

## 当前风险

- 当前 package 依赖包含 Vite 8、Vitest 4、TypeScript 5，实际运行可能需要高于 Node.js v8.17.0 的 Node 版本；若必须严格兼容 Node 8，需要单独评估工具链降级方案。
- Supabase 初始 schema 已覆盖较多长期实体，但 MVP 功能尚未完全使用，后续应避免修改历史 migration。
- Demo Mode 依赖 localStorage，适合本地演示，不应被视为真实同步或离线数据库能力。
- Practice 统计目前基于已加载记录计算，后续数据量增加后可能需要 Supabase 聚合或分页策略。
