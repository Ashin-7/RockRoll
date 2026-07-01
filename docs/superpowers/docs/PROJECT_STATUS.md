# PROJECT_STATUS

## 当前阶段

MVP Phase 1，Practice First。

## 当前状态

- 已建立 React 18 + TypeScript + Vite + Vitest + Supabase 的基础项目。
- 已有基础路由、AppShell、i18n、Auth、Backstage、Archive、Library、Inbox 与 Songs feature 雏形。
- Songs 当前处于本地 mock MVP：不接 Supabase，不修改数据库，不修改 Practice 数据模型。
- Practice 表单已支持选择曲目并提交 `songId`，作为 Song 与 Practice 关联的前端最小闭环。
- Practice History 已有独立 `#practice` mock 页面，通过本地数据展示最近练习记录。

## 最近完成

- 完成 `SongListPage` 本地 mock 曲目展示。
- 显示当前练习状态，并支持英文/中文状态文案。
- App 导航进入 Songs 时展示本地 mock 曲目。
- 已补充 Songs 页面测试覆盖默认 mock、空状态与中文文案。
- 完成 Practice 表单级 Song 关联：可传入曲目列表，提交时带上 `songId`，service 写入 `song_id`。
- 完成 Practice History mock 页面：新增 `#practice` 路由、导航入口、本地练习记录列表与空状态。

## 验证方式

当前项目工具链需要 Node 20 运行测试和构建。全局 Node 8 保持不变时，可使用单条命令临时指定 Node 20：

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

## 下一步建议

1. Practice Statistics。
2. Auth 最小闭环。
3. Song Library。
4. Artist Library。
