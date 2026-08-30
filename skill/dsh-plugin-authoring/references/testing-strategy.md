# Testing strategy for publishable plugins

This is recommended practice assembled from the DSH documentation and the xfg template; adapt commands to the plugin's own package scripts.

## Layers

1. **Unit:** pure transforms, patch helpers, schema validation, stream conversion, reducers, and presentation functions.
2. **Loader/profile integration:** mount the real plugin through a patch and assert service waiting, registration, disposal, and reload when a dependency appears/disappears.
3. **Capability behavior:** exercise Tools through the real registry; test LLM adapters through the real `llm` service with a fake provider transport; test Typert/HTTP using the actual boundary and malformed requests.
4. **Web:** load the real client module graph in a browser/snapshot harness; assert Slot registration, settings/remote mounting, light/dark themes, narrow layout, keyboard focus, and HMR cleanup.
5. **Tarball:** run `npm pack --dry-run` or `pnpm pack`; install the produced archive into a clean profile and run dump-config plus a Host/Web smoke test.
6. **Post-release:** install the exact npm/Git/tgz spec users will receive and repeat the smoke test.

## Mock boundary

Prefer real Loader, Cordis, registry, profile, and UI implementations. Mock only high-cost or nondeterministic boundaries such as provider HTTP, LLM transport, wall clock, or external services. Assert persisted/visible effects rather than trusting an agent's self-report.

## Lifecycle assertions

Every test that mounts a fiber, service, route, event listener, Tool, Slot, remote contribution, timer, watcher, or style must dispose it in `afterEach`/`finally`. HMR tests must prove the old registration is gone and the replacement is present exactly once. Test service disappearance and return when the plugin declares a hard dependency.

## Release checklist

- `node --check` for emitted plain JavaScript where applicable.
- Typecheck/build if the package has a TypeScript build.
- Invalid args, invalid outputs, cancellation, and coded errors are covered.
- Every `exports` target, bundle patch, generated Typert artifact, and client bundle is present in the packed archive.
- No test depends on a local unbuilt source path unless it explicitly tests `--patch` development mode.
- Snapshot changes are reviewed; nontrivial behavior changes update snapshots intentionally.

Windows Harness notes such as `node --test` pipe restrictions, cross-drive `link:` behavior, native dependency build approval, and the need to restart the active DSH Web process are environment troubleshooting, not plugin API guarantees.
