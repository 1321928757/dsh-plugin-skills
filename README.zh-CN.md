# DSH Plugin Skills

这是一个面向 DeepSeek Harness（DSH）插件开发的社区 skill 集合。

当前包含三个相互配合的 skill：

- `dsh-plugin-authoring`：插件创建、打包、验证和发布。
- `dsh-plugin-ui`：DSH Web 插件 UI 的设计、实现和验收。
- `dsh-plugin-readme`：插件 README、截图和发布文档的编写与维护。

英文文档见 [`README.md`](README.md)。

> 本项目是非官方的社区项目，不代表 DeepSeek Harness 官方立场。

## 目录

```text
skill/
├── dsh-plugin-authoring/
│   ├── SKILL.md
│   ├── templates/
│   └── references/
├── dsh-plugin-ui/
│   └── SKILL.md
└── dsh-plugin-readme/
    └── SKILL.md
```

## 安装

将需要的 skill 目录复制到 DSH skills 目录：

```powershell
$DshSkills = Join-Path $HOME '.dsh\skills'
Copy-Item .\skill\dsh-plugin-authoring $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-ui $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-readme $DshSkills -Recurse -Force
```

只需要单个 skill 时，只复制对应目录即可。

## 使用建议

- 从零开发或发布 DSH 插件时，使用 `dsh-plugin-authoring`。
- 实现插件 Web UI 时，同时使用 `dsh-plugin-ui`。
- 编写 README、截图或市场上架材料时，同时使用 `dsh-plugin-readme`。

每个 skill 的入口文件都是 `SKILL.md`。如果该文件引用了 `templates/` 或 `references/`，再按具体任务读取相关文件。

## 维护说明

- 文档中的版本、Slot、Service、主题令牌和发布平台规则可能随 DSH 或目标平台变化。
- 示例中的仓库地址、路径和版本号需要根据实际项目替换。
- 欢迎通过 Issue 或 Pull Request 修正文档、补充案例和更新兼容性说明。

## 许可证

本仓库内容采用 MIT License，详见 [`LICENSE`](LICENSE)。
