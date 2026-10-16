/**
 * Tool template for DSH 0.2.0-rc.2.
 *
 * The package build may keep this as ESM source or compile it; the runtime
 * contract is the same. Key points shown here:
 *   - `parameters` is an implicit OPEN object root; each property may carry
 *     `required: true`.
 *   - Any EXPLICIT object node must declare a boolean `additionalProperties`.
 *   - `execute` returns only the canonical value declared by `output.schema`.
 *   - presentCall/presentResult are pure replay-safe projections. They existed
 *     before 0.2 and are NOT consumed by the built-in Web client; a dedicated
 *     conversation card needs a client plugin registered on `tool.call.toolview`.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool-plugin'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'read_status',
    description: 'Read the plugin status.',
    parameters: {
      verbose: { type: 'boolean', description: 'Include extra detail.' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['status'],
        additionalProperties: false, // required on an explicit object node
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.details ? `${value.status}: ${value.details}` : value.status,
      }],
      presentationMeta: (_args, value) => ({ status: value.status }),
    },
    timeoutMs: 30_000,
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      return { status: 'ready', ...(args.verbose ? { details: 'verbose mode' } : {}) }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Read plugin status', rawInput: args }),
    // This output has no isError field; keep the projection independent of
    // undocumented execution-result properties.
    presentResult: () => ({ card: 'generic', title: 'Status' }),
  }))
}
