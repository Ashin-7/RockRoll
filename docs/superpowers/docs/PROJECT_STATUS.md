# PROJECT_STATUS

## 当前阶段

MVP Phase 1，Practice First。

## 当前状态

- 已建立 React 18 + TypeScript + Vite + Vitest + Supabase 的基础项目。
- 已有基础路由、AppShell、i18n、Auth、Backstage、Archive、Library、Inbox 与 Songs feature 雏形。
- Songs 已接入 Supabase 真实数据读写闭环：可读取当前用户曲目，并新增最小曲目记录。
- Practice 表单已支持选择曲目并提交 `songId`，作为 Song 与 Practice 关联的前端最小闭环。
- Practice History 已有独立 `#practice` 页面，默认从 Supabase `practice_sessions` 读取当前用户真实练习记录。
- Practice 表单入口已接入 `#practice` 页面，新增练习记录后会刷新真实历史与统计摘要。
- Practice 保存入口已受登录状态保护：未登录仅提示登录，登录后才显示新增练习记录表单。
- Practice Statistics 已在 `#practice` 页面基于当前练习记录提供统计摘要。
- Auth 已完成页面内最小闭环：可读取 session、展示当前邮箱、监听 auth 状态并退出登录。
- Auth 支持匿名测试登录，便于无需测试邮箱即可获得真实 Supabase session。
- 未配置 Supabase 时支持本地演示模式：匿名测试登录创建本地 session，Songs 与 Practice 写入浏览器 localStorage。
- Auth 支持通过 `VITE_TEST_LOGIN_EMAIL` 配置本地测试邮箱快捷填充，便于手动测试 magic link 登录。

## 最近完成

- 完成 `SongListPage` 本地 mock 曲目展示。
- 显示当前练习状态，并支持英文/中文状态文案。
- App 导航进入 Songs 时展示本地 mock 曲目。
- 已补充 Songs 页面测试覆盖默认 mock、空状态与中文文案。
- 完成 Songs Supabase 真实数据闭环：`#songs` 默认读取 `songs` 表，支持 loading/error/empty/list 状态和最小新增曲目表单。
- 完成 Practice 表单级 Song 关联：可传入曲目列表，提交时带上 `songId`，service 写入 `song_id`。
- 完成 Practice History mock 页面：新增 `#practice` 路由、导航入口、本地练习记录列表与空状态。
- 完成 Practice Statistics mock 摘要：基于本地练习历史计算练习次数、总时长、练习曲目数、平均时长和最近练习日期。
- 完成 Auth 最小闭环：`#auth` 页面支持未登录 magic link、已登录邮箱展示、auth 状态监听与退出登录。
- 完成 Practice History Supabase 真实查询：`#practice` 默认读取 `practice_sessions`，支持 loading/error/empty/list 状态，并修复练习记录写入缺少 `user_id` 的真实环境问题。
- 完成 Practice 表单入口接入：`#practice` 页面加载当前用户曲目作为选项，保存练习记录后重新读取真实历史并更新统计摘要。
- 完成 Practice 表单体验修正：未登录时隐藏保存表单并提示登录；练习时长和 BPM 使用自定义步进按钮替代浏览器原生 spinner。
- 完成测试登录辅助：Auth 页面可从本地环境变量读取测试邮箱并一键填充，文档说明测试账号需在 Supabase Auth 中创建。
- 完成匿名测试登录：Auth 页面可调用 Supabase anonymous sign-in，一键获得测试 session；README 说明需在 Supabase Auth 中启用匿名登录。
- 修正匿名测试登录反馈：点击后显示处理中，成功后主动刷新当前 session，失败时展示 Supabase 返回的错误。
- 完成本地演示模式：缺少 `.env.local` 时匿名测试登录仍可进入演示 session，并用 localStorage 测试 Songs / Practice 真实页面闭环。

## 验证方式

当前项目工具链需要 Node 20 运行测试和构建。全局 Node 8 保持不变时，可使用单条命令临时指定 Node 20：

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

## 下一步建议

1. Artist Library。
2. Metadata Inbox。
3. Song Detail 真实数据。
4. Artist Detail / Album Detail 基础信息。
