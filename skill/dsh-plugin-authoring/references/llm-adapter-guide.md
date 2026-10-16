# LLM Adapter guide (0.2.0-rc.2)

Source: [official adapter practice](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter) and `@deepseek-ai/dsh-llm` types. Official docs live under `/reference/…` and `/develop/…`; older `/cookbook/…` links without the `reference` prefix return 404.

## Shape and registration

```ts
import { attributionHeaders, LlmAdapter } from '@deepseek-ai/dsh-llm'

class MyAdapter extends LlmAdapter {
  async *stream(options) {
    options.signal?.throwIfAborted?.()
    // Merge attributionHeaders() into every provider request and forward the
    // signal. Translate provider events into StreamChunk values.
    const headers = { ...attributionHeaders() }
    void headers
  }

  async resolveModel(provider, model, signal) {
    signal?.throwIfAborted?.()
    return { provider, id: model, name: model }
  }

  // The base class already supplies listModels() (empty advisory list),
  // providerInfo(), providerRetryPolicy(), and prepareCall(). Override only
  // when this adapter has stronger metadata or dynamic-route behavior.
}

export const name = 'llm-myprovider'
export const inject = ['llm']
export function apply(ctx) {
  ctx.llm.registerAdapter(['my-provider'], new MyAdapter())
}
```

An adapter is a class extending `LlmAdapter` with a Schemastery `Config`, `export const inject = ['llm']`, and `ctx.llm.registerAdapter(['provider-route'], adapter)`. The first argument lists the provider routes the adapter handles; `GenerateOptions.provider` selects it. `GenerateOptions.model` is an adapter-owned model id, not something registered at lifecycle start.

Use the exact constructor and model-info types from the installed release. Provider configuration belongs in the plugin Config; secrets should use the DSH configuration/credentials conventions rather than a custom secret file.

## Stream obligations

`stream()` returns `AsyncIterable<StreamChunk>`. The protocol:

```ts
// text block
{ type: 'block-start', index, blockType: 'text' }
{ type: 'text-delta', index, text }
{ type: 'block-end', index, block: { ... } }

// tool call block
{ type: 'block-start', index, blockType: 'tool-call' }
{ type: 'tool-call-delta', index, id, name, argumentsDelta }
{ type: 'block-end', index, block: { type: 'tool-call', id, name, arguments } }

// terminal
{ type: 'usage', usage: { inputTokens, outputTokens } }
{ type: 'finish', reason: { kind: 'stop' | 'tool-calls' } }
```

Rules:

- Every `block-start` needs a matching `block-end`.
- `index` starts at 0 and increases; allocate by first appearance and reuse the same index for later deltas.
- Tool-call arguments stay **raw JSON text**: streaming fragments use `argumentsDelta`; never pass parsed objects as deltas.
- Tool-call ids are branded strings (`brandString<ToolCallId>('call-123')` from `@deepseek-ai/dsh-brand`).
- `usage` must be emitted **before** `finish`, and `finish` must be the **last** chunk. Buffer provider terminal data if necessary.
- Honor `options.signal` and forward it to fetch/SDK calls.
- Unsupported `GenerateOptions` fields (including a reasoning effort or stop-sequence form you cannot express) must fail explicitly with a stable `LlmError` code such as `UNSUPPORTED`; never silently discard them.
- Transport/protocol failures should throw a coded `LlmError` — do not rely on a plain `Error` being converted automatically. A provider-native in-band failure may instead finish with `kind: 'error'` or `'aborted'`; choose and document the mapping.
- If a provider requires response IDs, signatures, or other native state on a later call, put the minimal lossless projection in `finish.replayState` and validate it during replay.

## Model capabilities and lifecycle

Implement `resolveModel()` when you need metadata beyond the base result; it must include at least `{ provider, id: model, name: model }`. Preserve the adapter's authoritative optional capability list — including `off` — for reasoning effort; do not promote provider-specific spellings into a core enum, and do not invent unsupported defaults.

Async capability queries must honor the abort signal. The service validates the aggregate and **rejects an explicitly requested but unsupported reasoning effort before calling `stream()`**. Omitting `reasoning` in the resolved metadata means the model has no selectable reasoning capability.

The base `listModels()` returns an empty advisory catalog, while `providerInfo()`, `providerRetryPolicy()`, and `prepareCall()` also have defaults; override only when the adapter can defend stronger metadata or dynamic-route behavior.

Each provider route should have one adapter. Multi-route registration should be atomic according to the LLM service contract. `registerAdapter()` returns a disposer/replace handle; registration is fiber-owned and must disappear on dispose/HMR. Keep the handle when settings need to call `replace([...])`; otherwise the service-owned disposer is sufficient. Duplicate-route errors and replacement behavior should be tested.

Every provider HTTP request must include `attributionHeaders()` (or an equivalent library hook that demonstrably adds the same headers). Add a transport-level assertion for this; attribution is not a UI label and must not contain secrets or prompt data.

For Host exposure, use the current API Gateway/Typert binding path (`TypertRemoteService` or `bindTypertRemote`) rather than inventing a service property shape. Generated Client Remote methods return `RemoteResult<T>`; a gateway `invoke()` call is a different layer and returns the business value or throws. See [`typert-contract.md`](typert-contract.md) §4.

## Test matrix

Test normal text, multi-block streams, tool arguments split across chunks, usage/finish ordering, abort, transport errors, unsupported options, model resolution, and replay state. Use a fake provider transport, not a fake LLM service, so the adapter is exercised through the real registration path.
