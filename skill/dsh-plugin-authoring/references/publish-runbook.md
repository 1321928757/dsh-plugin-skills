# 发布与安装 Runbook

本文件把 DSH 核心事实与外部 marketplace 流程分开。目标运行时为 DSH `0.1.1-rc.2`；安装前请以当前官方文档和包 manifest 复核。

## A. DSH 官方安装/打包事实

### A1. 发布前 package 验收

- 需要 profile layer 时，`package.json` 才声明 `dsh.bundle.patch`；patch 文件必须被发布到 tarball，并且引用包内真实路径。
- 需要 Web Client 时，声明有效的 `dsh.client`，导出 `./client`，并把实际产物包含在 `files` 中。
- 需要 Typert 时，按生成器输出发布 `./typert`，以及 Client assembly 需要的 `./remote`；没有 Typert 能力的包不添加这些入口。
- 每个 `exports` 目标、运行时入口和声明的 patch 都必须在包中真实存在。用 `npm pack --dry-run` 或 `pnpm pack` 检查，而不是只看工作树。
- 对 Git/source 安装，包自己必须提供可用的 `prepare`/build 路径；预构建 npm 包或 `.tgz` 通常更可复现。

### A2. 本地 profile 验收

以下版本号只是插件包名示例；插件版本与 DSH runtime 版本独立，替换 `<plugin-version>`。

```powershell
npm pack --dry-run
# 或
pnpm pack

dsh plugin --profile test add .\dsh-my-plugin-<plugin-version>.tgz
dsh --profile test --dump-config
```

随后重启正在运行的 `dsh web`，刷新页面，验证 Host、Client、Tool、Remote、设置和错误路径。`dsh plugin --profile <name> <pnpm args...>` 是在 profile 目录转发给 pnpm；npm、Git、file/link 和 tgz 的具体 spec 语法属于 pnpm 行为。

### A3. Profile 层次和常见误判

生效层次是：

```text
profile bundles（按 dsh.profile.bundles 顺序）
→ profile cordis.patch.yml
→ $DSH_HOME/cordis.patch.yml
→ launcher --patch overlays（argv 顺序）
```

列入 `dsh.profile.bundles` 的包没有 `dsh.bundle.patch` 会失败；普通依赖没有 bundle 声明则仍可安装，但不会贡献配置层。`dsh.client` 也不等于 bundle。`allowBuilds`、固定 pnpm 版本和 Windows 跨盘 link 不是 DSH manifest 契约；只有遇到对应环境问题时再按 pnpm/Windows 版本处理。

## B. npm/Git/Tarball 交付

### B1. npm

1. 确认 `name`、`version`、`exports`、`files` 和 `publishConfig`。
2. `npm pack --dry-run`，安装 tarball 做一次 clean-profile 验收。
3. 登录目标 registry，按 npm 账户策略处理 2FA/OTP。
4. 发布后用 `npm view <package>@<version>` 核对实际 metadata，再用用户命令安装。

npm 的 registry、2FA、OTP 和 access policy 不是 DSH runtime 契约。

### B2. Git tag

固定 tag 或 commit，先确认仓库的 `prepare`/构建脚本和 pnpm 安装授权策略。没有 prepare 的 TypeScript source checkout 不会因为 `dsh plugin add` 自动得到构建产物；发布前应优先提供 npm 包或预构建 `.tgz`。GitHub `github:`、`git+https:` 等写法由 pnpm 解析，不是 DSH 自有协议。

### B3. Tarball

`<plugin-version>` is the plugin's own release version, not the DSH runtime version.

```powershell
pnpm pack
dsh plugin --profile test add C:\path\to\dsh-my-plugin-<plugin-version>.tgz
```

Tarball 适合在 Windows 跨盘、无构建工具或需要验证最终 `files` 集合时使用。它仍需在干净 profile 中重启并做真实冒烟。

## C. awesome-dsh-plugin（外部仓库流程）

以下规则属于 `awesome-dsh-plugin` 当前仓库的 listing policy，不属于 DSH 0.1.1-rc.2。提交前必须查看该仓库最新 README/workflow/commit；不要把本节门槛写进插件运行时设计。

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
