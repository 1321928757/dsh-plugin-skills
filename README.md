# DSH Plugin Skills

面向 DeepSeek Harness（DSH）插件开发的社区维护 skill 集合。

这套 skills 覆盖插件从设计、实现、文档编写到发布准备的常见工作流，适合希望开发或维护 DSH Web/profile bundle 插件的开发者。

> 本项目是非官方的社区项目，不代表 DeepSeek Harness 官方立场。

## Included skills

| Skill | 用途 |
| --- | --- |
| [`dsh-plugin-authoring`](skill/dsh-plugin-authoring/) | 从 0 到 1 创建、打包、验证和发布 DSH 插件 |
| [`dsh-plugin-ui`](skill/dsh-plugin-ui/) | 设计、实现和验收 DSH Web 插件 UI |
| [`dsh-plugin-readme`](skill/dsh-plugin-readme/) | 编写和维护插件 README、截图及发布文档 |

## Installation

将需要的 skill 目录复制到你的 DSH skills 目录。例如：

```powershell
$DshSkills = Join-Path $HOME '.dsh\skills'
Copy-Item .\skill\dsh-plugin-authoring $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-ui $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-readme $DshSkills -Recurse -Force
```

如果只需要其中一个 skill，只复制对应目录即可。

也可以直接克隆本仓库后按需使用：

```powershell
git clone https://github.com/<owner>/dsh-plugin-skills.git
```

将命令中的 `<owner>` 替换为实际 GitHub 用户名后再执行。

## Recommended usage

- 开始创建或发布插件：使用 `dsh-plugin-authoring`。
- 涉及 Web 界面：同时使用 `dsh-plugin-ui`。
- 编写 README、截图或上架材料：同时使用 `dsh-plugin-readme`。

这些 skills 可以单独使用，也可以组合使用。`SKILL.md` 是每个 skill 的入口；其中引用的 `templates/` 和 `references/` 文件按任务需要读取。

## Repository layout

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

## Scope and maintenance

- 内容以 DSH 实际运行时契约、开源插件实践和本地验证结果为依据。
- 涉及版本、Slot、Service、主题令牌或发布平台的内容应以当前环境和目标平台为准。
- 文档中的示例路径、仓库地址和版本号可能需要替换后才能使用。
- 欢迎提交 Issue 或 Pull Request 来修正文档、补充案例和更新兼容性说明。

## License

本仓库内容采用 MIT License，详见 [`LICENSE`](LICENSE)。
