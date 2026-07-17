# 专辑封面与曲风正式字段化设计

日期：2026-07-17

## 背景

Archive / Import 当前已经把 Anontraveler 专辑封面和曲风传入 candidate、Review plan 与 `external_sources.raw_payload.metadata`。Review plan 也已经能展示封面、来源点评、发行年份与曲风。

正式 `albums` 记录目前只保存标题、艺人、发行年份、专辑类型、笔记和可见性。封面与曲风仍依赖来源 JSON，不适合作为稳定的正式查询字段。本设计在不改变导入流程、`match_existing` 语义和权限模型的前提下，把封面与曲风提升为 `albums` 的正式字段。

## 目标

- 为公开专辑增加稳定、可查询的封面和曲风字段。
- 保持现有 Anontraveler preview、candidate、Review plan 和一键提交顺序。
- 保持 `external_sources.raw_payload` 作为来源审计与兼容回退。
- 兼容尚未回填正式字段的旧专辑。
- 继续执行 public-read、admin-only write 的既有权限模型。
- 只做来源曲风字符串的结构化存储，不做同义词、大小写、语言或分类体系归并。

## 非目标

- 不建立 `album_styles`、`styles`、`genres` 或别名表。
- 不执行历史数据回填、重复真实导入或批量正规化。
- 不新增 RPC、trigger、worker、任务状态或批量队列。
- 不恢复 Inbox 主导航。
- 不改变生成 Review plan 后立即提交的一键导入时机。
- 不改变 artist / album `match_existing` 的绑定和来源映射语义。
- 不新增管理员编辑封面或曲风的 UI。
- 不新增依赖、UI 框架或索引。

## 方案比较与决策

### 采用：`albums` 正式字段

在 `albums` 上增加 `cover_url text` 与 `styles text[]`。该方案与现有 `metadata.coverUrl`、`metadata.styles` 数据契约一致，新专辑可以在一次 insert 中写入全部正式字段，并继承 `albums` 现有 RLS。

### 未采用：`album_styles` 关系表

关系表更适合未来按独立曲风实体查询，但当前需要额外查询、写入、外键、索引和 RLS，也会增加非事务式前端提交的部分失败风险。当前 MVP 没有这些复杂度对应的收益。

### 未采用：全局曲风或流派字典

全局字典适合处理别名、翻译和统一分类，但超出本次已经确认的“保留来源原文”边界。

## 最小 Schema

只新增一份 additive migration，目标结构为：

```sql
alter table public.albums
  add column cover_url text,
  add column styles text[] not null default '{}'::text[];
```

约束说明：

- `cover_url` 允许 `null`，空字符串在 service 写入前转成 `null`。
- `styles` 不允许 `null`，旧记录和缺少曲风的新记录使用空数组。
- 本期不增加 URL check constraint，避免把当前已支持的来源值变成破坏性校验。
- 本期不增加 GIN 索引；只有出现数据库端 `styles` 包含查询并经验证需要时，再单独增加索引。

## 数据清洗规则

写入 `albums` 前执行最小、确定性的清洗：

- `coverUrl`：去除首尾空格；结果为空时写入 `null`。
- `styles`：逐项去除首尾空格、移除空值，并按首次出现顺序做区分大小写的精确去重。
- 不合并 `Rock` 与 `rock`，不把英文曲风翻译成中文，也不建立父子分类。
- 不修改 `review_payload.metadata` 与 `external_sources.raw_payload` 中的来源原文。

## 数据流

### Preview 与 Review plan

Anontraveler preview、candidate 映射和 Review plan 继续传递现有 `coverUrl` 与 `styles`。Review plan 仍直接展示尚未提交的 `review_payload.metadata`，不读取 `albums` 正式字段。

### 创建新专辑

`commitPublicImportReviewPlan` 创建新专辑时，在现有 album insert 中同时写入：

- `cover_url`
- `styles`
- 既有 `artist_id`、`title`、`release_year`、`album_type`、`notes`、`visibility`

封面与曲风不是第二次独立写入，因此不会新增关系表式的部分提交点。专辑创建成功后仍按现有顺序保存 `external_sources` 来源映射与 raw payload。

### 已存在专辑与 `match_existing`

- 手动 `match_existing` 只绑定现有公开专辑并保存来源映射，不更新目标专辑的 `cover_url` 或 `styles`。
- 根据既有 external source 自动复用专辑时，也不隐式更新正式字段。
- 尚未正规化的既有专辑继续通过 raw payload 回退显示。
- 以后如需回填，必须单独设计 admin-only、幂等任务，不能借重复导入或 `match_existing` 改变现有语义。

### Archive 读取

Archive 读取专辑展示元数据时采用正式字段优先、来源 JSON 回退：

- 非空 `albums.cover_url` 优先，否则使用 `external_sources.raw_payload.metadata.coverUrl`。
- 非空 `albums.styles` 优先，否则使用 `external_sources.raw_payload.metadata.styles`。
- 发行年份和来源点评保持现有行为，本次不扩大字段化范围。

专辑正式字段必须按 album ID 批量读取，禁止逐条 N+1 查询。大集合沿用项目已经确认的分块原则；具体分块实现必须在读取现有查询约定后确定，不在设计阶段假设未读取的 API。

## 向后兼容

- Migration 不从 raw payload 提取或回填来源元数据；旧专辑只获得 schema 默认值 `cover_url = null` 和 `styles = {}`。
- 旧数据通过 raw payload 回退继续显示，不要求重复导入。
- 新导入同时保留正式字段和来源 raw payload，便于来源追踪与故障恢复。
- Review plan payload、external source 唯一身份、archive item 身份和导入数量口径均不变。
- 没有正式字段或没有 external source 的专辑继续显示现有无封面 / 无曲风状态。

## 权限矩阵

| 能力 | anon | authenticated user | admin | 失败行为 |
| --- | --- | --- | --- | --- |
| 读取公开专辑封面与曲风 | 允许 | 允许 | 允许 | 正式字段为空时回退 raw payload |
| 读取非公开专辑 | 不允许 | 不允许 | 按现有策略 | 由现有 `albums` RLS 拒绝 |
| 创建专辑及写入新字段 | 不允许 | 不允许 | 允许 | service 先拒绝，RLS 再兜底 |
| 更新或删除专辑 | 不允许 | 不允许 | 允许 | 沿用现有 admin guard 和 RLS |
| URL preview | 保持现有只读能力 | 保持现有只读能力 | 允许 | 不写入数据库 |
| 保存 candidates / 生成 Review plan | 不允许 | 不允许 | 允许 | 沿用现有明确错误提示 |
| Commit public import | 不允许 | 不允许 | 允许 | 专辑 insert 失败时终止现有提交链路 |
| `match_existing` | 不可见 | 不可见 | 允许 | 只保存来源映射，不更新目标专辑 |
| 旧数据回填 | 不允许 | 不允许 | 本次不提供 | 后续单独设计 |
| 批量正规化 | 不允许 | 不允许 | 本次不提供 | 不新增 RPC、worker 或队列 |

三层权限要求：

1. UI：不增加新按钮，现有导入和 Review plan 继续仅管理员可见。
2. Service：继续使用现有 import / commit admin guard，不新增绕过 guard 的写入口。
3. RLS：新字段属于现有 `albums` 行，必须继承公开记录可读、公共资料 admin-only 写入的现有 policy。

权限模型没有变化，因此 `docs/PERMISSIONS.md` 不需要修改权限结论。实施结果需要在项目状态文档中记录新字段仍受现有 Albums 权限约束。

## Migration 约束与风险控制

- 使用 Supabase CLI 的 migration 创建流程生成新文件，不手写猜测时间戳，不修改历史 migration。
- 实施前只读核对创建 `albums`、定义其 grants 与 RLS 的最小相关 migration。
- 如果现有策略并非预期的 public-read/admin-write，立即停止并报告，不能擅自扩大权限或补写 policy。
- 预期 migration 不包含新 policy、grant、function、trigger、索引或数据回填。
- 不直接应用 remote migration；远端 apply 和角色探针需要用户另行明确授权。
- 不使用 service role key、RLS bypass、客户端 secret 或真实导入解决验证问题。

## 错误处理

- 缺少封面或曲风不是导入错误，分别写入 `null` 和空数组。
- 数据库 album insert 失败时继续抛出 Supabase 错误，由现有 Archive 一键导入错误区域展示。
- 不因正式字段写入失败而静默退回只写 raw payload。
- 读取正式字段失败时不静默吞掉数据库错误；只有字段值为空时才使用数据级回退。
- 非管理员请求必须在 service guard 阶段得到清楚的 admin-only 错误，并继续由 RLS 防止直接写入。

## 测试设计

### Inbox service

- 新建专辑 insert 包含清洗后的 `cover_url` 与 `styles`。
- 空封面和空曲风写为 `null` 与 `[]`。
- 曲风 trim、空值移除、稳定精确去重符合约定。
- 手动 `match_existing` 不调用 albums update。
- 已有 external source 自动复用也不更新专辑正式字段。
- 非管理员继续无法 commit public import。

### Archive service

- 正式封面与曲风优先于 raw payload。
- 正式字段为空时回退 raw payload。
- 同一集合中的新旧专辑可以混合展示。
- 专辑正式字段按集合批量读取，不产生逐条 N+1 查询。
- 两处都没有值时保留现有空状态。

### Migration 与权限

- 检查 migration 只新增两列，不包含回填或权限扩张。
- 核对现有 Albums RLS 后，记录为什么不需要新增 policy。
- 如果以后获准应用 remote migration，分别用 anon / 普通用户 / admin 做最小角色探针并清理测试数据；本次不包含远端 apply。

### 验证命令范围

- 运行 Archive / Inbox 定向 Vitest。
- 运行 `npm run build` 验证 TypeScript 与生产构建。
- 对本次相关文件运行 `git diff --check`。
- 不运行完整仓库测试、不运行真实导入、不运行 `npm install`。

## 实施前置条件

当前会话的读取范围不包含 Supabase migration 和 Albums feature。进入实施计划前必须得到用户允许，只补充读取：

- 定义 `albums` schema、grant 和 RLS 的最小相关 migration。
- 项目中现有 Supabase 数据库类型文件（如存在且与本次字段有关）。
- `src/features/albums` 中实际消费封面与曲风的最小相关文件；只有需要让 Albums 页面正式字段优先时才读取。

未获得该范围授权时，只能编写计划，不能安全创建 migration 或声称 Albums 全链路已完成。

## 验收标准

- 新建专辑在 `albums` 中保存正式 `cover_url` 与 `styles`。
- 旧专辑无需重复导入仍能通过 raw payload 显示封面和曲风。
- Review plan、一键导入时机、导入数量口径和 `match_existing` 语义不变。
- anon 和普通用户不能写入新字段，admin 写入仍受 service 与 RLS 双重保护。
- 没有新增回填、RPC、worker、队列、依赖或 Inbox 导航入口。
- Archive / Inbox 定向测试和生产构建通过。
