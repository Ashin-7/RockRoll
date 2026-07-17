# Practice Statistics Mock MVP Design

## 目标

在现有 `#practice` 页面中增加本地 mock 练习统计摘要，让用户进入练习页面后能先看到当前练习概览，再查看练习历史。

当前阶段仍保持 MVP Phase 1 / Practice First：

- 不接 Supabase。
- 不修改数据库。
- 不修改 Practice 数据模型。
- 不新增依赖。
- 不新增独立统计路由。
- 不做图表或复杂筛选。

## 范围

本次只做 `Practice Statistics` 的前端 mock 最小闭环：

- 基于 `localPracticeHistory` 或传入的 `sessions` 计算统计。
- 在 `PracticeHistoryPage` 顶部展示统计摘要。
- 支持中英文文案。
- 覆盖默认数据、空数据和中文文案测试。

## 页面设计

`#practice` 页面结构调整为：

1. 页面标题区：沿用当前 `Practice History` 标题。
2. 统计摘要区：位于标题区和历史列表之间。
3. 历史列表区：沿用当前练习历史记录展示。

统计摘要展示 5 个指标：

- 总练习次数：sessions 数量。
- 总练习时长：durationMinutes 总和。
- 练习曲目数：按 songTitle 去重后的数量。
- 平均单次时长：总时长 / 总次数，向最接近整数取整。
- 最近练习日期：按 practicedOn 排序后的最新日期。

空数据时：

- 数值指标显示 `0`。
- 最近练习日期显示本地化的空值文案。
- 原有空状态继续显示。

## 架构

新增一个 feature 内部统计计算模块：

- `src/features/practice/practiceStatistics.ts`

它只依赖 `PracticeHistoryItem` 类型，不访问 React、i18n、Supabase 或浏览器 API。

`PracticeHistoryPage` 负责：

- 调用统计计算函数。
- 使用 i18n 渲染统计标签。
- 保持传入 `sessions` 的测试入口。

数据流：

```text
practice.mock.ts / props.sessions
  -> calculatePracticeStatistics
  -> PracticeHistoryPage summary UI
```

## 测试策略

新增或更新测试覆盖：

- 统计函数对默认数据计算正确。
- 空数据统计返回安全默认值。
- `PracticeHistoryPage` 渲染统计摘要。
- 中文 locale 下统计标签可切换。

## 非目标

本次不做：

- 图表。
- 时间范围筛选。
- 数据库聚合。
- Practice 数据模型调整。
- 新导航入口。
- 独立 Statistics 页面。
- 样式体系重构。

## 风险

主要风险是统计口径过早复杂化。为降低风险，本次只使用当前 mock 数据已有字段，且统计函数保持纯函数，后续接 Supabase 时可以复用或替换。
