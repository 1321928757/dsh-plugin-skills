/**
 * dsh-my-plugin 浏览器端 bundle 骨架（单文件，经 __ModuleLoader__ 加载）。
 * 红线：
 *  - 纯 JS：禁 TypeScript / JSX / import / 打包器；第三方库用 require('react') 方式获取；
 *  - 样式只用 --dsw-* 主题令牌；品牌色用 color-mix 与令牌混色（@supports 回退）；
 *  - Typert 网关返回 {ok, value|error} 包装，host.call 里必须解包（"调用失败"的常见根因）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',
  factory: (require) => {
    const React = require('react')

    // ── 样式注入（防重复，随插件卸载由宿主 HMR 驱动清理）─────────────
    const css = `
      .myp-root {
        display:inline-flex; align-items:center; gap:4px; position:relative;
        --myp-accent: color-mix(in srgb, var(--dsw-alias-brand-primary) 62%, #0D9488 38%);
      }
      @supports not (background: color-mix(in srgb, red 50%, blue 50%)) {
        .myp-root { --myp-accent: var(--dsw-alias-brand-primary); }
      }
      .myp-btn {
        height:26px; padding:0 12px; border:none; border-radius:8px; cursor:pointer;
        font-weight:600; color:#fff; font-size:12px; line-height:1;
        background:linear-gradient(135deg, var(--myp-accent), var(--dsw-alias-brand-primary));
        transition:all .18s ease;
      }
      .myp-btn:hover:not(:disabled) { transform:translateY(-1px); }
      .myp-btn:active:not(:disabled) { transform:scale(.98); }
      .myp-btn:disabled { opacity:.45; cursor:not-allowed; }
      .myp-btn:focus-visible { outline:2px solid var(--myp-accent); outline-offset:2px; }
      .myp-info { color:var(--dsw-alias-label-secondary); font-size:11px; }
      @media (prefers-reduced-motion: reduce) {
        .myp-root *, .myp-btn { transition:none !important; }
      }
    `
    const cssTagId = 'dsh-my-plugin/client.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(cssTagId) + ']') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-my-plugin'
      tag.dataset.pluginCss = cssTagId
      tag.textContent = css
      document.head.appendChild(tag)
    }

    // ── Typert 贡献（与 ./typert.host.js 清单一一对应）──────────────
    // 客户端侧 codec 可用宽松 parse 对象（dsh-prompt-polish 实证）；
    // Host 侧 ./typert 清单的 codec 则必须是 zod v4 实例（loader 强校验，见该模板）。
    const descriptor = (method) => ({
      id: 'dsh-my-plugin#myService/' + method,
      service: 'myService',
      namespace: 'myService',
      method,
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-my-plugin#Args', schema: { parse: (v) => v } } },
      ],
      result: { mode: 'strict', typeSymbol: 'dsh-my-plugin#Result', schema: { parse: (v) => v } },
    })
    const CONTRIBUTION = { package: 'dsh-my-plugin', descriptors: [descriptor('ping')] }

    async function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return

      const remote = ctx.get('remote')
      if (remote === undefined || typeof remote.$mount !== 'function') return
      const unmount = await remote.$mount(CONTRIBUTION)
      ctx.effect(() => () => { unmount() }, 'dsh-my-plugin: remote contribution')
      const api = ctx.get('remote.myService')
      if (api === undefined) return

      // 红线：网关返回 {ok, value|error} 包装，必须解包成业务结果
      const host = {
        call: async (method, payload) => {
          const result = await api[method](payload)
          if (result === null || typeof result !== 'object') throw new Error('服务无响应')
          if (result.ok !== true) {
            const detail = result.error !== undefined && result.error !== null
              ? (typeof result.error === 'string' ? result.error : result.error.message)
              : ''
            throw new Error(detail || '调用失败')
          }
          return result.value
        },
      }

      function MyButton() {
        const [text, setText] = React.useState('')
        const click = async () => {
          try {
            const res = await host.call('ping', {})
            setText(JSON.stringify(res))
          } catch (err) {
            setText('错误: ' + err.message)
          }
        }
        return React.createElement(
          'span',
          { className: 'myp-root' },
          React.createElement('button', { type: 'button', className: 'myp-btn', onClick: click }, '我的插件'),
          text ? React.createElement('span', { className: 'myp-info' }, text) : null,
        )
      }

      // 输入栏左侧插槽。其他常见位置（先 cordis_inspect_query Slots.listSubTree 查可用名）：
      //   conversation.composer.dock / conversation.session.header.actions / conversation.view
      //   conversation.chat.turnTail（chain 型：select + priority）/ sidebar.footer.action
      //   settings.section（设置页独立分节）/ settings.general.item（设置行开关）
      // 数据通道备选：不走 Typert 时，Host 用 ctx.webServer.register({kind:'exact',path}) 挂 HTTP JSON API，
      //   Client 直接 fetch 直读 {ok,...}（无 {ok,value} 包装，别套用本文件的解包逻辑）。
      slots.inject('conversation.input.left', () => slots.register(
        { name: 'conversation.input.left', id: 'dsh-my-plugin', order: 100, label: '我的插件' },
        (props) => React.createElement(MyButton, props),
      ))
    }

    return { inject: ['remote'], apply }
  },
})
