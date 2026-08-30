---
name: dsh-plugin-readme
description: Write, review, and maintain production-quality README files for DeepSeek Harness (DSH) plugins — including bilingual README structure, source-grounded feature and security claims, installation and troubleshooting guidance, GitHub/npm screenshot hosting, screenshots.json marketplace metadata, package publish files, compatibility notes, and final documentation validation. Use when a user asks to 更新/优化/重写 DSH 插件 README、补充效果图、整理插件文档、修复 README 图片链接，或准备插件上架文档。
---

# DSH 插件 README 编写与维护

这是一套面向 DeepSeek Harness 插件仓库的 README 工作流。目标不是写营销文案，而是让新用户能够：

1. 判断插件是否适合自己；
2. 安装并验证插件；
3. 按最短路径使用主要功能；
4. 理解数据、权限、安全边界和已知限制；
5. 在出错时自行排查；
6. 在 GitHub、npm 与插件市场页面看到一致、可访问的截图和说明。

本技能总结自多个 DSH 插件 README 的实践，尤其适合同时存在英文 README、中文 README、Web UI 截图和 `screenshots.json` 的 profile bundle 插件。

## 1. 先收集事实，不要先写文案

README 的每一个具体承诺都应当能回到仓库中的证据。开始前先读取：

- `package.json`：包名、版本、入口、`files`、依赖、`dsh.bundle`、`dsh.client`、仓库地址；
- `README.md`、`README.zh-CN.md` 或其他语言文件：已有承诺、旧图片名、安装命令；
- `lib/`、`src/`、`scripts/`：真实工具名、参数、返回值、权限判断、默认值、存储位置、兼容性；
- `screenshots.json`：截图市场清单是否存在、是否引用旧文件；
- `assets/`、`docs/`：图片实际文件名、尺寸、格式和是否已被 Git 跟踪；
- `CHANGELOG.md`、`LICENSE`、`NOTICE`：版本历史和免责声明；
- 相关优秀项目 README：只提取信息架构和验证习惯，不直接复制不相关的营销内容。

推荐参考方向：

| 参考类型 | 可借鉴内容 | 不应盲目复制 |
| --- | --- | --- |
| `dsh-context` | “入口/能力”表格、按功能分节、截图紧跟功能说明、简洁的 Good to know | 与当前插件无关的大量仪表盘细节 |
| `dsh-bridge` | 安装/更新/卸载分开、先决条件、FAQ、故障排查、移动端或部署注意事项 | 远程访问、二维码、IM 等特有功能 |
| `DSH-better-sidebar` | 兼容性徽章、安全边界、已知限制、诚实披露、用户与开发者信息分层 | 超长生态列表、无关的 Star History、与插件能力无关的徽章墙 |
| `dsh-prompt-polish` | 简短安装路径、Usage 表格、截图段落、最小开发说明 | 只适用于 prompt 优化器的具体术语 |

### 1.1 建立“声明证据表”

在写作前，先把高风险声明分成四类：

| 类别 | 例子 | 处理方式 |
| --- | --- | --- |
| 可直接确认 | 工具名称、参数、文件路径、默认关闭、返回字段 | 可以明确写出，并尽量与源码术语一致 |
| 需要限定 | “表白名单保护所有 SQL”“结果最多 2000 行”“数据不会离开本机” | 必须补充实现边界，不能写成绝对保证 |
| 外部事实 | npm 是否已发布、支持哪些 DSH 版本、构建是否需要授权 | 查证后再写；无法确认就使用保守措辞或删除 |
| 发布约定 | npm 页面如何渲染相对图片、市场截图清单格式 | 以目标平台的仓库/构建规则为准，并做实际验证 |

典型的安全措辞改写：

- 不要写：`表白名单会拒绝所有白名单外的表引用`。
- 推荐写：`表白名单会检查实现能够识别的 FROM/JOIN/UPDATE/INTO 表引用；它不是完整 SQL 解析器，数据库账号权限仍是最终边界`。

- 不要写：`查询最多读取 2000 行`。
- 推荐写：`工具响应最多序列化返回 2000 行；如果实现是在查询完成后再截断，就明确说明这不是服务端扫描或网络传输上限`。

- 不要写：`所有数据都不会离开本机`。
- 推荐写：`连接配置和密码保存在本机；表结构、工具参数和查询结果会作为普通工具结果发送给已配置的 LLM 服务商`。

## 2. 推荐的信息架构

英文和中文 README 应当保持相同的章节顺序和事实覆盖范围。推荐使用下面的读者路径：

1. **标题与一句话定位**
2. **语言切换与少量徽章**
3. **数据边界提示**（涉及数据库、凭据、外部 API 时）
4. **功能概览 / At a glance**
5. **功能特性 / Features**
6. **工具或命令清单 / Agent tools**
7. **环境要求与兼容性 / Requirements and compatibility**
8. **安装、更新与卸载 / Install, update, or remove**
9. **快速开始 / Quick start**
10. **截图或功能导览 / Screenshots or Feature tour**
11. **安全与权限 / Security and permissions**
12. **已知限制 / Known limitations**
13. **工作原理 / How it works**
14. **迁移说明 / Migration**（有旧集成时）
15. **FAQ 与故障排查 / FAQ and troubleshooting**
16. **开发与验证 / Development**
17. **License / Disclaimer**

README 应优先按“用户完成任务的顺序”组织，而不是按代码文件组织。实现细节放到“工作原理”之后，避免新用户一开始就被 Host、Client、RPC 或 patch 术语阻塞。

### 2.1 Hero 区域

保持简短：

- 项目名；
- 一句话说明解决什么问题；
- 一句补充说明主要入口或使用方式；
- 英文/中文切换链接；
- 只放已确认有效的徽章。

不要添加无法验证的 npm 下载量、CI、版本或市场徽章。徽章本身也是对外承诺：链接和图片地址必须真实可访问。

### 2.2 功能概览表

用一张三行左右的表让读者快速定位入口：

```markdown
| Surface | What it provides |
| --- | --- |
| **Settings** | Configure ... |
| **Composer / command** | Choose or invoke ... |
| **Agent tools / runtime** | Use ... and receive ... |
```

中文 README 使用对应的中文列名，但不要改变行的语义或顺序。

### 2.3 工具清单

工具表必须写真实的：

- 工具名；
- 必填参数；
- 可选参数；
- 接受的操作或语句类型；
- 权限开关；
- 返回值；
- 超时、截断、拒绝规则；
- 是否需要先调用另一个工具。

如果是数据库工具，要区分：

- 语句分类限制；
- 多语句检测；
- 表范围检查；
- 写权限检查；
- 返回内容截断；
- 数据库服务端本身的权限。

不要把工具 description 中的理想化描述直接复制成安全保证，应对照实际实现和测试。

## 3. 安装文档的写法

安装章节应让用户只需复制一条命令即可开始。推荐顺序：

### 3.1 选择一种主安装方式

通常按以下顺序：

1. 固定 GitHub tag：适合插件刚发布或需要明确版本；
2. npm 包名：仅在确认 npm 包已发布后提供；
3. PowerShell 一键脚本：只在脚本真实存在且逻辑已读取确认后提供。

示例：

```powershell
dsh plugin --profile web add github:<owner>/<repo>#v<version>
```

npm 尚未确认发布时，必须保留类似“在 npm 可用后使用”的说明，不要让用户直接遇到 404。

### 3.2 安装后验证

至少提供：

```powershell
dsh --profile web --dump-config | findstr <plugin-name>
```

同时说明：

- 安装到了哪个 profile；
- 是否需要重启 `dsh web`；
- UI 入口在哪里；
- 如何确认按钮、设置项或工具已经出现。

“安装成功”与“运行时已加载”不是一回事。特别是 Web profile，未重启旧进程时，新 bundle 可能不会进入 boot graph。

### 3.3 更新、卸载和本地开发

把更新和卸载写成独立可复制命令：

```powershell
dsh plugin --profile web update <plugin>@latest
dsh plugin --profile web remove <plugin>
```

本地开发推荐单独 profile，避免污染用户正在使用的 profile：

```powershell
dsh plugin --profile demo add E:\path\to\plugin
dsh --profile demo --dump-config
```

如果 Windows 跨盘 `link:`、native 依赖、构建授权或 tgz 安装有特殊行为，要在 README 中说明真实限制，而不是给出未验证的“无须授权”承诺。

### 3.4 一键脚本必须诚实

读取 `scripts/install.ps1` 后再写说明。特别检查：

- 是否硬编码 `web` profile；
- 是否固定 pnpm 版本；
- 是否向用户目录写入辅助文件；
- 是否真的做了“自检”，还是只检查 `dsh` 在 PATH；
- `$Rev` 是否与 `package.json` 和 README tag 一致。

## 4. 截图与图片链接

截图不是装饰，而是功能说明的一部分。每张图都应该回答一个用户问题，并紧跟一两句解释。

### 4.1 图片文件命名

仓库内使用稳定、ASCII-only 的文件名，避免中文、空格和临时截图名：

```text
assets/settings.png
assets/conversation-no-connection.png
assets/conversation-picker.png
assets/conversation-connected.png
assets/conversation-context.png
assets/conversation-query.png
```

文件名应表达场景，而不是表达截图软件生成的时间戳。改名后必须同时检查 README、`screenshots.json`、发布清单和市场数据。

### 4.2 README 最终使用外部绝对 URL

对于 GitHub/npm/插件市场兼容的 README，推荐最终使用 GitHub 托管的绝对地址：

```markdown
![MySQL settings page](https://raw.githubusercontent.com/<owner>/<repo>/main/assets/settings.png)
```

原因：本地相对路径在仓库预览中可以工作，但 npm 或外部 README 渲染器通常不会按仓库上下文解析 `assets/foo.png`。如果目标平台有明确的外部图片规则，应以该规则为准。

开发阶段可以临时使用相对路径快速预览，但提交前应切回最终的外部 URL。

### 4.3 本地预览与远程 URL 的常见误区

如果 README 使用 `raw.githubusercontent.com/.../main/...`：

- 本地图片尚未 push 时，远程 URL 会 404；
- 本地替换图片后，远程 `main` 仍可能显示旧图片；
- GitHub Raw 或浏览器缓存可能导致短暂旧内容；
- 本地 Markdown 预览不会自动改用本地 `assets` 文件。

因此，截图更新流程是：

1. 使用 ASCII 文件名保存新图；
2. 更新 README 和 `screenshots.json`；
3. 确认 `package.json.files` 包含 `assets`；
4. 提交并 push；
5. 用 HTTP 请求检查远程 URL 返回 200；
6. 必要时使用 `Ctrl+F5` 或等待缓存刷新。

### 4.4 `screenshots.json` 市场清单

如果插件市场支持仓库内的 `screenshots.json`，应将它放在包根目录并使用当前存在的相对路径。常见形式：

```json
[
  "assets/settings.png",
  "assets/conversation-no-connection.png",
  "assets/conversation-picker.png",
  "assets/conversation-connected.png",
  "assets/conversation-context.png",
  "assets/conversation-query.png"
]
```

保持数量在市场规则允许的范围内（常见上限为 8 张），不要继续保留已经删除的 `picker.png`、`query.png` 等旧路径。

### 4.5 npm 发布清单

仅在 README 中引用图片还不够。检查 `package.json` 的 `files` 是否包含：

```json
{
  "files": [
    "README.md",
    "README.zh-CN.md",
    "screenshots.json",
    "assets"
  ]
}
```

用 `pnpm pack --dry-run` 或 `npm pack --dry-run` 确认截图确实进入 tarball。注意：`files` 中漏掉 `assets/` 是最常见的“本地正常、npm 页面图片 404”原因之一。

## 5. 安全、隐私与已知限制

涉及数据库、文件系统、远程接口或凭据的插件，必须单独写“安全与权限”和“已知限制”，不要只在功能列表末尾加一句“安全”。

### 5.1 用“强制行为 / 实现边界”表格

推荐结构：

| Guardrail | What is enforced | Important boundary |
| --- | --- | --- |
| Statement type | ... | ... |
| Permission switch | ... | ... |
| Table scope | ... | lexical or partial check details |
| Result size | ... | post-fetch vs server-side limit |
| Credential exposure | ... | local config vs model-visible output |

### 5.2 数据库插件必须核对的边界

不要遗漏以下常见事实：

- 表白名单是否是完整 SQL parser，还是只扫描 `FROM`、`JOIN`、`UPDATE`、`INTO` 等位置；
- `DESCRIBE`、`SHOW CREATE TABLE`、子查询、CTE、视图、存储过程等是否走同一检查；
- 结果是否在数据库服务端限制，还是全部取回后再切片；
- `DATABASE()`、默认 schema 或默认库为空时会发生什么；
- `MAX_EXECUTION_TIME` 或类似 hint 支持哪些 MySQL/MariaDB 版本；
- 密码是否明文落盘；
- 浏览器是否只收到 `hasPassword` 等安全视图；
- 查询结果是否会发送给 LLM；
- 是否支持事务、DDL、SSL/TLS、Unix socket、命名管道、字符集或其他连接方式；
- 应用层限制是否仍需要数据库账号的最小权限作为最终防线。

### 5.3 避免绝对安全措辞

推荐：

- “工具层拦截，不能替代数据库权限”；
- “密码不回传浏览器，但本地 JSON 文件中以明文保存”；
- “结果会发送给已配置的模型服务商”；
- “白名单是轻量级词法检查，建议配合数据库账号权限”。

避免：

- “绝对安全”；
- “所有 SQL 都被隔离”；
- “数据永远不会离开本机”；
- “2000 行限制可以防止数据库大查询”；
- “默认关闭写权限等于不可能写入”。

### 5.4 已知限制要可操作

每条限制都应告诉用户它的影响和替代方案。例如：

- 没有默认数据库 → `mysql_tables` 可能为空 → 配置默认数据库；
- 表白名单不是完整解析 → 不能单独当作权限边界 → 使用最小权限账号；
- 没有 SSL/TLS 选项 → 连接安全由网络和数据库部署保障 → 在受控网络中使用或自行配置数据库侧安全；
- 只有单会话连接选择 → 需要在每个会话重新选择；
- 查询后截断 → 大结果仍可能消耗数据库和内存 → 在 SQL 中主动加 `LIMIT`。

## 6. FAQ 与故障排查

FAQ 应来自真实实现和真实错误路径，而不是泛泛而谈。优先覆盖：

1. **按钮或设置项没有出现**：检查 profile、dump-config、重启旧 DSH 进程；
2. **没有配置连接**：告诉用户打开设置页并保存；
3. **当前会话没有选择连接**：说明单连接自动选择和多连接手动选择的差异；
4. **连接测试失败**：检查 Host、端口、凭据、默认数据库、服务器网络权限，并指出连接从 Host 发起；
5. **表结构为空**：检查 `DATABASE()`、默认数据库、schema 和白名单；
6. **写操作被拒绝**：检查 `allowWrite` 和工具允许的 DML 类型；
7. **多语句或 DDL 被拒绝**：说明这是预期行为；
8. **白名单拒绝**：说明实际检查范围，并建议检查数据库账号权限；
9. **密码是否到浏览器**：说明安全视图字段和本地明文存储；
10. **日志在哪**：给出实际 `$DSH_HOME` 路径和文件名。

使用源码中的用户可见错误词句可以提高检索成功率，例如“当前会话尚未选择数据库连接”“不允许一次执行多条语句”“当前连接未开启写权限”等，但不要把错误信息写成永远不变的 API 契约。

推荐用 `<details>` 折叠冗长 FAQ，使首页保持易读：

```markdown
<details>
<summary><b>The database button is missing</b></summary>

Restart the DSH Web process and verify the profile composition ...

</details>
```

## 7. 工作原理章节

普通用户完成安装和使用后，再介绍实现结构。对于 Web profile bundle，可以用一段简图：

```text
Settings / Composer UI
        │ browser slots + RPC
        ▼
Host service
        │ selection + storage + connection pool
        ├── local configuration
        └── runtime context / tool results
```

然后只说明用户有帮助的实现事实：

- Host bundle 注册了哪些工具或服务；
- Browser bundle 注册了哪些 slot；
- RPC 或 HTTP 数据通道是什么；
- 配置和密码存在哪里；
- 动态上下文是否影响稳定系统提示词缓存；
- stop/update/dispose 时哪些资源会被回收（如连接池、监听器、定时器）。

不必在 README 中复制整份 Typert manifest 或内部 CSS 实现。

## 8. 双语同步规则

`README.md` 和 `README.zh-CN.md` 不是两篇独立文档，而是一组镜像文档：

- 章节顺序一致；
- 功能数量一致；
- 工具名、参数名、文件名、命令和版本号保持原样；
- 安全限制不能只在一种语言中披露；
- 截图数量和顺序一致；
- 一种语言增加 FAQ 或兼容性说明时，另一种语言同步增加；
- 专有名词可本地化，但不要翻译代码标识符。

完成后可做简单机械检查：比较两份 README 的图片数量、代码块数量、主要二级标题和安装版本号。翻译质量仍需人工阅读，机械检查不能替代审校。

## 9. 版本、发布与变更维护

发布版本变化时，至少检查：

1. `package.json.version`；
2. `scripts/install.ps1` 中的 `$Rev`；
3. 两份 README 的 GitHub tag 安装命令；
4. 一键安装脚本的 raw URL tag；
5. `screenshots.json`；
6. `CHANGELOG.md`；
7. `package.json.files`；
8. README 中的兼容性和依赖说明。

README 不要内嵌完整 CHANGELOG。README 只保留当前能力和必要迁移说明，历史细节放在 `CHANGELOG.md` 或 GitHub Releases。

如果只更新截图或 README，不要随意 bump runtime 版本；如果安装命令、截图 URL 或发布清单发生变化，应将文档和元数据作为同一个文档任务提交。

## 10. 最终验收清单

### 内容

- [ ] 新用户能在 30 秒内知道插件做什么；
- [ ] 安装、更新、卸载、验证命令可复制；
- [ ] 主要入口、工具、参数、返回结果有说明；
- [ ] 环境要求和兼容性没有未经确认的版本承诺；
- [ ] 数据边界、密码存储、LLM 数据流已说明；
- [ ] 已知限制和替代方案已说明；
- [ ] FAQ 覆盖按钮缺失、连接失败、未选择连接、查询被拒绝等常见情况；
- [ ] 英文和中文 README 事实一致。

### 图片与发布

- [ ] 图片文件名稳定、ASCII-only；
- [ ] README 使用目标平台可访问的绝对图片 URL；
- [ ] push 前不要把远程 `main` URL 当作本地图片已更新；
- [ ] `screenshots.json` 不含旧文件名，且数量符合市场规则；
- [ ] `package.json.files` 包含 `assets` 和 `screenshots.json`（如果需要随包发布）；
- [ ] `pnpm pack --dry-run` 中能看到 README、截图清单和所有图片；
- [ ] push 后逐个 HTTP 检查远程图片返回 200。

### 仓库与格式

- [ ] `git diff --check` 通过；
- [ ] README 中不存在已删除图片的旧引用；
- [ ] 版本号、tag、raw URL、安装脚本一致；
- [ ] 代码改动之外的文档任务没有误改 runtime 文件；
- [ ] 只使用已验证的徽章和外链；
- [ ] 没有把“本地配置不外传”误写成“查询数据不外传”。

可使用下面的 PowerShell 检查图片和发布清单：

```powershell
$ErrorActionPreference = 'Stop'
$shots = Get-Content screenshots.json -Raw | ConvertFrom-Json
foreach ($shot in $shots) {
  if (-not (Test-Path $shot)) { throw "Missing screenshot: $shot" }
}

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
if ($pkg.files -notcontains 'assets') { throw 'package.json.files must include assets' }
if ($pkg.files -notcontains 'screenshots.json') { throw 'package.json.files must include screenshots.json' }

git diff --check
pnpm pack --dry-run
```

推送后再检查公开地址：

```powershell
$names = @(
  'settings.png',
  'conversation-no-connection.png',
  'conversation-picker.png',
  'conversation-connected.png',
  'conversation-context.png',
  'conversation-query.png'
)
foreach ($name in $names) {
  $url = "https://raw.githubusercontent.com/<owner>/<repo>/main/assets/$name"
  $response = Invoke-WebRequest -UseBasicParsing -Method Head $url
  if ($response.StatusCode -ne 200) { throw "Screenshot unavailable: $url" }
}
```

## 11. 交付说明模板

完成 README 任务后，最终说明应简洁列出：

- 修改了哪些 README 和元数据文件；
- 是否重命名了图片；
- 是否将图片改成远程绝对 URL；
- 是否补充 `assets` / `screenshots.json` 到 npm 发布清单；
- 做了哪些验证；
- 是否已 commit/push；
- 如果尚未 push，明确说明远程图片在此之前可能 404 或仍显示旧图。

不要声称“npm 页面已验证”或“远程图片已生效”，除非确实执行过对应的打包或 HTTP 检查。
