/*
 * Client bundle shape reference for DSH 0.1.1-rc.2.
 * Write ESM/TS source and let the client bundler emit this classic-script,
 * lazy-CJS registration wrapper. Do not hand-edit a generated bundle.
 *
 * The script registers a factory only. The factory is materialized later, so
 * code/CSS side effects belong inside it. `dsh.client.external` must describe
 * package modules whose code must arrive before synchronous require.
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
      // `slots` is a hard Client service for this contribution. Do not use
      // ctx.get() plus a silent return, which hides a broken composition.
      // This key is present in the rc.2 conversation UI composition, but Slot
      // keys are dynamic. Verify it with current SlotMap/Inspect before
      // shipping to another profile; an undeclared key is a contract error.
      // The inspected slot is a list/session slot, hence id and order are used.
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
