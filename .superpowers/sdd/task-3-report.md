# Task 3 实现报告

## Status

完成：仅基于明确 PDF 矢量结构识别 whole、half、quarter、eighth、16th 音符。

## RED 证据

1. 初始测试：`npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`
   - 结果：FAIL，Vitest 无法解析 `./rhythm-symbols`，符合 brief 预期的 module-not-found RED。
2. 歧义与中置信度测试：同一命令
   - 结果：FAIL 2 tests；重复 beam 被误判为 16th，中置信度系统产出了 whole。
3. filled 窄矩形 stem 测试：同一命令
   - 结果：FAIL 1 test；`fill-stroke` 窄矩形未被识别为 stem。

## GREEN 证据

命令：`npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

- Node：v20.20.2
- 结果：PASS
- Test Files：1 passed
- Tests：13 passed

## 修改文件

- `src/features/toolbox/toolbox.types.ts`
  - 新增 `RhythmDuration`、`RhythmGlyphEvent`、`RhythmGlyphResult` 公开类型。
- `src/features/toolbox/rhythm-symbols.ts`
  - 新增高置信度五线谱带内的结构化音符识别。
  - 阈值全部以 staff gap 派生并使用命名常量。
  - 非唯一 stem/beam、中置信度系统及无 stem 实心符头仅输出诊断。
- `src/features/toolbox/rhythm-symbols.test.ts`
  - 覆盖 five durations、拒绝场景、fill-stroke hole、阈值边界、歧义和中置信度诊断。

## 自查

- 未读取真实 PDF；测试只使用归一化矢量夹具。
- 未使用 TAB 横向间距推断时值。
- 未实现休止符、附点、三连音、连音线、技巧、扫描、播放、人工编辑、`.gp` 或 MusicXML。
- 未修改 Supabase、依赖或 lockfile；未运行 `npm install`。
- 只运行 Task 3 定向 Vitest，没有运行完整测试或构建。
- `git diff --check` 无空白错误，仅有现有 Git 的 LF/CRLF 转换提示。

## 风险

- 当前识别器只处理 brief 确认的归一化结构与阈值；不同 PDF 生成器若拆分轮廓、使用旋转矩阵或把 beam/stem 编码为其他绘制结构，会进入诊断或不识别。
- `fill-stroke` 开放符头要求同一路径存在严格内含的闭合内轮廓；跨路径表达的洞暂不识别。
- 本任务按约束只做定向验证，未覆盖仓库级类型检查、完整测试或构建。

## 评审修复 RED 证据

命令：`npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

1. 首轮新增回归测试：FAIL，4 tests failed / 13 passed。
   - 曲线和五角闭合轮廓被误识别为 beam。
   - `1.0 gap × 0.4 gap` 实心闭合矩形同时产出 notehead glyph，并被另一符头计作 beam。
   - 轻微偏移及嵌套 beam 轮廓被误计为两个独立层级。
2. 中心距离边界隔离测试：临时移除中心距离判断后 FAIL，1 test failed / 17 passed。
   - 两个区域不重叠、但中心纵向距离等于 `0.5 × max(thickness)` 的 beam 被误计为 16th。

## 评审修复 GREEN 证据

命令：`npm test -- --run src/features/toolbox/rhythm-symbols.test.ts`

- 结果：PASS
- Test Files：1 passed
- Tests：18 passed

## 评审修复内容

- beam 仅接受单一闭合直线四角轮廓，拒绝 curve、额外角点与多轮廓结构；保留 `move + 3 line + close` 矩形。
- 同一路径同时符合 notehead 与 beam 时，按系统输出不含 PDF 内容的结构歧义 warning，并从两类候选中排除。
- 同一 stem 的 beam 区域重叠，或中心纵向距离小于等于最大厚度的一半时，输出层级不唯一 warning，不产出高置信度 glyph。
- 真正分离的双 beam 仍识别为 16th。
