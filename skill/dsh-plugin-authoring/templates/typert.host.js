/**
 * dsh-my-plugin Typert 清单（Host 侧）。
 * 由 @deepseek-ai/dsh-typert-loader（dsh-base 内置）解析 exports["./typert"] 后自动注册，
 * 并逐字段强校验（loader：dsh-typert-loader/lib/index.js validateTypertManifest）：
 *  - package 必须等于包名；
 *  - face 必须严格为 "host"；
 *  - codec schema 必须是 zod v4 实例（含 _zod + parse）；裸 {parse} 对象会被拒。
 * zod 因此需要放在 dependencies。
 */
import { z } from 'zod'

const args$codec = { mode: 'strict', typeSymbol: 'dsh-my-plugin#Args', schema: z.record(z.string(), z.unknown()) }
const result$codec = { mode: 'strict', typeSymbol: 'dsh-my-plugin#Result', schema: z.record(z.string(), z.unknown()) }

export const TYPERT = {
  package: 'dsh-my-plugin',   // 必须 == package.json 的 name
  face: 'host',               // 必须严格 "host"
  schemas: [],
  invocations: [
    {
      id: 'myService/ping',
      service: 'myService',
      namespace: 'myService',
      method: 'ping',
      invocation: { kind: 'direct' },   // 或 { kind: 'context', context, wire, codec }
      parameters: [
        { name: 'args', wire: 'args', source: 'json', codec: args$codec },   // source: 'json' | 'lookup'
      ],
      result: result$codec,
      // 可选：cancellation: { parameter: 'signal' }、scope: { context, wire }、sourceLocation
    },
  ],
  // 可选 model 块（供 LLM 消费）：services/events/objects。
  // services[i].members[j].kind ∈ property/method/getter/setter/call/construct/index。
}

export default TYPERT
