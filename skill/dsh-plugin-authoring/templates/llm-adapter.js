/** LLM Adapter outline; verify exact exports/types in the installed release. */
import { attributionHeaders, LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm'

class MyProviderAdapter extends LlmAdapter {
  async *stream(options) {
    options.signal?.throwIfAborted?.()
    // A real transport must merge attributionHeaders() into every provider
    // request, forward options.signal, and translate provider events into
    // StreamChunk values. Emit usage before finish; finish is last; keep tool
    // arguments as raw JSON text in argumentsDelta.
    const headers = { ...attributionHeaders() }
    // Example only: pass `headers` to fetch()/the provider SDK request.
    void headers
    throw new LlmError('Implement provider transport', 'UNSUPPORTED')
  }

  async resolveModel(provider, model, signal) {
    signal?.throwIfAborted?.()
    return { provider, id: model, name: model }
  }

  // listModels(), providerInfo(), providerRetryPolicy(), and prepareCall()
  // already have rc.2 base implementations. Override only when needed.
}

export const name = 'llm-my-provider'
export const inject = ['llm']
export function apply(ctx, config) {
  const registration = ctx.llm.registerAdapter(['my-provider'], new MyProviderAdapter(config))
  // registerAdapter() returns a disposer/replace handle. The registration is
  // fiber-owned by the LLM service; retain it only if this plugin needs to
  // call registration.replace([...]) when settings change.
  void registration
}
