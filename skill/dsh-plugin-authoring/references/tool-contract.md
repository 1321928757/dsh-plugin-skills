# Tool contract (rc.2)

Source of truth: [official Tool cookbook](https://deepseek-harness.github.io/deepseek-harness/cookbook/adding-a-tool/) and `@deepseek-ai/dsh-tools` types in the DSH `0.1.1-rc.2` installation.

## Minimal registration

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet a person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Name' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      return `Hello, ${args.name}!`
    },
  }))
}
```

`defineTool()` creates a definition; `ctx.tools.register()` installs it and returns a disposer. Put `tools` in `inject` when it is a hard dependency. Registration and all callbacks belong to the plugin fiber.

## Schema and execution rules

- `name`, `description`, `parameters`, `output.schema`, `output.render`, and `execute` form the practical minimum.
- The parameter DSL is deliberately restricted. It supports the documented type/union/object/array/literal forms and annotations; it is not an arbitrary JSON Schema implementation. Explicit object nodes must declare `additionalProperties: true` or `false`.
- Arguments are validated before `execute`. Still enforce constraints the DSL cannot express, such as a non-empty string or a relationship between fields.
- `execute` returns only the canonical lossless JSON value declared by `output.schema`; do not return presentation content blocks.
- Infrastructure failures should throw. A domain result that represents a failed or incomplete operation should remain a valid schema value when callers can handle it.
- Forward `exec.signal` to I/O and stop cooperative work when it aborts. Treat `args` and execution identity as read-only.
- Do not mutate a registered definition, schema, or callback. Replace it by disposing the old registration and registering a new one.

## Model output versus UI cards

`output.render(args, value)` produces model-visible content. `presentCall`, `presentResult`, and `output.presentationMeta` are optional UI/replay projections and must be pure, total, deterministic functions. They must not perform I/O, read mutable session state, use time/randomness, or put UI-only diff/terminal markup into the canonical output.

The rc.2 presentation types define `card` intents such as `generic`, `terminal`, `diff`, `search`, and `web`; these are UI-facing projections, not canonical tool output. Use only intents rendered by the target UI, and check the installed `@deepseek-ai/dsh-tools/lib/types/presentation.d.ts` before relying on a specialized card. Presentation validation is intentionally soft so an old replay cannot crash merely because its card data is no longer valid.

## Hooks and policy

Use the exact current event contract before registering a hook:

- `tools/pre-execute`: allow, deny, or ask policy (waterfall; delegate with `next()`).
- `tools/execute`: deadlines, retries, metrics, or wrappers.
- `tools/post-execute`: post-processing of the outcome/content.
- `tools/code-dispatch-log`: transform only the durable logged copy of Code Mode sub-call content (waterfall).
- `tools/result`: observation of normalized immutable results (emit).
- `tools/change`: observe visible tool-set changes (emit).
- `ctx.tools.guard()`: final monotonic denial; later listeners cannot undo it.

This list is intentionally non-exhaustive; the installed `dsh-tools` event declarations are authoritative.

Keep deployment policy outside individual tools where possible.

## Long-running work

For work that outlives one call, use the current jobs service contract (`ctx.jobs.start`) and return a typed handle such as `{ kind: 'background', jobId }`. After a job is published, use the job-owned cancellation signal rather than the outer tool-call signal. Owner disposal, explicit job kill, and service teardown must all be able to clean it up. Do not recover IDs by parsing human-readable render text.

## Verification checklist

- Invalid arguments are rejected before the body runs.
- Successful values validate against `output.schema`.
- Aborted foreground work settles and releases resources.
- UI presentation can replay with no I/O and no throw.
- Registration disposer removes the tool; HMR does not leave duplicates.
- Nested Code Mode calls still return canonical values, not rendered text.
