---
name: dsh-plugin-authoring
description: End-to-end playbook for building, testing, packaging, installing, and publishing a DeepSeek Harness plugin against DSH 0.2.0-rc.2. Use for DSH plugin development, migration from a dynamic plugin to a profile bundle, upgrading a plugin from DSH 0.1.x, Web Client contributions, Typert/HTTP channels, LLM adapters, plugin/runtime compatibility gates, package release, or awesome-dsh-plugin listing.
---

# DSH 插件开发与交付（0.2.0-rc.2）

本 skill 面向可发布的 DSH 插件，主依据是官方文档、`dsh-v0.2.0-rc.2` 的运行时/包 manifest，以及本机安装的 0.2.0-rc.2 runtime 源码。`xfg-skills-dsp-plugin-template` 的测试、Tool 和交付经验只作为补充，不会覆盖官方契约。证据类型和路径见 [`references/evidence-matrix.md`](references/evidence-matrix.md)。

> **版本边界。** 目标版本是 DSH `0.2.0-rc.2`，官方 tag 是 [`dsh-v0.2.0-rc.2`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.0-rc.2)。动态 Slot、Service、Event 和 Theme 名称会随组合变化；不要把本文中的示例名当作当前运行时的完整目录，应先查询当前类型或 Harness Inspect。

> **从 0.1.x 迁移过来？** 先读第 12 节「0.1.x → 0.2.0-rc.2 迁移」。最容易被忽略的破坏性改动是 Typert strict codec 的 `schema` 字段被 `create()` factory 取代；只按旧 skill 或旧生成产物照抄的插件会在加载阶段直接失败。

## 1. 先选正确形态

这三个能力彼此独立，不能互相替代：

| 目的 | 需要什么 |
| --- | --- |
| 当前本地最快反馈 | `dsh web --patch <绝对路径 patch>`，patch 插入源码模块 |
| 可被 profile 启用的配置层 | 包 manifest 中的 `dsh.bundle.patch`，并被列入 `dsh.profile.bundles` |
| 浏览器 Client 模块 | `dsh.client` 声明 + `exports["./client"]` 的真实构建产物 |
| Typert Host | 仅参与 Host Typert 加载时导出生成的 `./typert` |
| Typert Client Remote | 仅由 Client assembly 使用时导出生成的 `./remote`；不是所有 Client 包都需要 |
| 只在当前 DSH 进程临时扩展 | 动态 Cordis Plugin，使用 `cordis-plugin-development` skill；不要把动态定义当作发布包 |

Client-only 包可以是合法的普通依赖；它只是在被 Loader entry 挂载后参加 Web client 扫描，不能因为有 `dsh.client` 就自动成为 profile bundle。反过来，一个 bundle 也可以没有浏览器半。

### 推荐开发顺序

1. 用绝对路径 `--patch` 插入最小 Host 插件，先验证行为；需要正式 profile layer 时再选 `templates/package.json`，需要 Client/Tool/LLM/Typert 时选择对应 manifest 变体。
2. 如果需要 Web，添加 `dsh.client`、`./client` 和真实的客户端构建产物。
3. 只有需要被用户以 profile layer 安装时，再添加 `dsh.bundle.patch`。
4. 先做 unit/组合测试，再 `pack` 到 `.tgz`，在干净 profile 安装验收，最后发布 npm/Git/tag 或提交外部列表。

本地 patch 示例：

```yaml
# scratch-plugin/cordis.yml
- insert:
    - id: my-plugin
      name: /absolute/path/to/scratch-plugin/src/index.ts
```

```powershell
pnpm dsh web --patch .\scratch-plugin\cordis.yml
```

## 2. Profile、Bundle 与 patch

官方教程：[Package and install a plugin](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)。

### Profile

profile 位于 `$DSH_HOME/profiles/<name>/`，通常包含：

- `package.json`：profile 的依赖与 `dsh.profile.bundles` 有序列表；
- 用户自己的 `cordis.patch.yml`；
- pnpm 管理的 `node_modules`。

`dsh plugin --profile <name> <pnpm args...>` 会在 profile 目录转发给 pnpm。`web`、`headless`、`tui` 等有随附模板；其它 profile 首次使用时由 `dsh plugin` 初始化。官方生成的 `pnpm-workspace.yaml` 关键形态是 `packages: - .`、`nodeLinker: hoisted`、`autoInstallPeers: false`。`allowBuilds` 只在 pnpm ≥10 拒绝运行 Git 依赖的 `prepare` 脚本时才成为必经步骤（见第 10 节），它不是 DSH profile manifest 契约。

包名解析有两个锚点：先从正在运行的 DSH 安装目录解析，再从 profile 目录解析；profile 外部包由 pnpm 管理。把包列入 `dsh.profile.bundles` 后，必须能解析包且包 manifest 必须有 `dsh.bundle.patch`；没有该声明是错误，不是「静默跳过」。没有 bundle 声明的依赖可以作为普通依赖安装，但不会贡献配置层。

### 配置层顺序

当前有效层按以下顺序叠加，后者覆盖前者：

```text
profile bundles（按 dsh.profile.bundles 顺序）
→ profile/cordis.patch.yml
→ $DSH_HOME/cordis.patch.yml
→ 各个 launcher --patch overlay（按 argv 顺序）
```

patch 是顶层数组，不是多层对象 deep merge。行顺序不代表 Service/Loader 激活顺序；依赖是否等待由 Cordis/Loader 生命周期决定。

### patch 语义

```yaml
# 顶层必须是数组；insert 的值是条目数组
- insert:
    - id: my-plugin
      name: my-plugin

# 也可把条目插入已有 group 的 config；id 是目标 group，insert 仍是条目数组
- id: web-app
  insert:
    - id: my-plugin
      name: my-plugin

# 普通覆盖没有 merge 操作；config 等字段整体替换
- id: my-plugin
  name: my-plugin
  disabled: true
```

实现要点：

- `insert` 不带 `id` 时追加到顶层；带 `id` 时目标必须存在且为 group，并追加到目标 `config`。
- 非 `insert` 必须有 `id`；可选 `name` 是防止误命中的一致性检查。
- `name` 不匹配、目标不存在或目标不是 group 时 warning 并跳过；其它字段直接覆盖，**不做深度合并**。用 `id` 覆盖一行时必须重新写全该行需要的每个 `config` key，否则会被整体替换掉。
- patch 按顺序单次执行；本次前面插入的 id 会立即进入索引，因此后续项可以命中它。
- 应用使用独立数据并由 include 的队列/事务更新配置树；解析、验证、模块加载和启动失败应保留清晰错误，旧树可在回滚成功时保留。

`--dump-default-config` 只显示默认组合层；`--dump-config` 再加 profile、home 和 launcher overlay，并保留 `!!js` 表达式不求值；`--dump-config-schema` 输出 profile entry 与 patch 的 JSON Schema，便于配置编写和静态检查。启动器参数必须位于应用参数边界之前；不要把 `dsh web --dump-config` 与 `dsh --profile web --dump-config` 当作同一个解析路径。

## 3. `package.json` 按能力配置

不要复制一个把 bundle、Client、Typert、React 和所有 DSH 服务都强行装上的万能 manifest。`templates/package.json` 是 Host-only bundle 基线；Client、Typert、Tool 和 LLM 能力分别使用对应的 `templates/package.*.json` 变体，再按实际代码删改字段：

| 能力 | 需要声明/验证 |
| --- | --- |
| Profile bundle | `dsh.bundle.patch` 指向包内真实 patch，可以是字符串或**有序数组**；patch 文件应在 `files` 中，常见官方 bundle 还导出 `./cordis.patch.yml` |
| Web Client | `dsh.client` 是对象，`platform` 必填且为字符串；`inject`/`external` 若提供必须为字符串数组，`immediately` 若提供必须为布尔值；`exports["./client"]` 必须解析到真实产物 |
| Typert Host | 生成的 `./typert`（仅选择 Typert Host 时） |
| Typert Client Remote | 生成的 `./remote`（仅 dual-face/Client assembly 需要时） |
| 普通 Node 包 | 只发布实际需要的 root/types/子路径 exports |

官方包常用 `type: module`、`main`、`types`、条件 `exports`、`files` 和 `publishConfig.access`，但这些是 Node/npm 实务，不应一概称为 DSH gate。每一个 exports 目标都必须在 tarball 中存在；不要默认要求 `./typert`、固定的 `lib/types` 目录或 README 文件。`templates/package.json` 是 Host-only bundle 基线；其它能力使用对应 `templates/package.*.json` 变体，并只保留实际生成且发布的 targets。

依赖决策：

- 宿主必须提供且需要共享身份/实例的接口或运行时，通常使用 `peerDependencies`。
- 与宿主共享实例的 DSH 包应按官方约定**同时**写进 `peerDependencies` 和 `devDependencies`：前者在 manifest 的查找位置由运行时解析复用宿主那一份，后者供类型检查和独立测试使用。
- 插件自身必须带上的纯运行时库、协议实现或应用安装闭包，可以使用 `dependencies`。
- `peerDependenciesMeta.optional` 只用于确实可缺失的 seam，不是所有共享依赖的强制格式。
- 以发布后的实际安装闭包为准；不要仅凭包名推断 `zod`、`schemastery` 或 React 的归属。

### 3.1 兼容性字段与运行时 gate 分工

两个字段职责不同，不要混用：

| 字段 | 0.2.0-rc.2 行为 |
| --- | --- |
| `engines.dsh` | **声明性**。0.2.0-rc.2 的安装器与加载器不强制检查它（后续版本改为优先按它判断）。写它仍然有益，因为它表达作者意图并被包 README/市场读取。 |
| `peerDependencies` 中的 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` | **强制检查**。这是实际的兼容性 gate。 |

gate 规则（`evaluatePluginCompatibility`）：

- 只检查名字等于 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的 peer；`@deepseek-ai/cordis`、`react` 等**不参与**版本 gate。
- 用 semver 与运行中的 DSH 版本比对，且 `includePrerelease: true`，所以 `0.2.0-rc.2` 这类预发布版本会真正参与区间匹配。
- `workspace:^`、`workspace:~`、`workspace:*` 视为「当前 runtime」，总是满足。
- 空字符串区间视为不兼容。
- 不满足时，安装/加载会被**拒绝**并给出诊断；只有 profile 的 `compatibility.json` 里存在该 `包名@版本` → 精确 DSH 版本的豁免时才放行。豁免通过插件管理器或 CLI 显式授予，授予时必须确认「可能导致崩溃或数据丢失」的风险。

实践建议：如果你的插件调用了某个 DSH 包的导出，就把它写进 `peerDependencies` 并给出覆盖你支持范围的区间；这样不兼容的宿主会在启动时就告诉你，而不是在运行中途抛出难以定位的错误。

## 4. Host 插件、配置、Service 与事件

最小 Host 入口是一个导出 `apply(ctx)` 的模块；官方样例也使用带 `name`/`inject` 的对象或 Service class。具体 Loader 入口契约应以当前实现为准，不要只凭某个社区样例假设默认导出和命名导出都被所有 Loader 等价支持。

```js
export const name = 'my-plugin'
export const inject = ['llm'] // 只有硬依赖才放这里

export function apply(ctx) {
  const optional = ctx.get('some-optional-service')
  const dispose = ctx.effect(() => {
    // 注册外部监听器/文件 watcher，并返回 cleanup
    return () => {}
  }, 'my-plugin resource')
  ctx.on('some-event', (...args) => {})
}
```

- `inject` 表示硬依赖；服务未就绪时应等待/重载。可选服务使用当前 Context 支持的 `ctx.get()` 并处理 `undefined`。
- 每个监听器、路由、timer、文件 watcher、工具和 UI 注册都必须归属当前 fiber；优先使用 `ctx.on()`、`ctx.effect()` 或官方 API 返回的 disposer。
- Config 使用 Schemastery schema 声明默认值和类型；跨字段约束放在服务支持的校验钩子中（例如 instant config 的 `.check()`），而不是假装 schema 已表达它。
- Service 消失时，依赖它的插件会 dispose；Service 回来后会按依赖关系重新激活。需要隔离服务时，查阅 Cordis group/isolate 的当前文档。

### Context 访问与服务获取

Cordis 的 Context 代理是**严格契约**，不是普通 JS 对象：`ctx.foo` 只在本 entry 的 `inject` 声明过 `foo` 时可读，否则抛

```text
cannot get property "foo" without inject
```

`ctx.foo?.bar` 也救不回来——可选链只处理 `undefined`/`null`，不捕获 throw。由此得出三条：

- **硬依赖**写进 `inject`；**可选依赖**一律 `ctx.get('foo')` 并处理 `undefined`。
- 需要「服务出现后再注册」时用 `ctx.inject(['foo'], (c) => { … })`：回调在服务就绪时运行，派生出的 Context 仍继承当前作用域标签（Agent 作用域、会话作用域都不会丢）。
- **抛错的位置决定后果**：Host half 的 `apply()` 抛错只是该行不激活；**Client half 的 `apply()` 抛错会让整个 web 启动失败**——外壳按 fiber 状态自检，直接拒绝启动 GUI 并弹出诊断对话框。客户端里任何可能抛的读取都必须走 `ctx.get`，或显式 `try/catch` 后降级。

可选能力缺失时的正确姿态是「降级 + 说明原因」（入口可见但禁用，并给出人能读懂的原因），不是抛错，也不是静默假装成功。

### 事件模式

| 模式 | 义务 |
| --- | --- |
| `emit` | 广播；监听器不委托下游 |
| `parallel` | 并发运行监听器并等待全部完成；不要假设执行顺序 |
| `bail` | 按约定返回第一个终止结果 |
| `serial` | 串行运行监听器，使用该事件的精确参数约定 |
| `waterfall` | 包装/改变下游结果；监听器必须调用 `next()` |

事件名和参数属于版本化契约。Tool 事件的导航见 [`references/event-matrix.md`](references/event-matrix.md)，但最终以当前包类型或 Inspect 为准。持久化的 `turn/*`、`step/*`、`tool/call`、`tool/result` 等是 SessionEvent，通过 `session/event` 观察；不要把它们误当作同名 Cordis event。

用 `cordis_inspect_query(platform: 'host', provider: 'Event', method: 'listEvents')` 取当前进程的完整事件目录（名字、mode、精确 signature），这是最省的核对方式，也能立刻发现本 skill 或旧文档里已经改名的条目。

## 5. Tool 快速路径

官方最小形式是：

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet a person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Name' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      return `Hello, ${args.name}!`
    },
  }))
}
```

`defineTool()` 只是定义；`ctx.tools.register()` 才是注册，并返回 disposer。参数会在 `execute` 前按受限 schema DSL 校验，参数不合法时抛 `ToolArgsError`（code `INVALID_ARGS`）；`execute` 返回不符合 `output.schema` 的值时抛 `ToolOutputError`（code `INVALID_TOOL_OUTPUT`）。显式对象节点写 `additionalProperties: true|false`（必填，见 [`references/tool-contract.md`](references/tool-contract.md)）。`execute` 只返回 `output.schema` 声明的无损 JSON 值，必须遵守 `exec.signal`。基础设施故障抛异常；领域层的「不理想状态」应返回符合 schema 的值，让渲染器解释它。

`output.render` 是模型可见内容；`presentCall`、`presentResult` 和 `presentationMeta` 是 UI/回放投影，必须是纯函数，不做 I/O、不依赖时钟/随机数，也不要把 diff/terminal 围栏塞进规范返回值。注意 `presentCall`/`presentResult` **不是** 0.2 新增能力，它们在 0.1.x 就已完整存在；而且内置 Web Client 不消费它们——要让工具在会话里出现专属卡片，需要在客户端把 tool 名注册进 keyed slot `tool.call.toolview`。

后台工作使用 `ctx.jobs.start()`，返回类型化句柄（例如 `{ kind: 'background', jobId }`），发布任务后使用任务自己的取消信号，并让 owner dispose、job kill 和 service teardown 清理它。权限/截止时间/指标优先放 `tools/pre-execute`、`tools/execute` 等扩展点；`ctx.tools.guard()` 的拒绝是单调的。

完整字段、卡片和 Hook 契约见 [`references/tool-contract.md`](references/tool-contract.md)。

## 6. Typert Remote 与 HTTP

Typert 是可选的单请求/单结果类型化通道。它适合多个 Host service 方法和稳定 JSON contract，不适合会话事件流、分页、增量 reduce 或实体子流（0.2 已加入 stream/uplink，但那是另一套 descriptor 形态）。

### 生成产物优先

生成器输出的 `./typert` 通常类似（手写时仅作结构参考；该片段不是独立可运行实现）：

```js
// Generated by @deepseek-ai/dsh-typert-generator ... do not edit.
import { z } from 'zod'

let _result$schema$value
const _result$schema = () => (_result$schema$value ??= z.object({ ok: z.boolean() }))

export const TYPERT = {
  package: 'dsh-my-plugin',
  face: 'host',
  schemas: [],
  invocations: [{
    id: 'dsh-my-plugin#myService/ping',
    service: 'myService',
    namespace: 'myService',
    method: 'ping',
    invocation: { kind: 'direct' },
    parameters: [{ name: 'request', wire: 'request', source: 'json', codec: resultCodec }],
    result: { mode: 'strict', typeSymbol: 'dsh-my-plugin#myService/ping:result', create: _result$schema },
    sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
  }],
}
```

**0.2 关键契约：strict codec 用 `create()` factory，不再有 `schema` 字段。**

```js
// 0.1.x（已失效）
{ mode: 'strict', typeSymbol: '...', schema: z.string() }
// 0.2.0-rc.2
{ mode: 'strict', typeSymbol: '...', create: () => z.string(), decode?, encode? }
```

- `create` 必须是函数，返回一个带 `.parse()` 的 schema；loader 缺 `create` 时的报错是 `... has no create() factory`，`mode !== 'strict'` 时是 `... must use a strict codec`。
- gateway 的边界校验实际执行 `codec.create().parse(value)`，所以 `create()` 返回的对象必须有 `parse`。
- `decode?` / `encode?` 是可选的高级钩子：`decode` 用于递归的原生字节校验，`encode` 用于含字节子树的结果编码。
- 真实生成文件标记 `do not edit`；`package` 必须与完整 `package.json.name` 一致，Host face 是 `host`。

生成的 dual-face 包通常同时发布 `./typert` 与 `./remote`；Host-only Typert 只需 `./typert`，而 `./remote` 仅在 Client assembly 实际挂载 Remote contribution 时导出。Client assembly 通过 `ctx.remote.$mount(contribution)` 安装 descriptors；贡献和实际调用 namespace 的依赖必须归属于实际使用它们的 Client 包。Remote 使用普通对象函数，不依赖 JavaScript Proxy。Client Gateway 会拒绝非 strict codec 的生成 Remote 描述符。

请求边界是 endpoint 加一个 plain `args` 对象；取消 signal 带外传输，不进入业务参数。Host `typertGateway.invoke()` 返回经过验证的业务值或抛错；Connection/API 层的 RPC carrier 才会形成 `{ ok: true, value }` 或 `{ ok: false, error }`。生成的 Client Remote 方法则解析为 `RemoteResult<T>` envelope：成功读 `result.value`，失败读 `result.error`，而 assembly faults 仍可能 reject。业务 wrapper 要按所处 API 层正确解包，注意业务结果本身也可能合法地拥有 `ok/value` 字段，不能用字段名猜测 envelope。

`invocation.id` 是 Typert descriptor 的全局身份（常见形如 `package#service/method`）；wire endpoint 是 `namespace/method`，两者不要混淆，也不要把带 `#` 的 id 发送给 API。Host Service 应按当前 API Gateway/Typert protocol 的正式 binding 路径提供 `typertRemote`，优先使用 `TypertRemoteService` 或 `bindTypertRemote(service, serviceKey, options)`；配套参考见 [`templates/typert.host-service.js`](templates/typert.host-service.js)，不要把旧版手写属性注入当作通用契约。

更完整的字段清单、`typeSymbol` 命名形态、scope/lookup 与校验错误表见 [`references/typert-contract.md`](references/typert-contract.md)。

HTTP JSON API 是另一条独立路径：路由、认证、JSON-safe 序列化、错误格式、取消、CORS/Host 绑定和 disposer 都由插件负责，不要把 Typert 的自动生成或 envelope 规则套到 HTTP 上。若需要 admit/wrap 共享 API 请求，可以挂 `connection/request`（waterfall）。

## 7. Client Module 与 Web UI

### Client module 加载链

`dsh.client` 当前必须是对象；Web client 使用 `platform: 'web'`，`inject` 和 `external` 是可选字符串数组，`immediately` 是可选布尔值。声明后必须能解析 `exports['./client']`（字符串或一层 `{ default: string }`），且该文件真实存在。

Node 端会扫描 Loader entry，构造 `window.__DSH_BOOT__`，并以 **combo 路由**提供脚本：

```text
GET|HEAD /plugins/??<pkg-a>/client.js,<pkg-b>/client.js&rev=<rev>
GET|HEAD /plugins/<pkg>/client.<chunk>.js?rev=<rev>     # 懒加载 chunk
```

一次 combo 请求会把多个插件注册进同一个 classic script；脚本在首次 `GET` 时拼接并缓存，URL 超过约 3 KiB 时会拆分。`rev` 来自文件系统 metadata（`mtimeMs`、`ctimeMs`、`size`），不是内容 hash——所以「同样字节、重新写入」也会让浏览器拿到新 bundle。URL 形状、hash 长度、拆分阈值都属于实现细节，不应作为插件 API 依赖，但**不要把 0.1.x 的 `/plugins/<id>/client.js?rev=...` 当成不变契约**。

`external` 才是模块图的同步代码到达边；图按 `external` 拓扑排序，自依赖/循环/缺失 bundle/畸形声明会在组合或激活阶段报告错误。0.2 起 `inject` 也被提升为 factory arrival 与插件组合的真实依赖边，不再只是说明性元数据。

一个容易踩的坑：client-modules 只在 specifier **恰好是裸包名**的那一行挂载包的浏览器半。用子路径 export 挂载的行不会有浏览器半，而且当根行关闭时，它注册的所有页面都会消失。需要独立生命周期的子插件应该发布成自己的包。

浏览器侧 bundle 是 classic script：

```js
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',
  factory: (require) => {
    // 这里是构建器生成的 CJS wrapper；不要手写整份 wrapper
    const runtime = require('@deepseek-ai/dsh-client-runtime')
    return { inject: ['slots'], apply(ctx) {} }
  },
})
```

脚本下载时只登记 factory；factory materialize（首次导入/require）时才运行代码和 CSS 副作用，并缓存结果。`require` 只能同步解析已经到达并注册的 seed/cache/factory；尚未到达的 external 必须先由模块图异步 arrive。重复 factory、缺模块和环依赖是 fail-loud。`immediately` 只表示第一阶段预取/登记，不代表 Cordis `apply` 已执行。

Client bundle 的构建输出格式是当前官方构建惯例，不是普通 package.json 字段契约。官方 `clientBundle` 预设位于 `packages/client/tsdown.client.ts` 且**不随 npm 发布**，仓库外的包必须自己复刻这一步。发布前必须确认实际脚本生成 classic script、每个 external 都在组合图中有 provider，且 CSS/监听/Slot 等副作用能通过插件 fiber/HMR disposer 回收。

### 客户端激活契约与自检

浏览器半的 `apply()` 在**启动关键路径**上：它抛错时该 entry 的 fiber 进入 `failed`，前端 boot 自检会拒绝启动整个 Web 应用（桌面端还会弹原生错误框）：

```text
web boot: N entry did not activate
<your-package>: failed
```

注意两侧严格程度不同：**浏览器外壳对任何非 `active` 的 entry 都抛错**，而 Node 侧 `dsh-app-boot` 只对 `agent-loop`/`webserver`/`modules`/`connection`/`headless-runner`/`acp`/`sdk-jsonrpc-server` 这些必需 id 启动失败，其余只记 warning。所以「Host 启动没报错」不能证明 client 半区没问题。

上线前逐条确认：

- [ ] `apply()` 内没有任何未 `inject` 的服务属性访问（见 §4「Context 访问与服务获取」）。
- [ ] 所有异步链路（`$mount()`、`ctx.inject` 回调、Slot 回调里的 promise）都收敛了失败。注意 `$mount` 是通过 `ctx.effect` 登记的，contribution 被真 Client Gateway 拒绝时失败落在这个 effect 上。
- [ ] 可选能力缺失时是降级 + 原因文案，不是抛错，也不是静默。
- [ ] Slot 注册的 key 在当前组合里真实存在且由父级声明；没有抢 `single` 洞或他人的子 Slot。
- [ ] 有一条 boot 契约测试断言 fiber 为 `active`，并覆盖「可选服务不存在」的场景，模板见 [`templates/tests/client-boot.test.mjs`](templates/tests/client-boot.test.mjs)（分层说明见 [`references/testing-strategy.md`](references/testing-strategy.md)）。
- [ ] Remote contribution 在**真 Client Gateway** 上 `$mount` 过一次：自造 mock 通过不等于真校验通过，模板见 [`templates/tests/client-remote-mount.test.mjs`](templates/tests/client-remote-mount.test.mjs)。
- [ ] 改完 client 只需**刷新页面**验证；只有 host 改动才需要重启 dsh。

报错原文、`FiberState` 语义、Slot 声明错误清单、模块图的组合期/到达期错误、以及崩溃日志结构，见 [`references/boot-and-activation.md`](references/boot-and-activation.md)。

### Slot 与主题

Slot 是动态的。用当前 `cordis_inspect_query(platform: 'client', provider: 'Slots', method: 'listSubTree')` 或安装包的 rc.2 类型确认真实 key、kind 和 owner props；未声明的 key 不应试注册（注册到未声明 Slot 或重复声明他人已拥有的子 Slot 会在插件激活时失败）。

`ctx.slots.inject(key, callback)` 可等待 Slot declaration，返回 disposer 会同时解除等待和活动贡献。Slot 的 kind 决定选择字段：`list` 用 `id`（必填）+ 可选 `order`/`label`；`keyed` 用 `key`；`chain` 用 `select`；`single` 是供填充的洞。`priority` 对 `single`/`list`/`keyed` 是遮蔽优先级，对 `chain` 是竞选顺序，**数值越小越先渲染/执行**。

不要维护旧版本的「黄金 Slot/主题令牌清单」。Slot 名字会随组合变化——0.2.0-rc.2 里 `settings.plugin.item` 已经不存在，插件页相关的实际 key 是 `plugins.item`、`plugins.row.config`、`plugins.bundle.config`、`plugins.bundle.activation`、`plugins.detail.actions`、`plugins.detail.badge`、`plugins.detail.section`。主题令牌、暗色模式、焦点、窄屏和无障碍是 UI 质量建议，可参考 `dsh-plugin-ui` skill，不是 DSH runtime gate。Inspect 的 `listTokens` 只返回**要求明暗各给一份**的 override 集合，不是完整 alias 目录；需要其它别名时以宿主 CSS 为准。

## 8. LLM Adapter

需要接入新的模型提供方时，阅读 [`references/llm-adapter-guide.md`](references/llm-adapter-guide.md) 和官方 [`adding-an-llm-adapter`](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter)。核心形态：继承 `LlmAdapter`，实现 `async *stream(options)` 返回 `AsyncIterable<StreamChunk>`，然后 `ctx.llm.registerAdapter(['provider'], adapter)`。

适配器必须：

- 在 `finish` 前发送 `usage`，`finish` 是最后一个 chunk；工具参数 delta 保持原始 JSON 文本并使用 `argumentsDelta`；index 按块首次出现顺序稳定分配。
- 遵守 `options.signal`；传输/协议故障抛带稳定 code 的 `LlmError`，不支持的输入字段使用 `UNSUPPORTED`，不要静默丢弃；提供方内故障可用 `finish { kind: 'error'|'aborted' }`。
- 实现 `resolveModel()`，按当前接口返回至少 `{ provider, id: model, name: model }` 和适配器能够证明的能力元数据；`listModels()`、`providerInfo()`、`providerRetryPolicy()`、`prepareCall()` 有 rc.2 基类默认值，只有需要覆盖时才实现。需要跨调用保留的原生响应信息通过 `finish.replayState`；密钥走 Config/环境/credentials，不读自定义秘密文件，不打日志。
- 每个 provider route 只注册一个 adapter；多 route 注册要么全部成功，要支持 fiber/HMR 清理。每个提供方 HTTP 请求还必须合并 `attributionHeaders()`（来自 `@deepseek-ai/llm`），并在 wire 测试中断言 Header 已发送。

## 9. 测试与交付验收

按 [`references/testing-strategy.md`](references/testing-strategy.md) 分层，不要只运行 `node --check`：

1. 语法/类型与 unit tests。
2. Loader/真实 profile 组合测试：patch、bundle、服务等待/消失/reload。
3. Tool/LLM/Remote 的 schema、取消、错误和回放测试。
4. Web client 的 bundle/module graph、Slot、亮暗主题和浏览器冒烟/snapshot。
5. `npm pack --dry-run` 或 `pnpm pack` 后，在干净 profile 安装 `.tgz`，执行 dump-config、重启 Web、刷新页面。
6. 发布后用实际 registry/spec 再次安装验证。

列表第 2 层与第 4 层之间建议再补一层 **boot 契约层**：用真 Cordis root 加载**构建产物**、按 entry 自己的 `inject` 列表提供 stub 服务，断言 fiber 状态为 `active`；再用真 Client Gateway `$mount` 一次 Remote contribution。这一层只需几十毫秒，却正好拦住「装上插件后 DSH 起不来」和「入口在但功能永久不可用」这两类最难在运行时定位的问题，模板见 [`templates/tests/client-boot.test.mjs`](templates/tests/client-boot.test.mjs) 与 [`templates/tests/client-remote-mount.test.mjs`](templates/tests/client-remote-mount.test.mjs)。

优先使用真实 Loader、Service 和 UI 组合；只 mock 网络、LLM、时钟等高成本/不确定边界。测试结束 dispose 所有 fiber/监听器/服务；HMR 测试必须断言旧注册被清理。Windows 当前环境中 `node --test` 的子进程管道、跨盘 `link:` 和 pnpm native build 授权可能有环境特定故障，见发布参考，不是 DSH API 契约。

升级到 0.2 时，务必为 Typert 清单补一个**契约测试**：直接 import 生成的 `./typert`，断言 `invocations.length`、每个 codec 的 `mode === 'strict'` 且 `typeof create === 'function'`、`create()` 返回值有 `parse`，并断言旧形态（只有 `schema`）会被拒绝。这类测试能在几秒内定位「生成产物过期」这一类最难在运行时排查的问题。

## 10. 发布与外部 listing

官方 DSH 发布基础：包带实际 exports/files 和（若作为 profile bundle）`dsh.bundle.patch`；Git 源构建依赖包自己的 `prepare`，预构建 npm/tgz 通常更可复现；用户使用 `dsh plugin --profile <name> add <pnpm spec>` 安装，再用 `dsh --profile <name> --dump-config` 和真实 Web/Host 冒烟验证。

`dsh plugin --profile <name> add github:<owner>/<repo>` 拉取的是**源码而不是构建产物**：不会执行 `build`。TypeScript 包必须提供自洽的 `prepare` 脚本，否则用户拿到的包没有 `lib/`。pnpm ≥10 还会先拒绝运行 Git 依赖的 `prepare`，需要用户按提示把包名加进该 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-hello-plugin: true
```

这是「授权安装期执行任意代码」，要提醒用户并建议用 commit SHA 固定版本。不需要构建授权的两条路：发布到 npm（在 `pnpm publish` 时构建好 `lib/`），或 `pnpm pack` 出 `.tgz` 让用户安装。

npm、GitHub tag、截图、npm 2FA 和 awesome-dsh-plugin 的仓库年龄/提交数/topic/CI 是外部流程或运营策略，不是 DSH core contract。参阅 [`references/publish-runbook.md`](references/publish-runbook.md)，其中已将这些边界分开。

## 11. 红线与排障原则

- 不递归枚举或序列化 Cordis 活对象；只读取任务需要的叶字段，并构造自己的 JSON 数据。
- 每个监听、路由、timer、文件 watcher、Tool、Slot、style 和远程挂载都必须有 fiber/disposer 生命周期。
- Client/Remote 跨边界只传 lossless JSON；不要传函数、类实例或 `undefined`。
- 不把 `inject` 当作 `external`，不把 `dsh.client` 当作 `dsh.bundle`，不把 HTTP response 当作 Typert envelope。
- 修改 Client 后，确认 watcher/build 是否真的在运行；否则重建相关产物、重启对应 dsh web 并刷新页面。
- 遇到「插件装上了但没生效 / 启动报 incompatib」时，先确认 peer 区间是否覆盖运行中的 DSH 版本，再确认 profile 的 `compatibility.json` 是否已有豁免；不要先去改 patch。
- 遇到「Typert 方法调用在边界报 input-invalid」时，先确认 `create()` 返回的 schema 与 Host 侧真实类型一致，而不是去放宽 `mode`。

### 启动/激活类故障速查

| 现象 | 根因 | 下一步 |
| --- | --- | --- |
| `web boot: N entry did not activate`，某条是 `<pkg>: failed` | 该 entry 的 `apply()` 抛错；client 侧最常见的是读了未 `inject` 的服务属性 | 看 boot 遮罩/崩溃日志的 renderer 段，或本地跑 boot 契约测试复现 |
| `<pkg>: pending (waiting for service: x)` | `inject` 里的服务没有任何行 provide：名字拼错、包没装或顺序不对 | 核对服务名与所属包是否在组合里，不要先去改 patch |
| `<pkg>: import failed (see console for the import error)` | bundle 没注册 factory 或模块解析失败（ESM 当 classic script 加载、external 没到达等） | 看 renderer console 的第一条 SyntaxError；确认产物是 `__ModuleLoader__.load({ id, factory })` |
| 入口在但按钮/功能永久不可用、提示「未就绪」 | 可信能力获取时抛错被组件 `catch` 吞掉，退化到 fail-closed 分支 | 别只看 UI：写个最小临时 client 插件复现同一次取值，区分「没注册 / 没挂载 / 取法错」 |

诊断入口（boot 遮罩、桌面崩溃日志的路径与分段、`window.__DSH_BOOT__` 能回答与不能回答什么）见 [`references/boot-and-activation.md`](references/boot-and-activation.md) §4。**不要指望在运行中的页面里找一个根 Context 全局变量**：`__dshClientCtx` 这类名字在 0.2.0-rc.2 的安装产物里并不存在。

## 12. 0.1.x → 0.2.0-rc.2 迁移

按「先加载、再调用、最后 UI」的顺序排查。下面每条都来自对 `dsh-v0.1.1-rc.2` 与 `dsh-v0.2.0-rc.2` 源码/manifest 的对照，而不是推测。

### 12.1 会直接导致加载失败的改动

| 改动 | 症状 | 修法 |
| --- | --- | --- |
| Typert strict codec 的 `schema` 字段被 `create()` factory 取代 | loader 报 `... has no create() factory` 或 `... must use a strict codec`；整个 typert-loader 行激活失败，插件的所有 RPC 都不可用 | 重新生成 `./typert` / `./remote`；手写或过期产物把 `schema: X` 改成 `create: () => X`（推荐用惰性 memo 形式） |
| `@deepseek-ai/dsh-invariants` 与各包的 `./invariant` 子路径导出被移除 | 引用这些模块的 patch/overlay 加载失败；TS import 不再编译 | 删除相关行、patch 条目、依赖与 import；原先依赖 `INVARIANT` 重抛的插件要改用自家通道报告失败 |
| 子路径插件的显示信息不再从 `<subpath>/package.json` 读取 | 插件页标题/描述/图标为空 | 标题描述移到该子路径的 `locale/*.json`（`meta.title`/`meta.description`）并导出；图标改为导出 `<subpath>/icon`；删除该 `package.json` 导出 |
| `Automation tasks`（`@deepseek-ai/dsh-experimental-schedule-bundle`）bundle 退役 | profile 里残留该 bundle 条目；对 `time-context` 的顶层 override 不再命中任何行 | 让 dsh 启动一次以自动改写 `dsh.profile.bundles`；把 `schedule`/`ui-schedule` 的 override 留在 `cordis.patch.yml`；删掉 `time-context` override |

### 12.2 会改变运行行为、但不一定报错的改动

- **`peerDependencies` 兼容性 gate 成为强制项。** 参见 3.1。旧插件若把 peer 区间写成 `^0.1.1-rc.2`，在 0.2.0-rc.2 上会被拒绝加载。
- **Remote 错误类型从 `RemoteFailure` 变成 code 判别的 `RemoteError` 联合。** 旧的 `{ code, message, details }` 手写形状不再匹配；读取错误时应按新 code 集合分支，不要假设 `details` 一定存在。
- **`TypertHostContextProvider` → `TypertHostContextAdapter`，`TypertClientContextBinder` → `TypertClientContextAdapter`（且改为双向）。** 引用旧名字的代码要改名。
- **Remote descriptor 新增 `mode: 'stream'` 与 `uplink`，并新增 `ctx.invocation`。** 只在需要流式/双向时才用；普通单请求/单结果仍是 `kind: 'direct'`。
- **Client module `rev` 语义从内容 hash 改为 mtime/ctime/size；路由改为 combo + chunk；`window.__DSH_BOOT__` 增加 `batches` 与 phase；`inject` 变成真实的 arrival 依赖边。** 依赖「改文件内容不变就不刷新」或依赖旧 `/plugins/<id>/client.js` URL 的脚本/缓存假设要放弃。
- **`tools/code-dispatch-log` 改名为 `tools/ptc-dispatch-log`。** 旧监听器不会报错，只是永远不触发——这是最隐蔽的一类回归，建议用 Inspect 目录重新核对所有事件名。
- **`agent/session-start` 在 0.2.0-rc.2 的目录里不存在**；会话起始相关请使用 `agent/created`。

### 12.3 不要误判为 0.2 新特性的东西

- **Tool presentation cards（`presentCall` / `presentResult` / `presentationMeta`）在 0.1.1-rc.2 就已完整存在**，不是迁移项。而且内置 Web Client 不消费它们——要出卡片必须注册 `tool.call.toolview`。
- **`window.__ModuleLoader__` 在两个版本都存在**，注册形状仍是 `{ id, factory }`。
- **`engines.dsh` 在 0.2.0-rc.2 仍只是声明**，不要把它描述成会被强制校验的字段。

### 12.4 迁移顺序建议

1. 先跑通加载：修 Typert codec、修被移除的模块、修 peer 区间。
2. 再跑通调用：用契约测试覆盖 Typert 清单形状；用真实 RPC 冒烟覆盖 list/get/select 之类方法。
3. 最后修 UI：用 Inspect 重新核对 Slot key 与 kind，重新核对主题令牌。
4. 事件监听器逐个对照当前 `listEvents` 目录改名。
5. 更新 README 里的兼容性说明、截图和安装 tag。

官方迁移文档位于仓库内 `docs/upgrade-guide/v<semver>/<slug>/guide.md`（`kind: upgrade-guide`，固定包含 `## Change` 与 `## Migration` 两节）。注意 `docs/` 是按 tag 存在的：在 `dsh-v0.2.0-rc.2` tag 上 `docs/upgrade-guide/` 只有 `v0.1.7-rc.2`，`v0.2.0-rc.2` 目录是后来在主分支补的。要确认某个行为是否真的在你使用的版本里成立，请用 tag 化的 raw 路径核对：

```text
https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/<tag>/docs/<path>.md
```

## 附：文件索引

| 文件 | 用途 |
| --- | --- |
| [`templates/package.json`](templates/package.json) | Host-only profile bundle manifest 基线 |
| [`templates/package.client.json`](templates/package.client.json) | Web Client-only manifest 变体 |
| [`templates/package.client-bundle.json`](templates/package.client-bundle.json) | Web Client + profile bundle manifest 变体 |
| [`templates/package.typert-dual.json`](templates/package.typert-dual.json) | Typert dual-face bundle manifest 变体 |
| [`templates/package.tool.json`](templates/package.tool.json) | Tool bundle manifest 变体 |
| [`templates/package.llm.json`](templates/package.llm.json) | LLM Adapter bundle manifest 变体 |
| [`templates/cordis.patch.yml`](templates/cordis.patch.yml) | bundle patch 示例 |
| [`templates/typert.host.js`](templates/typert.host.js) | 生成 Typert Host artifact 的形状参考（非独立可运行文件） |
| [`templates/typert.host-service.js`](templates/typert.host-service.js) | Host Service 与 `typertRemote` binding 参考 |
| [`templates/typert.remote-client.js`](templates/typert.remote-client.js) | 生成 Typert Client contribution 参考 |
| [`templates/client.js`](templates/client.js) | classic script/lazy factory 注释模板 |
| [`templates/tool.js`](templates/tool.js) | Tool 注册模板 |
| [`templates/llm-adapter.js`](templates/llm-adapter.js) | LLM Adapter 模板 |
| [`templates/tests/unit.test.mjs`](templates/tests/unit.test.mjs) | unit/dispose 测试骨架 |
| [`templates/tests/loader.integration.test.mjs`](templates/tests/loader.integration.test.mjs) | Loader/profile 组合测试骨架 |
| [`templates/tests/web.snapshot.test.mjs`](templates/tests/web.snapshot.test.mjs) | Web 冒烟测试骨架 |
| [`templates/tests/client-boot.test.mjs`](templates/tests/client-boot.test.mjs) | 客户端 boot 契约（真 Cordis root + 真产物，断言 fiber 为 `active`） |
| [`templates/tests/client-remote-mount.test.mjs`](templates/tests/client-remote-mount.test.mjs) | 真 Client Gateway 接受 contribution + 身份投影 + fail-closed |
| [`templates/install.ps1`](templates/install.ps1) | npm/Git/tgz 安装提示脚本 |
| [`references/evidence-matrix.md`](references/evidence-matrix.md) | 事实、样例、经验和外部流程的边界 |
| [`references/boot-and-activation.md`](references/boot-and-activation.md) | 启动/激活契约：两侧自检、FiberState、Slot 与模块图报错原文、崩溃日志与诊断路径 |
| [`references/typert-contract.md`](references/typert-contract.md) | Typert codec/manifest/gateway 契约（含 `create()` factory） |
| [`references/tool-contract.md`](references/tool-contract.md) | Tool schema/执行/展示/后台任务 |
| [`references/event-matrix.md`](references/event-matrix.md) | Event mode 导航矩阵 |
| [`references/llm-adapter-guide.md`](references/llm-adapter-guide.md) | LLM Adapter 流协议与错误 |
| [`references/client-module-contract.md`](references/client-module-contract.md) | Client module graph 与 bundle 加载 |
| [`references/testing-strategy.md`](references/testing-strategy.md) | 分层测试与发布前验收 |
| [`references/publish-runbook.md`](references/publish-runbook.md) | 官方安装事实与外部 listing 流程 |
