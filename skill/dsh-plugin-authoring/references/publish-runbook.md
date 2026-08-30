# awesome-dsh-plugin 上架 Runbook（泛化版）

> 适用：任何声明了 `dsh.bundle` 的 profile bundle 插件。每步含验收标准。

## 硬门槛（CI 自动检查，先记住）

| 门槛 | 说明 |
| --- | --- |
| `dsh.bundle` | `package.json` 必须声明（只有 `dsh.client` 会被拒）；`cordis.patch.yml` 必须提交 |
| 仓库 ≥1 天 | 从 GitHub 建库时刻计时，PR 必须满 24h |
| ≥10 提交 | 首次推送前把已有代码按逻辑拆成 ≥10 个提交是正常历史整理 |
| `dsh-plugin` topic | 仓库主页 About 齿轮里打（先推送，About 入口才出现） |
| 描述合规 | 单行、只说功能、无营销词、双语以句号结尾 |

## 阶段 A：本地准备

1. 替换全部 `<owner>` 占位：`package.json` repository、`scripts/install.ps1` `$Owner`、README 安装行（github:/raw）；
2. `node --check` + 单测 + `pnpm pack` → **本地 tgz 预验收通过**（装进测试 profile → 重启 → 亮/暗主题 + 功能全过）；
3. `git init -b main` → 按逻辑拆 ≥10 提交 → `git push`（tag 也推：`git tag vX.Y.Z && git push origin vX.Y.Z`）。

- [ ] 验收：`git rev-list --count HEAD` ≥ 10；`git ls-remote origin` 可见 main 与 tag；raw 安装脚本 URL 可读；`dsh plugin --profile <p> add github:owner/repo#vX.Y.Z` 冒烟通过。

## 阶段 B：GitHub 建库

1. 建 Public 空仓库（**不要**勾 README/license/.gitignore——本地已有）；
2. 推送后刷新仓库页 → 右侧 About ⚙ 填 Description + Topics（`dsh-plugin` 必打）+ 三个 home-page 勾选项按需（Release 留、Deployments/Packages 去）；
3. 记建库时刻 = 1 天计时起点。

## 阶段 C：准备 listing 材料

条目文件（列表仓库 fork 分支里）：

```yaml
url: https://github.com/<owner>/<repo>
name: <owner>/<repo>
category: ui      # 14 值：ui usage theme model session memory tools skill vision workflow notify dev market fun
description:
  en: 'One line, ends with a period. 含 ": " 冒号必须整行加引号'
  zh: 一句话，以句号结尾。
```

文件名必须为 `<owner>__<repo>.yml`（slug = url 去 `https://github.com/` 前缀、`/` 换 `__`；monorepo 子包另有 `/tree/...` + `--packages-` 规则）。

截图（可选推荐）：列表仓库 `data/screenshots.json` 以条目 URL 为 key，1–8 张 **GitHub 托管 https** 图片（`raw.githubusercontent.com`；第三方图床被构建校验拒绝）；图片放自己仓库 `assets/` 目录。

## 阶段 D：fork + 生成 + PR

```powershell
git clone https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git   # 或复用已有 clone
git fetch origin && git checkout -b add/<repo>      # 分支基于最新 upstream main（防 stale-fork 守卫误判）
# 放好 data/plugins/<owner>__<repo>.yml（可同时改 data/screenshots.json）
npm ci
node scripts/generate-readme.mjs
node scripts/generate-readme.mjs --check     # 必须通过
npx awesome-lint                            # 预跑 CI
git add data/plugins/<owner>__<repo>.yml README.md README.zh.md [data/screenshots.json]
git commit -m "Add <owner>/<repo>"
# GitHub 网页 fork 后：
git remote add fork https://github.com/<你>/awesome-dsh-plugin.git
git push -u fork add/<repo>
```

- [ ] 打开 PR 指向 upstream `main`，按模板勾选；README **禁止手改**、`data/added-dates.json` 禁改、单 PR 一个 yml。

## 阶段 E：CI 跟进与合并后验收

1. **PR check**（fork 上下文）：stale-fork 守卫 → `generate-readme --check` → `awesome-lint` → 站点构建；
2. **Submission gate**（workflow_run，带 token）：只把新增 yml 当数据读 → 查 `dsh.bundle` / 1 天 / 10 提交，结果以 check 回贴 PR。

- [ ] 两段全绿；失败看错因，**同一分支修好再 push，勿重开 PR**；
- [ ] 合并后：awesome-dsh-plugin.com 与列表 README 出现条目；dsh-market 同步收录；
- [ ] 后续保持仓库活跃（归档/长期停更会被周期扫描移除）。

## 常见失败对照

| 症状 | 修法 |
| --- | --- |
| Submission gate 报 dsh.bundle | 补 `dsh.bundle` + 提交 cordis.patch.yml |
| 仓库太新 / 提交不足 | 等满 1 天；继续真实提交 |
| PR check 报 README 不匹配 | 重跑 generate-readme.mjs |
| stale-fork 报大量删除 | fork Sync 到 upstream main 再推 |
| screenshots 构建被拒 | 换成 raw.githubusercontent 图床 |

## npm 可选发布

`npm view <pkg>`（期望 404）→ `npm login` → `npm publish --access public`。
**E403 提示 Two-factor authentication required → 账号开 TOTP 后 `npm publish --otp=<码>`**。
无 build 脚本的纯 JS 包 npm 收益很小（git 装同样免 allowBuilds），跳过不影响上架；跳过时 README 安装段以 GitHub 源为主。
