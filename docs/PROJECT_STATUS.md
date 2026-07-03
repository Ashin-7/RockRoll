# RockRoll 项目状态

更新时间：2026-07-03

## 当前阶段

RockRoll 处于 MVP Phase 1，当前策略仍是 Practice First。

当前最高优先级已经从继续扩展功能，调整为先验证真实 Supabase Auth + 当前用户数据 CRUD 闭环。

## 本轮完成：Auth + Supabase CRUD 最小真实闭环

已完成真实 Supabase Auth 登录链路验证：

- `.env.local` 已连接真实 Supabase 项目。
- 密码注册 / 登录已在真实 Supabase session 下跑通。
- Demo Mode 保留，但不会因为缺少 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 自动伪造登录。
- Demo Mode 仅在 `VITE_ENABLE_DEMO_MODE=true` 时允许写入和读取 `rockroll.demoSession`。

已完成真实登录用户的 Supabase CRUD smoke test：

- 测试表：`practice_sessions`。
- 测试用户：真实 Supabase user id `727c9005-4e86-4ab0-8226-5bf7da1ed5e6`。
- insert 成功：测试行 `510d47a3-572d-48b5-abbe-805f1b017b0b`。
- select 成功：读取到当前用户绑定数据。
- update 成功：`focus_area = supabase-smoke-update`。
- delete 成功：页面显示 `Deleted: yes`。

本轮没有修改 Supabase schema，没有使用 service role key，没有绕过 RLS。

## Auth 当前状态

已完成：

- 独立 Auth 页面入口。
- 密码登录。
- 密码注册。
- Magic link 登录入口保留。
- 注册需要邮箱确认时，页面会明确提示。
- 注册确认邮件可重发。
- 真实 Supabase CRUD smoke test 入口。
- Smoke test 成功后显示 user id、inserted row、updated focus、deleted 状态。
- Demo Mode UI 明确标识当前不是 Supabase 真实登录。

注意事项：

- Supabase 后台如果开启 Confirm email，密码注册后必须先确认邮箱。
- Supabase 后台如果关闭 Confirm email，新注册用户应直接获得 session。
- 之前遇到的 `User already registered` + `Invalid login credentials` 是测试用户历史状态导致，删除该 Auth 用户后重新注册已跑通。

## 已完成的历史能力摘要

以下为当前已完成能力的高层摘要，详细实现以代码和测试为准：

- Practice progress fields 已接入 Supabase：`goal_duration_minutes`、`completion_percent`、`tags`。
- Practice service 已支持相关字段的 list / create / update 映射。
- Supabase migrations 已推送到远程项目并完成字段与约束验证。
- Inbox / Library CRUD UI pattern 已完成一轮收口。
- Media Asset Edit / Delete 已完成。
- Media Link Edit / Delete 已完成。
- Archive Item Edit / Delete 已完成。
- Archive Collection Edit / Delete 已完成。

## 匿名旅行者导入评估

既有文档已更新：`docs/IMPORT_ANONTRAVELER.md`。

当前结论：

- 现阶段不建议立刻自建完整后端。
- 短期继续采用 Supabase Database + Supabase Storage + RLS。
- 匿名旅行者导入应采用 Import Inbox-first，而不是前端直接写正式库。
- 图片、视频、音频文件进入 Storage 或未来私有对象存储，Postgres 只保存 metadata、路径和关联关系。
- 大规模导入、转码、波形分析、后台队列等需求明确后，再引入 Edge Functions、独立 worker 或自建后端。
- 进入导入 MVP 前，先完成真实 Supabase session 下的 Practice CRUD UI 验证。

## 验证记录

本轮 Auth 验证命令：

```powershell
npm test -- --run src/features/auth/AuthPage.test.tsx
npm test -- --run src/features/auth
npm run build
```

结果：

- `AuthPage.test.tsx`：15 个用例通过。
- `src/features/auth`：2 个测试文件、35 个用例通过。
- `npm run build`：通过。

真实浏览器验证：

- 登录账号：`15779799065@163.com`。
- Supabase user id：`727c9005-4e86-4ab0-8226-5bf7da1ed5e6`。
- CRUD smoke test：insert / select / update / delete 通过，页面显示 `Deleted: yes`。

## 当前风险

- 需要继续验证真实 Supabase session 下的 Practice 正式 UI CRUD，而不仅是 smoke test。
- 如果 Practice UI 遇到 RLS / permission 错误，只能修正 policy，不能使用 service role key，不能绕过 RLS。
- 当前部分 Auth 页面文案仍为英文，可后续单独整理，不建议在 CRUD 验证前扩大 UI/i18n 修改。
- 历史文档曾出现编码乱码，本文件已重新写成干净 UTF-8 中文。

## 下一步建议

下一步优先做：真实 Supabase session 下的 Practice CRUD UI 验证。

范围：

- 使用当前真实登录用户。
- 在 Practice 页面执行创建、读取、更新、删除练习记录。
- 测试数据必须绑定当前 Supabase user id。
- 如遇 RLS 错误，修 policy，不绕过权限。

Practice 真实 CRUD UI 验证通过后，再启动匿名旅行者导入 MVP。
