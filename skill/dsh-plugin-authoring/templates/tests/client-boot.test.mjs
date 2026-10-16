/*
 * Boot contract test for the Web client half (DSH 0.2.0-rc.2).
 *
 * Why this layer exists
 * ---------------------
 * A client entry whose apply() throws never reaches the `active` fiber state,
 * and the shell then refuses to boot the entire Web app:
 *
 *   web boot: 1 entry did not activate
 *   @scope/my-plugin: failed
 *
 * The most common cause is reading a service the entry did not declare in
 * `inject`: a Cordis Context proxy THROWS
 *
 *   cannot get property "x" without inject
 *
 * instead of answering `undefined`. This test boots the *shipped* artifact on a
 * real Cordis root with exactly the entry's own `inject` list, so that mistake
 * fails here instead of on the user's machine.
 *
 * Adapt
 * -----
 *   1. PKG_ID         → the id your dsh.client entry registers in __ModuleLoader__.load
 *   2. BUNDLE         → the built artifact package.json exports as ./client
 *   3. EXTERNALS      → the modules your bundle requires(); each must also be a
 *                       `dsh.client.external` entry
 *   4. shellService() → one stub per name in your `inject` list (extend, do not guess)
 *
 * deps: node:test, jsdom, @deepseek-ai/cordis, plus the platform externals the
 *       bundle actually requires (react, react/jsx-runtime, …).
 *       Run with: node --test templates/tests/client-boot.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { Context } from '@deepseek-ai/cordis'

const PKG_ID = '@scope/my-plugin'
const BUNDLE = fileURLToPath(new URL('../../lib/client.js', import.meta.url))
const FIBER_STATE = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

/** Evaluate the classic script exactly like the browser loader does. */
async function loadPlugin() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://localhost/' })
  const window = dom.window
  const factories = new Map()
  window.__ModuleLoader__ = { load: ({ id, factory }) => factories.set(id, factory) }
  new Function('window', 'document', readFileSync(BUNDLE, 'utf8'))(window, window.document)

  const factory = factories.get(PKG_ID)
  assert.ok(factory, `bundle did not register ${PKG_ID} through __ModuleLoader__.load`)

  // Only modules declared in `dsh.client.external` may be required; requiring
  // anything else here means the real composition graph would fail as well.
  const externals = {
    'react': await import('react'),
    'react/jsx-runtime': await import('react/jsx-runtime'),
  }
  return factory((id) => {
    assert.ok(externals[id], `unexpected require(${JSON.stringify(id)}) — declare it in dsh.client.external`)
    return externals[id]
  })
}

/** Minimal stubs for the services this entry injects. Extend per plugin. */
function shellService(name) {
  switch (name) {
    case 'slots':
      return { inject: (_key, callback) => callback(), register: () => () => {} }
    case 'locale':
      return { register: () => () => {}, bind: () => (key) => key }
    case 'configForms':
      return {
        describe: () => ({ subscribe: () => () => {}, getSnapshot: () => ({ view: undefined }) }),
        get: () => undefined,
      }
    case 'layout':
      return { selectPanel: () => {}, panelInfo: undefined }
    default:
      throw new Error(`add a stub for injected service ${JSON.stringify(name)}`)
  }
}

/** Mount the plugin the way the shell does: a fiber carrying its own inject list. */
async function mount({ optionalServices = [] } = {}) {
  const plugin = await loadPlugin()
  const root = new Context()
  for (const name of plugin.inject) root.provide(name, shellService(name))
  for (const name of optionalServices) {
    // Deliberately NOT injected: the plugin must reach these through ctx.get or
    // ctx.inject, never through a property read.
    root.provide(name, name === 'remote' ? { $mount: async () => async () => {} } : { scope: () => undefined })
  }
  const fiber = root.plugin({ name: PKG_ID, inject: plugin.inject, apply: (ctx) => plugin.apply(ctx) })
  await settle()
  return { root, fiber, plugin }
}

/** Let the fiber finish applying its effects and any deferred activation work. */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

test('client entry reaches the active fiber state with only its injected services', async () => {
  const { fiber } = await mount()
  assert.equal(FIBER_STATE[fiber.state], 'active', 'an apply() throw fails the whole Web boot')
})

test('optional services absent must not break activation', async () => {
  // No `remote`, no `sessions`: a property read of either would throw and be
  // reported to the user as "the app will not start".
  const { fiber } = await mount()
  assert.equal(FIBER_STATE[fiber.state], 'active', 'no undeclared-service property read may throw')
})

test('optional services arriving later are picked up without a second boot', async () => {
  const plugin = await loadPlugin()
  const root = new Context()
  for (const name of plugin.inject) root.provide(name, shellService(name))
  const fiber = root.plugin({ name: PKG_ID, inject: plugin.inject, apply: (ctx) => plugin.apply(ctx) })
  await settle()

  // The gateway client may land after this entry: `ctx.inject` callbacks run
  // when the service appears, which is why the entry stays active either way.
  root.provide('remote', { $mount: async () => async () => {} })
  root.provide('sessions', { scope: () => undefined })
  await settle()
  assert.equal(FIBER_STATE[fiber.state], 'active', 'a late service must be handled through ctx.inject')
})
