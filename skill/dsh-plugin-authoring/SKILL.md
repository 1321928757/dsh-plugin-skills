---
name: dsh-plugin-authoring
description: End-to-end playbook for building and shipping a DeepSeek Harness plugin — profile-bundle package structure, host services, Typert RPC or HTTP API data channels, web client slots and theming, the local verification loop, versioning, GitHub, and awesome-dsh-plugin listing. Use when the user wants to 开发/编写/创建一个 DSH 插件 (plugin), 从 0 到 1 做一个插件, 上架/提交/发布 到 awesome-dsh-plugin 插件市场, 迁移动态插件为可发布 bundle, or 参考 dsh-better-sidebar / dsh-cost-meter / dsh-prompt-polish.
---

# DSH 插件 0→1 开发与上架

本文档从 dsh-prompt-polish 实战 + 三个开源插件仓库（DSH-better-sidebar / dsh-cost-meter / dsh-usage-plugin）取证 + 官方包源码（dsh-app-boot / dsh-typert-* / dsh-client-modules / dsh-client-ui-slots）校对而成。模板见 `templates/`，上架 runbook 见 `references/publish-runbook.md`。

## 1. 先选形态：动态插件 vs profile bundle

| 场景 | 形态 |
| --- | --- |
| 只在当前会话临时扩展、用完即弃 | **动态 Cordis 插件**（`cordis_define`/`cordis_run`，见 cordis-plugin-development skill） |
| 要发布、装进 profile、每会话常驻（输入栏按钮/设置行）、要上架 awesome | **profile bundle**（本 skill 主线） |

官方事实（`@deepseek-ai/dsh` README / `dsh-app-boot`）：

- profile 是 `$DSH_HOME/profiles/<name>/` 目录，含 `package.json`（插件 dependencies + `dsh.profile` 及其有序 `bundles` 列表）+ 用户自己的 `cordis.patch.yml`；
- bundle 是 manifest 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 的 npm 包；`dsh.profile.bundles` 的每个名字按「双锚点」解析（先 dsh 安装目录，再 profile 目录），**列出的包若没有 bundle 声明会明确报错**；
- `dsh plugin --profile <name> <pnpm args>` 就是把命令**转发给 profile 目录里的 pnpm**（`spawnSync("pnpm", args, {cwd: profileDir})`），所以 add 的源写法就是 pnpm 的：npm 包名 / `github:owner/repo#tag` / `git+https://...#tag` / `file:./x.tgz` / `link:../pkg` 都合法；`web`/`headless` 模板自动初始化，其他 profile 名要先经 `dsh plugin` 创建；
- CLI 顺序与调试层：`--profile` 是 `plugin` 子命令**自己的 requiredOption**（顺序固定 `dsh plugin --profile <name> add ...`）；可重复的 `dsh --patch <path>` 在 profile 层之后叠 patch overlay；`dsh --dump-config` 查看合成结果（`# ==` 注释标层归属）。

## 2. 仓库骨架

`package.json` 逐字段（完整版见 `templates/package.json`）：

- `dsh.bundle.patch` → `./cordis.patch.yml`（**必备**；只有 `dsh.client` 不可安装，上架 CI 直接拒）；
- `dsh.client.platform` **必填**，官方 gate 只认 `=== "web"`；可选 `dsh.client.inject`（字符串数组：浏览器半需要的官方包，如 `dsh-client-runtime`/`dsh-client-ui-slots`/`dsh-client-ui-conversation`——better-sidebar 与 usage-plugin 均如此）与 `dsh.client.immediately`（布尔：立即加载）；必须导出 `exports["./client"]` 指向构建产物（Node 半 hash 进 boot graph，经 `/plugins/<id>/client.js?rev=` 下发）；
- `exports`：`"."`→Host 入口、`"./client"`→浏览器半、`"./typert"`→Typert 清单、`"./package.json"`；
- `files` 白名单（决定 npm 包与 git 安装内容）；
- **依赖归属判据（三仓库实证 + cost-meter 源码注释）**：共享运行时（`@deepseek-ai/cordis`、`react`、`dsh-client-*`）必须 `peerDependencies`（+ `peerDependenciesMeta.optional:true`），避免 profile 重复运行时；**无状态的纯函数工具包**（如 `dsh-credentials`、`dsh-home-paths`）可以放 `dependencies`。官方无明文强制，两派并存，以上是实践收敛出的规则；
- `keywords` 必含 `dsh-plugin`；`type: module`。

**patch 文件语义（权威：`dsh-app-boot/lib/index.js` `applyEntryPatches`）**：

```yaml
# 顶层必须是数组；insert 的值是可多个条目的数组
- insert: [{id: dsh-my-plugin, name: dsh-my-plugin}]
```

- `insert` 不带 `id` → 追加到顶层；带 `id` 且目标是 group → 追加进该 group 的 `config`；
- 非 insert 补丁：`id` 必填，可选 `name` 必须与目标行一致（不一致警告并跳过），其余字段（如 `disabled: true`）**覆盖**目标条目——没有 `merge` 操作；
- 补丁按顺序生效，后面的补丁可以命中前面插入的行；没匹配到行的补丁警告跳过（`--dump-config` 能看到 `# ==` 层注释）。

**构建链取舍**：better-sidebar 是 TS + `tsdown` build + `prepublishOnly`（可量产）；dsh-prompt-polish / cost-meter / usage-plugin 是纯手写 JS、零 build。二选一即可；**若引入构建链，产物仍是单文件、`exports["./client"]` 指向该文件**（见 §5 加载契约）。零构建 = 免 allowBuilds、迭代最快。

**验收**：`npm pack --dry-run` 列出的文件正好是 `files` 白名单；`dsh --profile <p> --dump-config` 能看到自己那行（带 `# ==` 层注释）。

## 3. Host 半（lib/index.js）

签名两种都合法：**命名导出** `export const name / export function apply(ctx)`（cost-meter、prompt-polish 风格）或 **默认导出对象** `export default { inject: [...], apply(ctx) {} }`（usage-plugin 风格）；`apply(ctx, config?)` 可接收 loader 传入的配置。

- 硬依赖进 `inject`；其余一律 `ctx.get('fs'/'llm'/'webServer'/'settings'/'credentials'/'sandboxPolicy'/'sessionProjections'...)` + `undefined` 兜底（usage-plugin 的教训：路由依赖 webServer 时**必须**把 webServer 写进 inject，否则服务未就绪就 apply → 注册失败）；
- 每个副作用可回收：`ctx.effect(() => disposer, 'label')`（better-sidebar 每条 webServer 路由单独一条 effect，HMR-safe）；
- **三级设置持久化**：L1 浏览器 localStorage（即时）→ L2 设置页行（联动）→ L3 文件。L3 路径两派：全局偏好用 `$DSH_HOME/storages/<插件>/`（`dsh-home-paths`，cost-meter）；会话数据用 `<workspace>/.dsh/<插件>/`（`sandboxPolicy.resolve({session}).workspaceRoot`，usage-plugin）。写入被沙箱拒绝时静默降级：Host 返回 `{ok:false, reason:'sandbox'}`，Client 打 `_hostBlocked` 标记防旧文件回灌；
- **llm/stream 捕获（计费/用量类插件标准姿势，两仓库逐字一致）**：
  ```js
  ctx.on('llm/stream', (options, next) => {
    const downstream = next()
    return (async function* () {
      for await (const chunk of downstream) {
        if (chunk.type === 'usage') { /* 记 usage */ }
        yield chunk
      } finally { /* 落账 */ }
    })()
  })
  ```
- **会话投影**：`ctx.inject(['sessionProjections'], pctx => pctx.sessionProjections.register(定义))`（cost-meter 注册 `costUsage` 投影，init/apply/view 纯函数）；
- **设置命名空间 + 并发写保护**：`ctx.inject(['settings'], sctx => sctx.settings.register(ns, schema))` → `scope.watch` 同步门控，revision-guarded 写（冲突 → 409）；
- **HTTP/WS 路由**（不走 Typert 时的通道）：`ctx.webServer.register({kind:'prefix'|'exact', path, handler})`、`ctx.webServer.registerUpgrade(path, ...)` 挂 WebSocket；
- **boot 诊断**：apply 各步写 `dsh-<插件>-boot.log` 缓冲，激活失败一眼可见（usage-plugin 模式）。

**验收**：`node --check` 通过；装进 profile 后 boot 日志无异常、服务可用；设置被拒时 UI 不报错且本地值不丢。

## 4. 数据通道二选一：Typert RPC 或 HTTP JSON API

### 4.1 Typert RPC（推荐：类型化、自动注册；dsh-prompt-polish / cost-meter 路线）

**Host 侧**（`lib/typert.host.js`，默认导出 `TYPERT`；`dsh-typert-loader` 解析 `exports["./typert"]` 后 `import()` 读取命名导出并**逐字段强校验**——`package` 必须等于包名、`face` 必须严格为 `"host"`、codec schema 必须是 zod v4 实例（含 `_zod` + `parse`；裸 `{parse}` 对象会被拒），zod 因此进 `dependencies`）：

```js
import { z } from 'zod'
const args$codec = { mode: 'strict', typeSymbol: 'pkg#Args', schema: z.record(z.string(), z.unknown()) }
const result$codec = { mode: 'strict', typeSymbol: 'pkg#Result', schema: z.record(z.string(), z.unknown()) }

export const TYPERT = {
  package: 'dsh-my-plugin',   // 必须 == 包名
  face: 'host',               // 必须严格 "host"
  schemas: [],
  invocations: [{
    id: 'myService/doThing', service: 'myService', namespace: 'myService', method: 'doThing',
    invocation: { kind: 'direct' },                    // 或 {kind:'context', context, wire, codec}
    parameters: [{ name: 'args', wire: 'args', source: 'json', codec: args$codec }],  // source: 'json'|'lookup'
    result: result$codec,
    // 可选：cancellation:{parameter:'signal'}、scope:{context,wire}、sourceLocation
  }],
  // 可选 model 块（services/events/objects，成员 kind∈property/method/getter/setter/call/construct/index）供 LLM 消费
}
```

Host 的 apply 里给服务对象挂非枚举 `typertRemote`（官方 `TypertGatewayBinding` 形状，三字段齐全）：

```js
Object.defineProperty(service, 'typertRemote', { value: { service, serviceKey: 'myService', namespace: 'myService' } })
ctx.provide('myService', service)
```

**Client 侧**：`inject:['remote']` → `await ctx.remote.$mount(CONTRIBUTION)`（descriptors 与清单一一对应，ctx.effect 回收 unmount）→ `ctx.get('remote.myService')`。

**红线（"调用失败"的根因）**：网关返回 `{ok:true, value:<业务结果>}`；失败 `{ok:false, error:{code, message, details}}`。必须解包：

```js
const host = { call: async (method, payload) => {
  const result = await api[method](payload)
  if (result.ok !== true) throw new Error(result.error?.message || '调用失败')
  return result.value   // ← 直接透传 result 会让业务代码读到 undefined
} }
```

手工探测 wire 格式：`POST /api/<ns>/<method>`，body `{"type":"client-request","method":"ns/method","rpcId":"x","payload":{"args":{"args":{...}}}}`（wire 字段名 `args` 比业务多嵌套一层）。

### 4.2 HTTP JSON API（usage-plugin 路线：无 codec、适合大 JSON）

Host：`ctx.webServer.register({kind:'exact', path:'/usage/api', handler})`，`res.writeHead(200, {'Content-Type':'application/json'})` 回 `{ok, error}` 形状；Client：`fetch('/usage/api', {method:'POST', ...}).then(r => r.json())` **直读字段**——注意这条路**没有 `{ok,value}` 包装**，别把 Typert 解包逻辑套过来。

选型：要类型校验/自动注册/多方法面 → Typert；单一大 JSON、想少一层协议 → HTTP。WebSocket 流式用 `registerUpgrade`。

## 5. Client 半（lib/client.js）

**加载契约（官方 `dsh-client-modules`）**：Node 半扫描声明了 `dsh.client` 的包，把 `exports["./client"]` hash 进 boot graph，经 `/plugins` 下发；浏览器执行 bundle 脚本**只注册 factory**，副作用（CSS 注入等）都在 factory 闭包里、物化（首次 require）时才跑：

```js
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',
  factory: (require) => {
    const React = require('react')   // CJS 表：require 可物化其他已注册模块；require 环会抛错
    // <style> 注入放在 factory 里；data-plugin-css 判重；样式回收由 dsh-client-hmr 管理
    return { inject: ['remote'], apply(ctx) { /* ... */ } }
  },
})
```

- 产物纯 JS（`React.createElement`）；TS 源码需先 build 成单文件 CJS factory；
- **slot 契约（官方 `dsh-client-ui-slots`）**：`ctx.slots.inject(slotName, () => ctx.slots.register({ name, id, order, label?, children?, store?, inject?, locale?, registrant?, ...kind }, Component))`。要点：**未声明的 slot 名注册即抛错**（先 `cordis_inspect_query` Slots.listSubTree 查可用名）；kind 规则——`list`：必填 `id`、可选 `order` 与 `label`（string 或跟随 locale 的 thunk）；`keyed`：必填 `key`；`chain`：必填 `select` 选择器（+`priority` 自提名）；`single`：仅 `priority`（同优先级二次注册抛错）；`inject: () => ({store, service})` 注入运行时依赖；`children` 声明子 slot；注册 disposer 递归拆除其子 slot/store；
- **slot 名速查（官方 0.1.0-rc.6 各 client-ui 包 SlotMap 声明 + 三仓库实证；运行时权威以 `cordis_inspect_query` Slots.listSubTree 为准）**：

| slot | kind | 用途 / 实证 |
| --- | --- | --- |
| `conversation.input.left` / `.right` / `.overlay` / `.dock` / `.plan` / `.model`、`conversation.composer.bar` / `.dock` | list | 输入栏周边（✨ 按钮 prompt-polish；用量条 cost-meter） |
| `conversation.session.header.actions` / `.utilities` | list | 会话头部操作区（cost-meter） |
| `conversation.view` | list | 会话级大视图（usage-plugin 用量面板） |
| `conversation.chat.node` / `.commandview` | keyed | 消息节点 / 命令视图渲染 |
| `conversation.chat.turnTail` | chain | 每轮消息尾部（select+priority 自提名，better-sidebar） |
| `conversation.chat.assistant-actions` | list | 助手消息操作区 |
| `conversation.hero.workspace` / `.agentPreset` | — | 会话 hero 区 |
| `settings.section` | list | 设置页独立分节（三仓库都用；id/order/label） |
| `settings.general.item` | list | 设置→通用开关行（**投影仅 {id,order}，无 label**） |
| `settings.action` / `.header` / `.close` / `.onboarding`、`settings.plugins.tab`、`settings.plugin.item` | list | 设置页其余区域 |
| `sidebar.footer.action` | list | 侧边栏底部操作（cost-meter） |
| `sidebar.workspaces` / `sidebar.settings` | single | 侧边栏根区 |

- **`--dsw-*` 令牌黄金清单（cost-meter 与 better-sidebar 一致消费）**：表面 `bg-base / bg-layer-1/2/3`、边框 `border-l1`、文字 `label-primary/secondary/tertiary`、品牌 `brand-primary`、交互 `interactive-bg-hover`、状态 `state-success/warn/error/business-primary`、控件 `button-elevated-fill`、浮层 `specific-menu`、阴影 `shadow-lv3`、输入 `bg-input`。**反例**：usage-plugin 硬编码 rgba 不跟随主题——绝不要学；
- 品牌强调色：`color-mix(in srgb, var(--dsw-alias-brand-primary) 62%, #0D9488 38%)` + `@supports not (...)` 回退纯令牌（暗色主题安全）；
- **跨插件服务**：`ctx.provide('betterSidebar', service)` + `registerTab/registerFileViewer` 扩展点（返回 disposer），做"插件的插件"；消费者 `inject:['betterSidebar']`；
- **i18n**：`ctx.locale.register(NS, 'zh', dict)` + effect 回收（better-sidebar）；
- 可访问性三件套：`:focus-visible`、`prefers-reduced-motion`、`prefers-contrast`；浮层宽度 `min(320px, calc(100vw - 32px))`。

**验收**：亮/暗两主题各过一遍（悬停/焦点/禁用/窄屏）；功能行为与旧版逐项一致（回归红线）。

## 6. 本地开发循环（先验收，后推送）

```powershell
node --check lib\index.js lib\client.js lib\typert.host.js lib\shared.js
node test\shared.test.mjs        # 沙箱里直接跑文件！node --test 子进程管道会 EPERM
pnpm pack                        # 产出 dsh-my-plugin-x.y.z.tgz（.gitignore 忽略）
Copy-Item .\dsh-my-plugin-0.1.0.tgz C:\Users\<你>\.dsh-tmp\
dsh plugin --profile web add C:\Users\<你>\.dsh-tmp\dsh-my-plugin-0.1.0.tgz
# 重启 dsh web → 浏览器验收
```

关键坑：

- **Windows 跨盘 `link:` 断裂**：profile 在 C:、源码在 E: 时，`dsh plugin add <目录>` 会生成 `C:\...\E:\...` 的断裂 junction——**一律 pnpm pack 后用 tgz 路径安装**（pnpm 把 tgz 快照进 store）；
- **native 依赖（node-pty 等）**：pnpm 默认阻断未白名单构建，且 **profile 模板的 `pnpm-workspace.yaml` 默认不含 `allowBuilds`**——把 pnpm 报错里打印的确切 key 加进去（better-sidebar install.ps1 预写模式）；npm 预构建包则可跳过 allowBuilds 授权；
- **改动后必须重启 `dsh web` 才生效**；重启前确认旧进程真的退了（旧进程占端口时新代码根本不进 boot graph，按钮会"神秘消失"）；better-sidebar 用 `pm2 restart dsh-web` 管理重启；
- **黄金流程**：本地 tgz 预验收（装 → 重启 → 亮/暗主题 + 功能全过）→ 通过后才 `git push` / 打 tag。有问题就本地修 → 重 pack → 重装，**远端零返工**；
- 装机脚本两式：`dsh plugin --profile web add <pkg>@<version>`（npm 源，better-sidebar 式）或 `github:owner/repo#tag` + 固定 pnpm 版本（cost-meter/prompt-polish 式，`templates/install.ps1`）。

## 7. 版本发布

bump 版本时**三处同步，一处不漏**：① `package.json` `version`；② `scripts/install.ps1` 的 `$Rev`（含注释/示例里的 `#vX.Y.Z`）；③ 两份 README 的安装行（`github:owner/repo#vX.Y.Z` 与 raw URL）。

然后：pack → 本地预验收 → `git push` → `git tag vX.Y.Z` → `git push origin vX.Y.Z` →（可选）`dsh plugin --profile web add github:owner/repo#vX.Y.Z` 把安装源从 tgz 切回 github。UI 有变时同步刷新 README 截图与 `assets/*.png`（文件名不变则市场引用自动更新）。

## 8. awesome-dsh-plugin 上架

硬门槛（CI 自动查）：`dsh.bundle` 已声明 ✅｜**仓库创建 ≥1 天**｜**≥10 提交**｜**`dsh-plugin` topic**｜描述单行、无营销词、双语以句号结尾。

流程（详见 `references/publish-runbook.md`）：

1. **GitHub 建库**：Public 空库，不勾 README/license（本地已有）；**先推送，仓库主页才出现 About 的 ⚙（topics 入口）**；建库时刻 = 1 天计时起点；
2. **≥10 提交**：首次推送前把已有代码按逻辑拆成 ≥10 个提交（脚手架/核心/Host/Client/测试/文档…）是正常的历史整理；
3. **条目文件** `data/plugins/<owner>__<repo>.yml`：`url`/`name`/`category`（14 值，ui/usage/theme/model/session/memory/tools/vision/skill/workflow/notify/dev/market/fun）/`description.en|zh`；**en 行含 `: ` 冒号必须加引号**；文件名 = slug（url 去 `https://github.com/` 前缀、`/` 换 `__`）；
4. **fork + 生成**：fork 列表仓库 → 同步 upstream main（防 stale-fork 守卫误报）→ 放 yml → `npm ci` → `node scripts/generate-readme.mjs` → `--check` → `npx awesome-lint` → 提交「1 yml + 2 个生成的 README」→ push → PR 到 upstream main。**README 禁手改、`data/added-dates.json` 禁改、单 PR 一个 yml**；
5. **截图（推荐）**：`data/screenshots.json` 以条目 URL 为 key、1–8 张 **GitHub 托管 https** 图片（`raw.githubusercontent.com`，第三方图床被拒）；图片放自己仓库 `assets/`；
6. **两段 CI**：PR check（README 一致性/awesome-lint/构建）→ Submission gate（workflow_run 带 token，只把新增 yml 当数据读：查 dsh.bundle/1 天/10 提交）。失败看错因，**同一分支修好再 push，勿重开 PR**；
7. **npm（可选）**：`npm view` 验名 → `npm login` → `npm publish --access public`。**E403 "Two-factor authentication ... required" → 账号开 TOTP 后 `npm publish --otp=<码>`**。无 build 脚本的包 npm 收益很小（git 装同样免 allowBuilds），跳过不影响上架。

**⚠️ 数据驱动仓库的 PR 重建策略（实战教训）**：
- 列表仓库的 `data/screenshots.json` 会被上游不定期整体重排，rebase 几乎必冲突（冲突区可能横跨数百行）——不要把解冲突当主路径；
- 确定性恢复：`git rebase --abort` → `git switch -C <分支> origin/main`（从最新上游整体重建）→ 重新落盘条目 yml → 在**新尾部**重新追加 screenshots.json 条目 → 在最终基座上重跑 `node scripts/generate-readme.mjs`（否则 README 缺上游最新条目，`--check` 必挂）→ 提交 → push；
- 受限环境跑 `rebase --continue` 时 `GIT_EDITOR=true` 可能因 msys 崩溃——改用 `$env:GIT_EDITOR='cmd /c exit 0'`，或直接采用「重建分支」方案绕开；
- 重建后 PR 历史只含自己的提交，比在冲突现场纠缠更干净。

## 9. 高频坑速查表

| 症状 | 根因 → 修法 |
| --- | --- |
| 点按钮"优化失败/调用失败" | Typert 网关 `{ok,value}` 未解包 → `host.call` 返回 `result.value`（HTTP API 路线无此包装，别混用） |
| 装完按钮不出现 | 没重启 `dsh web`，或旧进程仍占端口 → 杀干净再启 |
| `dsh plugin add <目录>` 后 dump-config 警告无 dsh.bundle、路径 `C:\...\E:\...` | Windows 跨盘 `link:` 断裂 junction → pnpm pack 后装 tgz |
| slot 注册即抛错 | 用了未声明的 slot 名 → `cordis_inspect_query` Slots.listSubTree 查可用名 |
| Host 路由/服务注册失败 | 依赖服务没写进 inject，apply 早于服务就绪 → webServer/settings 等进 inject |
| typert 清单校验失败（package/face/codec 报错） | `package` 必须等于包名、`face` 必须 `"host"`、schema 必须 zod v4 实例 → 照 `templates/typert.host.js` |
| 上架 Submission gate 报 dsh.bundle | 只声明了 `dsh.client` 或 cordis.patch.yml 未提交 |
| 报仓库太新/提交不足 | 等满 1 天；继续真实提交 |
| PR check 报 README 不匹配 | 手改了 README → 重跑 generate-readme.mjs |
| stale-fork 报大量删除 | fork 落后 upstream main → Sync fork 再推 |
| screenshots 构建被拒 | 用了第三方图床 → 换 raw.githubusercontent |
| npm publish E403 | 无 2FA → 开 TOTP 后 `--otp` 发布 |
| `node --test` EPERM（沙箱内） | 管道捕获子进程受限 → 直接 `node test/xxx.test.mjs` |
| 暗色主题下 UI 发白/刺眼 | 硬编码色值 → 全部换 `--dsw-*` 令牌（usage-plugin 是反例） |

## 10. 红线

- 不编辑/删除 shipped preset 与部署自带配置；
- 不 `JSON.stringify`/递归枚举 Cordis 活对象，只取叶子字段；
- 每个副作用（样式、监听、timer、路由、slot）都可回收；
- 行为与提示词字节级回归约定：升级 UI/版本时，功能位置（按钮、开关、弹窗行为）与用户可见的输出契约不变；
- 客户端只走 JSON（RPC/HTTP 两路都不传函数/undefined/类实例）；factory 内不要制造 require 环。

## 附录 A：slot 名速查

见 §5 官方目录表（来源：0.1.0-rc.6 各 client-ui 包的 SlotMap declare-merge 声明 + 三仓库实证）。**权威清单永远以运行时 `cordis_inspect_query` Slots.listSubTree 为准**（slot 由各包动态声明、会随版本变化）。

## 附录 B：`--dsw-*` 令牌清单

表面：`--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1/2/3`；边框：`--dsw-alias-border-l1`；文字：`--dsw-alias-label-primary/secondary/tertiary`；品牌：`--dsw-alias-brand-primary`；交互：`--dsw-alias-interactive-bg-hover`；状态：`--dsw-alias-state-success-primary/warn-primary/error-primary/business-primary`；控件：`--dsw-alias-button-elevated-fill`；浮层：`--dsw-specific-menu`、`--dsw-shadow-lv3`；输入：`--dsw-alias-bg-input`、`--dsw-alias-label-primary-inverted`。布局类官方变量（`--dsh-chat-content-width` 等）也可消费；自定义布局变量可写到 `<html>` 元素上（better-sidebar 先例）。

## 附录 C：Host 常用服务速查（全部惰性 `ctx.get` + undefined 兜底，hard 依赖才进 inject）

| 服务 | 用途 |
| --- | --- |
| `fs` / `sandboxPolicy` | 文件读写、`resolve({session}).workspaceRoot` 定位会话根 |
| `webServer` | `register({kind:'prefix'|'exact'})`、`registerUpgrade`（WS） |
| `llm` | 模型调用（dsh-prompt-polish 优化调用即走它） |
| `settings` | `register(ns, schema)` 设置命名空间 + scope.watch |
| `sessionProjections` | `register(定义)` 会话投影（costUsage 等） |
| `credentials` / `home-paths` | 凭据、`$DSH_HOME` 路径（纯函数，可放 dependencies） |
| `timer` | 定时任务（进 inject） |
| `sessions` / `workspaces` | 会话与工作区快照（getSnapshot/subscribe） |
| `locale` | Client 侧 i18n 词典注册 |

## 附：模板清单

| 文件 | 用途 |
| --- | --- |
| `templates/package.json` | bundle 骨架（占位 `<owner>`/`<name>`） |
| `templates/cordis.patch.yml` | 单行 insert（可扩展多条/字段覆盖） |
| `templates/typert.host.js` | TYPERT 清单 + codec 骨架 |
| `templates/client.js` | __ModuleLoader__ factory + slot 注册 + style 注入 + 解包骨架 |
| `templates/install.ps1` | `<owner>`/`$Rev` 占位的一键安装器 |
| `references/publish-runbook.md` | 上架逐步 runbook（泛化版） |
