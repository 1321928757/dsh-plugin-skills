/*
 * Remote contribution acceptance (DSH 0.2.0-rc.2).
 *
 * Why this layer exists
 * ---------------------
 * `ctx.remote.$mount(contribution)` validates the contribution against the REAL
 * Client Gateway and registers the namespace through `ctx.effect`. A mock that
 * accepts your contribution proves nothing about that validation, and a
 * rejection lands on the effect rather than on something you can inspect later.
 * This test drives the real gateway client bundle with the artifact you ship and
 * asserts:
 *
 *   1. the mount resolves and the mounting fiber stays `active`;
 *   2. the namespace methods are installed on the `remote.<namespace>` service;
 *   3. the wire args carry the identity the Agent Context adapter supplied —
 *      the caller passes no session id;
 *   4. without an Agent Context adapter the call fails closed, locally, with no
 *      request on the carrier.
 *
 * Adapt
 * -----
 *   PKG_ID        → your package id
 *   NAMESPACE     → the namespace in your ./remote artifact
 *   METHOD/ARGS   → one unary scoped method to call, and its business arguments
 *   TYPERT_REMOTE → the artifact your package ships
 *
 * deps: node:test, jsdom, @deepseek-ai/cordis, @deepseek-ai/dsh-api-gateway
 *       Run with: node --test templates/tests/client-remote-mount.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import * as cordis from '@deepseek-ai/cordis'
import { TYPERT_REMOTE } from '../../lib/typert.remote-client.js'

const require_ = createRequire(import.meta.url)
const PKG_ID = '@scope/my-plugin'
const NAMESPACE = 'myService'
const METHOD = 'ping'
const ARGS = [{ message: 'hello' }]

/** Load one classic ModuleLoader bundle and return the factory it registered. */
function loadFactory(path, id) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://localhost/' })
  const window = dom.window
  const factories = new Map()
  window.__ModuleLoader__ = { load: ({ id: entryId, factory }) => factories.set(entryId, factory) }
  new Function('window', 'document', readFileSync(path, 'utf8'))(window, window.document)
  const factory = factories.get(id)
  assert.ok(factory, `${id} did not register a factory`)
  return factory
}

async function bootClientRemote({ agentAdapter = true } = {}) {
  const gateway = loadFactory(require_.resolve('@deepseek-ai/dsh-api-gateway/client'), '@deepseek-ai/dsh-api-gateway')((id) => {
    if (id === '@deepseek-ai/cordis') return cordis
    throw new Error(`unexpected gateway require(${JSON.stringify(id)})`)
  })

  const calls = []
  const adapters = new Map()
  const root = new cordis.Context()

  // The gateway client injects exactly ["typert", "connection"] and touches only
  // these members (verified against the shipped lib/client.js):
  //   typert.contexts.getClient, typert.remotes.register
  //   connection.rpc.open / .call, connection.generation, connection.isLoopback,
  //   connection.start, connection.registerGenerationSource
  // A stub that is missing one of them makes the gateway client itself fail to
  // activate — which is easy to misread as a problem with the contribution.
  root.provide('typert', {
    contexts: { getClient: (key) => adapters.get(key) },
    remotes: { register: () => () => {} },
  })
  root.provide('connection', {
    isLoopback: true,
    generation: { getSnapshot: () => undefined, subscribe: () => () => {} },
    rpc: {
      // `open` present keeps the gateway away from its stream mux; the methods
      // under test are unary and travel through `call`.
      open: () => undefined,
      call: async (_mount, endpoint, payload) => {
        calls.push({ endpoint, args: payload.args })
        return { ok: true, value: { generation: 'g1', revision: 0, epoch: 0, authorizedAliases: [], capability: 'cap-1' } }
      },
    },
    start: () => () => {},
    registerGenerationSource: () => () => {},
  })

  const gatewayFiber = root.plugin({
    name: '@deepseek-ai/dsh-api-gateway',
    inject: gateway.inject,
    apply: (ctx) => gateway.apply(ctx),
  })
  await settle()
  assert.equal(gatewayFiber.state, 2, 'the gateway client must activate before the mount means anything')

  if (agentAdapter) {
    // The session controller registers exactly this shape.
    adapters.set('agent', { identity: () => 'session-alpha', resolve: () => undefined })
  }

  const mounted = { error: undefined }
  root.plugin({
    name: `${PKG_ID}-probe`,
    inject: ['remote'],
    apply: (ctx) => { ctx.remote.$mount(TYPERT_REMOTE).catch((error) => { mounted.error = error }) },
  })
  await settle()
  return { root, calls, mounted }
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function namespaceOf(root) {
  const service = root.get(`remote.${NAMESPACE}`)
  assert.ok(service, `the ${NAMESPACE} namespace was not installed`)
  return service
}

test('the real Client Gateway accepts the shipped contribution', async () => {
  const { root, mounted } = await bootClientRemote()
  assert.equal(mounted.error, undefined, `$mount rejected: ${mounted.error?.message}`)
  assert.equal(typeof namespaceOf(root)[METHOD], 'function')
})

test('the Agent Context adapter supplies the wire identity, not the caller', async () => {
  const { root, calls } = await bootClientRemote()
  await namespaceOf(root)[METHOD](...ARGS)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].args, { agentId: 'session-alpha', ...ARGS[0] })
})

test('without an Agent Context adapter the call fails closed and sends nothing', async () => {
  const { root, calls } = await bootClientRemote({ agentAdapter: false })
  await assert.rejects(() => namespaceOf(root)[METHOD](...ARGS))
  assert.equal(calls.length, 0)
})
