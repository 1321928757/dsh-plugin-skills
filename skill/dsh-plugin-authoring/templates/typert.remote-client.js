/*
 * Shape reference for generated ./remote output.
 * Real @deepseek-ai/dsh-typert-generator output is authoritative and marked
 * `do not edit`. This hand-written shape reference is not generator output.
 * The Client API in rc.2 requires strict codecs here.
 */
import { z } from 'zod'

const requestCodec = {
  mode: 'strict',
  typeSymbol: 'dsh-my-remote-plugin/types#PingRequest',
  schema: z.object({ message: z.string() }).strict(),
}
const resultCodec = {
  mode: 'strict',
  typeSymbol: 'dsh-my-remote-plugin/types#PingResult',
  schema: z.object({ reply: z.string() }).strict(),
}

export const TYPERT_REMOTE = {
  package: 'dsh-my-remote-plugin',
  descriptors: [
    {
      id: 'dsh-my-remote-plugin#myService/ping',
      service: 'myService',
      namespace: 'myService',
      method: 'ping',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'request', wire: 'request', source: 'json', codec: requestCodec },
      ],
      result: resultCodec,
      sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
    },
  ],
}

export default TYPERT_REMOTE

/*
 * The assembly, not this generated contribution, owns mounting:
 *
 * const unmount = await ctx.remote.$mount(TYPERT_REMOTE)
 * ctx.effect(() => unmount, 'my-plugin: remote contribution')
 * const result = await ctx.remote.myService.ping({ message: 'hello' })
 * if (!result.ok) throw new Error(result.error.message)
 * const value = result.value
 *
 * `typertGateway.invoke()` is a different Host-layer API: it returns the
 * business value or throws. Generated Client methods resolve RemoteResult<T>.
 */
