# Evidence matrix (DSH 0.1.1-rc.2)

This is a maintenance index, not a replacement for the source. The target DSH tag is [`dsh-v0.1.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.1-rc.2). Local evidence was checked under `E:\deepseek-harness\0.1.1-rc2\node_modules\@deepseek-ai\`. When a contract changes, update this file and the main skill together.

| Claim | Evidence class | Release evidence | Guidance boundary |
|---|---|---|---|
| Profile path, bundle order, profile/home/launcher layers | Official docs + runtime | [`publish`](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish); `dsh-app-boot/lib/index.js:289-305,526-565,568-576,851-895` (`loadProfile`, `applyEntryPatches`) | DSH contract; command spelling still follows the installed CLI help |
| Bundle membership requires `dsh.bundle.patch` | Runtime + official tutorial | `dsh-app-boot/lib/index.js:526-557` (`loadProfile`) | Applies when a package is listed in `dsh.profile.bundles`, not to every dependency |
| Top-level patch array and direct-overwrite semantics | Runtime | `dsh-app-boot/lib/index.js:57-105` (`applyEntryPatches`); `cordis-plugin-include/lib/index.js:57-105` | DSH contract; no generic deep merge |
| `dsh.client` and `exports["./client"]` | Runtime + package manifests | `dsh-client-modules/lib/index.js:120-145` (`parseDshClient`, `clientExportOf`); `dsh-api-remotes/package.json:25-43` | Web client contract; `inject`, `external`, and `immediately` are distinct fields |
| Client graph hash, route, external topology, lazy factory | Runtime + subsystem docs | `dsh-client-modules/lib/index.js:147-193,364-394`; `dsh-client-modules/lib/client.js:129-139,192-237,279-...`; [`client-modules`](https://deepseek-harness.github.io/deepseek-harness/subsystems/client-modules/) | Source-verified rc.2 behavior; do not treat implementation URL details as a forever API |
| Typert generated `TYPERT`/`TYPERT_REMOTE` artifacts | Generated official package output + docs | `dsh-commands/lib/typert.host.js:1-119`; `dsh-commands/lib/typert.remote-client.js:1-119`; `dsh-api-gateway/lib/client.js:408-423`; [`API Gateway`](https://deepseek-harness.github.io/deepseek-harness/api-gateway/) | Generated files are examples of generator output; do not hand-edit them; Client Gateway requires strict codecs |
| `RemoteResult` and Host binding layers | Runtime types | `dsh-typert-protocol/lib/types/types.d.ts:39-57,28-38`; `dsh-api-gateway/lib/types/index.d.ts:31-51` | Generated Client methods return an envelope; Gateway `invoke()` returns business value or throws |
| Tool schema, output, cancellation, presentation | Official docs + runtime types | [`tool cookbook`](https://deepseek-harness.github.io/deepseek-harness/cookbook/adding-a-tool/); `dsh-tools/lib/types/schema.d.ts:55-89`; `dsh-tools/lib/types/presentation.d.ts:38-143`; `dsh-tools/lib/types/index.d.ts:28-93` | Tool fields and UI intents must be checked against the installed version |
| Config/settings namespace layering | Official docs + runtime | [`settings`](https://deepseek-harness.github.io/deepseek-harness/subsystems/settings/), `dsh-settings` types | Namespace/storage details are service-specific |
| LLM Adapter stream ordering and errors | Official docs + runtime types | [`LLM adapter`](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter); `dsh-llm/lib/index.js:1068-1116`; `dsh-llm/lib/types/index.d.ts:160-191,213-262`; `dsh-llm/lib/types/attribution.d.ts:40-46` | Provider-specific wire mapping remains plugin-owned; every provider request must add attribution headers |
| Unit/e2e/Web/HMR test layering | Template practice | `xfg-skills-dsp-plugin-template/references/testing-strategy.md` | Recommended practice, not a DSH CI promise |
| GitHub/npm/tgz installation | Official tutorial + pnpm behavior | [`publish`](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) | Exact source spec syntax is delegated to pnpm |
| Listing age, commit, topic, screenshot and CI rules | External marketplace process | `awesome-dsh-plugin` repository workflow/README | Never describe these as DSH runtime requirements; re-check the current upstream commit |
| Windows `link:`/EPERM/native-build issues | Environment experience | Current Harness/Windows environment | Troubleshooting only; not a DSH API contract |

## Disputed claims deliberately removed

- A package with only `dsh.client` is not universally “uninstallable”; it is simply not a profile bundle layer unless it also declares `dsh.bundle.patch`.
- `./typert` is not a universal export. It is needed only when the package participates in Typert Host generation/registration.
- All shared runtime dependencies are not required to be optional peers. Choose `peerDependencies`, `dependencies`, and optional peers from actual ownership and installation closure.
- `allowBuilds`, fixed pnpm versions, repository age, and commit counts are not DSH core manifest contracts.
