# 发布与安装 Runbook

本文件把 DSH 核心事实与外部 marketplace 流程分开。目标运行时为 DSH `0.2.0-rc.2`；安装前请以当前官方文档和包 manifest 复核。

## A. DSH 官方安装/打包事实

### A1. 发布前 package 验收

- 需要 profile layer 时，`package.json` 才声明 `dsh.bundle.patch`；它可以是一个**文件路径字符串，也可以是有序字符串数组**（按该顺序作为同一层应用，每个文件内的相对路径相对该文件解析）。patch 文件必须被发布到 tarball，并且引用包内真实路径。
- 需要 Web Client 时，声明有效的 `dsh.client`（`platform` 必填），导出 `./client`，并把实际产物包含在 `files` 中。
- 需要 Typert 时，按生成器输出发布 `./typert`，以及 Client assembly 需要的 `./remote`；没有 Typert 能力的包不添加这些入口。
- 每个 `exports` 目标、运行时入口和声明的 patch 都必须在包中真实存在。用 `npm pack --dry-run` 或 `pnpm pack` 检查，而不是只看工作树。
- 对 Git/source 安装，包自己必须提供可用的 `prepare`/build 路径；预构建 npm 包或 `.tgz` 通常更可复现。
- 与宿主共享实例的 DSH 包按官方约定同时写进 `peerDependencies` 和 `devDependencies`。

### A2. 兼容性 gate（0.2.0-rc.2 起强制）

- 运行时会检查 `peerDependencies` 中名字为 `@deepseek-ai/dsh` 或 `@deepseek-ai/dsh-*` 的项，用 semver 与运行中的 DSH 版本比对，且 `includePrerelease: true`。`@deepseek-ai/cordis`、`react` 等**不参与**版本 gate。
- `workspace:^`、`workspace:~`、`workspace:*` 视为当前 runtime，总是满足；空字符串区间视为不兼容。
- 不满足时安装/加载被拒绝，诊断会给出「更新插件 / 换用兼容版本 / 授予精确版本豁免」三条路径。
- 豁免保存在 profile 的 `compatibility.json`，键是 `包名@版本`，值是精确的 DSH 运行时版本数组；通过插件管理器或 CLI 授予，授予时必须显式确认崩溃/数据丢失风险。
- `engines.dsh` 在 0.2.0-rc.2 是**声明性**字段，不会被强制检查；不要指望它拦截不兼容安装（后续版本改为优先使用它）。

### A3. 本地 profile 验收

以下版本号只是插件包名示例；插件版本与 DSH runtime 版本独立，替换 `<plugin-version>`。

```powershell
npm pack --dry-run
# 或
pnpm pack

dsh plugin --profile test add .\dsh-my-plugin-<plugin-version>.tgz
dsh --profile test --dump-config
dsh --profile test --dump-config-schema   # 需要核对 entry/patch schema 时
```

随后重启正在运行的 `dsh web`，刷新页面，验证 Host、Client、Tool、Remote、设置和错误路径。`dsh plugin --profile <name> <pnpm args...>` 是在 profile 目录转发给 pnpm；npm、Git、file/link 和 tgz 的具体 spec 语法属于 pnpm 行为。

### A4. Profile 层次和常见误判

生效层次是：

```text
profile bundles（按 dsh.profile.bundles 顺序）
→ profile cordis.patch.yml
→ $DSH_HOME/cordis.patch.yml
→ launcher --patch overlays（argv 顺序）
```

列入 `dsh.profile.bundles` 的包没有 `dsh.bundle` 会失败；普通依赖没有 bundle 声明则仍可安装，但不会贡献配置层。`dsh.client` 也不等于 bundle。README 里的名字只是提示：patch 行按**包名**引用插件，而不是相对源码路径，这样 Node 模块解析才能找到已安装的代码。

Windows 跨盘 link 和 pnpm native build 授权不是 DSH manifest 契约；只有遇到对应环境问题时再按 pnpm/Windows 版本处理。

## B. npm/Git/Tarball 交付

### B1. npm

1. 确认 `name`、`version`、`exports`、`files` 和 `publishConfig`。
2. `npm pack --dry-run`，安装 tarball 做一次 clean-profile 验收。
3. 登录目标 registry，按 npm 账户策略处理 2FA/OTP。
4. 发布后用 `npm view <package>@<version>` 核对实际 metadata，再用用户命令安装。

npm 的 registry、2FA、OTP 和 access policy 不是 DSH runtime 契约。

### B2. Git tag

固定 tag 或 commit，先确认仓库的 `prepare`/构建脚本和 pnpm 安装授权策略。

`dsh plugin --profile <name> add github:<owner>/<repo>` 拉取的是**源码，不是构建产物**——不会执行 `build`。TypeScript 包必须提供自洽的 `prepare`（不依赖 monorepo 内部路径），否则用户拿到的是没有 `lib/` 的包。pnpm ≥10 还会先拒绝运行 Git 依赖的 `prepare`，用户需要按提示把包名加进该 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-hello-plugin: true
```

处理这一点时要明确告知：这是在授权**安装期执行任意代码**，且不在任何沙箱内。建议同时用 commit SHA 固定版本（`github:owner/repo#<sha>`）。

不需要构建授权的方式：发布到 npm（构建在 `pnpm publish` 时完成），或交付预构建 `.tgz`。

### B3. Tarball

`<plugin-version>` 是插件自己的发布版本，不是 DSH runtime 版本。

```powershell
pnpm pack
dsh plugin --profile test add C:\path\to\dsh-my-plugin-<plugin-version>.tgz
```

Tarball 适合在 Windows 跨盘、无构建工具或需要验证最终 `files` 集合时使用。它仍需在干净 profile 中重启并做真实冒烟。

## C. awesome-dsh-plugin（外部仓库流程）

以下规则属于 `awesome-dsh-plugin` 当前仓库的 listing policy，不属于 DSH 0.2.0-rc.2。提交前必须查看该仓库最新 README/workflow/commit；不要把本节门槛写进插件运行时设计。

可能存在的检查包括：

- `dsh.bundle` 与 patch 是否存在；
- repository age、commit count、`dsh-plugin` topic；
- entry YAML、描述格式、slug、生成 README 一致性；
- screenshots 的托管 URL、数量和构建；
- stale fork、PR check、submission gate。

常见数据驱动 listing 流程（按上游当前规则调整）：

```powershell
git fetch upstream
git switch -c add/dsh-my-plugin upstream/main
# 添加 data/plugins/<owner>__<repo>.yml
npm ci
node scripts/generate-readme.mjs
node scripts/generate-readme.mjs --check
npx awesome-lint
git add data/plugins README.md README.zh.md
git commit -m "Add <owner>/<repo>"
git push origin add/dsh-my-plugin
```

README 生成文件不要手改，`data/added-dates.json` 等上游维护文件不要擅自改。截图、npm 登录、GitHub topics、PR 重建和 rebase 是运营流程；listing 仓库的当前 CI 才是其权威。

## D. Windows/当前 Harness 排障（非 API 契约）

- 跨盘 `link:` 可能产生不可用链接；用已构建 `.tgz` 验证最终包。
- pnpm 版本可能对 native build authorization 有额外要求；只授权信任的依赖，或使用预构建包。
- 当前受限执行环境可能限制 `node --test` 的子进程管道；必要时直接运行测试文件并记录限制。
- 修改 Client 后，必须确认 watcher/build 已更新 bundle；否则重建、重启 dsh web、刷新页面。新起的其它服务器不会替换既有 DSH GUI。
- 「装上了但插件没生效」的排查顺序：先看 peer 区间是否覆盖运行中的 DSH 版本（必要时查 profile 的 `compatibility.json`），再看 `--dump-config` 里是否有该 layer，最后才怀疑代码。
- 桌面安装把 `@deepseek-ai/*` 运行时打进 `resources/app.asar`，profile 的 `node_modules` 里只有少量包。要核对真实运行时契约时，读 asar 内容，而不是只看 profile 的 `node_modules`。
