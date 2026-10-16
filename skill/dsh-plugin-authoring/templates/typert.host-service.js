/*
 * Host service binding shape reference for Typert (DSH 0.2.0-rc.2).
 * The generated ./typert descriptor and this live Service must agree on the
 * Cordis key (`myService`), namespace, method name, arguments, and result.
 * Prefer TypertRemoteService or bindTypertRemote from the installed release.
 *
 * Remote methods that must reach the generated Client types are marked with
 * `@Remote` / `@RemoteScope(key)` from @deepseek-ai/dsh-typert-protocol. Strict
 * analysis requires public, non-static, concrete instance methods that are not
 * generic, with named required simple-identifier parameters (no destructuring,
 * defaults, rest, or optional params). A trailing `signal: AbortSignal`
 * parameter is recorded out of band as `cancellation.parameter === 'signal'`
 * and never enters `args`.
 */
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

export class MyService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'myService')
  }

  async ping(request) {
    return { reply: `pong: ${request.message}` }
  }
}

export const name = 'my-service-plugin'
export function apply(ctx) {
  // `TypertRemoteService` registers the service key and exposes its
  // `typertRemote` binding. Do not also provide a second instance or invent a
  // different service key; the generated descriptor resolves `myService`.
  ctx.plugin(MyService)
}
