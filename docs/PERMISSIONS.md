# RockRoll 权限矩阵

更新时间：2026-07-08

## 目标

这份文档定义 RockRoll MVP 阶段的最小权限边界。后续新增或调整 CRUD、导入、提交、匹配、回填、批量处理能力前，必须先对照这里确认权限。

核心原则：

- Practice 和 Songs / 曲目是普通登录用户可维护的核心私有数据。
- 除 Practice 和 Songs / 曲目外，所有 CRUD 默认仅管理员可见、可操作。
- Archive / 档案正式资料允许 public 查询，但写入、导入和维护仍必须是管理员。
- 前端隐藏入口只是体验层；真正权限必须由 Supabase RLS / policy / RPC / service 层保证。
- 公共资料中不得保存 token、cookie、service role key、真实账号、私密笔记或内部备注。

## 角色定义

| 角色 | 定义 | 默认能力 |
| --- | --- | --- |
| `anon` | 未登录访问者 | 只读明确公开的正式资料 |
| `authenticated user` | 已登录普通用户 | 维护自己的 Practice 和 Songs / 曲目私有数据；读取公开正式资料 |
| `admin` | `profiles.role = 'admin'` 且通过 `public.is_public_library_admin()` 判断的管理员 | 维护公共资料库、导入、提交、匹配、回填和批量处理 |

## 模块权限矩阵

| 模块 / 数据 | anon | authenticated user | admin | 说明 |
| --- | --- | --- | --- | --- |
| Auth / Session | 不可管理 | 管理自己的登录状态 | 可按后台策略管理 | 不在客户端暴露特权密钥 |
| Profiles | 不可读写私有字段 | 读写自己的非敏感资料 | 可维护角色字段 | 角色字段不能由普通用户自改 |
| Practice | 不可读写 | CRUD 自己的数据 | 可按后续后台需求管理 | MVP 核心私有能力 |
| Practice History / Statistics | 不可读写 | 读取自己的统计和历史 | 可按后续后台需求管理 | 必须按用户隔离 |
| Songs / 曲目 | 不可读写私有曲目 | CRUD 自己的曲目 | 可按后续后台需求管理 | 普通用户例外能力 |
| Artists | 只读 public | 只读 public | CRUD public / admin 数据 | 普通用户不直接维护公共艺人库 |
| Albums | 只读 public | 只读 public | CRUD public / admin 数据 | 普通用户不直接维护公共专辑库 |
| Archive collections | 只读 public | 只读 public | CRUD public / admin 数据 | public 查询开放，写入管理员 |
| Archive items | 只读 public | 只读 public | CRUD public / admin 数据 | 包含榜单条目、备注回填等 |
| External sources | 只读 public 映射 | 只读 public 映射 | CRUD public / admin 映射 | 用于去重和来源追踪，写入管理员 |
| Import jobs | 不可见 | 不可见 | CRUD | 导入流程内部状态 |
| Import candidates | 不可见 | 不可见 | CRUD | 导入候选，不对普通用户开放 |
| Import drafts | 不可见 | 不可见 | CRUD | 导入草稿 / 预览保存状态 |
| Import review items | 不可见 | 不可见 | CRUD | Review plan 明细和确认项 |
| Match existing | 不可见 | 不可见 | 操作 | 手动匹配会影响公共资料库，管理员限定 |
| AI 候选笔记 | 不可触发 | 暂不开放 | 后续评估 | 只能生成待确认草稿，不能自动覆盖 |

## 操作权限矩阵

| 操作类型 | anon | authenticated user | admin | 默认要求 |
| --- | --- | --- | --- | --- |
| 读取 public 正式资料 | 允许 | 允许 | 允许 | 仅 `visibility = 'public'` 或等价公开条件 |
| 读取私有 Practice / Songs | 不允许 | 仅自己的数据 | 可按后台需求 | 必须带 owner / user_id 限制 |
| 创建 Practice / Songs | 不允许 | 仅自己的数据 | 可按后台需求 | `user_id = auth.uid()` |
| 更新 Practice / Songs | 不允许 | 仅自己的数据 | 可按后台需求 | `USING` 和 `WITH CHECK` 都要限制 owner |
| 删除 Practice / Songs | 不允许 | 仅自己的数据 | 可按后台需求 | 删除前确认影响范围 |
| 创建公共资料库数据 | 不允许 | 不允许 | 允许 | 包含 artists、albums、archive、external sources |
| 更新公共资料库数据 | 不允许 | 不允许 | 允许 | 包含 note 回填、source 映射补写 |
| 删除公共资料库数据 | 不允许 | 不允许 | 允许 | MVP 阶段谨慎开放，需测试 |
| URL 预览导入 | 可按页面设计预览公开 URL | 可按页面设计预览公开 URL | 允许 | 预览不得写库，不得保存私密数据 |
| 保存候选 / 生成 Review plan | 不允许 | 不允许 | 允许 | 写入 import_* 表 |
| Commit public import | 不允许 | 不允许 | 允许 | 写入 public 正式资料和 external source |
| 批量扫描目录 | 可视设计决定但不写库 | 可视设计决定但不写库 | 可写入后续目录状态 | 当前仅前端临时扫描，不落库 |
| 批量导入 | 不允许 | 不允许 | 后续单独设计 | 需要任务状态、失败恢复、审计 |

## UI 与服务层要求

前端：

- 非管理员不显示资料库写入、导入、提交、匹配、回填、删除、批量处理入口。
- 普通用户在 Practice 和 Songs / 曲目以外不应看到可写的 CRUD 表单。
- 管理员入口也必须显示清楚操作状态、失败提示和提交结果。
- 前端判断只能用于体验优化，不作为安全边界。

Service / Supabase：

- 所有 public schema 表必须启用 RLS。
- 公开读取 policy 只允许读取明确公开的正式资料。
- 写入 public 资料库必须检查管理员身份。
- UPDATE policy 必须同时包含 `USING` 和 `WITH CHECK`。
- 普通用户自有数据必须用 `auth.uid()` / owner 字段限制。
- 禁止用 service role key、RLS bypass 或客户端 secret 解决权限问题。
- RPC 如需写入公共资料，必须验证调用者是管理员，并明确 revoke / grant 范围。

## 后续实现顺序

1. 盘点当前 Archive / Albums / Library / Import UI 中仍暴露给普通用户的 CRUD 入口。
2. 盘点 service 层是否存在普通用户可触发的公共资料写入路径。
3. 对照现有 migration / RLS，确认 public 读取和 admin 写入是否覆盖所有资料库表。
4. 为 Archive URL 导入、Review plan、Commit、Match existing 补管理员可见和不可见测试。
5. 为 RLS / service 添加普通用户不能写 public 资料的测试。
6. 再继续真实导入数量验证和导入状态追踪。

## 判断规则

如果一个新功能不属于 Practice 或 Songs / 曲目的用户私有 CRUD，并且会改变数据库正式资料、导入状态、来源映射、公共说明、公共备注或批量任务状态，那么默认按管理员功能处理。只有用户明确确认并补齐权限矩阵后，才允许扩大普通用户权限。
