# Tool contract (0.2.0-rc.2)

Source of truth: [official Tool cookbook](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-tool) and the `@deepseek-ai/dsh-tools` compiler/types in the DSH `0.2.0-rc.2` installation.

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

`defineTool()` creates a definition; `ctx.tools.register()` installs it and returns a disposer. Registration is effect-based: disposing the plugin fiber unregisters the tool and removes it from system-prompt assembly. Put `tools` in `inject` when it is a hard dependency.

`defineTool` compiles the declared parameters and wraps `execute` so that **arguments are validated before the body runs**; a violation throws `ToolArgsError` with code `INVALID_ARGS`. A value that fails `output.schema` throws `ToolOutputError` with code `INVALID_TOOL_OUTPUT`.

## Parameter DSL

Two different shapes, do not confuse them:

- `ParameterSchemaSpec` — the implicit **open object root** passed as `parameters`. Each property is a `ParameterPropertySpec`, i.e. a value schema **plus** an optional `required?: true` annotation. Requiredness stays a per-property annotation; there is no `required: []` array at the authoring layer.
- `ValueSchemaSpec` — one node. The compiler accepts `json`, `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`, or `oneOf`.

Rules the compiler enforces:

| Rule | Detail |
| --- | --- |
| Object nodes | **Must** declare `additionalProperties: true \| false` explicitly. Missing or non-boolean is an author error. |
| Implicit parameter root | Stays open; you do not declare `additionalProperties` on it. |
| `oneOf` | At least 2 value schemas; cannot be combined with `type`. |
| `enum` / `const` | Scalars only, and must match the node's `type`. |
| Annotations | `description`, `title`, `default`, `examples`. |
| Unknown keywords | Reject rather than being accepted without enforcement. |

`{ type: 'json' }` infers `JsonValue` and compiles to an annotation-only raw schema. Inference is exact to 16 container levels, then falls back to `JsonValue`.

Arguments are validated before `execute`, but constraints the DSL cannot express (non-empty string, cross-field relationship) remain yours to enforce in the body.

### Raw JSON Schema tools

MCP-style tools bypass `defineTool` and own their input validation. The enforced raw subset is:

```ts
{ type?, oneOf?, properties?, required?, additionalProperties?, items?, enum?, const?, description?, title?, default?, examples? }
```

Helpers: `assertSupportedJsonSchema()`, `validateJsonSchemaValue()`, `assertObjectJsonSchema()`, and the `JsonSchemaError` class (which collects **every** violation in `violations` rather than stopping at the first).

## Execution rules

- `execute` returns only the canonical lossless JSON value declared by `output.schema`; never return presentation content blocks.
- Forward `exec.signal` to I/O and stop cooperative work when it aborts. Treat `args` and execution identity as read-only.
- Infrastructure failures should throw. A domain result representing a failed or incomplete operation should remain a valid schema value when callers can handle it.
- Do not mutate a registered definition, schema, or callback. Replace it by disposing the old registration and registering a new one.
- Optional host-only fields: `projectContent`, `finalizeContent`, `timeoutMs` (positive finite number), `isConcurrencySafe` (must return exactly `true` to opt in to parallel scheduling), `deferLoading`.

## Model output versus UI cards

```ts
interface ToolOutputDefinition {
  readonly schema: JsonSchemaNode
  render(args: unknown, value: JsonValue): ContentBlock[]
  presentationMeta?(args: unknown, value: JsonValue): JsonValue
}
```

`output.render` produces model-visible content. `presentCall`, `presentResult`, and `presentationMeta` are UI/replay projections and must be pure, total, deterministic functions: no I/O, no mutable session state, no clock/randomness, and no UI-only diff/terminal markup inside the canonical output.

`defineTool` soft-validates this path — a replay-only presenter that cannot validate its args returns `undefined` and falls back to generic rendering instead of throwing, so an old session log can never crash the renderer.

> **These cards are not a 0.2 feature.** `presentation.ts` already existed in full at 0.1.1-rc.2. Do not list it as a migration item.

Card tags at rc.2:

- `presentCall(args)` → `ToolCallView`: `{ card: 'generic', title, kind?, rawInput?, content?, locations? }`, `{ card: 'terminal', title, description?, cwd? }`, `{ card: 'diff', title, diffs, locations? }`.
- `presentResult(args, { content, isError, meta? })` → `ToolResultView`: `generic`; `terminal` (`output?`, `exitCode?`, `signal?`); `diff`; `read` (`path`, `offset`, `lines`, `totalLines`, `lang?`, `content?`); `search` (`shape: 'matches' | 'paths'`, `truncated`, `total`); `web` (`kind: 'search' | 'fetch'`).

**The built-in Web Client does not consume `presentCall`/`presentResult`.** To give a tool a dedicated conversation card, a client plugin must register the wire tool name in the keyed slot `tool.call.toolview` and derive props from `ToolCallBlock`. Defining only a Host presentation method does not add a Web card.

## Hooks and policy

Order of the dispatch pipeline:

```text
tools/pre-execute  → ctx.tools.guard() → tools/execute → projectContent
                   → tools/post-execute → finalizeContent → tools/result
```

| Event | Mode | Use |
| --- | --- | --- |
| `tools/pre-execute` | waterfall | allow / deny / cancel / ask before dispatch |
| `tools/execute` | waterfall | around-dispatch timeout, retry, metrics (only `exec.signal` is replaceable) |
| `tools/post-execute` | waterfall | accept, replace, enrich, or block a normalized result |
| `tools/ptc-dispatch-log` | waterfall | replace content in the durable log copy of a `run_code` sub-dispatch |
| `tools/result` | emit | observe the frozen, lossless-JSON final outcome |
| `tools/change` | emit | observe visible tool-set changes (registry-wide, deliberately unfiltered) |

Decision types:

```ts
type PreToolDecision =
  | { kind: 'allow' }
  | { kind: 'deny', reason: string, info?: unknown }
  | { kind: 'cancel' }
  | { kind: 'ask', reason?: string, displayReason?: string }

type PostToolDecision =
  | { kind: 'accept', content?, value?, additionalContexts? }
  | { kind: 'block', feedback: string, additionalContexts? }
```

`ctx.tools.guard()` returns `string | undefined` and has **no allow result**, so a denial is monotonic — no later listener can undo it. `ctx.tools.restrict({ allow?, deny? })` intersects restrictions; it does not affect scope-local registrations.

> `tools/code-dispatch-log` was **renamed** to `tools/ptc-dispatch-log`. A listener registered under the old name does not error — it simply never fires. Re-check every event name against the live `listEvents` catalog after an upgrade.

The listed set is intentionally non-exhaustive; the installed event declarations and `cordis_inspect_query(platform:'host', provider:'Event', method:'listEvents')` are authoritative.

Keep deployment policy outside individual tools where possible.

## Long-running work

For work that outlives one call, use the current jobs service contract (`ctx.jobs.start`) and return a typed handle such as `{ kind: 'background', jobId }`. After a job is published, use the **job-owned** cancellation signal rather than the outer tool-call signal. Owner disposal, explicit job kill, and service teardown must all be able to clean it up. Do not recover IDs by parsing human-readable render text.

## Verification checklist

- Invalid arguments are rejected before the body runs (`ToolArgsError` / `INVALID_ARGS`).
- Successful values validate against `output.schema` (`ToolOutputError` / `INVALID_TOOL_OUTPUT` otherwise).
- Aborted foreground work settles and releases resources.
- UI presentation can replay with no I/O and no throw.
- Registration disposer removes the tool; HMR does not leave duplicates.
- Nested Code Mode calls still return canonical values, not rendered text.
- Tool-only fields (`output`, `execute`, `presentCall`, …) never appear in the model request — `schemas()` whitelists name/description/parameters only.
