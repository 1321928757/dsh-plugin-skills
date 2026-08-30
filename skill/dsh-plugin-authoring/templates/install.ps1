#Requires -Version 5.1
<##
  DSH plugin installation helper.

  This demonstrates the official dsh plugin -> pnpm path. Replace the
  placeholders before publishing. Git/source builds require the package to
  provide a usable prepare/build path; a packed artifact is usually more
  reproducible. Exact spec syntax is pnpm behavior, not a DSH protocol.
##>
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [ValidateSet('npm', 'git', 'tgz')]
  [string]$Source = 'npm'
)
$ErrorActionPreference = 'Stop'

$Package = 'dsh-my-plugin'
$PluginVersion = '<plugin-version>'
$Owner = '<owner>'
$Repo = 'dsh-my-plugin'
$Tag = '<plugin-tag>'
$Tgz = Join-Path $PSScriptRoot "dsh-my-plugin-$PluginVersion.tgz" # resolved beside this script, not caller CWD

function Info([string]$Message) { Write-Host "[$Package] $Message" -ForegroundColor Cyan }
function Fail([string]$Message) { Write-Host "[$Package] $Message" -ForegroundColor Red; throw $Message }

if ($Source -eq 'npm') {
  if ($PluginVersion -eq '<plugin-version>') { Fail 'Replace <plugin-version> before using npm mode.' }
  $Spec = "$Package@$PluginVersion"
} elseif ($Source -eq 'git') {
  if ($Owner -eq '<owner>' -or $Tag -eq '<plugin-tag>') { Fail 'Replace <owner> and <plugin-tag> before using git mode.' }
  $Spec = "github:$Owner/$Repo#$Tag"
  Info 'Git installs may run package build scripts; trust and pin the tag/commit.'
} else {
  if (-not (Test-Path $Tgz)) { Fail "Tarball not found beside this script: $Tgz" }
  $Spec = (Resolve-Path $Tgz).Path
  Info 'A prebuilt tarball avoids source-build assumptions.'
}

if (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  Fail 'dsh was not found. Install the DeepSeek Harness first.'
}
# dsh plugin forwards package operations to pnpm; this check gives a clearer
# error, but a fixed pnpm version is not a DSH requirement.
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Fail 'pnpm was not found. Install a pnpm version supported by your environment.'
}

Info "Installing $Spec into profile $Profile"
dsh plugin --profile $Profile add $Spec
if ($LASTEXITCODE -ne 0) { Fail 'Installation failed; inspect pnpm output above.' }

Write-Host @"
[$Package] installed.
  Verify layer: dsh --profile $Profile --dump-config
  Apply Web changes: restart the active dsh web process, then refresh the page.
  Remove: dsh plugin --profile $Profile remove $Package
"@
