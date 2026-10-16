# 启动与激活契约（0.2.0-rc.2）

本文件覆盖「插件装上之后 DSH 起不来 / 入口在但功能永久不可用」这一类故障的**契约、报错原文和诊断路径**。

证据分级（每个结论都标注，不要把环境现象当 API 承诺）：

- **[契约]** 来自运行中的 0.2.0-rc.2 产物源码（`dsh-web-frontend`、`dsh-app-boot`、`dsh-cordis-client-runner`、`@deepseek-ai/cordis`、`dsh-client-ui-slots`、`dsh-api-gateway`、桌面 `lib/main.js`），可在同版本上复现。
- **[实践]** 推荐做法，不是运行时强制。
- **[环境]** 当前 Windows/桌面环境的现象。

> 桌面版把运行时打进 `resources/app.asar`；本文件的源码引用都来自解析该 asar。profile 的 `node_modules` 里**没有**这些包，不要在那里找。

## 1. 两套自检，严格程度不同

这是最容易误判的一点：**Host 侧启动干净，不代表 client 半区没问题。**

### 1.1 浏览器外壳：任何非 active entry 都致命 [契约]

前端在 boot 批次的 entry 全部 settle 之后逐条检查 fiber 状态，**只要有一个不是 `active` 就抛错**，没有豁免名单：

```js
// dsh-web-frontend dist bundle（压缩前形态）
function assertActivated(ctx, modules) {
  const problems = []
  for (const entry of ctx.loader.entries()) {
    const name = entry.options.name
    if (entry.fiber === undefined) {
      const error = modules.importError(name)
      problems.push(error === undefined
        ? `${name}: import failed (see console for the import error)`
        : `${name}: import failed: ${error.message}`)
      continue
    }
    const label = FIBER_LABEL[entry.fiber.state]
    if (label !== 'active') {
      if (label === 'pending') {
        const missing = Object.keys(entry.fiber.inject).filter((s) => ctx.get(s) === undefined)
        problems.push(`${name}: pending (waiting for service${missing.length === 1 ? '' : 's'}: ${missing.join(', ') || 'unknown'})`)
      } else problems.push(`${name}: ${label}`)
    }
  }
  if (problems.length > 0) throw new Error(`web boot: ${problems.length} entr${problems.length === 1 ? 'y' : 'ies'} did not activate\n${problems.join('\n')}`)
}
```

抛出后前端不再渲染应用，改为显示 boot 遮罩：**"Failed to load plugins"** 加逐条 entry（DOM 上带 `data-dsh-boot`）。这就是用户看到的「应用无法启动」。

### 1.2 Node/Host 侧：只有「必需 entry」才致命 [契约]

`dsh-app-boot` 的 `auditStartupEntries` 使用一份**硬编码的全局必需清单**：

```js
const requiredStartupEntryIds = new Set([
  'agent-loop', 'webserver', 'modules', 'connection',
  'headless-runner', 'acp', 'sdk-jsonrpc-server',
])
```

- 失败项是 bootstrap Include 或上述 id 之一 → `throw new StartupError(...)`，启动失败。
- 其余（包括所有第三方插件的 entry）→ 只往 stderr 写一条
  `${binName}: warning: N entries did not activate`，**兄弟节点照常运行**。

所以第三方插件的 Node 半区 `apply()` 抛错通常只会得到一条 warning；而它的 **client 半区** `apply()` 抛错会让整个 Web 应用不启动。

### 1.3 桌面外壳把 boot 失败升级成原生对话框 [契约]

前端把失败通过 preload 暴露的桥上报，主进程弹原生错误框并写崩溃报告：

```js
// preload-app.cjs
contextBridge.exposeInMainWorld('dshDesktopBoot', {
  ready:  () => ipcRenderer.invoke(DESKTOP_IPC.boot),
  failed: (message) => ipcRenderer.invoke(DESKTOP_IPC.bootFailed, message),
})

// lib/main.js
ipcMain.handle(DESKTOP_IPC.bootFailed /* 'dsh-desktop:boot-failed' */, (event, message) => {
  assertDesktopSender(event, ['app'])
  reportFatal(new Error(message), 'web-boot')
})
```

对话框文案 `fatalSummary: "应用无法启动或已意外停止。"`，按钮为 **退出 / 重启 / 禁用第三方插件**。

## 2. 为什么会「不是 active」

`FiberState` 的数值顺序固定（`@deepseek-ai/cordis` `src/fiber.ts`）[契约]：

```text
PENDING=0  LOADING=1  ACTIVE=2  FAILED=3  DISPOSED=4  UNLOADING=5
```

因此 `fiber.state === 2` 等价于 `active`，`['pending','loading','active','failed','disposed','unloading'][fiber.state]` 是正确的标签表。

| 现象 | 含义 | 根因 |
| --- | --- | --- |
| `<pkg>: failed` | fiber 存在但 `_error` 已设置 | **`apply()` 同步抛错**，或注入的服务在读取时抛错 |
| `<pkg>: pending (waiting for service: x)` | fiber 存在但从未加载 | `inject` 里的服务没有任何 entry provide（名字拼错、包没装、顺序不对） |
| `<pkg>: import failed (see console for the import error)` | `entry.fiber === undefined` | bundle 没注册 factory、模块解析失败、ESM 被当 classic script 加载 |
| `<pkg>: import failed: <message>` | 同上，且拿到了 import 错误 | 同上，带具体原因 |

### 2.1 `apply()` 抛错 = fiber FAILED [契约]

fiber 的加载路径捕获插件回调的异常，记日志后写入 `_error`；之后 `get state()` 返回 `FAILED`：

```js
} catch (reason) {
  this.ctx.logger.error(reason)
  this._error = reason
}
```

`apply()` 内部任何未 `inject` 的服务属性读取都会走到这里（见 §3）。

### 2.2 disposer 抛错**不会**让 fiber 变 failed [契约]

反过来说也成立：清理段的异常被吞掉并记日志，不写 `_error`。

```js
// fiber.ts 卸载路径
await Promise.all(this._disposables.clear().map(async (dispose) => {
  try { await runDisposable(dispose) } catch (reason) { this.ctx.logger.error(reason) }
}))
// runDisposable 内部同样：同步抛错 → logger.error；promise rejection → .catch(logger.error)
```

**实践含义**：不要指望「disposer 抛错」会在 boot 自检里暴露出来——它只出现在日志里。清理逻辑要么自己收敛失败，要么显式上报。**[实践]**

### 2.3 Host 进程的 unhandled rejection 是致命的 [契约]

Node/Host 进程装了 `installFailLoud`：

```js
proc.on('unhandledRejection', (err) => {
  if (assembledActivationRejections.has(err)) return   // 已由启动审计报告过
  report(err, 'fatal load failure')                     // stderr + proc.exit(1)
})
proc.on('uncaughtException', (err) => report(err, 'fatal uncaught exception'))
```

即：**Host 侧未处理的 rejection 会写 stderr 并以退出码 1 结束**（若有 `release` 钩子，先等它收尾，超时有上限）。已经被启动审计收集过的 rejection 不重复报告。

浏览器侧没有这层保护；renderer 的未处理异常只会进 console——但桌面会捕获 renderer 的 error 级 console 写进崩溃报告（§4）。

## 3. Cordis Context 访问规则

### 3.1 未声明的服务属性会抛错 [契约]

`@deepseek-ai/cordis` 的 `ReflectService.handler.get` 在属性既不是特殊属性、也不在 target 上时直接构造错误：

```js
const error = new Error(`cannot get property "${prop}" without inject`)
```

然后沿 fiber 链查找 provider；找不到就抛出。同一路径还有第二种文案：

```text
cannot get required service "${prop}" in inactive context
```

即属性**在** `inject` 里、但当前 Context 未激活。

**`ctx.foo?.bar` 救不回来**：可选链只处理 `undefined`/`null`，不捕获 throw。

### 3.2 三种取法 [契约]

| 需求 | 写法 | 语义 |
| --- | --- | --- |
| 硬依赖 | `export const inject = ['slots']`，然后 `ctx.slots` | entry 会等该服务；没有 provider 就一直 `pending` |
| 可选依赖 | `ctx.get('someService')` | 源码注释原文：*"Read a service from the store **without the inject requirement**"*，未提供时返回 `undefined`，不抛错 |
| 晚到服务 | `ctx.inject(['remote'], (c) => { … })` | 等价于 `ctx.plugin({ inject, apply: callback })`，创建**子 fiber**；服务变化时回调会被卸载并重跑 |

`ctx.inject` 派生的 Context 继承调用方的 scope/isolate 标签，所以 Agent 作用域不会丢。注意它返回的是 `Fiber & PromiseLike<Fiber>`，而回调签名是 `Plugin.Function<void>`——**回调不把值返回给调用方**，需要桥接：

```js
const binding = await new Promise((resolve, reject) => {
  agentCtx.inject(['remote.myService'], (c) => {
    Promise.resolve(c.remote.myService).then(resolve, reject)
  })
})
```

（也可以 `await agentCtx.inject([...], () => {})` 让加载结束，再用 `agentCtx.get('remote.myService')` 取。）

### 3.3 错误姿势的典型后果

- 在 client `apply()` 里读未 `inject` 的服务 → 抛错 → fiber `failed` → §1.1 抛 `web boot: …` → 整个应用不启动。
- 在组件里读未 `inject`（或作用域未声明）的服务 → 抛错被组件 `catch` → 退化到 fail-closed 分支 → **入口在，按钮永久不可用**。这种最隐蔽：Host 完全正常。

**[实践]** 可选能力缺失时应「降级 + 说明原因」（入口可见但禁用，给出人能读懂的理由），而不是抛错，也不是静默假装成功。

## 4. 诊断路径

1. **boot 遮罩**：前端显示 "Failed to load plugins" 与逐条 entry 原因；DOM 上带 `data-dsh-boot`。这是第一手信息。
2. **桌面崩溃日志**：`app.getPath('logs')` 下的 `crash-<ISO时间>-<source>.log`，`source ∈ {host, web-boot, renderer, main}`；boot 自检失败写 `-web-boot.log`。Windows 默认 `%APPDATA%\@deepseek-ai\dsh-desktop\logs\`。
   报告结构：header（time/source/phase/app/platform/electron/node/locale/pid）→ `--- error ---` → 可选 `--- host diagnostic (as reported by the Host process) ---` → `--- renderer console (error level, oldest first) ---`。只保留最近 10 份。
3. **`dsh web`（非桌面）**：启动终端 + 浏览器 console。`import failed (see console for the import error)` 就是在指路。
4. **`window.__DSH_BOOT__`**：client-modules 注入的 boot graph（`{ rev, entries, batches }`）。能回答「我的包有没有进组合图」，**不能**回答「`apply()` 有没有成功」。
5. **没有受支持的运行中根 Context 全局入口。** 要复现一次具体取值，写一个最小临时 client 插件打印 `ctx.get(...)` 结果，或直接用 [`templates/tests/client-boot.test.mjs`](../templates/tests/client-boot.test.mjs) 在真 Cordis root 上跑同一段代码。见 [`evidence-matrix.md`](evidence-matrix.md) 的 Unverified。
6. **外壳自检逻辑就在前端产物里**（搜 `did not activate`）。用 asar 解析手法读它，不要靠猜。

## 5. Slot 声明与注册错误 [契约]

`dsh-client-ui-slots` 的 README 把规则说得很清楚：

> Declaring a slot is claiming it: the registering entry becomes the only entry allowed to render that key, and **registering into an undeclared slot, declaring an already-declared child, mounting one shared handle under two scopes, or registering a chain without `select` throws at load.**

这些抛出发生在**加载期**，所以会走 §2.1 的路径变成 fiber `failed`，进而让整个 Web boot 失败。源码里的报错原文：

| 触发 | 报错 |
| --- | --- |
| 注册到未声明的 key | `slot "${name}" is not declared (a parent entry's children table must declare it)` |
| 重复声明他人已拥有的子 Slot | `slot "${childKey}" is already declared (by ${declaredBy ?? 'an unknown entry'})` |
| `list` 槽缺 `id` | `list slot "${name}" requires options.id` |
| `list` 槽 id 冲突 | `list slot "${name}" already has an entry with id "${id}" …` |
| `keyed` 槽缺 `key` | `keyed slot "${name}" requires options.key` |
| `keyed` 槽 key 冲突 | `keyed slot "${name}" already has an entry for key "${key}" …` |
| `chain` 槽缺 `select` | `chain slot "${name}" requires options.select` |
| `single` 槽重复占用 | `single slot "${name}" already has a registration …` |
| 一个 store handle 挂到两个作用域 | `store handle mounted under "${name}" (scope "${scope}") is already mounted under scope "${pinned.scope}" — one handle, one scope` |
| 重复定义 factory | `slot factory "${name}" already has a definition` |

其他要点：

- 选择字段由 **kind** 决定：`list` → `id`（必填）+ 可选 `order`/`label`；`keyed` → `key`；`chain` → `select`；`single` 是供填充的洞。
- `chain` 的 `select` 按 **`priority` 升序**运行（相同则按注册顺序），第一个返回非 `null` 的 entry 当选，并成为组件的 `matched` prop；全为 `null` 时落到 owner 的 `renderSlotChain` 兜底。
- 声明、渲染授权、运行时 spec 是同一张表；entry 的 disposer 会**递归**折叠它声明的子 Slot。
- `root` 是唯一由 `SlotCore` 预置的 Slot。

## 6. Client 模块图的错误 [契约]

分两个阶段，报错来源不同。

### 6.1 组合期（Node 侧，浏览器还没加载）

| 触发 | 报错 |
| --- | --- |
| `external` 造成环 | `client-modules: module graph cycle a -> b -> a — a requested package row must precede its consumers, and factory-form CJS cannot deliver partial exports` |
| 某行声明了自己的包 | `client-modules: "<id>" requests module "<name>" that it answers itself — a row must not declare its own package in dsh.client.external` |
| 声明了 `dsh.client` 但没有 `./client` 产物 | `client-modules: <package> declares dsh.client but exports no "./client" bundle` |
| 同一个包被两个活跃 Loader 源解析到 | `client-modules: package <package> resolves from multiple active Loader sources: …; remove one entry` |
| 单个 entry 撑爆 combo URL 上限（约 3 KiB） | `client-modules: <id> exceeds the 3072-byte combo URL limit` |
| 声明的 external 没有 provider | `client-modules: <pkg> <field> must be a string array` / 缺失 provider 在组合或激活阶段报告 |

### 6.2 到达/物化期（浏览器内）

| 触发 | 报错 |
| --- | --- |
| 脚本执行了但没注册 factory | `<url>: loaded without registering "<id>" via __ModuleLoader__.load` |
| 脚本之前已执行过、无法重放 | `<preferred>: already executed without registering "<id>"` |
| 一次性加载多个 entry 时全部失败 | `client-modules: could not load "<id>": …` |
| `require` 命中不了任何来源 | `client-modules: require("<spec>") missed the module table — not a platform seed word, not a materialized module, and no registered package factory (a build-time externals drift, or a dynamic dependency that did not arrive)` |
| 工厂形式的 CJS 出现 require 环 | `client-modules: require cycle through "<id>" (factory-form CJS cannot deliver partial exports)` |
| 重复注册同一个 id | `client-modules: duplicate factory registration for …` |
| 模块到达顺序成环 | `client-modules: module arrival cycle …` |

**[实践]** `dsh.client.inject` / `external` 的到达顺序问题几乎总是先在 Node 侧组合报错，而不是在浏览器里；先看启动终端/崩溃日志的 host 段。

## 7. 上线前自检清单 [实践]

- [ ] `apply()` 内没有任何未 `inject` 的服务属性访问（§3.1）。
- [ ] 所有异步链路（`$mount()`、`ctx.inject` 回调、Slot 回调里的 promise）都收敛了失败。注意 `$mount` 是通过 `ctx.effect` 登记的，contribution 被真 Client Gateway 拒绝时失败落在这个 effect 上。
- [ ] 可选能力缺失时是降级 + 原因文案，不是抛错，也不是静默。
- [ ] 有一条 boot 契约测试断言 `fiber.state === 'active'`，并覆盖「可选服务不存在」的场景。
- [ ] Remote contribution 在**真 Client Gateway** 上 `$mount` 过一次（自造 mock 通过 ≠ 真校验通过）。
- [ ] 改完 client 只需**刷新页面**验证；只有 host 改动才需要重启 dsh。
- [ ] Slot 注册的 key 是当前组合里真实存在且由你的父级声明的；不要抢 `single` 洞或他人的子 Slot。
