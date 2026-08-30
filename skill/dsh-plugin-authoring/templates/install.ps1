#Requires -Version 5.1
# dsh-my-plugin 一键安装 / 更新脚本。
# 发布前替换占位符：$Owner、$Repo、$Rev（并同步 README 安装行）。
# 用法：irm https://raw.githubusercontent.com/<owner>/<repo>/v0.1.0/scripts/install.ps1 | iex
[CmdletBinding()]
param(
  [string]$Profile = 'web'
)
$ErrorActionPreference = 'Stop'

$Package      = 'dsh-my-plugin'
$Owner        = '<owner>'          # GitHub 用户名
$Repo         = 'dsh-my-plugin'
$Rev          = 'v0.1.0'           # 固定发布 tag：bump 版本时同步更新此值与 README 安装行
$PnpmVersion  = '11.21.0'          # 固定 pnpm 版本，保证安装链可复现
$GitSpec = "github:$Owner/$Repo#$Rev"
$TarSpec = "https://github.com/$Owner/$Repo/archive/refs/tags/$Rev.tar.gz"

function Info([string]$msg) { Write-Host "[$Package] $msg" -ForegroundColor Cyan }
function Fail([string]$msg) { Write-Host "[$Package] $msg" -ForegroundColor Red; throw $msg }
function Has([string]$name) { return $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

# 前置：DeepSeek Harness
if (-not (Has 'dsh')) {
  Fail "未找到 dsh 命令。请先安装 DeepSeek Harness:`n  npm install -g @deepseek-ai/dsh   (需要 Node.js >= 20)"
}

# 前置：pnpm（dsh plugin 底层转发给 pnpm；版本固定，保证可复现）
if (-not (Has 'pnpm')) {
  if (Has 'corepack') { corepack prepare "pnpm@$PnpmVersion" --activate 2>$null | Out-Null }
  if (-not (Has 'pnpm')) { npm install -g "pnpm@$PnpmVersion" | Out-Null }
  if (-not (Has 'pnpm')) { Fail "pnpm 安装失败，请手动执行 npm install -g pnpm@$PnpmVersion 后重试" }
}

# 安装来源：优先 git；没有 git 用 GitHub tag 打包直链（两者都固定到 $Rev）
$spec = if (Has 'git') { $GitSpec } else { $TarSpec }
Info "安装来源: $spec"
dsh plugin --profile $Profile add $spec
if ($LASTEXITCODE -ne 0) { Fail "add 失败（见上方输出）" }

Write-Host @"
[$Package] 安装/更新完成！（固定版本：$Rev）
  生效:   重启 dsh web（先停掉当前进程，再运行  dsh web）
  验证:   dsh --profile $Profile --dump-config | findstr $Package
  卸载:   dsh plugin --profile $Profile remove $Package
"@
