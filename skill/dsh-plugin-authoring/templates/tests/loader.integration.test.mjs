import test from 'node:test'
import assert from 'node:assert/strict'

// Replace this scaffold with the target release's real Loader/profile harness.
// Do not call apply() directly: the test must cover patch insertion, dependency
// waiting, registration, disposal, and reload when a Service returns.
//
// Useful assertions once implemented:
//   - the plugin row appears in `dsh --profile <p> --dump-config`;
//   - disposing the fiber removes every registration (no duplicates after HMR);
//   - a hard `inject` dependency makes the plugin wait, then activate;
//   - an incompatible `@deepseek-ai/dsh*` peer range is reported, not ignored.
test('loader/profile integration scaffold', { skip: 'implement with a real 0.2.0-rc.2 Loader harness' }, () => {
  assert.fail('scaffold')
})
