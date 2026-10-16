/*
 * Client bundle shape reference for DSH 0.2.0-rc.2.
 * Write ESM/TS source and let the client bundler emit this classic-script,
 * lazy-CJS registration wrapper. Do not hand-edit a generated bundle.
 *
 * The script registers a factory only. The factory is materialized later, so
 * code/CSS side effects belong inside it. `dsh.client.external` must describe
 * package modules whose code must arrive before synchronous require.
 *
 * 0.2 notes:
 *   - `dsh.client.inject` is now a real factory-arrival/composition edge, not
 *     just informational metadata.
 *   - Resources are served as COMBO routes (several plugins in one classic
 *     script), with package-local `client.<name>.js` chunks for dynamic
 *     imports. Do not hard-code the old per-plugin URL shape.
 *   - A browser half mounts only on the Loader row whose specifier is exactly
 *     the bare package name.
 *   - Cordis Contexts resolve ONLY the service names this entry declared in
 *     `inject`. `ctx.someService` throws `cannot get property "…" without
 *     inject` otherwise, and a throw inside a client apply() fails the WHOLE
 *     web boot (`web boot: N entry did not activate`). Optional services go
 *     through `ctx.get(...)`; "run once it exists" goes through
 *     `ctx.inject([...], (c) => …)`. See SKILL.md §4 and §7.
 */
window.__ModuleLoader__.load({
  id: 'dsh-my-client-plugin',
  factory: (require) => {
    const React = require('react')
    // The manifest's dsh.client.external entry makes this module arrive before
    // synchronous require. The actual runtime object is used by generated UI
    // code; this minimal shape keeps the dependency visible in the example.
    const runtime = require('@deepseek-ai/dsh-client-runtime')
    void runtime

    // Factory materialization point: CSS is intentionally injected here.
    const cssTagId = 'dsh-my-client-plugin/client.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + cssTagId + '"]') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-my-client-plugin'
      tag.dataset.pluginCss = cssTagId
      tag.textContent = '.myp-root { color: var(--dsw-alias-label-primary); }'
      document.head.appendChild(tag)
    }

    function MyButton() {
      return React.createElement('button', { type: 'button', className: 'myp-root' }, '我的插件')
    }

    function apply(ctx) {
      // Optional capabilities answer `undefined` here; a property read of an
      // undeclared service would THROW and take the whole web boot down.
      const optional = ctx.get('someOptionalService')
      void optional
      // Wait for a late service instead of reading it by property:
      //   ctx.inject(['remote'], (c) => { /* c.remote is resolved */ })

      // `slots` is a hard Client service for this contribution. Do not use
      // ctx.get() plus a silent return, which hides a broken composition.
      // Slot keys are dynamic. This key exists in the composed 0.2.0-rc.2 Web
      // conversation UI, but verify it with the live Slot tree before shipping
      // to another profile: an undeclared key is a contract error, and
      // registering to a child slot another entry already owns fails too.
      //
      //   cordis_inspect_query({ platform: 'client', provider: 'Slots', method: 'listSubTree' })
      //
      // Selection fields follow the slot's KIND: `list` takes id (+ optional
      // order/label), `keyed` takes key, `chain` takes select, `single` is a
      // hole to be filled. `priority` (lower first) is shadowing order for
      // single/list/keyed and election order for chain.
      ctx.slots.inject('conversation.input.left', () => {
        const dispose = ctx.slots.register(
          { name: 'conversation.input.left', id: 'dsh-my-client-plugin', order: 100 },
          MyButton,
        )
        return dispose
      })
    }

    return { inject: ['slots'], apply }
  },
})
