# Songs Supabase Data Loop MVP Design

## 目标

把 Songs 从本地 mock 展示推进到真实 Supabase 数据读写闭环：登录用户可以在 `#songs` 页面读取自己的曲目，并新增最小曲目记录。

当前阶段仍保持 MVP Phase 1：

- 使用现有 Supabase 后端能力。
- 不新建 Node/API 后端服务。
- 不新增依赖。
- 默认不修改数据库 schema。
- 不改 Practice 数据模型。
- 不做 Artist/Album/Genre 关系编辑。
- 不做复杂搜索、排序、筛选或批量操作。

## 范围

本次只做 Songs 真实数据最小闭环：

- `songs.service.ts` 支持读取当前用户可见的 `songs` 表数据。
- `songs.service.ts` 支持新增曲目，并写入当前登录用户 `user_id`。
- `SongListPage` 默认从 Supabase 加载真实数据。
- 页面展示 loading、error、empty 和真实列表状态。
- 页面提供最小新增曲目表单：标题、状态、难度。
- 新增成功后重新读取列表。
- 支持中英文文案。
- 保留测试注入能力，避免单元测试访问真实 Supabase。

## 非目标

本次不做：

- 新建后端服务。
- 修改或新增 Supabase migration。
- 修改 RLS policy。
- 新增 seed 数据。
- Artist 关系表写入。
- Practice 真实查询。
- Song detail 真实数据。
- 路由守卫。
- 文件上传或媒体资源。

## 现有基础

当前 schema 已有：

- `public.songs`
- `public.artists`
- `public.song_artists`
- `public.practice_sessions`

`songs` 表包含本次需要的字段：

- `id`
- `user_id`
- `title`
- `status`
- `difficulty`
- `updated_at`

RLS 已启用，策略是 `auth.uid() = user_id`。因此新增曲目时必须明确写入当前登录用户 id。

## 架构

### Service

`src/features/songs/songs.service.ts` 负责：

- `listSongs()`：读取 `songs` 表，按 `updated_at` 倒序。
- `createSong(input)`：读取当前 session user id，然后 insert 到 `songs`。
- 把 Supabase row 转换为 `SongSummary`。
- 对未知或非法 status 做保守 fallback：`planned`。

### Page

`src/features/songs/SongListPage.tsx` 负责：

- 页面 mount 时加载真实数据。
- 渲染 loading、error、empty、list。
- 提供最小新增曲目表单。
- 成功新增后清空表单并重新加载列表。
- 仍允许测试通过 props 注入 `songs`、`onLoadSongs`、`onCreateSong`。

数据流：

```text
SongListPage mount
  -> listSongs()
  -> render real songs

Submit new song
  -> createSong(input)
  -> listSongs()
  -> render refreshed songs
```

## 表单字段

新增曲目表单包含：

- `title`：必填。
- `status`：默认 `planned`。
- `difficulty`：可选，范围 1-5。

暂不包含 artist，因为当前真实 artist 关系需要 `artists` 与 `song_artists` 两张表，超出本次最小闭环。

## 错误处理

- 未登录或 session 缺失：显示错误文案，不写入数据。
- list 失败：显示错误文案。
- create 失败：显示错误文案，保留表单输入。
- difficulty 为空时写入 `null`。

## 测试策略

- `songs.service.test.ts`
  - `listSongs` 调用 Supabase 并映射 row。
  - `createSong` 写入当前 user id。
  - session 缺失时报错。
  - Supabase error 会抛出。
- `SongListPage.test.tsx`
  - 默认通过 injected loader 渲染真实数据列表。
  - loading 状态可见。
  - empty 状态可见。
  - error 状态可见。
  - 提交新增曲目后调用 injected create，并刷新列表。
  - 中文文案可切换。

## 风险

主要风险是本地 Supabase 环境未配置或没有登录 session。测试通过依赖注入规避真实网络；实际运行需要用户配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 并登录。若现有 RLS 或 schema 与远端环境不一致，需要单独处理 Supabase migration 或环境同步。
