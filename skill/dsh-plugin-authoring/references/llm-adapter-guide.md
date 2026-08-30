# LLM Adapter guide (rc.2)

Source: [official adapter practice](https://deepseek-harness.github.io/deepseek-harness/develop/practice/llm-adapter), [adapter cookbook](https://deepseek-harness.github.io/deepseek-harness/cookbook/adding-an-llm-adapter/), and `@deepseek-ai/dsh-llm` types.

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

  // The rc.2 base class already supplies listModels() (empty advisory list),
  // providerInfo(), providerRetryPolicy(), and prepareCall(). Override only
  // when this adapter has stronger metadata or dynamic-route behavior.
}

export const name = 'llm-myprovider'
export const inject = ['llm']
export function apply(ctx) {
  ctx.llm.registerAdapter(['my-provider'], new MyAdapter())
}
```

Use the exact constructor and model-info types from the installed release. Provider configuration belongs in the plugin Config; secrets should use the DSH configuration/credentials conventions rather than a custom secret file.

## Stream obligations

- Emit block start/delta/end in the order required by `StreamChunk`.
- Emit `usage` before `finish`; `finish` is last and no content follows it. Buffer provider terminal data if necessary.
- Keep tool-call arguments as raw JSON text. Streaming fragments use `argumentsDelta`; do not pass parsed objects as deltas.
- Allocate block indexes by first appearance and reuse the same index for later deltas.
- Honor `options.signal` and forward it to fetch/SDK calls.
- Unsupported `GenerateOptions` fields must fail explicitly with a stable `LlmError` code such as `UNSUPPORTED`; never silently discard them.
- Transport/protocol failures should throw a coded `LlmError`. A provider-native in-band failure may instead finish with `kind: 'error'` or `'aborted'`; choose and document the mapping.
- If a provider requires response IDs, signatures, or other native state on a later call, put the minimal lossless projection in `finish.replayState` and validate it during replay.

## Model capabilities and lifecycle

Implement `resolveModel()` only when you need metadata beyond the rc.2 base result; it must include `{ provider, id, name }`. The base `listModels()` returns an empty advisory catalog, while `providerInfo()`, `providerRetryPolicy()`, and `prepareCall()` also have defaults; override only when the adapter can defend stronger metadata or dynamic-route behavior. Return only capability fields the adapter can defend. Reasoning effort IDs are stable opaque adapter IDs; do not expose protocol spellings or invent unsupported defaults.

Each provider route should have one adapter. Multi-route registration should be atomic according to the LLM service contract. `registerAdapter()` returns a disposer/replace handle; registration is fiber-owned and must disappear on dispose/HMR. Keep the handle when settings need to call `replace([...])`; otherwise the service-owned disposer is sufficient. Duplicate-route errors and replacement behavior should be tested.

Every provider HTTP request must include `attributionHeaders()` (or an equivalent library hook that demonstrably adds the same headers). Add a transport-level assertion for this; attribution is not a UI label and must not contain secrets or prompt data.

For Host exposure, use the current API Gateway/Typert binding path (`TypertRemoteService` or `bindTypertRemote`) rather than inventing a service property shape. Generated Client Remote methods return `RemoteResult<T>`; a gateway `invoke()` call is a different layer and returns the business value or throws.

## Test matrix

Test normal text, multi-block streams, tool arguments split across chunks, usage/finish ordering, abort, transport errors, unsupported options, model resolution, and replay state. Use a fake provider transport, not a fake LLM service, so the adapter is exercised through the real registration path.
