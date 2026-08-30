/**
 * Tool template. The package build may keep this as ESM source or compile it;
 * the runtime contract is the same in DSH 0.1.1-rc.2.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool-plugin'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'read_status',
    description: 'Read the plugin status.',
    parameters: {
      verbose: { type: 'boolean' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['status'],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.details ? `${value.status}: ${value.details}` : value.status,
      }],
      presentationMeta: (_args, value) => ({ status: value.status }),
    },
    async execute(_args, exec) {
      exec.signal.throwIfAborted?.()
      return { status: 'ready' }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Read plugin status', rawInput: args }),
    // This output has no isError field; keep the projection independent of
  // undocumented execution-result properties.
  presentResult: () => ({ card: 'generic', title: 'Status' }),
  }))
}
