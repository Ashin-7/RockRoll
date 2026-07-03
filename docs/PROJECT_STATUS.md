# RockRoll 项目状态

## 本轮补充：Archive Collection Edit / Delete

- 已完成 Archive Collection 编辑与删除最小闭环：
  - Archive collection 列表增加 Edit / Delete 操作列。
  - 点击 Edit 会回填 collection 表单，并切换到 Collection / edit 模式。
  - 编辑提交会更新 title、source、sourceUrl、description、collectionType。
  - 点击 Delete 会删除指定 collection 并刷新列表。
  - Demo Mode 删除 collection 时会同步清理该 collection 下的本地 archive items。
  - Supabase 与 Demo Mode 均支持 collection 编辑 / 删除。
- 本轮未修改 Supabase schema、路由、依赖或构建配置。
- 验证结果：
  - `npm test -- --run src/features/archive`
  - 结果：3 个测试文件、18 个用例通过。
  - `npm run build`
  - 结果：通过。
- 环境说明：
  - 使用本机已有 Node `v20.20.2` 的 npm 完成测试与构建。
  - 未运行 `npm install`。

更新时间：2026-07-03

## 本轮补充：Media Link Edit / Delete

- 已完成 Media Link 独立编辑与删除最小闭环：
  - Library 媒体资产列表的 Linked entity 单元格增加 Edit link / Delete link 操作。
  - 点击 Edit link 会在当前 link 行内打开小型编辑表单。
  - 编辑提交只更新 `media_links.entity_type` 与 `media_links.entity_id`，不改媒体资产字段。
  - 点击 Delete link 会删除指定 media link 并刷新列表。
  - Supabase 与 Demo Mode 均支持 media link 编辑 / 删除。
- 本轮未修改 Supabase schema、路由、依赖或构建配置。
- 验证结果：
  - `npm test -- --run src/features/library`
  - 结果：2 个测试文件、16 个用例通过。
  - `npm run build`
  - 结果：通过。
- 环境说明：
  - 使用本机已有 Node `v20.20.2` 的 npm 完成测试与构建。
  - 未运行 `npm install`。

更新时间：2026-07-03

## 本轮补充：Archive Item Edit / Delete

- 已完成 Archive collection detail 中条目的编辑与删除最小闭环：
  - Archive item 行增加 Edit / Delete 操作。
  - 点击 Edit 会回填条目表单，并切换到 Item / edit 模式。
  - 编辑提交会更新条目的 entity、展示标题、排序、备注与外部来源字段。
  - 点击 Delete 会删除条目并刷新当前 collection。
  - Supabase 与 Demo Mode 均支持编辑 / 删除。
- 本轮未修改 Supabase schema、路由、依赖或构建配置。
- 验证结果：
  - `npm test -- --run src/features/archive`
  - 结果：3 个测试文件、14 个用例通过。
  - `npm run build`
  - 结果：通过。
- 环境说明：
  - 默认 shell 起始为 Node `v8.17.0`，Vitest 无法在该版本启动。
  - 本轮沿用既有项目验证方式，切换到本机已有 Node `v20.20.2` 后完成测试与构建。
  - 未运行 `npm install`。

更新时间：2026-07-03

## 本轮补充：Media Asset Edit / Delete

- 已完成 Media Asset 编辑与删除最小闭环：
  - Library 媒体资产行增加 Edit / Delete 操作。
  - 点击 Edit 会回填表单，并切换到 Media / edit 模式。
  - 编辑提交会更新媒体资产字段，并替换可选实体关联。
  - 点击 Delete 会删除媒体资产并刷新列表。
  - Supabase 与 Demo Mode 均支持编辑 / 删除。
- 本轮未修改 Supabase schema、路由、依赖或构建配置。
- 验证结果：
  - `npm test -- --run src/features/library`
  - 结果：2 个测试文件、12 个用例通过。
  - `npm run build`
  - 结果：通过。

更新时间：2026-07-03

## 本轮补充：Inbox / Library CRUD UI Pattern

- 已完成 Inbox 与 Library 的 CRUD UI Pattern 收口：
  - Inbox 首页补齐后台式指标区、Import workflow 分区、Preview output 分区和候选导入行列表。
  - Inbox Anontraveler 预览结果补充 Preview collection 与 Album samples 展示。
  - Library 首页补齐 Assets filed / Linked assets / Media types 指标区。
  - Library 媒体创建表单调整为 Asset identity / Storage profile / Optional link 分区。
  - Library 媒体资产列表调整为 Asset / Media type / Storage / Linked entity / Notes 行列表。
- 本轮未修改 Supabase schema、路由、依赖或构建配置。
- 验证结果：
  - `npm test -- --run src/features/inbox src/features/library`
  - 结果：6 个测试文件、19 个用例通过。

更新时间：2026-07-03

## 本轮补充：Practice Supabase Progress Fields

- 已完成 Practice 目标时长、完成度与标签的真实 Supabase 持久化映射：
  - 新增 migration，为 `practice_sessions` 增加 `goal_duration_minutes`、`completion_percent`、`tags`。
  - `goal_duration_minutes` 允许为空，非空时必须大于 0。
  - `completion_percent` 允许为空，非空时必须在 0-100。
  - `tags` 使用 `text[] not null default '{}'::text[]`，兼容旧数据。
  - Practice service 的 list/create/update 已映射这些字段。
- 本轮修改了 Supabase 稳定区：
  - 原因：Practice 前端与 Demo Mode 已具备字段能力，P0 数据闭环需要真实持久化。
  - 风险：远程 Supabase 实例已完成 migration 应用与字段/约束验证；后续仍需注意不要提交任何密钥或环境变量。
  - 替代方案：继续只在 Demo Mode 保留字段，但线上数据会丢失新增信息。
  - 影响范围：仅 `practice_sessions` 兼容新增字段与 Practice service 字段映射。
- 本轮补充了一个构建修复：
  - `src/features/songs/songs.service.ts` 中 Demo Mode 旧数据默认值合并顺序调整，避免 TypeScript 5.7 报重复字段覆盖错误。
  - 行为保持兼容：旧本地歌曲缺少 `releaseYear`、`bpm`、`notes` 时继续补默认值。
- 验证结果：
  - `npm test -- --run src/features/practice`：4 个测试文件、24 个用例通过。
  - `node -v`：`v20.20.2`。
  - `npm -v`：`10.8.2`。
  - `npm test -- --run src/features/songs`：3 个测试文件、23 个用例通过。
  - `npm test -- --run`：31 个测试文件、146 个用例通过。
  - `npm run build`：通过。
- Supabase CLI / Docker 状态：
  - 已安装 Supabase CLI `2.109.0` 到用户本地目录，并加入用户 PATH。
  - 已链接远程 Supabase 项目 `ubijnnfqlasqlwqbazfa`。
  - `supabase db push` 已成功应用全部 5 个 migrations 到远程项目。
  - `supabase migration list --linked` 显示本地与远程 migration 版本一致。
  - 远程查询确认 `practice_sessions` 已包含 `goal_duration_minutes`、`completion_percent`、`tags`。
  - 远程查询确认目标时长与完成度 check 约束存在。
  - 远程插入包含新增字段的练习记录成功，非法 `completion_percent = 120` 被 check 约束拒绝。
  - 远程验证用测试数据已清理。
- 额外说明：
  - 早前在 Node `v8.17.0` 下尝试完整测试与构建失败，原因是当前 Vite/Vitest/TypeScript 工具链需要现代 Node。
  - 已切换到 Node `v20.20.2` 后完成完整验证。
  - `npm install` 未运行，本轮未修改依赖或 lockfile。
  - 未读取、记录或提交 Supabase token / 数据库密码。

更新时间：2026-07-03
