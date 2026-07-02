# Global Rules for Coding Agent

## Operating Principles

- Prefer small, reviewable diffs.

- Avoid sweeping refactors unless explicitly requested.

- Before editing, identify the file(s) to change and state the plan in 3-6 bullets.

- When the request is ambiguous, choose the smallest safe interpretation and state the assumption before editing.

- Never invent APIs, configs, file paths, or project conventions. Search the repository first if unsure.

- Preserve backward compatibility unless explicitly requested.

- Keep changes consistent with the existing architecture and coding style.

- If multiple implementations are reasonable, briefly explain the trade-offs and choose the simplest maintainable solution.

- Before making non-trivial changes, inspect the repository structure, existing patterns, and related implementations instead of assuming conventions.

- If repository state is inconsistent, dependencies are missing, or required context is unavailable, stop and explain what is blocking progress instead of guessing.

## Safety and Secrets

- Never paste secrets, tokens, private keys, .env values, or credentials into code or logs.

- If a task requires secrets, request that they be provided through environment variables.

- Do not add analytics, telemetry, or network calls unless explicitly requested.

## Code Quality

- Add or update tests for behavior changes when the project has tests.

- Prefer type safety and explicit error handling.

- Add comments only when the intent is non-obvious.

- Follow existing project conventions before introducing new patterns or abstractions.

## Frontend & UI

When working on frontend or UI tasks, act as a senior frontend engineer plus UI systems designer.

Prioritize:

- Build the actual usable interface first, not a marketing shell.

- Match the existing project stack, component patterns, styling system, and file structure.

- Use responsive, mobile-first layouts.

- Use semantic HTML and accessible interaction patterns.

- Follow WCAG 2.1 AA where practical.

- Create consistent spacing, typography, color, and component states.

- Prefer reusable components when they reduce real duplication.

- Optimize performance: avoid unnecessary re-renders, oversized bundles, blocking assets, and layout shift.

- Keep UI dense and task-focused for SaaS/admin/business tools.

- Use polished visual design for consumer apps, landing pages, portfolios, and games.

- Verify important UI changes in browser screenshots when possible.

Frontend implementation rules:

- Inspect existing components before adding new abstractions.

- Use TypeScript types where the project already uses TypeScript.

- Use existing design tokens, CSS variables, Tailwind config, theme files, or component libraries.

- Add loading, empty, error, disabled, hover, focus, and active states where users would expect them.

- Ensure text does not overflow buttons, cards, nav items, or compact panels.

- Avoid decorative UI that reduces clarity.

- Avoid nested cards and excessive card-heavy layouts.

- Use icons for common tool actions when an icon library exists.

UI design rules:

- Establish clear visual hierarchy.

- Use consistent spacing and alignment.

- Keep color palettes balanced; avoid one-note palettes.

- Make primary actions obvious and secondary actions quieter.

- Use familiar controls: tabs for views, toggles for binary settings, sliders/inputs for numeric values, menus for option sets.

- For dashboards and operational tools, prefer restrained, scannable, information-dense layouts.

- For landing pages, show the product/place/person/object clearly in the first viewport.

Verification:

- Run lint/typecheck/tests when available.

- For visual work, start the app and inspect desktop and mobile layouts.

- Report what changed and what was verified.

## Build and Run Etiquette

- Unless explicitly requested otherwise, assume every project targets Node.js v8.17.0. Do not suggest or introduce features, syntax, dependencies, or tooling that require a newer Node.js version.

- For legacy Vue/webpack projects under D:\Code, preserve Node.js v8.17.0, npm lockfileVersion 1, and existing dependency versions unless I explicitly ask for an upgrade.

- For non-project automation, browser tooling, or one-off helper scripts, ask before using nvm to switch to a newer Node.js version, and keep those tools outside legacy project directories.

- When suggesting commands for the user to run manually, provide the exact command and its purpose.

- When changes may affect the build, run the fastest relevant check first.

- Do not run expensive builds or full test suites unless they are necessary or explicitly requested.

- Prefer concise Chinese comments for business logic, complex workflows, compatibility workarounds, and non-obvious implementation details. Avoid redundant comments that merely restate the code.

## Output Formatting

- For code changes: include a short summary and a list of files changed.

- For debugging: include hypotheses, experiments run, and the minimal fix.

- If assumptions were made, list them explicitly in the final response.

## Communication Preferences

- Use concise explanations, concrete steps, and copy-pastable commands.

- Use the project or team's preferred language for explanations.

## Git Hygiene

- Keep commits logically scoped.

- Do not modify unrelated files.

- Avoid formatting-only changes unless requested.

--- project-doc ---

# AGENTS.md

# 项目定位

RockRoll 是一个私有云优先（Private Cloud First）的音乐档案与练习追踪应用。

项目核心目标：

- 用户认证与账号管理
- 以歌曲为中心的练习记录系统
- 视频、音频、曲谱、Guitar Pro 文件管理
- 艺人、专辑、风格等音乐资料库
- 外部音乐元数据导入
- 长期个人音乐成长档案

当前项目处于 MVP 阶段。

Codex 的目标不是展示复杂架构能力，而是：

- 保持稳定
- 保持简单
- 保持长期可维护
- 保持可持续迭代
- 避免重复造轮子

---

# 沟通与文档语言

默认：

- 使用中文回复
- 使用中文总结
- 使用中文任务拆解
- 使用中文注释
- 使用中文文档

代码：

- 文件名使用英文
- 变量名使用英文
- 函数名使用英文
- 类名使用英文
- 禁止拼音命名

注释原则：

解释：

    为什么这样做

而不是：

    代码正在做什么

---

# 当前技术栈

当前技术栈：

- React 18
- TypeScript
- Vite
- Vitest
- Testing Library
- Supabase

未经用户明确要求，不允许主动引入：

- Vue
- Nuxt
- Next.js
- Redux
- MobX
- Zustand
- CSS-in-JS
- 新数据库
- 新 ORM
- 新构建工具
- 微服务
- 微前端

新增依赖前必须说明：

- 为什么需要
- 是否有替代方案
- 影响范围
- 长期维护成本

---

# UI 技术规范

当前阶段：

    原生 React + 当前样式体系

后期 UI 方案：

    shadcn/ui
    +
    Radix UI
    +
    Lucide React

当前状态：

- shadcn/ui：未引入
- Radix UI：未引入
- Lucide React：未引入

规则：

- 优先复用已有组件
- 不重复创建基础组件
- 不主动引入 Ant Design
- 不主动引入 MUI
- 不主动引入 Element Plus
- 不主动引入新的 UI 框架

允许：

- Tailwind（仅作为 shadcn/ui 的依赖）

当前原则：

    Practice MVP 优先
    UI 美化延后

推荐目录：

src/
  components/
    ui/
  features/
  styles/

禁止：

- 多 UI 框架混用
- 重复 Button
- 重复 Input
- 重复 Modal
- 重复 Dialog
- 重复 Card
- 未经确认引入动画库

---

# 项目架构原则

采用：

    Feature First Architecture

原则：

    先正确
    再稳定
    再优化
    最后抽象

禁止：

- 为了复用而抽象
- 为了架构而架构
- 为了高级而设计

---

# 当前目录结构

src/
  app/
  config/
  features/
  i18n/
  lib/
  styles/
  test/
  App.tsx
  main.tsx

supabase/
  migrations/
  seed.sql

docs/
  superpowers/

规则：

- 保持目录结构稳定
- 不大规模移动目录
- 新功能优先放 feature
- 不创建新的顶级业务目录

---

# Feature 边界

当前模块：

- auth
- songs
- practice
- archive
- library
- inbox
- backstage

规则：

- 优先修改当前 feature
- 禁止跨 feature 放业务逻辑
- 禁止跨 feature import 内部实现
- 公共能力确认后再进入 lib

---

# 当前阶段

当前阶段：

    MVP Phase 1

当前策略：

    Practice First

原则：

- 不提前优化
- 不提前抽象
- 不提前美化
- 不提前桌面化

---

# 当前开发顺序

1. Practice 数据模型
2. Practice CRUD
3. Song 与 Practice 关联
4. Practice History
5. Practice Statistics
6. Auth 最小闭环
7. Song Library
8. Artist Library
9. Metadata Inbox

---

# Practice 模块规则

Practice 是 MVP 核心。

涉及：

- practice
- practice_history
- practice_statistics
- song_practice

优先保证：

- 数据结构正确
- CRUD 正确
- 历史数据兼容
- 查询性能合理

暂不优先：

- UI
- 动画
- 高级抽象
- 极限优化
- 桌面适配

原则：

    先正确
    再漂亮

---

# 禁止提前开发

禁止主动开发：

- Dashboard
- AI
- 推荐系统
- 社区
- 聊天
- 插件系统
- 实时协同
- 离线数据库
- 多端同步
- 音乐播放器
- Electron
- Tauri
- 高级统计图表

除非用户明确要求。

---

# 架构稳定区

禁止随意修改：

src/app
src/config
src/lib
supabase
vite.config.ts
tsconfig.json
vitest.config.ts

修改前必须说明：

- 原因
- 风险
- 替代方案
- 影响范围

---

# 功能状态管理

项目维护：

    docs/PROJECT_STATUS.md

修改前必须检查：

- 当前阶段
- 当前任务
- 是否影响稳定区域
- 是否需要更新状态
- 是否需要补充测试

---

# 防止重复造轮子

新增代码前必须检查：

1. 当前 feature
2. src/lib
3. React 官方能力
4. 浏览器 API
5. Supabase 能力

禁止：

- 重复 Hook
- 重复 DTO
- 重复 API
- 重复组件
- 重复状态管理
- 重复工具函数
- 重复业务逻辑

原则：

    重复三次以上再考虑抽象

---

# 文件规模规则

建议：

- Component <= 300 行
- Hook <= 200 行
- Service <= 300 行
- Utils <= 200 行

超过后考虑拆分。

禁止：

- 1000+ 行组件
- 巨型 Hook
- 巨型 util.ts

---

# 开发命令

npm install
npm run dev
npm test -- --run
npm run build

结束任务前：

npm test -- --run
npm run build

无法执行时必须说明原因。

---

# Supabase 规则

数据库修改：

- 新增 migration
- 不修改历史 migration
- 考虑 RLS
- 考虑索引
- 考虑权限
- 考虑兼容性

禁止：

- 删除已有字段
- 删除已有表
- 删除 seed 数据

修改后：

- 更新 migration
- 更新类型
- 更新文档

---

# 环境变量规则

禁止提交：

- .env.local
- Service Role Key
- Token
- Cookie
- 真实账号

修改环境变量后同步检查：

.env.example
README.md

---

# React 与 TypeScript

必须：

- 函数组件
- 明确类型
- 单一职责

避免：

- any
- 超级泛型
- HOC 地狱
- Hook 地狱
- 过度抽象

原则：

    简单优先

---

# 样式规则

原则：

- 全局样式放 styles
- feature 样式靠近 feature
- 不主动引入新的 CSS 体系
- 不大规模重写视觉

当前阶段：

- 功能优先于视觉
- 结构优先于动画
- Practice 优先于 UI

目标：

    清晰
    统一
    可维护

---

# 测试规则

优先测试：

- CRUD
- 表单
- 数据转换
- 路由
- Supabase
- 核心业务逻辑

---

# 文档规则

同步更新：

- README.md
- docs/PROJECT_STATUS.md
- docs/DECISIONS.md
- docs/superpowers/

文档：

- 中文优先
- 结构清晰
- 内容简洁

---

# 架构决策

项目维护：

    docs/DECISIONS.md

记录：

- 为什么使用 Supabase
- 为什么使用 Feature 架构
- 为什么使用 Tauri
- 为什么不使用 Zustand
- 为什么 Practice First

---

# Codex 工作流程

开始任务：

1. 阅读相关文件
2. 阅读 PROJECT_STATUS.md
3. 判断功能边界
4. 检查是否已有实现
5. 给出中文计划
6. 打开任务队列，并在执行过程中持续更新状态
7. 小步修改

上下文节省规则：

- 继续当前任务时，优先沿用已有上下文和已确认的项目状态。
- 默认只读取 `AGENTS.md`、`docs/PROJECT_STATUS.md`、`docs/NEXT_TASKS.md` 和当前任务目录。
- 如果用户明确限定读取范围，只读取用户指定的文件或目录。
- 禁止默认扫描整个仓库；只有当前任务被阻塞且必须确认未知实现时，才补充读取最小必要文件。
- 不重新检查无关模块，优先聚焦当前 P0/P1/P2 任务涉及的 feature。
- 除非 `package.json`、`pnpm-lock.yaml` 或 `package-lock.json` 发生变化，否则禁止运行 `npm install`。
- 除非用户明确要求，否则禁止运行完整测试；优先运行与当前修改相关的最小测试。
- 开发任务优先采用增量修改，不进行仓库级分析。
- 文档和轻量计划变更不强制运行构建或测试；如未运行，结束时说明原因。

多轮迭代会话切换规则：

当满足以下任一条件时，应停止继续扩大当前对话上下文，并准备开启新一轮对话：

1. 已连续完成 2 个以上开发任务。
2. 当前对话已多次读取大量上下文。
3. 本轮修改涉及 5 个以上文件。
4. 当前任务已经完成，可以进入下一个 P0/P1 任务。
5. 用户要求继续较多迭代。

触发切换时，不要继续开发新功能，而是先执行交接：

1. 更新 `docs/PROJECT_STATUS.md`
   - 当前完成了什么
   - 当前分支状态
   - 当前风险
   - 当前验证结果

2. 更新 `docs/NEXT_TASKS.md`
   - 标记已完成任务
   - 写明下一个推荐任务
   - 写明只需要读取哪些文件

3. 如有必要，创建或更新 `docs/SESSION_HANDOFF.md`
   内容包括：
   - 本轮完成内容
   - 修改文件列表
   - 验证命令和结果
   - 未完成事项
   - 下一轮推荐提示词

4. 最后输出一句：
   “建议开启新对话，并粘贴以下提示词继续。”

提示词格式：

```text
继续 RockRoll 项目开发。
请只读取：
- AGENTS.md
- docs/PROJECT_STATUS.md
- docs/NEXT_TASKS.md
- docs/SESSION_HANDOFF.md
- 当前任务相关目录

继续 docs/NEXT_TASKS.md 中的下一个任务。
不要扫描整个仓库。
不要运行 npm install。
不要做架构重构。
完成后中文总结。
```

结束任务：

## 本次处理

## 修改文件

## 是否影响已完成能力

## 验证方式

## 风险

## 后续建议

GitHub 同步：

- 当一次任务产生较多文件变更、阶段性功能完成、或用户要求“提交一版”时，完成必要验证后应先提交到本地 Git，再推送到当前跟踪的 GitHub 分支。
- 推送前必须确认 `git status` 与当前分支，避免提交无关改动；如存在用户未确认的无关改动，只提交本次任务相关文件。
- 如用户明确要求暂不推送、远端未配置、网络/权限失败、或当前状态不适合推送，需说明原因与下一步命令。

---

# 当不确定时

如果 Codex 无法判断：

- 是否重构
- 是否抽象
- 是否新增依赖
- 是否修改架构
- 是否修改数据库

默认：

    不修改

并说明原因。

---

# 桌面端规划

后期采用：

    Tauri

路线：

Practice MVP
    ↓
Song Library
    ↓
Web 稳定
    ↓
Tauri

当前：

    禁止引入 Tauri

---

# 黄金法则

1. 功能优先于架构
2. 正确优先于优雅
3. 简单优先于高级
4. 稳定优先于重构
5. 已有实现优先于重新实现
6. 用户要求优先于默认最佳实践
