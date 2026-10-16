# Evidence matrix (DSH 0.2.0-rc.2)

This is a maintenance index, not a replacement for the source. The target DSH tag is [`dsh-v0.2.0-rc.2`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.0-rc.2). When a contract changes, update this file and the main skill together.

## How the evidence was gathered

Three independent classes, cross-checked against each other:

1. **Official docs** — the site is built from `master`, which is *ahead* of `0.2.0-rc.2` (master was `0.2.1-alpha.4` at the time of writing). Trust it for concepts, verify version-specific claims against tagged source.
   - Real path prefix is `/reference/…`, **not** the shorter paths older notes used. `/api-gateway/`, `/subsystems/client-modules/` and `/cookbook/adding-a-tool/` all 404.
   - Appending `.md` returns raw markdown: `…/reference/subsystems/typert.md`.
2. **Tagged source** — `https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/<tag>/<path>`. This is the only way to prove a claim holds *at rc.2*.
3. **Installed runtime** — the desktop 0.2.0-rc.2 install bundles `@deepseek-ai/*` inside `resources/app.asar` (not in the profile's `node_modules`). Read them by parsing the asar header; the profile only carries a handful of packages (`cosmokit`, `dsh-home-paths`, `dsh-subprocess`, `dsh-typert-protocol`, `schemastery`).

Live introspection (`cordis_inspect_query`) is the cheapest way to confirm Slots, Events, Services, Configs and Theme tokens in the exact running composition, and it catches renames that no document mentions.

## Claim index

| Claim | Evidence class | Release evidence | Guidance boundary |
|---|---|---|---|
| Profile path, bundle order, profile/home/launcher layers | Official docs + runtime | [`publish`](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish); `dsh-app-boot` (`loadProfile`, `loadProfileDirectory`, `applyEntryPatches`) | DSH contract; command spelling still follows the installed CLI help |
| Bundle membership requires `dsh.bundle` | Runtime + official tutorial | `dsh-app-boot`: `profile bundle "…" declares no dsh.bundle in its package.json` | Applies when a package is listed in `dsh.profile.bundles`, not to every dependency |
| `dsh.bundle.patch` accepts `string \| string[]` | Runtime | `dsh-app-boot`: `dsh.bundle.patch must be a file path or a list of file paths` | Ordered file list applied as one layer |
| Top-level patch array and whole-`config` replacement | Runtime + docs | `dsh-app-boot`; `cordis-plugin-include` | DSH contract; no generic deep merge |
| `dsh.client` fields | Runtime + official typed source | `dsh-client-modules` `parseDshClient`: `platform` required string; `inject`/`external` optional string arrays; `immediately` optional boolean; `exports["./client"]` string or one-level `{default:string}` | `inject` is composition/arrival metadata, not module `require` |
| Client boot graph `{ rev, entries, batches }` and combo routes | Runtime + subsystem docs | `dsh-client-modules` node/browser halves; [`client-modules`](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/client-modules) | Source-verified rc.2 behavior; URL/hash/split details are implementation, not API |
| Client bundle lazy factory + arrival/materialize | Runtime | `dsh-client-modules/lib/client.js`: `__ModuleLoader__.load({id,factory})`, `arrive`, `materialize`, cycle rejection | `__ModuleLoader__` exists in 0.1.x too — not a migration item |
| Browsers half mounts only on the bare-package-name row | Official cookbook | [`adding-a-settings-card`](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-settings-card) | Ownership caveat; subpath-only rows register pages that die with the root row |
| **Typert strict codec uses `create()` factory** | Tagged source diff + runtime + docs | `packages/typert/protocol/src/types.ts` at both tags; `dsh-typert-loader` `requireStrictCodec`; `dsh-api-gateway` `decode()` → `codec.create().parse(value)` | **The 0.1.x `schema` field is gone.** See [`typert-contract.md`](typert-contract.md) |
| `TYPERT` manifest required fields | Runtime | `dsh-typert-loader` `validateTypertManifest` / `requireInvocation` | Full field list in [`typert-contract.md`](typert-contract.md) |
| Generated `./typert` / `./remote` artifacts | Real generated official output | `dsh-agent-preset-registry`, `dsh-client-ui-plugin-manager` and other `lib/typert.*.js` | Generated files are `do not edit`; Client Gateway rejects non-strict codecs |
| `RemoteResult` / Host binding layers | Runtime + docs | `dsh-api-gateway` client install path; `dsh-typert-protocol` | Generated Client methods resolve an envelope; Host `invoke()` returns the value or throws |
| Remote streaming/uplink, `ctx.invocation`, `RemoteError` union, adapter renames | Tagged source diff | `packages/typert/protocol/src/types.ts` at both tags | 0.2 additions; not required for plain unary services |
| **Plugin/runtime compatibility gate** | Runtime | `dsh-app-boot` `evaluatePluginCompatibility` + `readProfileCompatibility` + `pluginCompatibilityWarning` | Only `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peers are checked; `includePrerelease: true`; exemption lives in profile `compatibility.json` |
| `engines.dsh` not enforced at rc.2 | Runtime + package README | Both the app-boot reader and the package README statement | Declarative at rc.2; later releases prioritize it. Do not describe it as enforced |
| Tool schema subset, `defineTool`, output, cancellation | Official docs + runtime types | [`adding-a-tool`](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-tool); `dsh-tools` compiler and `defineTool` | Explicit object nodes require boolean `additionalProperties` |
| Tool presentation cards | Runtime + tagged source | `dsh-tools` `presentation.ts` exists at 0.1.1-rc.2 as well | **Not a 0.2 migration item**; Web cards need `tool.call.toolview` |
| Tool hook names and modes | Runtime + live Inspect | `dsh-tools` event declarations; live `listEvents` catalog | `tools/ptc-dispatch-log` replaced `tools/code-dispatch-log` |
| Slot keys, kinds, selection fields | Live Inspect + docs | `cordis_inspect_query(platform:'client', provider:'Slots', method:'listSubTree')`; [`slots`](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/slots) | Slot keys are dynamic; re-check per composition |
| Theme token override set | Live Inspect | `cordis_inspect_query(platform:'client', provider:'Theme', method:'listTokens')` | Returns the light+dark override set, not the full alias catalog |
| Config/settings namespace layering, instant config, `settings/document-updated` | Official docs + runtime | [`settings`](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/settings); live event catalog | Namespace/storage details are service-specific |
| LLM Adapter stream ordering and errors | Official docs + runtime types | [`llm-adapter`](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter); `dsh-llm` types | Provider-specific wire mapping remains plugin-owned; every provider request adds attribution headers |
| Migration guides live in-repo, not on the site | Official repo layout | `docs/upgrade-guide/v<semver>/<slug>/guide.md` with `kind: upgrade-guide` and fixed `## Change` / `## Migration` headings | At the rc.2 tag only `v0.1.7-rc.2` existed; `v0.2.0-rc.2` guides were added later on master |
| GitHub install needs `prepare` + pnpm build approval | Official tutorial + pnpm behavior | [`publish`](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) | Authorizing `prepare` is arbitrary install-time code execution |
| Unit/e2e/Web/HMR test layering | Template practice | `xfg-skills-dsp-plugin-template` | Recommended practice, not a DSH CI promise |
| Listing age, commit, topic, screenshot and CI rules | External marketplace process | `awesome-dsh-plugin` repository workflow/README | Never describe these as DSH runtime requirements; re-check the current upstream commit |
| Windows `link:`/EPERM/native-build issues | Environment experience | Current Harness/Windows environment | Troubleshooting only; not a DSH API contract |
| Cordis Context resolves only declared (injected) service names | Runtime + tagged source | `@deepseek-ai/cordis` `src/reflect.ts:144` — `ReflectService.handler.get` throws `cannot get property "${prop}" without inject`; `ctx.get(name)` is documented there as "Read a service from the store without the inject requirement" | `ctx.get(name)` is the supported optional accessor; `ctx.inject(deps, cb)` waits for a late service |
| `ctx.inject(deps, cb)` is shorthand for `ctx.plugin({ inject, apply })` and creates a child fiber | Tagged source | `@deepseek-ai/cordis` `src/registry.ts:300-302`; the derived Context keeps the caller's scope/isolate tags | "Run once a service appears" without losing the Agent scope tag |
| A client entry that never reaches the `active` fiber state fails the whole Web boot | Runtime | `dsh-web-frontend` bundle: the boot check throws `web boot: ${n} entry(s) did not activate` for **every** Loader entry whose fiber is not `active`, with reasons `failed` / `pending (waiting for service: x)` / `import failed: …`; the overlay then renders "Failed to load plugins" | Treat a throw inside a client `apply()` as boot-breaking |
| The Node-side startup audit is **less** strict than the browser one | Runtime | `dsh-app-boot` `auditStartupEntries`: only `requiredStartupEntryIds` (`agent-loop`, `webserver`, `modules`, `connection`, `headless-runner`, `acp`, `sdk-jsonrpc-server`) or the bootstrap Include failing raises `StartupError`; other inactive entries only emit `warning: N entries did not activate` while siblings keep running | A clean Host start does **not** prove the client half is healthy |
| Desktop fatal dialog and crash report | Runtime | `lib/main.js`: IPC `dsh-desktop:boot-failed` → `reportFatal(new Error(message), 'web-boot')`; locale `fatalSummary: "应用无法启动或已意外停止。"`; report written to `app.getPath('logs')` as `crash-<ISO>-<source>.log`, sources `host`/`web-boot`/`renderer`/`main`, newest 10 kept; sections `--- error ---`, optional `--- host diagnostic … ---`, `--- renderer console (error level, oldest first) ---` | Windows default is `%APPDATA%\@deepseek-ai\dsh-desktop\logs\` (app `name` is `@deepseek-ai/dsh-desktop`) |
| `FiberState` numeric order | Tagged source | `@deepseek-ai/cordis` `src/fiber.ts:147-153`: `PENDING=0, LOADING=1, ACTIVE=2, FAILED=3, DISPOSED=4, UNLOADING=5` | Makes `fiber.state === 2` / a `['pending','loading','active',…]` lookup table correct in the boot template |
| Agent-scoped client Contexts declare only the namespaces their own fiber injected | Runtime + official client bundle | Follows from the Context trap plus `remote.<namespace>` service registration; a plain `agentCtx.remote.<ns>` read is an undeclared property | Scoped Remote calls must go through `ctx.inject` |
| Client Remote namespaces are Cordis services keyed `remote.<namespace>` | Runtime | `dsh-api-gateway` client `remoteServiceKey(namespace)` returns `` `remote.${namespace}` ``, used by `createNamespace` and the installed service class | The dot is part of the service key, not a subpath export |
| `$mount` registers its namespace through `ctx.effect` | Runtime | `dsh-api-gateway` client `$mount`: `const owned = callerCtx.effect(async () => { const dispose = await this.enqueue(() => this.mountContribution(callerCtx, contribution)); … })` | A contribution the Gateway rejects can fail that effect; validate against the real Gateway |

## Disputed claims deliberately removed

- A package with only `dsh.client` is not universally “uninstallable”; it is simply not a profile bundle layer unless it also declares `dsh.bundle.patch`.
- `./typert` is not a universal export. It is needed only when the package participates in Typert Host generation/registration.
- All shared runtime dependencies are not required to be optional peers. Choose `peerDependencies`, `dependencies`, and optional peers from actual ownership and installation closure; packages that must share the host instance are conventionally declared in **both** `peerDependencies` and `devDependencies`.
- `allowBuilds`, fixed pnpm versions, repository age, and commit counts are not DSH core manifest contracts.
- Tool presentation cards are not a 0.2 feature; they existed at 0.1.1-rc.2.
- `engines.dsh` is declarative at 0.2.0-rc.2; the enforced gate is the `@deepseek-ai/dsh*` `peerDependencies` check.

## Unverified / open items

- Whether every docs page is byte-identical between `dsh-v0.2.0-rc.2` and master. Only the client-modules, slots and tool-cookbook pages were diffed.
- A dedicated `dsh` CLI reference page. None exists on the docs site; CLI reference material is in-repo under `apps/cli/reference/`.
- Slot keys and event names at the 0.1.1 baseline (needed only for a precise per-item migration diff).
- Intermediate 0.1.1-rc.2 → 0.1.7-rc.2 breaking changes; the rc.2 tag carries no guide for that span.
- Whether `window.__dshClientCtx` exists at all. A whole-asar byte search of the installed 0.2.0-rc.2 desktop build (`__dshClientCtx`, `__dshClient`, `dshClientCtx`) returned **zero** hits, so it is **not** a usable probe in this build and is no longer documented as one. The `__DSH*` globals that *are* present are `__DSH_BOOT__`, `__DSH_BOOT_READY__`, `__DSH_TRANSPORT__`, `__DSH_LOCALE__`, `__DSH_HOST_PATHS__`, `__DSH_DIRECTORY_PICKER__`, `__DSH_FILE_UPLOAD__`, `__DSH_CONNECTION_RECOVERY__`, `__DSH_SHORTCUTS_CONFIG__`, `__DSH_CONTACT_CONFIG__`, `__DSH_MODELS_ONBOARDING__`, `__DSH_DOCUMENT_PREVIEW_CONFIG__`. Whether some other DSH host or a future shell exposes a root-Context handle is unknown; if you need one, verify it before relying on it.
- Whether every shell composes `remote` and `sessions` before third-party client entries apply, or whether that ordering is incidental to the current bundle list.
- The exact `app.getPath('logs')` value on macOS/Linux; only the Windows default (`%APPDATA%\<app name>\logs`) was derived from the Electron convention plus the packaged `name`.
