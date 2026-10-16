# Client module contract (0.2.0-rc.2)

Source: [`client-modules` subsystem docs](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/client-modules) and the installed `@deepseek-ai/dsh-client-modules` Node/browser halves.

## Package declaration

A Web client package declares:

```json
{
  "dsh": {
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-runtime"],
      "external": ["@deepseek-ai/dsh-client-runtime"]
    }
  },
  "exports": {
    "./client": { "default": "./lib/client.js" }
  }
}
```

Validated field by field (`parseDshClient`):

| Field | Requirement |
| --- | --- |
| `platform` | **Required**, string. The Web consumer matches `'web'`. |
| `inject` | Optional string array. Package-name dependency edges for factory arrival **and** plugin composition. |
| `external` | Optional string array. Exact module-table requests beyond the implicit client baseline; subpaths such as `<pkg>/client` are allowed. Type-only imports are erased and create no request. |
| `immediately` | Optional boolean. Boot phase-one registration barrier; absent means the shared application batch. |

A declared client must resolve `exports["./client"]` as a string or a one-level object with a string `default`, and the target must exist. A missing build output fails loud with `client-modules: client bundle not found; run \`pnpm run build\` before launch`.

> 0.2 changed `inject` semantics. In 0.1.x it was documented as informational, with the authoritative edges in `dsh.client`. In 0.2.0-rc.2 it is a real arrival/composition edge. Do not copy an `inject` entry merely because a value is imported, but do declare the packages whose factories must exist first.

## Host graph, combo routes and browser loader

The Node half scans mounted Loader entries, composes the boot graph, and publishes it as `window.__DSH_BOOT__`:

```ts
interface WebBootEntry {
  id: string            // entry name == package name
  url: string           // revisioned single-resource combo reference, document-relative
  rev: string           // opaque artifact revision
  inject?: string[]
  external?: string[]
  immediately?: boolean
}
type WebBootBatchPhase = 'bootstrap' | 'application'
interface WebBootBatch { phase: WebBootBatchPhase; url: string; rev: string; entries: string[] }
interface WebBootGraph { rev: string; entries: WebBootEntry[]; batches: WebBootBatch[] }
```

Resources are served as **combo** routes — one classic script that registers several packages in sequence:

```text
GET|HEAD /plugins/??<pkg-a>/client.js,<pkg-b>/client.js&rev=<rev>
GET|HEAD /plugins/<pkg>/client.<chunk>.js?rev=<rev>     # package-local lazy chunk
```

Implementation facts worth knowing, none of which is a plugin API:

- Scripts are concatenated and cached on the first `GET`; the route splits a combo before its browser-facing URL exceeds ~3 KiB.
- An Indexed Source Map v3 is composed on the first source-map `GET`.
- `rev` is derived from **filesystem metadata** (`mtimeMs`, `ctimeMs`, `size`) — not from hashing bytes. A rewrite with identical content still produces a new `rev`, which matters for HMR/cache assumptions.
- The revision is per artifact: `comboRevision()` folds each ordered row's own `rev`.
- `HEAD` never materializes a body. Unknown or modified entry lists, a missing or stale `rev`, and non-`GET`/`HEAD` methods are rejected.

The browser parser is strict: a missing or malformed graph throws, duplicate entry ids throw, each entry must carry string `id`/`url`/`rev`, every batch phase must be `'bootstrap'` or `'application'`, batch `entries` must be a non-empty string array naming known entries, and an entry may belong to exactly one initial-load batch.

`external` is the synchronous arrive-before-require edge; the graph is topologically ordered by it, and self-dependencies or cycles are rejected during composition. `immediately` marks stage-one prefetch/registration and does **not** mean the Cordis plugin has already applied.

## Lazy-CJS factory format

The browser receives a classic script whose only top-level job is to register a lazy factory:

```js
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',
  factory: (require) => {
    // Bundler-generated CJS wrapper. Materialization happens on import.
    return { inject: ['slots'], apply(ctx) {} }
  },
})
```

- The factory body — including CSS side effects — runs at **materialization**, not at script execution, and is memoized in the load cache.
- `require` resolves in this order: platform seed table → memoized records → boot-graph rows → registered factories → otherwise throw. An external that has not arrived must be brought in by the graph; do not create an ad-hoc fetch inside the factory.
- Requiring a module that is currently materializing throws: factory-form CJS cannot deliver partial exports, so a require cycle is fail-loud.
- A loaded script that does not register its declared id is reported (`loaded without registering "<id>" via __ModuleLoader__.load`), and a bundle that already executed without registering is not silently re-run.
- Dynamic chunks use `require.async('./client.<name>.js')`; the chunk route only serves names matching the published package-local chunk pattern.

`PLATFORM_MODULES` is the frozen shell-seeded baseline (React, Cordis, static UI libraries). `dsh.client.external` only *adds* exact requests beyond that baseline. Composition rejects malformed requests, missing providers, self-requests, and synchronous request cycles.

> The official `clientBundle` build preset lives at `packages/client/tsdown.client.ts` and is **not published**. Out-of-repo packages must replicate that build step themselves. The classic script/factory shape is the current build convention, not a promise that every external package hand-writes a single-file CJS wrapper.

## Ownership: which row gets the browser half

Client-modules mounts a package's browser half **only on the row whose specifier is exactly the bare package name**. Rows mounted from a subpath export never get a browser half.

Consequences:

- A bundle that splits one package across several rows keeps its client half on the root row.
- Every page the package registered disappears when the root row closes.
- A sub-plugin that must keep its page when another row closes should ship as **its own package**.

## Slots, settings, and cleanup

Use the current Slot tree (`cordis_inspect_query(platform:'client', provider:'Slots', method:'listSubTree')`) or the installed rc.2 types to select a Slot, verify its kind and owner props, and check that the containing package is actually mounted.

- Slot kind determines the selection fields: `list` → `id` (required) plus optional `order`/`label`; `keyed` → `key`; `chain` → `select`; `single` is a hole to be filled.
- `priority` is shadowing priority for `single`/`list`/`keyed` and election order for `chain`; lower renders/runs first.
- Each declaration has exactly one live owner. Registering to an undeclared slot, or re-declaring a child another entry already owns, fails at plugin activation.
- `ctx.slots.inject(key, callback)` waits for a declaration when needed and returns a disposer that releases both the wait and the active contribution.
- Components never receive `ctx`; they receive the scope's standard props (`sessionId`, `useSession`, `useProjection`, `useConversation`, `useInput`, `inputActions`, `useChat`, and the optional-result variants for `session-maybe`).

The same rule applies to client services, locale, settings scope, and remote namespaces: declare hard dependencies, obtain optional services through the supported API, and use the disposer returned by registration or `$mount`. Every style tag, listener, store, and Slot contribution must be fiber/HMR-safe.

## Services and scoped namespaces

A Cordis Context proxy resolves only the service names the **reading fiber** declared. Reading anything else throws instead of answering `undefined`:

```text
cannot get property "sessions" without inject
```

| Need | Use | Notes |
| --- | --- | --- |
| Hard dependency | `export const inject = ['slots']`, then `ctx.slots` | The entry waits for the service; a missing provider leaves the row `pending` |
| Optional dependency | `ctx.get('webUiSettings')` | Answers `undefined`; never throws |
| Run once a service appears | `ctx.inject(['remote'], (c) => { … })` | The callback runs when the service is provided; the derived Context keeps the caller's scope tag |
| A scoped Remote namespace | `agentCtx.inject(['remote.<namespace>'], (c) => c.remote.<namespace>)` | See below |

**An entry that throws while applying fails the whole Web boot.** After the boot batch the shell checks every Loader entry's fiber state and refuses to start when one never reached `active`:

```text
web boot: 1 entry did not activate
@scope/my-plugin: failed
```

The per-entry reasons are `failed` (the plugin threw while applying), `pending (waiting for service: x)` (an injected service has no provider) and `import failed: …` (the bundle never registered or materialized). Treat a throw inside a client `apply()` as boot-breaking, not as a local error: read optional services through `ctx.get`, keep fallible work inside effects or components that render a reason, and never let an exception escape `apply()`.

> The browser check is **stricter** than the Node-side startup audit, which only rejects `requiredStartupEntryIds` and warns about every other inactive entry. Declaring a child Slot another entry owns, registering into an undeclared slot, or a module-graph cycle all surface through this same boot failure. The full error inventory — Slot messages, composition-time vs arrival-time module errors, `FiberState` semantics, and the crash-report layout — is in [`boot-and-activation.md`](boot-and-activation.md).

**Agent-scoped Remote namespaces need an inject.** The Client Gateway installs every mounted namespace as the Cordis service `remote.<namespace>`, but an Agent scope Context declares only the namespaces *its own* fiber injected. A plain property read of the plugin's own namespace therefore throws:

```js
agentCtx.remote.myService.ping()                                        // ✗ without inject
agentCtx.inject(['remote.myService'], (c) => c.remote.myService.ping()) // ✓
```

The injected Context still inherits the Agent scope tag, so the wire identity keeps being projected by the Client Context adapter (`scope: { context: 'agent', wire: 'agentId' }`): the caller passes no session id and the Host resolves the `agent` lookup to the exact live object. `$mount` itself is registered through `ctx.effect` on the calling Context, so a contribution the real Gateway rejects can fail that effect — validate against the real Gateway, not only against a mock. When the namespace cannot be resolved, report a fail-closed state with a reason (a disabled control plus copy) instead of fabricating a default Session or pretending the feature is unavailable for another reason.
