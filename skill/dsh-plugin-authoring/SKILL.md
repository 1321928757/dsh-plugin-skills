---
name: dsh-plugin-authoring
description: End-to-end playbook for building, testing, packaging, installing, and publishing a DeepSeek Harness plugin against DSH 0.1.1-rc.2. Use for DSH plugin development, migration from a dynamic plugin to a profile bundle, Web Client contributions, Typert/HTTP channels, LLM adapters, package release, or awesome-dsh-plugin listing.
---

# DSH 插件开发与交付（0.1.1-rc.2）

本 skill 面向可发布的 DSH 插件，主依据是官方文档与 `dsh-v0.1.1-rc.2` 的运行时/包 manifest。`xfg-skills-dsp-plugin-template` 的测试、Tool 和交付经验只作为补充，不会覆盖官方契约。证据类型和路径见 [`references/evidence-matrix.md`](references/evidence-matrix.md)。

> **版本边界。** 目标版本是 DSH `0.1.1-rc.2`，官方 tag 是 [`dsh-v0.1.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.1-rc.2)。动态 Slot、Service、Event 和 Theme 名称会随组合变化；不要把本文中的示例名当作当前运行时的完整目录，应先查询当前类型或 Harness Inspect。

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

`dsh plugin --profile <name> <pnpm args...>` 会在 profile 目录转发给 pnpm。`web` 和 `headless` 有随附模板；其它 profile 首次使用时由 `dsh plugin` 初始化。官方生成的 `pnpm-workspace.yaml` 关键形态是 `packages: - .`、`nodeLinker: hoisted`、`autoInstallPeers: false`。`allowBuilds` 不是 DSH profile manifest 契约；只有 pnpm 安装某个源码/native 依赖实际报构建授权错误时，才按该 pnpm 版本提示处理。

包名解析有两个锚点：先从正在运行的 DSH 安装目录解析，再从 profile 目录解析；profile 外部包由 pnpm 管理。把包列入 `dsh.profile.bundles` 后，必须能解析包且包 manifest 必须有 `dsh.bundle.patch`；没有该声明是错误，不是“静默跳过”。没有 bundle 声明的依赖可以作为普通依赖安装，但不会贡献配置层。

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
- `name` 不匹配、目标不存在或目标不是 group 时 warning 并跳过；其它字段直接覆盖，不做深度合并。
- patch 按顺序单次执行；本次前面插入的 id 会立即进入索引，因此后续项可以命中它。
- 应用使用独立数据并由 include 的队列/事务更新配置树；解析、验证、模块加载和启动失败应保留清晰错误，旧树可在回滚成功时保留。

`--dump-default-config` 只显示默认组合层；`--dump-config` 再加 profile、home 和 launcher overlay，并保留 `!!js` 表达式不求值。启动器参数必须位于应用参数边界之前；不要把 `dsh web --dump-config` 与 `dsh --profile web --dump-config` 当作同一个解析路径。

## 3. `package.json` 按能力配置

不要复制一个把 bundle、Client、Typert、React 和所有 DSH 服务都强行装上的万能 manifest。`templates/package.json` 是 Host-only bundle 基线；Client、Typert、Tool 和 LLM 能力分别使用对应的 `templates/package.*.json` 变体，再按实际代码删改字段：

| 能力 | 需要声明/验证 |
| --- | --- |
| Profile bundle | `dsh.bundle.patch` 指向包内真实 patch；patch 文件应在 `files` 中，常见官方 bundle 还导出 `./cordis.patch.yml` |
| Web Client | `dsh.client` 是对象；当前 Web 链检查 `platform` 为字符串，`inject`/`external` 若提供必须为字符串数组，`immediately` 若提供必须为布尔值；`exports["./client"]` 必须解析到真实产物 |
| Typert Host | 生成的 `./typert`（仅选择 Typert Host 时） |
| Typert Client Remote | 生成的 `./remote`（仅 dual-face/Client assembly 需要时） |
| 普通 Node 包 | 只发布实际需要的 root/types/子路径 exports |

官方包常用 `type: module`、`main`、`types`、条件 `exports`、`files` 和 `publishConfig.access`，但这些是 Node/npm 实务，不应一概称为 DSH gate。每一个 exports 目标都必须在 tarball 中存在；不要默认要求 `./typert`、固定的 `lib/types` 目录或 README 文件。`templates/package.json` 是 Host-only bundle 基线；其它能力使用对应 `templates/package.*.json` 变体，并只保留实际生成且发布的 targets。

依赖决策：

- 宿主必须提供且需要共享身份/实例的接口或运行时，通常使用 `peerDependencies`。
- 插件自身必须带上的纯运行时库、协议实现或应用安装闭包，可以使用 `dependencies`。
- `peerDependenciesMeta.optional` 只用于确实可缺失的 seam，不是所有共享依赖的强制格式。
- 以发布后的实际安装闭包为准；不要仅凭包名推断 `zod`、`schemastery` 或 React 的归属。

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
- Config 使用 Schemastery schema 声明默认值和类型；跨字段约束放在服务支持的校验钩子中，而不是假装 schema 已表达它。
- Service 消失时，依赖它的插件会 dispose；Service 回来后会按依赖关系重新激活。需要隔离服务时，查阅 Cordis group/isolate 的当前文档。

### 事件模式

| 模式 | 义务 |
| --- | --- |
| `emit` | 广播；监听器不委托下游 |
| `parallel` | 并发运行监听器并等待全部完成；不要假设执行顺序 |
| `bail` | 按约定返回第一个终止结果 |
| `serial` | 串行运行监听器，使用该事件的精确参数约定 |
| `waterfall` | 包装/改变下游结果；监听器必须调用 `next()` |

事件名和参数属于版本化契约。Tool 事件的导航见 [`references/event-matrix.md`](references/event-matrix.md)，但最终以当前包类型或 Inspect 为准。持久化的 `turn/*`、`step/*`、`tool/call`、`tool/result` 等是 SessionEvent，通过 `session/event` 观察；不要把它们误当作同名 Cordis event。

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

`defineTool()` 只是定义；`ctx.tools.register()` 才是注册，并返回 disposer。参数会在 `execute` 前按受限 schema DSL 校验；显式对象节点写 `additionalProperties: true|false`。`execute` 只返回 `output.schema` 声明的无损 JSON 值，必须遵守 `exec.signal`。基础设施故障抛异常；领域层的“不理想状态”应返回符合 schema 的值，让渲染器解释它。

`output.render` 是模型可见内容；`presentCall`、`presentResult` 和 `presentationMeta` 是 UI/回放投影，必须是纯函数，不做 I/O、不依赖时钟/随机数，也不要把 diff/terminal 围栏塞进规范返回值。后台工作使用 `ctx.jobs.start()`，返回类型化句柄（例如 `{ kind: 'background', jobId }`），发布任务后使用任务自己的取消信号，并让 owner dispose、job kill 和 service teardown 清理它。权限/截止时间/指标优先放 `tools/pre-execute`、`tools/execute` 等扩展点；`ctx.tools.guard()` 的拒绝是单调的。

完整字段、卡片和 Hook 契约见 [`references/tool-contract.md`](references/tool-contract.md)。

## 6. Typert Remote 与 HTTP

Typert 是可选的单请求/单结果类型化通道。它适合多个 Host service 方法和稳定 JSON contract，不适合会话事件流、分页、增量 reduce 或实体子流。

### 生成产物优先

生成器输出的 `./typert` 通常类似（手写时仅作结构参考；该片段不是独立可运行实现）：

```js
// Generated by @deepseek-ai/dsh-typert-generator ... do not edit.
import { z } from 'zod'

const result = {
  mode: 'strict',
  typeSymbol: 'dsh-my-plugin/types#Result',
  schema: z.object({ ok: z.boolean() }),
}

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
    parameters: [{ name: 'request', wire: 'request', source: 'json', codec: result }],
    result,
    sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
  }],
}
```

真实生成文件标记 `do not edit`；`package` 必须与完整 `package.json.name` 一致，Host face 是 `host`。严格 codec 和 `./typert` 的确切依赖由生成产物和当前 loader 决定：rc.2 loader 会检查严格 codec 的运行时 schema 形态（包括 `_zod` 和 `parse`），但这不是把任意手写 `{parse}` 或固定 `zod` 依赖规则推广给所有插件的理由。

生成的 dual-face 包通常同时发布 `./typert` 与 `./remote`；Host-only Typert 只需 `./typert`，而 `./remote` 仅在 Client assembly 实际挂载 Remote contribution 时导出。Client assembly 通过 `ctx.remote.$mount(contribution)` 安装 descriptors；贡献和实际调用 namespace 的依赖必须归属于实际使用它们的 Client 包。Remote 使用普通对象函数，不依赖 JavaScript Proxy。实际生成的 Remote 贡献可能由专门的 assembly 包装配，不要把这段示例误读为所有 Client 包都必须自挂载。

请求边界是 endpoint 加一个 plain `args` 对象；取消 signal 带外传输，不进入业务参数。Host `typertGateway.invoke()` 返回经过验证的业务值或抛错；Connection/API 层的 RPC carrier 才会形成 `{ ok: true, value }` 或 `{ ok: false, error }`。生成的 Client Remote 方法则解析为 `RemoteResult<T>` envelope：成功读 `result.value`，失败读 `result.error`，而 assembly faults 仍可能 reject。业务 wrapper 要按所处 API 层正确解包，注意业务结果本身也可能合法地拥有 `ok/value` 字段，不能用字段名猜测 envelope。

`invocation.id` 是 Typert descriptor 的全局身份（常见形如 `package#service/method`）；wire endpoint 是 `namespace/method`，两者不要混淆，也不要把带 `#` 的 id 发送给 API。Host Service 应按当前 API Gateway/Typert protocol 的正式 binding 路径提供 `typertRemote`，优先使用 `TypertRemoteService` 或 `bindTypertRemote(service, serviceKey, options)`；配套参考见 [`templates/typert.host-service.js`](templates/typert.host-service.js)，不要把旧版手写属性注入当作通用契约。

HTTP JSON API 是另一条独立路径：路由、认证、JSON-safe 序列化、错误格式、取消、CORS/Host 绑定和 disposer 都由插件负责，不要把 Typert 的自动生成或 envelope 规则套到 HTTP 上。

## 7. Client Module 与 Web UI

### Client module 加载链

`dsh.client` 当前必须是对象；Web client 使用 `platform: 'web'`，`inject` 和 `external` 是可选字符串数组，`immediately` 是可选布尔值。声明后必须能解析 `exports['./client']`（字符串或一层 `{ default: string }`），且该文件真实存在。

Node 端会扫描 Loader entry，构造 `window.__DSH_BOOT__`，并在 rc.2 当前实现中把 bundle 作为 `/plugins/<id>/client.js?rev=<12 位 SHA-1>` 提供；具体 URL/hash 长度属于实现细节，不应作为插件 API 依赖。`external` 才是模块图的同步代码到达边；图按 external 拓扑排序，自依赖/循环/缺失 bundle/畸形声明会在组合或激活阶段报告错误。`inject` 是 package/fiber 相关声明元数据，不要用它代替实际的 module `require` 依赖。

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

Client bundle 的构建输出格式是当前官方构建惯例，不是普通 package.json 字段契约。发布前必须确认实际脚本生成 classic script、每个 external 都在组合图中有 provider，且 CSS/监听/Slot 等副作用能通过插件 fiber/HMR disposer 回收。

### Slot 与主题

Slot 是动态的。用当前 `cordis_inspect_query` 的 `Slots.listSubTree` 或安装包的 rc.2 类型确认真实 key、kind 和 owner props；未声明的 key 不应试注册。`ctx.slots.inject(key, callback)` 可等待 Slot declaration，返回 disposer 会同时解除等待和活动贡献。

不要维护旧版本的“黄金 Slot/主题令牌清单”。`settings.general.item`、`settings.plugin.item`、`conversation.input.*` 等名字只能作为线索，实际使用前必须核对当前组合。主题令牌、暗色模式、焦点、窄屏和无障碍是 UI 质量建议，可参考 `dsh-plugin-ui` skill，不是 DSH runtime gate。

## 8. LLM Adapter

需要接入新的模型提供方时，阅读 [`references/llm-adapter-guide.md`](references/llm-adapter-guide.md) 和官方 [`adding-an-llm-adapter`](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter)。核心形态：继承 `LlmAdapter`，实现 `async *stream(options)` 返回 `AsyncIterable<StreamChunk>`，然后 `ctx.llm.registerAdapter(['provider'], adapter)`。

适配器必须：

- 在 `finish` 前发送 `usage`，`finish` 是最后一个 chunk；工具参数 delta 保持原始 JSON 文本并使用 `argumentsDelta`；index 按块首次出现顺序稳定分配。
- 遵守 `options.signal`；传输/协议故障抛带稳定 code 的 `LlmError`，不支持的输入字段使用 `UNSUPPORTED`，不要静默丢弃；提供方内故障可用 `finish { kind: 'error'|'aborted' }`。
- 实现 `resolveModel()`，按当前接口返回至少 `{ provider, id: model, name: model }` 和适配器能够证明的能力元数据；`listModels()`、`providerInfo()`、`providerRetryPolicy()`、`prepareCall()` 有 rc.2 基类默认值，只有需要覆盖时才实现。需要跨调用保留的原生响应信息通过 `finish.replayState`；密钥走 Config/环境/credentials，不读自定义秘密文件，不打日志。
- 每个 provider route 只注册一个 adapter；多 route 注册要么全部成功，要支持 fiber/HMR 清理。每个提供方 HTTP 请求还必须合并 `attributionHeaders()`（来自 `@deepseek-ai/dsh-llm`），并在 wire 测试中断言 Header 已发送。

## 9. 测试与交付验收

按 [`references/testing-strategy.md`](references/testing-strategy.md) 分层，不要只运行 `node --check`：

1. 语法/类型与 unit tests。
2. Loader/真实 profile 组合测试：patch、bundle、服务等待/消失/reload。
3. Tool/LLM/Remote 的 schema、取消、错误和回放测试。
4. Web client 的 bundle/module graph、Slot、亮暗主题和浏览器冒烟/snapshot。
5. `npm pack --dry-run` 或 `pnpm pack` 后，在干净 profile 安装 `.tgz`，执行 dump-config、重启 Web、刷新页面。
6. 发布后用实际 registry/spec 再次安装验证。

优先使用真实 Loader、Service 和 UI 组合；只 mock 网络、LLM、时钟等高成本/不确定边界。测试结束 dispose 所有 fiber/监听器/服务；HMR 测试必须断言旧注册被清理。Windows 当前环境中 `node --test` 的子进程管道、跨盘 `link:` 和 pnpm native build 授权可能有环境特定故障，见发布参考，不是 DSH API 契约。

## 10. 发布与外部 listing

官方 DSH 发布基础：包带实际 exports/files 和（若作为 profile bundle）`dsh.bundle.patch`；Git 源构建依赖包自己的 `prepare`，预构建 npm/tgz 通常更可复现；用户使用 `dsh plugin --profile <name> add <pnpm spec>` 安装，再用 `dsh --profile <name> --dump-config` 和真实 Web/Host 冒烟验证。

npm、GitHub tag、截图、npm 2FA 和 awesome-dsh-plugin 的仓库年龄/提交数/topic/CI 是外部流程或运营策略，不是 DSH core contract。参阅 [`references/publish-runbook.md`](references/publish-runbook.md)，其中已将这些边界分开。

## 11. 红线与排障原则

- 不递归枚举或序列化 Cordis 活对象；只读取任务需要的叶字段，并构造自己的 JSON 数据。
- 每个监听、路由、timer、文件 watcher、Tool、Slot、style 和远程挂载都必须有 fiber/disposer 生命周期。
- Client/Remote 跨边界只传 lossless JSON；不要传函数、类实例或 `undefined`。
- 不把 `inject` 当作 `external`，不把 `dsh.client` 当作 `dsh.bundle`，不把 HTTP response 当作 Typert envelope。
- 修改 Client 后，确认 watcher/build 是否真的在运行；否则重建相关产物、重启对应 dsh web 并刷新页面。

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
| [`templates/install.ps1`](templates/install.ps1) | npm/Git/tgz 安装提示脚本 |
| [`references/evidence-matrix.md`](references/evidence-matrix.md) | 事实、样例、经验和外部流程的边界 |
| [`references/tool-contract.md`](references/tool-contract.md) | Tool schema/执行/展示/后台任务 |
| [`references/event-matrix.md`](references/event-matrix.md) | Event mode 导航矩阵 |
| [`references/llm-adapter-guide.md`](references/llm-adapter-guide.md) | LLM Adapter 流协议与错误 |
| [`references/client-module-contract.md`](references/client-module-contract.md) | Client module graph 与 bundle 加载 |
| [`references/testing-strategy.md`](references/testing-strategy.md) | 分层测试与发布前验收 |
| [`references/publish-runbook.md`](references/publish-runbook.md) | 官方安装事实与外部 listing 流程 |
