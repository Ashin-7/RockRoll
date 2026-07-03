# RockRoll 下一步任务

更新时间：2026-07-03

## 本轮完成：Auth + Supabase CRUD 最小真实闭环

状态：已完成，并已通过真实 Supabase session 手动验证。

完成范围：

- 真实密码注册 / 登录链路已跑通。
- Demo Mode 边界已收紧：仅 `VITE_ENABLE_DEMO_MODE=true` 时允许本地 demo session。
- 缺少 Supabase 环境变量且未开启 Demo Mode 时，不再伪造登录成功。
- Auth 页面新增独立登录 / 注册体验与密码注册支持。
- Auth 页面补充注册需邮箱确认时的明确提示与重发确认邮件入口。
- Auth 页面补充 Supabase CRUD smoke test 成功结果展示。
- 真实登录用户已完成 `practice_sessions` insert / select / update / delete smoke test。

验证：

- `npm test -- --run src/features/auth/AuthPage.test.tsx`：15 个用例通过。
- `npm test -- --run src/features/auth`：2 个测试文件、35 个用例通过。
- `npm run build`：通过。
- 浏览器真实 Supabase session smoke test：`Deleted: yes`。

## 导入架构评估结果

既有文档已更新：`docs/IMPORT_ANONTRAVELER.md`。

结论：

- 暂不自建完整后端。
- 继续使用 Supabase 作为主后端。
- 匿名旅行者导入采用 Import Inbox-first。
- 图片、视频、音频采用 Media metadata-first。
- 大规模后台导入、转码、队列、重试等需求明确后，再引入 Edge Functions、独立 worker 或自建服务。

导入 MVP 排在 Practice 真实 CRUD UI 验证之后。

## 当前最高优先级

继续验证真实 Supabase session 下的 Practice CRUD UI。

目标：

- 使用真实 Supabase 登录用户。
- 在 Practice 页面完成最小 UI 闭环：create / list / update / delete。
- 数据必须绑定当前登录用户 `user_id`。
- 不使用 Demo Mode 伪造通过。
- 不使用 service role key。
- 如遇 RLS / permission 错误，只修 policy，不绕过 RLS。

## 推荐执行顺序

1. 只读取 Practice 相关实现：`src/features/practice`。
2. 确认 Practice service 当前 Supabase CRUD 是否已经绑定当前用户。
3. 检查 Practice 页面是否已有 create / list / update / delete UI。
4. 使用浏览器真实登录 session 操作 Practice 页面。
5. 如果 UI 缺少编辑 / 删除入口，只做最小入口补齐，不做大规模 UI 重构。
6. 如果报 RLS 错误，定位缺少的 policy：select / insert / update / delete。
7. 验证通过后更新本文档和交接文档。
8. 下一阶段再启动匿名旅行者导入 MVP。

## 下一轮建议只读取

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASKS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/IMPORT_ANONTRAVELER.md`
- `src/features/auth`
- `src/features/practice`
- `supabase/migrations`

## 不要做

- 不要扫描整个仓库。
- 不要运行 `npm install`。
- 不要做架构重构。
- 不要扩展新业务功能。
- 不要引入新的 UI 框架。
- 不要使用 service role key。
- 不要绕过 RLS。

## 后续候选任务

在 Practice 真实 CRUD UI 验证通过后，优先考虑：

1. 匿名旅行者导入 MVP：小型 JSON / CSV 进入 Inbox preview。
2. 用户确认后分批写入正式库。
3. 图片外链或手动上传到 Storage。
4. 视频 / 音频先保存 metadata 和 Storage path，不做转码。
5. Song 与 Practice 关联的真实 UI 验证。
6. Practice History 最小列表。
7. Practice Statistics 最小统计。
