# 工具箱：电子六线谱 PDF 转 MusicXML 设计

## 目标

在 RockRoll 中新增独立工具箱，允许用户在浏览器本地选择清晰的电子吉他六线谱 PDF，分析五线谱与 TAB 的结构，并导出可由 Guitar Pro 8 打开的 MusicXML。

首个验收样例是用户本地的 `endless rain.pdf`。该文件不进入仓库，也不上传到 Supabase。

## 产品边界

- 输入仅限清晰电子 PDF，不支持扫描件或照片。
- 首版仅支持单吉他轨、六弦标准调弦 E A D G B E、五线谱与 TAB 配对。
- 全程浏览器本地处理，不上传、不持久化、不调用在线转换服务。
- 输出为 `.musicxml`，由 Guitar Pro 8 打开后另存为 `.gp`。
- 识别不确定时必须显示警告，不得静默猜测。
- 不引入 Tauri、后端 worker、队列、数据库表或 Supabase Storage。

## 技术方案

采用 `pdfjs-dist@4.10.38` 动态读取 PDF。该版本兼容项目当前 Node 20/Vite 8，使用 Apache-2.0 许可证。工具箱路由打开前不加载 PDF.js。

解析流程分为四层：

1. `pdf.service.ts` 负责文件类型、大小、页数、文本项和绘图指令读取。
2. `tab-analyzer.ts` 负责识别电子谱特征、标题、速度、拍号、小节编号、TAB 文本和诊断警告。
3. `musicxml.service.ts` 负责将已确认的乐谱模型序列化为 MusicXML；未识别音符的小节使用明确的整小节休止占位并产生警告。
4. `ToolboxPage.tsx` 负责文件选择、分析状态、摘要、警告和下载。

第一实施阶段先建立安全的纵向切片：能识别电子 PDF、提取页数/标题/速度/拍号/小节范围，并生成结构合法的 MusicXML 骨架。随后再按测试扩展弦号、品位、节奏和技巧识别。

## 数据模型

```ts
interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface TabScoreAnalysis {
  fileName: string;
  pageCount: number;
  title: string;
  tempo: number | null;
  beats: number;
  beatType: number;
  measureNumbers: number[];
  vectorDrawingCount: number;
  warnings: string[];
}
```

后续音符模型单独加入，不把不完整的几何细节塞进页面组件。

## 页面与交互

- 主导航新增“工具箱 / Toolbox”。
- 页面第一视觉是一个类似谱架工作台的文件投放区，保持 RockRoll 现有煤黑、酒红、琥珀色体系。
- 选择文件后立即在本地分析，显示文件名、页数、识别到的小节范围、速度、拍号和矢量对象数量。
- 不支持的扫描 PDF、加密 PDF、空 PDF、非 PDF 或超限文件显示可操作错误。
- 分析完成且存在小节结构时启用“下载 MusicXML”。
- 下载文件名来自 PDF 文件名，扩展名替换为 `.musicxml`。

## 错误处理

- 最大文件大小 20 MB，最大页数 20 页。
- PDF 没有可提取文本或矢量绘图时，判定为扫描件并停止转换。
- 未识别速度时默认输出 120 BPM，但在界面和 MusicXML 中记录警告。
- 未识别拍号时默认输出 4/4，但记录警告。
- 未识别到小节编号时不允许下载。
- 对象 URL 下载后立即释放。

## 测试与验收

- 单元测试覆盖文件校验、标题/速度/拍号/小节提取、MusicXML 转义和骨架生成。
- 页面测试覆盖本地分析状态、错误提示、摘要、警告和下载按钮。
- 路由测试覆盖 `#toolbox`，导航测试覆盖入口与激活态。
- 使用 `endless rain.pdf` 做只读验证：4 页、可提取文本、无整页图片、存在大量矢量绘图、识别到 1-18 小节和 92 BPM。
- MusicXML 必须可由 XML 解析器读取，并能由 Guitar Pro 8 打开；复杂音符识别完成前，骨架中的休止占位必须明确标注为未识别，不能伪装成成功转谱。

## 权限与隐私

工具箱对所有本地访问者可见，因为它不读取或写入 RockRoll 数据。匿名、普通用户和管理员拥有相同的本地文件处理能力。原始 PDF、解析结果和 MusicXML 均不经过 Supabase，不新增 RLS 或权限文档条目。

