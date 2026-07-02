# RockRoll 项目状态

更新时间：2026-07-02

## 当前项目阶段

MVP Foundation

当前目标是稳定 MVP 基础能力，优先补齐核心资料管理能力，并保持 Supabase Schema、基础路由、Demo Mode 与测试体系可持续迭代。

## 本轮完成内容

- 已补充 `AGENTS.md` 的上下文节省规则与多轮迭代会话切换规则。
- 已完成本地 P0 CRUD 增量实现：
  - Practice Delete
  - Practice Edit
  - Song Edit
  - Song Delete
- 已完成 P0 CRUD 最终复核，并准备纳入本地提交。
- 已完成 Supabase Schema 稳定化复核，并新增 migration：
  - `songs` / `practice_sessions` 更新时自动刷新 `updated_at`。
  - `practice_sessions` 新增 insert/update 的 `song_id` 归属校验，避免跨用户引用歌曲。
- 已完成 Artist CRUD 增量实现：
  - Artist Edit
  - Artist Delete
  - Supabase 与本地 Demo Mode 双路径
- 已完成 Album CRUD 增量实现：
  - Album List / Create / Detail / Edit / Delete
  - Supabase 与本地 Demo Mode 双路径
  - 接入 `#albums` 与 `#album/:id` 路由
- 已完成 Archive 管理 MVP 增量实现：
  - Archive Collection List / Create
  - Archive Collection Detail
  - 手动添加 Album 类型 Archive Item
  - Supabase 与本地 Demo Mode 双路径
  - 接入 `#archive/:id` 路由
- 已完成 Media Library MVP 增量实现：
  - Media Asset List / Create
  - 可选关联 Song / Practice / Artist / Album
  - Supabase 与本地 Demo Mode 双路径
  - 收紧 `media_links` RLS，避免跨用户关联媒体

## 当前分支状态

- 当前分支：`feature/mvp-foundation`
- 跟踪分支：`origin/feature/mvp-foundation`
- 当前分支已包含 P0 CRUD、Supabase Schema 稳定化、Artist CRUD、Album CRUD 与 Archive MVP 提交；本次 Media Library MVP 改动待提交。

## 已完成模块

- Auth
- Songs
- Practice
- Artists
- Albums
- Archive MVP
- Media Library MVP
- 基础路由
- Demo Mode
- Supabase 接入

## 部分完成模块

- Song Detail：已补齐本地编辑/删除入口，但仍需后续确认 i18n、列表同步与完整构建验证。
- Inbox

## 未开始模块

- 媒体管理
- 元数据导入
- 成长分析
- AI 功能

## 当前技术栈

- React
- TypeScript
- Vite
- Supabase
- Vitest
- Testing Library

## 当前架构原则

- Private Cloud First
- Feature First
- Simple First
- Long-term Maintainability

## 当前 MVP 优先级

### P0

- Practice CRUD 完整化：已完成 Edit / Delete 本地实现与最终复核。
- Song CRUD 完整化：已完成 Edit / Delete 本地实现与最终复核。
- Supabase Schema 稳定化：已完成 P0 Practice / Songs 相关字段、RLS 与 `updated_at` 复核。

### P1

- Artist 管理：已补齐编辑与删除闭环。
- Album 管理：已补齐列表、创建、详情、编辑与删除闭环，已提交。
- Archive 管理：已完成 Collection / Item 最小闭环。

### P2

- 文件管理：已完成 Media Asset 元数据与可选实体关联的最小闭环，待提交。
- 外部元数据导入

## Practice 模块状态评估

当前完成度：约 70%。

已具备能力：

- 创建练习记录
- 查看练习记录
- 编辑练习记录
- 删除练习记录
- 基础统计信息
- Song 关联
- Supabase 与本地 Demo Mode 双路径

主要缺口：

- 筛选与排序
- 标签
- 目标时长
- 完成度
- 更完整的 i18n 文案

推荐开发顺序：

1. 匿名旅行者导入预览 MVP。
2. Practice Filter / Sort。
3. Practice Goal Duration。
4. Practice Completion。
5. Practice Tags。

## 当前验证结果

本轮已运行并通过：

```powershell
npm test -- --run src/features/albums src/app/routes.test.tsx src/features/archive/ArchivePage.test.tsx
npm test -- --run src/features/archive src/app/routes.test.tsx
npm test -- --run src/features/library
```

结果：

- 当前 shell Node.js 为 `v20.20.2`，Album / routes / Archive 相关测试通过：5 个测试文件，19 个用例。
- 当前 shell Node.js 为 `v20.20.2`，Archive / routes 相关测试通过：4 个测试文件，16 个用例。
- 当前 shell Node.js 为 `v20.20.2`，Library 相关测试通过：2 个测试文件，7 个用例。

本轮已执行轻量校验：

```powershell
git diff --check
supabase --version
node -v
npm -v
```

结果：

- `git diff --check` 未发现空白错误。
- 当前环境未安装 Supabase CLI，无法执行本地 migration lint 或迁移演练。
- 当前 shell Node.js 为 `v20.20.2`，npm 为 `10.8.2`。

未运行：

```powershell
npm install
npm test -- --run
npm run build
```

原因：

- `package.json`、`pnpm-lock.yaml`、`package-lock.json` 未在本轮要求中发生变化，不运行 `npm install`。
- 用户要求节省上下文和避免完整测试，本轮未运行完整测试与构建。

## 当前风险

- 当前 shell 使用 Node.js v20.20.2 运行通过 Album 相关测试；若切回 Node.js v8.17.0，当前 Vite/Vitest 工具链仍不兼容。
- Media Library 当前只管理元数据，不处理真实文件上传、播放器或 Supabase Storage bucket 初始化。
- Practice / Song / Artist 新增 UI 文案目前存在硬编码英文，后续可按 i18n 策略补齐。
- 尚未运行完整测试与构建，合并前仍需至少执行一次。
- Supabase migrations 尚未在真实 Supabase 实例上执行验证。
