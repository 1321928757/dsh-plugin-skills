# Event mode and selection guide

This is a navigation index, not a versioned signature catalog. Query the current Cordis/Event contract or inspect the installed package before writing a listener. Official event concepts are documented in the DSH framework event guide.

## Modes

| Mode | Meaning | Listener obligation |
|---|---|---|
| `emit` | One-way broadcast | Observe; do not expect a downstream result |
| `parallel` | Run listeners concurrently and await all of them | Do not rely on listener order; follow the event's rejection contract |
| `bail` | Stop when a listener returns the contract's terminating value | Return only the documented result |
| `serial` | Run listeners in sequence under the event's serial contract | Follow the event's exact arguments; do not invent `next()` |
| `waterfall` | Wrap/decorate a downstream result | Call `next()` exactly as the event contract requires |

A mode is part of the event contract. Do not change a listener from `emit` to `waterfall` based on a similarly named event.

## Useful rc.2 navigation points

These names are useful starting points, not a promise that every deployment mounts them:

| Event | Typical use | Mode to verify | rc.2 evidence/navigation |
|---|---|---|---|
| `tools/pre-execute` | permission/approval gate | `waterfall` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:28-39` |
| `tools/execute` | timeout/retry/metrics wrapper | `waterfall` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:41-50` |
| `tools/post-execute` | alter an outcome or content | `waterfall` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:52-61` |
| `tools/code-dispatch-log` | transform durable Code Mode sub-call content | `waterfall` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:63-75` |
| `tools/result` | observe normalized tool results | `emit` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:77-83` |
| `tools/change` | observe visible tool-set changes | `emit` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts:85-93` |
| `llm/stream` | wrap a model stream | `waterfall` | `@deepseek-ai/dsh-llm/lib/types/index.d.ts:35-43` |
| `llm/adapters-updated` | observe provider changes | `emit` | query the installed `dsh-llm` Event contract |
| `system-prompt/assemble` | contribute/transform prompt assembly | `waterfall` | query the installed `dsh-system-prompt` Event contract |
| `agent/session-start` / `agent/status` | observe lifecycle | `emit` | query the installed `dsh-agent` Event contract |
| `agent/turn-stopping` | ordered stopping work | `serial` | query the installed `dsh-agent` Event contract |

## Persisted session events are different

`turn/*`, `step/*`, `tool/call`, `tool/result`, and `compaction/*` are persisted `SessionEvent` types. Observe them through the documented `session/event` path and inspect `event.type`; do not infer that a persisted event is a Cordis event with the same name or mode.

## Resource hygiene

Register with `ctx.on()` so the listener is fiber-owned. For `waterfall`, preserve the downstream value and cancellation semantics. Test disposal and HMR replacement: after the disposer runs, no new callback should begin.
