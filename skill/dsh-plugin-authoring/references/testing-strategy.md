# Testing strategy for publishable plugins

This is recommended practice assembled from the DSH documentation, the xfg template, and a real 0.1.x → 0.2 plugin upgrade; adapt commands to the plugin's own package scripts.

## Layers

1. **Unit:** pure transforms, patch helpers, schema validation, stream conversion, reducers, and presentation functions.
2. **Manifest/codec contracts:** import the artifacts you actually publish and assert their required shape. This is the cheapest layer that catches a stale generated file — see below.
3. **Loader/profile integration:** mount the real plugin through a patch and assert service waiting, registration, disposal, and reload when a dependency appears/disappears.
4. **Capability behavior:** exercise Tools through the real registry; test LLM adapters through the real `llm` service with a fake provider transport; test Typert/HTTP using the actual boundary and malformed requests.
5. **Web:** load the real client module graph in a browser/snapshot harness; assert Slot registration, settings/remote mounting, light/dark themes, narrow layout, keyboard focus, and HMR cleanup.
6. **Tarball:** run `npm pack --dry-run` or `pnpm pack`; install the produced archive into a clean profile and run dump-config plus a Host/Web smoke test.
7. **Post-release:** install the exact npm/Git/tgz spec users will receive and repeat the smoke test.

## Contract tests worth writing first

These run in milliseconds, need no browser or database, and block the failure modes that are hardest to diagnose at runtime.

**Typert manifest codec shape.** Assert `face === 'host'`, then for every parameter and result codec: `mode === 'strict'`, `typeof typeSymbol === 'string'`, `typeof create === 'function'`, `create()` returns an object with `parse`, and the 0.1.x `schema` field is absent. Also assert each `./remote` descriptor carries an `implementation` string and strict codecs. A short template is in [`typert-contract.md`](typert-contract.md) §7.

**Tool schema authoring.** Assert explicit object nodes carry boolean `additionalProperties`, that a rejected argument throws `ToolArgsError` with code `INVALID_ARGS`, and that an out-of-schema return throws `ToolOutputError` with code `INVALID_TOOL_OUTPUT`.

**RPC/endpoint inventory.** Snapshot the method list and assert the count and names. This catches "the manifest silently lost a method" or "a rename leaked into the wire name" before a user sees a dead endpoint.

**Event listener names.** Assert the names you register against the current catalog. A renamed event produces no error and no warning — the listener just never fires — so this is the only cheap way to catch it.

**Client boot contract.** Load the *built* client bundle the way the shell does — a jsdom document with `window.__ModuleLoader__`, then a real Cordis root providing exactly the services named in the entry's own `inject` list — and assert the fiber state is `active`. An apply-time throw is not a local error: the shell refuses to boot the whole Web app when one entry never reaches `active` (`web boot: N entry did not activate`), which is what the user experiences as "the app will not start". Run the harness twice, once with the optional services (`remote`, `sessions`, …) present and once absent; the second run is what proves no undeclared-service property read slipped in. [`templates/tests/client-boot.test.mjs`](../templates/tests/client-boot.test.mjs) is a skeleton with the full harness; it needs `jsdom` and `@deepseek-ai/cordis` resolvable from the working directory, so run it inside the plugin project (which declares those devDependencies) rather than from this skill repository.

**Remote contribution acceptance.** Mount the contribution through the real Client Gateway (`ctx.remote.$mount`) instead of a mock, call one method with a registered Agent Context adapter, and assert the wire args carry the identity the *adapter* supplied — never an id the caller passed. Then drop the adapter and assert the call fails closed with no request sent. [`templates/tests/client-remote-mount.test.mjs`](../templates/tests/client-remote-mount.test.mjs) also pins the service surface the real gateway client needs, verified against the shipped `lib/client.js`: it injects exactly `["typert", "connection"]` and touches only `typert.contexts.getClient`, `typert.remotes.register`, `connection.rpc.open`/`.call`, `connection.generation`, `connection.isLoopback`, `connection.start`, `connection.registerGenerationSource`. A stub missing one of those makes the **gateway client itself** fail to activate — easy to misread as a problem with your contribution. The test also needs a Client Gateway bundle path (`@deepseek-ai/dsh-api-gateway/client`), which resolves inside a DSH installation.

## Mock boundary

Prefer real Loader, Cordis, registry, profile, and UI implementations. Mock only high-cost or nondeterministic boundaries such as provider HTTP, LLM transport, wall clock, or external services. Assert persisted/visible effects rather than trusting an agent's self-report.

## Lifecycle assertions

Every test that mounts a fiber, service, route, event listener, Tool, Slot, remote contribution, timer, watcher, or style must dispose it in `afterEach`/`finally`. HMR tests must prove the old registration is gone and the replacement is present exactly once. Test service disappearance and return when the plugin declares a hard dependency.

## Isolated acceptance runs

When you need to verify against a real DSH runtime, do it in a throwaway profile rather than the profile the user is working in:

- separate `DSH_HOME`, separate profile name, separate port, separate browser profile;
- assert on the served boot graph and a rendered control, not just on a successful process start;
- treat any console error or uncaught exception in the renderer as a failure;
- script cleanup so the probe can repeat (delete the connections/state it created);
- never restart or reconfigure the user's live instance.

## Release checklist

- `node --check` for emitted plain JavaScript where applicable.
- Typecheck/build if the package has a TypeScript build; confirm the build really regenerated any codegen artifacts.
- Invalid args, invalid outputs, cancellation, and coded errors are covered.
- Every `exports` target, bundle patch, generated Typert artifact, and client bundle is present in the packed archive.
- No test depends on a local unbuilt source path unless it explicitly tests `--patch` development mode.
- Snapshot changes are reviewed; nontrivial behavior changes update snapshots intentionally.

Windows Harness notes such as `node --test` pipe restrictions, cross-drive `link:` behavior, native dependency build approval, and the need to restart the active DSH Web process are environment troubleshooting, not plugin API guarantees.

Two environment facts that cost real time when applying an updated plugin to a live profile:

- **Scope the verification action to the changed half.** A client-half change is verified by reloading the page; only a host-half change needs a DSH restart. Making "restart and try again" the default loop turns every UI iteration into a full boot cycle.
- **A `link:` install does not need a forced reinstall.** In a user profile, `pnpm install` may decide the existing `node_modules` layout must be purged and, without a TTY, aborts (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`) — do not force it. `link:` plus the existing junction is enough for DSH to load the package. Uninstalling a bundle removes its `cordis.yml` row and its entry from `dsh.profile.bundles`; reinstalling only needs the dependency and that bundle entry back, because the composition file is regenerated on the next start.
- **Leave the user's instance as you found it.** Back up the profile `package.json` before touching it, and revoke any authorization you created while verifying.
