# RockRoll 项目状态

更新时间：2026-07-02

## 当前项目阶段

MVP Foundation

当前目标是稳定 MVP 基础能力，优先补齐 Song 与 Practice 的基础 CRUD，并保持 Supabase Schema、基础路由、Demo Mode 与测试体系可持续迭代。

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
- 本轮在 Node.js v8.17.0 下重新运行 Practice 与 Songs 相关测试时，Vitest 因 ESM 入口无法启动，未进入用例执行。

## 当前分支状态

- 当前分支：`feature/mvp-foundation`
- 跟踪分支：`origin/feature/mvp-foundation`
- 当前分支已包含 P0 CRUD 收尾提交；本次 Supabase Schema 复核改动待提交。

## 已完成模块

- Auth
- Songs
- Practice
- 基础路由
- Demo Mode
- Supabase 接入

## 部分完成模块

- Song Detail：已补齐本地编辑/删除入口，但仍需后续确认 i18n、列表同步与完整构建验证。
- Artist
- Archive
- Library
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

- Artist 管理
- Album 管理
- Archive 管理

### P2

- 文件管理
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

1. Artist CRUD。
2. Album CRUD。
3. Practice Filter / Sort。
4. Practice Goal Duration。
5. Practice Completion。
6. Practice Tags。

## 当前验证结果

本轮尝试运行：

```powershell
npm test -- --run src/features/practice
npm test -- --run src/features/songs
```

结果：

- 两条命令均在 Vitest 启动阶段失败，错误为 Node.js v8.17.0 无法解析 `node_modules/vitest/vitest.mjs` 中的 ESM `import`。
- 本轮未进入 Practice / Songs 测试用例执行阶段。

本轮已执行轻量校验：

```powershell
git diff --check
supabase --version
```

结果：

- `git diff --check` 未发现空白错误。
- 当前环境未安装 Supabase CLI，无法执行本地 migration lint 或迁移演练。

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

- 当前工具链的 Vitest 入口与 Node.js v8.17.0 不兼容，本轮相关测试无法完成。
- Practice / Song 新增 UI 文案目前存在硬编码英文，后续可按 i18n 策略补齐。
- 尚未运行完整测试与构建，合并前仍需至少执行一次。
- Supabase migration 尚未在真实 Supabase 实例上执行验证。
