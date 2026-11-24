# Notemaker

**[中文](README.md) · [English](README.en.md)**

从真实材料制作有内容的可视化笔记；点击 **Edit** 进入单元格模式，点击 **Save** 直接写回当前 HTML。

适用于文档、PPTX、课程、会议纪要、论文、搜索结果和模型整理稿。板块名称与内容结构由材料决定，不固定套用课程天数。每个板块遵循 **介绍 → 内容小节 → 最后一个总结小节**。

![Notemaker 预览](docs/demo-preview.png)

## 内容不只是一句导语

介绍应说明背景、具体问题、关键概念之间的关系和阅读路线；总结应联系前面的内容，比较方法或状态，说明证据、局限和后续可核对的问题。复杂板块需要多段展开、适当的表格或图解，不能用一句口号代替。长度根据材料复杂度调整，不靠统一字数或重复套话凑篇幅。

会议笔记区分讨论、建议、已确认事项和行动；论文区分作者主张、证据、局限与整理者推断；课程用例子解释概念。来源中的页码、幻灯片、段落或时间位置应保留，没有的负责人、期限或实验数值不编造。

生成时先建立「原文单元 → 正文小节」覆盖表，先展开正文，再写介绍和结尾归纳。正文必须保留材料的具体内容，不能拿一篇“如何读课件/做会议记录”的通用文章代替。改进 skill 时，先更新规则，再从原材料生成独立新稿，与旧稿对照，不把直接润色旧稿当作 skill 效果。

`scripts/audit_note.py` 可检查正文与框架文字的分布、来源覆盖映射和遗漏说明。它提供诊断，不是内容质量分数；仍需对照原文检查事实、解释和状态。详见 [内容质量流程](skills/notemaker/references/content-quality.md)。

## 像 Notebook 一样自由编辑

- 阅读模式不显示单元格编辑控件；点击 Edit 后才解锁。
- 介绍、正文、总结都支持单元格上方/下方插入、修改、复制、上下移动、删除；清空后可重新增加。
- 文字与图表格可视编辑，也可打开 HTML 源码；代码格使用文本编辑器，**不执行代码**。
- 支持增加、删除、排序板块与小节，插入本地图片，调整标题、主题、强调色与字号。
- Cancel 恢复本轮编辑前的状态；没有自动保存。

## Save 不再让你选保存位置

用配套“打开编辑”启动器打开笔记后，当前源 HTML 已绑定。Save 自动备份修改前版本，然后原子写回这个文件，验证写入后才显示成功。不调用文件选择器，不把另存或浏览器缓存假称为保存。

要实现这一点，需要一个 **Python 标准库本地服务**。它只绑定 `127.0.0.1` 和当前文件，采用会话校验及文件版本检查；两个窗口冲突或写入失败时保留草稿，避免静默覆盖。备份位于 `.notemaker-backups/`。

直接双击 HTML 仍可离线阅读、编辑；但独立浏览器页面不能无授权覆盖自身路径，所以这种模式的 Save 会提示使用启动器。**导出副本** 是另一个明确操作，生成包含全部内容的新 HTML，不冒充原位保存。

## 安装与使用

把 `skills/notemaker/` 复制到 `~/.codex/skills/notemaker/`，或从本仓库 Release 下载 skill 压缩包。

> 用 $notemaker 读取这份课件、会议记录或论文。每个板块先充分介绍，再展开内容，最后归纳总结。保留依据，提供可自由增删的单元格和一键原位保存。

生成与配套启动器：

```sh
python skills/notemaker/scripts/build_note.py note.json --output note.html
python skills/notemaker/scripts/serve_note.py note.html --create-launchers
```

之后双击生成的 `.cmd`（Windows）或 `.command`（macOS/Linux），或直接运行：

```sh
python skills/notemaker/scripts/serve_note.py note.html
```

保留启动终端；停止服务用 Ctrl+C。需要 Python 3.10+；阅读版不需要安装环境。启动器、HTML 和 `_notemaker_runtime/` 一起移动可继续使用。macOS 启动器已提供，但不宣称在没有实测的系统上通过验证。

## 材料读取与后续修改

skill 指导 AI 读取材料、核对来源、组织与解释内容；生成器负责封装，不会自行调用 AI API。可用提取器保留实际源文件位置：

```sh
python skills/notemaker/scripts/read_material.py lecture.pptx --output extracted.json
python skills/notemaker/scripts/build_note.py edited-note.html --extract recovered.json
```

支持 PPTX、PDF、HTML、Markdown 和文本。PDF 提取需要可用的 pypdf；PPTX 文本提取不等于检查了图片、布局和图片中的公式。旧 `.ppt` 必须用合适工具转换，不是修改扩展名。用户保存过后，AI 必须从最新 HTML 提取内容，不能用旧 JSON 覆盖修改。

公开的 `examples/general-note.json` 是虚构的通用界面示例。实际外部材料案例与私人笔记不随代码仓库转载；实际测试需记录来源、提取范围、问题和结果，不能把虚构示例当成读过课件或论文的证据。

## 开发验证

论文与课件的内容流程已分开：论文说明问题、贡献、机制、核心公式与实验依据；课件优先讲知识、原图与例题解答，课程通知和成绩不占用知识主线。参见 [流程对照与验证范围](docs/reading-workflow-review.md)。

```sh
npm ci
npx playwright install chromium
python skills/notemaker/scripts/build_note.py examples/general-note.json --output examples/general-note.html
python -m unittest discover -s tests -p 'test_*.py'
npm test
```

测试使用真正的临时 HTML 和本地服务，核对同路径写入、重开、备份、单元格操作、冲突、失败保护、权限边界、图片与外观保留、显式导出和窄屏。原子替换失败有独立测试。外部案例/私人笔记检查仅在本地具备相应文件时执行；CI 会明确标记跳过，不能说这些私人输入也在 GitHub 上验证了。

源码入口：`SKILL.md`、`scripts/build_note.py`、`scripts/serve_note.py`、`scripts/read_material.py`、`assets/notebook.js`、`assets/app.js`。详细保存约定见 [local-saving.md](skills/notemaker/references/local-saving.md)。
