/*
 * Host service binding shape reference for Typert.
 * The generated ./typert descriptor and this live Service must agree on the
 * Cordis key (`myService`), namespace, method name, arguments, and result.
 * Prefer TypertRemoteService or bindTypertRemote from the installed release.
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
