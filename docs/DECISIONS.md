# RockRoll 架构决策记录

更新时间：2026-07-02

## 1. 使用 Supabase 作为 MVP 后端

决策：当前 MVP 使用 Supabase 承载 Auth、Postgres、RLS 与基础数据访问。

原因：

- 能快速建立私有云优先的数据闭环。
- Auth 与 RLS 能较早验证多用户数据隔离。
- 对当前 React + TypeScript + Vite MVP 足够简单，不需要自建后端服务。

影响：

- 数据库变更必须通过新增 migration 完成。
- 业务写入需要始终考虑 `user_id`、RLS 与当前 session。
- 本地 Demo Mode 只作为未配置 Supabase 时的演示路径。

## 2. 使用 Feature First Architecture

决策：业务代码优先放在 `src/features/<feature>` 内，公共能力确认稳定后再进入 `src/lib`。

原因：

- MVP 阶段 feature 边界比提前抽象更重要。
- Songs、Practice、Auth 等模块可以独立演进，减少跨模块耦合。
- 便于后续按优先级补齐 CRUD 与测试。

影响：

- 不跨 feature 引用内部实现。
- 不为少量重复提前抽象。
- 公共 service、hook、类型需要确认复用价值后再移动。

## 3. Practice First

决策：当前 MVP 优先补齐 Practice 与 Song 相关能力。

原因：

- RockRoll 的核心价值是围绕歌曲的练习记录与长期成长档案。
- Practice CRUD、History、Statistics 是后续成长分析和档案管理的基础。
- 先补齐核心闭环，能避免过早开发 Dashboard、AI、播放器等非必要能力。

影响：

- P0 优先处理 Practice Edit/Delete 与 Song Edit/Delete。
- 高级统计、标签、目标时长、完成度按依赖顺序推进。
- UI 美化和复杂交互延后。

## 4. 暂不引入 Zustand / Redux / TanStack 等大型依赖

决策：当前阶段继续使用 React 内建状态与 feature service。

原因：

- 现有状态规模仍可由组件 state、props 与 service 支撑。
- 新状态库会增加学习、维护和架构约束成本。
- MVP 当前瓶颈是 CRUD 完整性和 schema 稳定性，不是全局状态能力。

影响：

- 页面级状态保持局部管理。
- 跨页面共享先通过 Auth service、Supabase 与路由参数解决。
- 只有当真实重复和复杂状态流出现后，再评估是否引入新方案。

## 5. 暂不引入 Tauri

决策：当前阶段不开发桌面端，不引入 Tauri。

原因：

- Web MVP 尚未稳定。
- 桌面端会增加构建、发布、文件权限和平台兼容成本。
- 当前优先级是 Practice、Song、Artist、Album 等核心数据能力。

影响：

- 文件管理先以 Supabase schema 和 Web 能力为边界。
- 桌面端规划保留到 Web MVP 稳定之后。

## 6. Demo Mode 仅用于本地演示

决策：缺少 Supabase 环境变量时，允许使用 localStorage 作为本地 Demo Mode。

原因：

- 便于未配置 Supabase 时验证 UI 与最小业务流程。
- 降低早期开发和展示门槛。

影响：

- Demo Mode 不提供真实同步、权限或长期数据保证。
- 不应围绕 Demo Mode 设计复杂离线能力。
- Supabase 路径仍是正式能力的判断标准。
