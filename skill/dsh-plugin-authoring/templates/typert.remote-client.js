/*
 * Shape reference for generated ./remote output.
 * Real @deepseek-ai/dsh-typert-generator output is authoritative and marked
 * `do not edit`. This hand-written shape reference is not generator output.
 *
 * DSH 0.2 contract: strict codecs use a `create()` FACTORY (the 0.1.x `schema`
 * field is gone), descriptors carry an `implementation` name exported by this
 * module, and a scoped contribution declares `scope` plus its single `lookup`
 * parameter. The Client gateway REFUSES a non-strict codec:
 *   "client api: generated Remote <endpoint> field <field> has no strict codec"
 */
import { z } from 'zod'

let _ping_request$schema$value
const _ping_request$schema = () => (_ping_request$schema$value ??= z.object({ message: z.string() }))

let _ping_result$schema$value
const _ping_result$schema = () => (_ping_result$schema$value ??= z.object({ reply: z.string() }))

/* Named by `implementation` below; in real output these are generator-emitted. */
export async function remoteExportPing(request) {
  return { reply: `pong: ${request.message}` }
}

export const TYPERT_REMOTE = {
  package: 'dsh-my-remote-plugin', // must equal package.json.name exactly
  descriptors: [
    {
      id: 'dsh-my-remote-plugin#myService/ping',
      service: 'myService',
      namespace: 'myService',
      method: 'ping',
      implementation: 'remoteExportPing', // exported binding in this module
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: 'dsh-my-remote-plugin#myService/ping:request',
            create: _ping_request$schema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-my-remote-plugin#myService/ping:result',
        create: _ping_result$schema,
        // Optional result post-processing hook on the Client side:
        // decode: (value) => value,
      },
      sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
    },
  ],
}

export default TYPERT_REMOTE

/*
 * A scoped method additionally projects a session/agent context. `scope.wire`
 * must name the invocation's ONLY lookup parameter, and its `lookup` must equal
 * `scope.context`:
 *
 * {
 *   id: 'dsh-my-remote-plugin#myService/select',
 *   service: 'myService', namespace: 'myService', method: 'select',
 *   implementation: 'remoteExportSelect',
 *   invocation: { kind: 'direct' },
 *   scope: { context: 'agent', wire: 'agentId' },
 *   parameters: [
 *     { name: 'agent',        wire: 'agentId', source: 'lookup', lookup: 'agent', codec: { ... } },
 *     { name: 'agentPreset',  wire: 'agentPreset', source: 'json', codec: { ... } },
 *   ],
 *   result: { ... },
 * }
 *
 * The assembly, not this generated contribution, owns mounting:
 *
 * const unmount = await ctx.remote.$mount(TYPERT_REMOTE)
 * ctx.effect(() => unmount, 'my-plugin: remote contribution')
 * const result = await ctx.remote.myService.ping({ message: 'hello' })
 * if (!result.ok) throw result.error
 * const value = result.value
 *
 * `typertGateway.invoke()` is a different Host-layer API: it returns the
 * business value or throws. Generated Client methods resolve RemoteResult<T>.
 * Do not decide which layer you are in by inspecting field names — a business
 * value may legitimately carry its own `ok`/`value` fields.
 */
