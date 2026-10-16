# Changelog

## Unreleased

### 目标版本迁移：DSH 0.1.1-rc.2 → 0.2.0-rc.2

- **Typert 契约更新。** strict codec 的 `schema` 字段被 `create()` factory 取代（`{ mode: 'strict', typeSymbol, create, decode?, encode? }`）。新增 [`references/typert-contract.md`](skill/dsh-plugin-authoring/references/typert-contract.md)，覆盖 loader 逐字段校验、`typeSymbol` 命名形态、`./remote` descriptor、gateway 边界校验、三层 envelope 与契约测试模板。
- **新增兼容性 gate 说明。** `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` 的 `peerDependencies` 会被 semver 强制检查（`includePrerelease: true`），不满足时安装/加载被拒绝，只能通过 profile `compatibility.json` 的精确版本豁免放行。同时说明 `engines.dsh` 在本版本仍是声明性字段。
- **新增「0.1.x → 0.2.0-rc.2 迁移」章节**，区分「会直接导致加载失败」「会改变运行行为」「不要误判为新特性」三类改动，并给出迁移顺序。
- **修正官方文档路径。** 旧路径（`/api-gateway/`、`/subsystems/client-modules/`、`/cookbook/adding-a-tool/`）均返回 404，已改为 `/reference/…`；补充 `.md` 原始 Markdown 与 tag 化 raw 路径的用法。
- **Client module 契约更新。** combo 路由、package-local chunk、`rev` 来自 `mtimeMs`/`ctimeMs`/`size`、boot graph 的 `batches` 与 phase、`inject` 提升为真实 arrival 边，以及「浏览器半只挂在裸包名 row 上」的所有权注意事项。
- **Event 矩阵修正。** `tools/code-dispatch-log` → `tools/ptc-dispatch-log`；移除不存在的 `agent/session-start`（改用 `agent/created`）；补充 session、settings、plugin-manager、connection、webserver、workspace 等当前事件。
- **Tool 契约补全。** 参数 DSL 的类型与 `additionalProperties` 强制要求、`ToolArgsError`/`ToolOutputError` code、dispatch 管线顺序、`guard()` 的单调性；并明确 presentation cards 不是 0.2 新特性、内置 Web Client 需要 `tool.call.toolview` 才有专属卡片。
- **UI skill 对齐当前组合。** 用 0.2.0-rc.2 实际存在的 Slot key 替换已失效的 `settings.plugin.item`；补充 kind → 选择字段映射、`priority` 语义、组件不接收 `ctx`，以及 `listTokens` 只返回 override 集合的说明。
- **模板更新。** Typert 模板改为 `create()` 惰性 memo 形态；`./remote` 模板补充 `implementation` 与 `scope`/`lookup`；package 模板的 peer 版本更新为 `~4.0.4`（cordis）与 `^0.2.0-rc.2`（dsh-*）并加入 `engines`；`install.ps1` 与发布 runbook 补充 pnpm `allowBuilds` 与 `prepare` 说明。
- **测试策略补充契约测试层**，用于在毫秒级拦截过期生成产物与事件改名这类静默回归。

### 客户端激活期契约（来自 dsh-ssh 的两个真实故障）

- **新增 [`references/boot-and-activation.md`](skill/dsh-plugin-authoring/references/boot-and-activation.md)**：把「装上插件后 DSH 起不来」这一类故障的契约、报错原文和诊断路径集中到一处，并按 **[契约] / [实践] / [环境]** 三级标注证据。
  - 两侧自检严格程度不同：浏览器外壳对**任何**非 `active` 的 entry 都抛 `web boot: N entry did not activate`，而 Node 侧 `dsh-app-boot` 只对 `requiredStartupEntryIds` 与 bootstrap Include 抛 `StartupError`，其余只记 warning。
  - `FiberState` 数值顺序、四种「不是 active」的原因、`apply()` 抛错与 disposer 抛错的**不同**后果、Host 进程 `unhandledRejection` 的 fail-loud 行为。
  - Slot 声明/注册的完整报错清单（未声明 key、重复声明子 Slot、缺 `id`/`key`/`select`、单洞重复占用等）。
  - Client 模块图在**组合期**（Node）与**到达期**（浏览器）各自的报错。
  - 诊断入口：boot 遮罩、桌面崩溃日志的路径与分段、`window.__DSH_BOOT__` 的能与不能。
- **`SKILL.md` 补三处**：§4 新增「Context 访问与服务获取」（未 `inject` 的属性读取会抛错、`ctx.get` 与 `ctx.inject` 的分工、抛错位置决定后果）；§7 新增「客户端激活契约与自检」清单；§11 新增「启动/激活类故障速查」。
- **模板**：新增 [`templates/tests/client-boot.test.mjs`](skill/dsh-plugin-authoring/templates/tests/client-boot.test.mjs)（真 Cordis root 加载构建产物，断言 fiber 为 `active`，并覆盖可选服务缺失）与 [`templates/tests/client-remote-mount.test.mjs`](skill/dsh-plugin-authoring/templates/tests/client-remote-mount.test.mjs)（真 Client Gateway `$mount`、身份投影、fail-closed），并在 `SKILL.md` 文件索引登记。`templates/client.js` 补反向规则与 `ctx.get`/`ctx.inject` 示例。
- **`dsh-plugin-ui` 新增 §7.5「作用域与会话身份」**：只有 session / session-maybe 作用域的 Slot 拿得到 `sessionId`；`ctx.sessions` 的每个方法都要求显式 `SessionId`，没有 current/active 访问器；根作用域容器通常已提供 session 作用域子洞（如 `rightbar` → `rightbar.session`）；授权控件用未绑定/已绑定/未知三态，并把库存与已授权集合分开。
- **`dsh-plugin-readme` FAQ 增补**：「装上插件后 DSH 起不来」列为第 2 条排障项，含崩溃日志位置与桌面端「禁用第三方插件」出路。

### 并入提案时的复核结论

- **保留**：Context 未 `inject` 抛错、浏览器 boot 自检致命、`remote.<namespace>` 服务 key、`$mount` 经 `ctx.effect` 登记、Client 模块图与 Slot 报错、API 文档路径与各条 `[契约]` 结论。
- **改写**：`window.__dshClientCtx` 探针被**删除**。对已安装的 0.2.0-rc.2 桌面版做整包字节搜索（`__dshClientCtx` / `__dshClient` / `dshClientCtx`）零命中，因此它在该构建里不可用，已降级到 evidence-matrix 的 Unverified 并列出实际存在的 `__DSH*` 全局；改用 boot 遮罩、崩溃日志与 boot 契约测试作为替代诊断路径。
- **改写**：补上「浏览器比 Node 侧更严格」这一非对称结论，并把崩溃日志的完整分段（含可选 `--- host diagnostic ---`）与 `FiberState` 数值顺序写实。
- **修正**：`typert-contract.md` 中一处 `templates/...` 反引号路径缺 `../`（从 `references/` 无法解析）、一处多余空行。

## 初始版本

- 初始化 DSH 插件开发 skills 集合。
- 收录 `dsh-plugin-authoring`、`dsh-plugin-ui` 和 `dsh-plugin-readme`。
- 增加英文 README、中文 README、许可证和贡献指南。
