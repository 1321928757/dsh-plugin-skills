# Client module contract (rc.2)

Source: [`dsh-client-modules` subsystem docs](https://deepseek-harness.github.io/deepseek-harness/subsystems/client-modules/) and the installed `@deepseek-ai/dsh-client-modules` Node/browser halves.

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

In rc.2, `dsh.client` must be an object; `platform` is a string; supplied `inject` and `external` values must be string arrays; supplied `immediately` must be boolean. A declared client must resolve `exports["./client"]` as a string or one-level object with a string `default`, and the target must exist.

`inject` describes package/fiber composition metadata. `external` names module specifiers whose code must be available to synchronous `require`. Do not copy an `inject` entry merely because a value is imported; determine the actual module-table edge from the build and runtime composition.

## Host graph and browser loader

The Node half scans mounted Loader entries, hashes each client file, and publishes a boot graph through `window.__DSH_BOOT__`. The rc.2 implementation currently uses row URLs shaped like `/plugins/<id>/client.js?rev=<12-hex SHA-1>` (`dsh-client-modules/lib/index.js:147-159`); URL and hash length are implementation details, not plugin API. The graph is topologically ordered by `external`; self-dependencies and cycles are rejected during graph composition. `immediately` marks stage-one prefetch/registration and does not mean the Cordis plugin has already applied.

The browser receives a classic script. Its top-level responsibility is to register a lazy factory:

```js
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',
  factory: (require) => {
    // Bundler-generated CJS wrapper. Materialization happens on import.
    return { inject: ['slots'], apply(ctx) {} }
  },
})
```

The factory body, including CSS side effects, runs on materialization and is cached. `require` can synchronously resolve only seed/cache/factory modules that have already arrived. An external module that has not arrived must be brought in by the graph before use; do not create an ad-hoc fetch or a require cycle inside the factory. Duplicate registrations, missing factories, and cycles are fail-loud.

The classic script/factory shape is the current official build convention, not a promise that every external package must hand-write a single-file CJS wrapper. Use the current client build preset when available, or reproduce its output contract carefully.

## Slots, settings, and cleanup

Use the current SlotMap/types or Harness Inspect to select a Slot, verify its kind and owner props, and check that the containing package is actually mounted. `ctx.slots.inject(key, callback)` waits for a declaration when needed and returns a disposer for the wait and active contribution. A missing key is a contract error, not a cue to guess a nearby name.

The same rule applies to client services, locale, settings scope, and remote namespaces: declare hard dependencies, obtain optional services through the supported API, and use the disposer returned by registration or `$mount`. Every style tag, listener, store, and Slot contribution must be fiber/HMR-safe.
