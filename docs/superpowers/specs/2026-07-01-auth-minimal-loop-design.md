# Auth Minimal Loop MVP Design

## 目标

在现有 `#auth` 页面内完成 Auth 最小闭环：用户可以发送 magic link，页面可以识别当前登录 session，已登录时展示账号邮箱，并支持退出登录。

当前阶段仍保持 MVP Phase 1 / Practice First：

- 不修改数据库。
- 不新增 Supabase migration。
- 不新增依赖。
- 不做路由守卫。
- 不改 Practice、Songs 或其他业务数据模型。
- 不引入全局状态管理。

## 范围

本次只做 Auth 页面内闭环：

- 未登录时展示现有 magic link 表单。
- 页面加载时读取当前 Supabase session。
- 已登录时展示当前用户邮箱。
- 已登录时提供退出按钮。
- 监听 Supabase auth 状态变化，magic link 回调或退出后可以更新页面状态。
- 支持中英文文案。
- 补充 Auth 页面和 service 测试。

## 非目标

本次不做：

- 未登录强制跳转。
- 已登录后自动跳转后台或 Practice。
- 全局 AppShell 用户菜单。
- 权限系统。
- 用户资料表。
- RLS 或数据库策略修改。
- 密码登录、OAuth 登录、多因素认证。

## 架构

沿用现有 Auth feature：

- `src/features/auth/auth.service.ts`
  - 保留 `signInWithEmail(email)`。
  - 新增 `getCurrentSession()`。
  - 新增 `signOut()`。
  - 新增 `onAuthStateChange(callback)`，返回取消订阅函数。
- `src/features/auth/AuthPage.tsx`
  - 负责页面状态和渲染。
  - 默认使用 `auth.service.ts` 中的真实方法。
  - 测试时通过 props 注入 mock 方法，避免真实 Supabase 调用。
- `src/i18n/messages.ts`
  - 增加 Auth 状态与退出相关文案。

数据流：

```text
AuthPage mount
  -> getCurrentSession()
  -> set session state
  -> onAuthStateChange(callback)
  -> render signed-in or signed-out view

Sign out click
  -> signOut()
  -> clear local session state
```

## 页面行为

### 加载中

页面首次读取 session 时显示轻量 loading 文案，避免在 session 未确认前闪现登录表单。

### 未登录

沿用当前 magic link 表单：

- 输入邮箱。
- 点击发送登录链接。
- 成功后显示检查邮箱提示。
- 失败后显示错误信息。

### 已登录

显示：

- 已登录提示。
- 当前邮箱。
- 退出按钮。

退出成功后：

- 清空当前 session。
- 显示退出成功提示。
- 回到 magic link 表单。

## 错误处理

- `signInWithEmail` 失败：沿用当前错误展示。
- `getCurrentSession` 失败：显示通用错误，同时保留未登录表单。
- `signOut` 失败：显示错误，不清空当前 session。
- auth state listener 的 session 为空时，页面切换到未登录状态。

## 测试策略

- `auth.service.ts`：使用 mock Supabase client 验证方法调用和错误抛出。
- `AuthPage.test.tsx`：
  - 未登录时可以提交 magic link。
  - 加载已有 session 后展示邮箱和退出按钮。
  - 点击退出后调用 injected signOut 并回到表单。
  - 中文 locale 下展示中文登录状态文案。

## 风险

主要风险是把 Auth MVP 做成全局认证系统。本设计刻意把范围限制在 `#auth` 页面内，避免影响现有 Practice/Songs mock 流程。后续如果需要路由守卫或全局用户菜单，可以基于这次 service 能力继续扩展。
