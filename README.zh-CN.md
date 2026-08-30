# DSH Plugin Skills

[English](README.md) | 简体中文

一个由社区维护的可复用 skill 集合，面向 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) 插件的创建、设计、文档编写和发布准备。

> 本项目是非官方社区项目，不代表 DeepSeek Harness 官方立场，也不由官方制作、认证或维护。

## 这个仓库提供什么

本仓库提供的是面向 Agent 的指导型 skill，而不是一个可以直接运行的 DSH 插件。每个 skill 都围绕一个明确职责，提供工作流程、实现约束、可复用模板和验收建议。

三个 skill 按插件交付过程组织：

```text
规划并实现  →  设计 Web UI  →  编写文档并准备发布
     │                 │                    │
     └ authoring ──────┴ ui ────────────────┴ readme
```

## 包含的 skills

| Skill | 适用场景 | 主要内容 |
| --- | --- | --- |
| [`dsh-plugin-authoring`](skill/dsh-plugin-authoring/) | 创建或发布 DSH 插件 | profile bundle、`package.json`、`cordis.patch.yml`、Host/Client 两端、Typert 或 HTTP 数据通道、本地验证、版本管理、GitHub 和市场上架准备 |
| [`dsh-plugin-ui`](skill/dsh-plugin-ui/) | 设计、实现、审查或重构 DSH Web UI | Slot、运行时契约、DSH 主题令牌、布局与密度、响应式、无障碍、异步状态、生命周期清理和浏览器验收 |
| [`dsh-plugin-readme`](skill/dsh-plugin-readme/) | 编写或维护插件文档 | 基于证据写 README、双语一致性、安装与排障、安全边界、截图、`screenshots.json`、npm 发布文件和发布验收 |

三个 skill 可以独立使用，也可以组合使用。对于完整的插件项目，建议按顺序组合使用。

## 如何选择 skill

### 从零开始开发插件

先使用 [`dsh-plugin-authoring`](skill/dsh-plugin-authoring/)。它帮助你判断临时动态 Cordis 插件和可发布 profile bundle 的区别，并覆盖仓库骨架与运行时集成流程。

### 开发 Web 界面

只要插件包含设置页、会话区域、侧边栏、数据面板、弹层或其他浏览器界面，就加入 [`dsh-plugin-ui`](skill/dsh-plugin-ui/)。它适合在编写 Slot 注册和自定义 CSS 之前使用，因为它要求先检查当前宿主契约，而不是直接照搬旧示例。

### 准备 README 或发布

插件需要 README、截图、安全说明、兼容性说明或市场上架材料时，加入 [`dsh-plugin-readme`](skill/dsh-plugin-readme/)。它要求把用户可见的具体声明与源码和验证证据对应起来。

### 一个典型的组合流程

```text
1. dsh-plugin-authoring  — 确定插件形态并搭建运行时骨架
2. dsh-plugin-ui         — 实现并验证浏览器端体验（如果插件有 UI）
3. dsh-plugin-readme     — 记录安装、使用、限制和发布证据
```

## 安装

先克隆本仓库，再把需要的 skill 目录复制到 DSH 用户 skill 目录。下面的 PowerShell 示例会安装全部三个 skill：

```powershell
git clone https://github.com/<owner>/dsh-plugin-skills.git
cd dsh-plugin-skills

$DshSkills = Join-Path $HOME '.dsh\skills'
New-Item -ItemType Directory -Path $DshSkills -Force | Out-Null

Copy-Item .\skill\dsh-plugin-authoring $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-ui $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-readme $DshSkills -Recurse -Force
```

仓库发布后，将 `<owner>` 替换为实际 GitHub 用户名。只安装一个 skill 时，只复制对应目录即可，例如：

```powershell
Copy-Item .\skill\dsh-plugin-ui (Join-Path $DshSkills 'dsh-plugin-ui') -Recurse -Force
```

复制完成后，在支持 DSH skills 的 Agent 环境中按目录名调用对应 skill。如果当前会话已经完成 skill 清单加载，建议开启新会话，或使用宿主提供的 skill 刷新机制，再使用新复制的版本。

## 仓库结构

```text
.
├── README.md
├── README.zh-CN.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── skill/
    ├── dsh-plugin-authoring/
    │   ├── SKILL.md
    │   ├── references/
    │   │   └── publish-runbook.md
    │   └── templates/
    │       ├── client.js
    │       ├── cordis.patch.yml
    │       ├── install.ps1
    │       ├── package.json
    │       └── typert.host.js
    ├── dsh-plugin-readme/
    │   └── SKILL.md
    └── dsh-plugin-ui/
        └── SKILL.md
```

每个 skill 的入口文件都是 `SKILL.md`。其他文件是入口文档引用的支持材料，不是单独的 skill；需要时再按入口文档说明读取。

## 核心原则

- **先证据，后声明。** 写出具体承诺前，检查目标插件的源码、manifest、运行时契约、测试和实际包内容。
- **先宿主契约，后实现。** Slot、Service、primitive、主题令牌和数据线形状可能变化；不要把旧示例当作当前事实。
- **明确安全边界。** Loopback 围栏、写权限、凭据处理、结果限制和解析器局限都应写成实现边界，而不是绝对保证。
- **重视生命周期。** 样式、监听器、定时器、订阅、路由和 Slot 注册都必须有 disposer 或 Fiber 负责的清理路径。
- **把用户可见状态当成功能的一部分。** Loading、空态、错误、只读、禁用、保存中、成功、窄屏、键盘操作和 reduced motion 都需要有明确处理。
- **保持社区定位。** DSH 兼容性和发布规则应保守描述，并在宿主或目标平台变化后重新验证。

## 范围与兼容性

这些 skill 是开发指导，不能替代当前 DSH 运行时契约或目标插件的测试。示例中的包名、路径、版本号和仓库 owner 可能是占位符，使用前请替换为已验证的实际值。

当前内容主要聚焦 DSH Web/profile bundle 插件。未来如果某个测试、调试、安全审查或其他方向具备清晰边界和可复用指导，可以继续添加新的 skill。

## 参与贡献

欢迎通过 Issue 和 Pull Request 提交错误修正、新示例、兼容性更新和可复用模板。提交前请确认：

1. 每个 skill 都保持在自己的职责范围内；
2. 修改仓库级文档时，英文和中文 README 的事实保持一致；
3. 命令、路径、链接和 DSH 专有声明有对应来源或运行时观察依据；
4. 没有提交凭据、token、私有数据库信息、生成的本地状态或机器相关配置；
5. 没有把社区实践描述成 DSH 官方保证。

详细清单见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 许可证

本仓库内容采用 [MIT License](LICENSE)。
