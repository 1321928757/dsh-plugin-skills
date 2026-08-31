---
name: dsh-plugin-ui
description: DSH Web 插件 UI 设计与实现规范。用于设计、实现、审查或重构 DSH 插件的 settings.section、settings.plugin.item、conversation.view、sidebar、overlay、modal、数据面板和工作台界面，确保视觉风格、主题令牌、交互状态、响应式布局与 DSH Web UI 一致。
---

# DSH Plugin UI

一套面向 DeepSeek Harness Web 插件的 UI 设计、实现与验收规范。

本 skill 的目标不是让所有插件长得一样，而是让每个插件在保留自身产品个性的同时，遵守 DSH 的空间、颜色、字体、交互和生命周期语言：**像 DSH 的一部分，而不是嵌在 DSH 上的另一个网站**。

> 设计原则：先理解宿主，再表达插件；先建立层级，再添加装饰；先保证状态和可用性，再追求视觉亮点。

---

## 1. 适用范围与不可违反的边界

### 1.1 适用的 UI 类型

- 设置页独立分区：`settings.section`
- 插件设置卡：`settings.plugin.item`
- 会话视图或分析面板：`conversation.view`
- 消息操作按钮：`conversation.chat.assistant-actions`
- 输入栏按钮、浮层和命令面板：`conversation.input.*`
- 壳层通知和 Toast：`shell.overlay`
- 宿主侧栏扩展服务注册的 Tab、文件查看器、自由窗口和侧栏设置
- 数据密集型 dashboard、列表、时间线、图表、诊断页
- 设置、确认、预览、图片 lightbox、进度和错误反馈

### 1.2 运行形态

先判断插件是：

| 形态 | UI 实现约束 |
| --- | --- |
| 发布版 profile bundle | 通常是 TS/TSX + tsdown + CSS/CSS Modules；客户端由 `exports["./client"]` 交给 DSH Web 加载 |
| 动态 Cordis Plugin | 客户端代码必须是运行时支持的 plain JavaScript；使用 `React.createElement`，不能使用 import、TypeScript、JSX 或假定存在的第三方包 |
| 宿主扩展服务的消费插件 | 只使用宿主公开的服务和注册表；不要 value-import 另一个插件的内部模块 |

不要把 DSH Web 当作普通独立 React 应用。插件 UI 必须通过已声明的 Slot、官方 primitives 或公开服务挂载；不要自行启动另一个 Web 应用覆盖宿主页面。

### 1.3 DSH-specific 红线

- 不用未通过运行时检查的 Slot 名称、服务名、组件 props 或主题令牌。
- 不通过全局 `body`、`#root`、裸 `button`、裸 `input` 改写宿主样式；布局型插件只有在明确拥有宿主布局扩展点时才可例外。
- 不把 `--dsw-specific-sidebar-fill` 用作普通插件面板背景；它属于宿主侧栏皮肤语义，皮肤插件可能将它设为透明。
- 不把 `Inspect` 返回的 live object 当作业务数据，也不序列化 Service、Slot、Session 或 Context 对象。
- 不在浏览器端传递函数、类实例、`undefined` 或其他非 lossless JSON 值。
- 每个 style、listener、timer、Slot、订阅、路由和 observer 都必须可由当前 Fiber 回收。
- 不以 emoji 作为结构性图标、警告图标、状态图标或导航图标。
- 不用硬编码的独立品牌调色板替换 DSH 主题；插件自己的强调色只能作为少量、可解释的 signature。

---

## 2. 独立设计原则：先约束，再表达

本 skill 不依赖任何特定插件、仓库或本地实现。下面的规则是可迁移的 UI 设计与工程原则；它们描述“应该验证什么”和“如何做出取舍”，而不是要求复制某个项目的界面。

### 2.1 先确认事实，再选择方案

实现前只依赖当前目标宿主能够确认的事实：

- 当前可用的 Slot、Service、primitive、主题令牌和组件 props；
- 插件实际承担的用户任务、数据来源和生命周期；
- 目标容器的宽度、滚动边界、权限状态和可用的浏览器能力；
- 目标插件自己的代码、测试、依赖和兼容性声明。

如果某个名称、接口或视觉 token 无法从当前宿主契约、目标插件代码或实际运行验证中确认，就把它当作未知项处理：先探测、提供降级，或删除该假设。不要因为某个旧示例“看起来能用”就将其写入实现。

### 2.2 可迁移的 UI 取舍

- 设置页面按用户任务分组，每组回答一个问题；
- 官方交互组件优先承担按钮、菜单、弹窗、提示和消息等宿主 chrome，插件 CSS 主要处理布局与领域内容；
- 异步界面保留已有数据，显式表达 busy、进度、错误和 retry；
- 复杂诊断默认折叠但保留摘要，避免首屏被实现细节占满；
- 图片和异步区域预留尺寸，避免布局跳动；
- 数据图形同时提供文本、表格或摘要，让精确值不依赖 hover；
- 不可信 projection、日志和 RPC 结果在边界验证，单条坏记录不能击穿整个视图；
- 资源释放绑定到真实生命周期：组件卸载、Tab 关闭和插件停止不能混为一谈；
- 只在确实拥有布局集成责任时触碰宿主 DOM，其余插件使用公开 Slot 和服务。

### 2.3 明确拒绝的做法

- 依赖 hover 才能获得重要信息；
- 用 emoji 代替结构性图标、状态图标或警告图标；
- 只依赖 placeholder 的表单输入；
- 使用固定 `100vh`、固定嵌套滚动或固定桌面双栏冒充响应式设计；
- 把图表完全标记为 `aria-hidden`，却没有文本摘要或数据表；
- 用全局 selector、宿主 DOM 路径或猜测的 z-index 污染宿主；
- 使用硬编码独立调色板、随机强阴影、过度渐变或玻璃拟态替代主题契约；
- 让输入值在每次 change 时强制 clamp 或回退，打断用户完成编辑；
- 使用数组 index 作为动态列表的 React key；
- 只显示技术 stack、只显示 spinner，或在错误后没有恢复路径。

---

## 3. 设计流程：Brief → Wireframe → Tokens → UI → Critique → Browser

不要直接从“做一个漂亮页面”开始写 JSX。每次实现前先完成以下短流程。

### Step 1：定义宿主位置和唯一任务

先写清楚：

```text
Surface: settings.section / conversation.view / sidebar tab / overlay / modal
User: 谁在什么上下文中使用它
Single job: 用户在此界面最重要的一件事是什么
Data: 数据来自 projection、公开 service、RPC、HTTP 还是本地状态
Density: compact / comfortable / data-dense
Signature: 一个与插件领域相关、可解释且克制的记忆点
```

一个页面只能有一个 primary action。其余动作应退居 secondary、ghost、link 或 overflow。

### Step 2：先查运行时契约

在编写 Slot、primitive、theme 或 service 代码前：

1. 用当前运行时 Inspect 查询可用的 Slot 树。
2. 查询对应 Slot 的注册 contract、kind、props、order 语义。
3. 查询实际 theme tokens 和官方 UI primitives 的签名。
4. 检查当前 DSH 版本的 client inject 和兼容性要求。
5. 记录“必须存在”的硬依赖和“存在则启用”的可选能力。

不要把旧文档、旧版本示例或其他项目的 Slot 名称和 props 当作当前运行时事实。

### Step 3：写 4–6 个视觉决定

至少明确：

- 表面层级：base、layer-1、layer-2、layer-3 如何分工
- 文字层级：title、body、metadata、code
- 主要交互色：使用 brand/business token 还是插件 signature 色
- 空间节奏：compact 还是 comfortable；主 gap 和 section gap
- 组件形状：flat card、soft card、pill、边界线或工作台分栏
- 一个 signature element：例如上下文堆叠条、文件树、状态时间线；不是无意义的渐变或装饰光晕

然后问自己：如果删掉插件名称，是否仍能看出这是为该领域做的 UI？如果答案是否定的，重新选择 signature；如果页面像通用 AI dashboard，删除一个模板化装饰。

### Step 4：先画结构，不先调色

推荐用 ASCII 记录布局：

```text
[标题 + 说明]                         [版本/主动作]
[状态 banner ------------------------------------------------]
[Group: 标题/说明                                      ]
[字段行：标签/说明                         控件           ]
[字段行：标签/说明                         控件           ]
[Group: ...                                           ]
[sticky footer：状态                         保存           ]
```

或：

```text
[view header / filters / segmented controls]
[summary cards: 4 → 2 → 1]
[primary content                         ][detail]
[events / activity                      ][secondary]
```

每个容器只回答一个问题。不要把 settings、diagnostics、history、actions 和 marketing copy 混在同一张卡里。

### Step 5：两轮审查

**实现前审查**：

- 是否误用了奶油+衬线、黑底酸绿、通用 bento、随机玻璃拟态等 AI 默认风格？
- 是否有一个且只有一个可解释的 signature？
- 是否每个颜色、半径、阴影、间距都有 token 或宿主语义？
- 是否能在宿主宽度而不是理想 viewport 下成立？

**实现后审查**：

- 亮色、暗色、自定义 skin、窄宽和文字放大是否仍有层级？
- loading、empty、error、readonly、disabled、saving、success 是否可见并可恢复？
- 键盘操作是否完整；hover 信息是否有 focus/tap 等价路径？
- 是否出现白屏、横向溢出、滚动跳闪、布局抖动或浮层被宿主遮挡？

---

## 4. DSH 主题契约

### 4.1 令牌优先级

遵循三层思想，但不要在插件内重新发明一套与 DSH 冲突的全局主题：

```text
DSH host tokens  →  plugin semantic aliases  →  component state tokens
```

插件可以定义局部变量，但局部变量必须指向宿主 token：

```css
.my-plugin__root {
  --my-surface: var(--dsw-alias-bg-layer-1);
  --my-surface-raised: var(--dsw-alias-bg-layer-3);
  --my-border: var(--dsw-alias-border-l2);
  --my-text: var(--dsw-alias-label-primary);
  --my-muted: var(--dsw-alias-label-tertiary);
  --my-accent: var(--dsw-alias-brand-primary);
}
```

组件只消费 `--my-*` 或直接消费已确认的 DSH token。不要在组件中散落 raw hex。

### 4.2 常用 DSH token 目录

下面是常见的语义 token 角色。它们不是跨所有 DSH 版本的硬编码保证；实际开发前必须以当前运行时 Inspect 和宿主 CSS 为准。

| 语义 | 优先 token |
| --- | --- |
| 页面/基础表面 | `--dsw-alias-bg-base` |
| 普通卡片/面板 | `--dsw-alias-bg-layer-1` |
| 内嵌区域/控件背景 | `--dsw-alias-bg-layer-2`、`--dsw-alias-bg-input` |
| 高层卡片/设置组 | `--dsw-alias-bg-layer-3` |
| 平台控件 | `--dsw-alias-bg-module-platform` |
| 菜单/特定浮层 | `--dsw-specific-menu`、官方 primitive |
| 主文字 | `--dsw-alias-label-primary` |
| 次文字 | `--dsw-alias-label-secondary` |
| 说明/metadata | `--dsw-alias-label-tertiary`、`--dsw-alias-label-dimmed` |
| 反色文字 | `--dsw-alias-label-primary-foreground`，或确认后的 primitive label token |
| 可见卡片边界 | `--dsw-alias-border-l2` |
| hairline/divider | `--dsw-alias-border-l1`、`--dsw-alias-hairline` |
| 更强边界/focus | `--dsw-alias-border-l4`、`--dsw-alias-label-dimmed` |
| 品牌链接/强调 | `--dsw-alias-brand-primary` |
| primary control | `--dsw-alias-button-primary-fill`、`--dsw-alias-state-business-primary` |
| hover/active | `--dsw-alias-interactive-bg-hover`、`--dsw-alias-interactive-bg-active`、`--dsw-alias-interactive-bg-hover-accent` |
| 成功/警告/错误 | `--dsw-alias-state-success-primary`、`--dsw-alias-state-warn-primary`、`--dsw-alias-state-error-primary` |
| danger 兼容别名 | `--dsw-alias-danger`，使用前确认当前宿主是否提供 |
| 阴影 | `--dsw-shadow-lv1`、`--dsw-shadow-lv2`、`--dsw-shadow-lv3` |
| 字体角色 | `--dsw-font-s-14`、`--dsw-font-xxs-12`、`--dsw-font-xxxs-11` 及 strong variants |
| 字体族 | `--ds-font-family-sans`、`--ds-font-family-code`、确认后的 `--dsw-font-mono` |
| motion | `--ds-transition-duration-slow`、`--ds-ease-in-out` |
| 宿主布局辅助 | `--dsh-content-font-delta`、`--dsh-scrollbar-width` |

### 4.3 表面、边界和阴影

DSH Web 的典型语言是“层级由不同 surface + hairline border 表达”，不是每张卡都加阴影：

- `layer-1`：普通卡片、面板、列表容器。
- `layer-2`：卡片内部统计格、输入、内嵌详情、hover surface。
- `layer-3`：设置 group、高层内容或需要与页面背景分离的容器。
- `border-l2`：能被看见的卡片和控件边界。
- `border-l1/hairline`：分隔线、标签和低噪声边界。
- `shadow-lv1`：轻微浮起的 sticky action 或 card hover。
- `shadow-lv3`：modal、free window 等真正脱离文档流的浮层。
- 普通 sidebar/workbench panel 默认 flat；不要同时堆叠高透明、blur、渐变和强阴影。

推荐半径：

| 元素 | 推荐 |
| --- | --- |
| 小控件/输入 | 6–8px |
| 普通卡片 | 8–12px |
| 设置 group/大面板 | 12–16px |
| 状态 chip/badge | 4–6px |
| pill/圆形 icon control | `999px` 或 `50%` |

### 4.4 `color-mix` 和 fallback

混色只能用于低强度 tint、focus ring 和状态背景；必须考虑不支持 `color-mix()` 的 WebView：

```css
.my-plugin__status--success {
  color: var(--dsw-alias-state-success-primary, #15803d);
  background: rgba(22, 163, 74, .10);
}

@supports (background: color-mix(in srgb, black, white)) {
  .my-plugin__status--success {
    background: color-mix(
      in srgb,
      var(--dsw-alias-state-success-primary) 12%,
      transparent
    );
  }
}
```

fallback 只放在插件边界、且应是接近 DSH light baseline 的兜底；不能把 fallback 当作主设计系统。

### 4.5 字体、数字与文案

- 优先 `font: inherit`，让插件跟随宿主字号和用户偏好。
- DSH 的 desktop UI 可采用 13–14px 的 compact body；长说明、错误、帮助文案不要低于可读下限。
- 典型层级：metadata 11–12px，dense body 12–13px，standard body 13–14px，section title 15–16px，页面标题 20–22px。
- 行高通常为字号的 1.4–1.6；中文长说明要留出换行空间。
- 路径、命令、JSON、版本、价格、token 和时间使用 `var(--ds-font-family-code, ui-monospace, monospace)` 或确认后的 DSH mono token。
- 数字列表、进度、金额、时间使用 `font-variant-numeric: tabular-nums`，避免数字宽度变化造成抖动。
- 文案使用用户理解的对象，而不是内部实现名称；使用主动、明确的动词：`保存设置`、`重试`、`打开文件`，不要只写 `提交`、`执行`。
- 需要中英文时全部走 `ctx.locale`/`t()`；不要只翻译 Slot label 而保留正文中文硬编码。

---

## 5. 布局和密度规范

### 5.1 基础空间节奏

以 4px 为底，常用值优先：`4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32px`。

- 控件内部 gap：4–8px
- 同组字段 gap：8–12px
- 卡片内部 padding：12–16px
- 设置 group padding：16–20px
- 页面 section gap：14–16px
- 页面底部安全 padding：至少 24–32px；有 sticky footer 时额外预留其高度

嵌入式 DSH 界面的共识不是“越宽越高级”：

- settings section 常见 max-width：760–920px
- dashboard card gap：10–14px
- sidebar chrome：34–36px；icon control 的可视尺寸可为 28px，但触控/键盘命中区应更大
- 关键操作触控目标：至少 44×44px；desktop compact 可使用 32–40px 视觉控件，但不要让用户只能点击 16–20px 的细线或字形

### 5.2 Flex containment 必须项

每个嵌套的 flex/grid 内容区都检查：

```css
.my-plugin__root {
  min-width: 0;
  min-height: 0;
}

.my-plugin__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.my-plugin__long-value {
  min-width: 0;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
}
```

避免 URL、工具名、文件路径或 locale 变长后撑破 panel。不要在嵌入式 Slot 里默认使用 `100vw`、`100vh` 或固定宽度。

### 5.3 视图类型布局配方

#### Settings section

```text
root column
├── intro/header
├── status banner（需要时）
├── group card
│   ├── heading + description
│   └── settings rows / responsive grid
├── group card
└── optional sticky action bar
```

设置行采用：左侧 title/description，右侧 control；行之间用 hairline 分隔。复杂选项通过 disclosure 或 modal 渐进展示，不要一次性暴露所有高级字段。

#### Conversation dashboard

- 顶部 summary cards：宽屏 4 列，窄宽自动 2/1 列。
- 主内容使用 2 列时，给 detail column 明确 `min-width: 0` 和可滚动边界。
- 历史柱状图在数据过多时保留固定 bar width + 水平滚动，不要将柱压缩成不可读的 1px。
- 事件列表、文件活动和 browser detail 使用可折叠 section；摘要始终可见。

#### Sidebar/workbench

- 桌面可以采用右侧全高 panel + 底部 center panel，但这属于布局拥有者的高级能力。
- 普通消费插件只注册 tab/viewer，不直接改 `#root`。
- 每个 pane：tab strip → content；inactive 内容从视觉和键盘树中移除，但若要保留资源状态，采用宿主允许的 mounted/display 策略。
- 面板默认 flat，边界用 hairline，浮窗才使用较高 shadow。

#### Modal / lightbox / popover

- 决策型 modal：标题、说明、可滚动内容、明确 Cancel/Confirm footer。
- 纯预览型 lightbox：不要套用复杂决策 modal，但必须拥有 dialog 语义、close、Escape、焦点恢复。
- 浮层宽度优先 `min(…px, calc(100vw - 32px))`，高度优先 `min(…vh, …px)`，移动端考虑 `dvh` 和 safe area。
- 优先使用官方 Modal/Menu/Tooltip primitive；自定义 z-index 前先确认宿主 overlay 层级。

### 5.4 响应式策略

DSH 插件通常被嵌入 settings dialog 或 sidebar，优先使用 container query：

```css
.my-plugin__root { container-type: inline-size; }
@container (max-width: 680px) {
  .my-plugin__grid { grid-template-columns: 1fr; }
}
```

同时测试：

- 320–375px：窄手机或窄 drawer
- 480–560px：settings dialog 窄状态
- 680–768px：双列切换边界
- 1024px：常见 desktop embedded width
- 1440px：宽屏和长文本测量

不要把“桌面双栏缩小”当作移动布局。需要时迁移为单列 drawer、折叠详情或 overflow menu，并保留用户状态。

### 5.5 Sticky、滚动与 CLS

- sticky header 必须和对应 scroll container 一起设计，不能让搜索栏和分类栏各自独立 sticky 后相互遮挡。
- 动态折叠会改变上方高度时，必要时使用 `overflow-anchor: none`，但必须验证滚动不会丢失。
- 图片声明 `width/height` 或 `aspect-ratio`；异步内容预留空间。
- 避免嵌套滚动；如果确实需要内部滚动，明确哪个区域负责滚动，并确保焦点元素可见。
- 不动画 `width/height/top/left` 来制造装饰效果；布局变化优先 transform/opacity，拖拽时关闭 easing。

---

## 6. 组件、图标和状态

### 6.1 官方 primitives 优先

可以使用当前宿主已注入且经过 Inspect 确认的：

- `Button`：primary、secondary、outline、ghost、link、destructive
- `Input`、`Menu`、`Modal`、`Tooltip`、`Toast`
- `DisclosureRow`、`Pill`、`StateDot`、官方 SVG icons

插件自定义 CSS 只处理：

- grid/flex/layout
- 专属卡片或数据可视化
- sticky action、progress、timeline、gallery
- 宿主没有提供的局部 visual treatment

不要为了使用 shadcn、Radix 或 Tailwind 而把它们直接装入或注入 DSH。DSH 插件实际优先是 React DOM + CSS/CSS Modules + DSH primitives；可移植的是它们的语义和无障碍原则，不是整套运行时依赖。

### 6.2 Button / IconButton

每个按钮至少定义：default、hover、focus-visible、active/pressed、disabled；异步操作另加 loading。

- primary：当前区域唯一主要行动。
- outline/secondary：并列但非主要操作。
- ghost/link：低风险辅助动作。
- destructive：删除、卸载、替换、恢复等危险动作；优先二次确认。
- icon-only：必须有 `aria-label`，并提供 tooltip 作为补充。
- 不用透明背景的微小文字作为唯一可点击入口。
- loading 时禁用重复提交，保留动作对象，显示 spinner 或文本。

### 6.3 Input / Select / Checkbox / Switch

- 每个输入有可见 label；placeholder 只能提供示例，不能替代 label。
- 错误放在相关字段附近，并使用 `aria-invalid` + `aria-describedby`。
- 输入高度通常 36–40px；触控模式扩大到至少 44px。
- 复杂表单使用 fieldset/legend 或等价的可读组名。
- 原生 checkbox/radio 优先；自定义 switch 必须由真实 input 提供语义和 focus，再用 sibling 绘制 track/thumb。
- disabled 必须同时具备真正的 `disabled`/`aria-disabled`、视觉降级和不可执行行为。
- 输入中的空值不要在每个按键时强制替换成默认值；在 blur/submit 时校验更友好。

### 6.4 Card / Badge / Alert

Card anatomy：

```text
Card
├── Header: title + description + metadata/action
├── Content: one coherent subject
└── Footer: secondary action/status
```

- 普通卡片只用一套边界和 surface，不随机混合 radius/shadow。
- interactive card 的 hover 只改变背景、边界或 shadow，不改变布局尺寸。
- Badge 表示 metadata 或状态，不要把整段重要信息塞进 badge。
- Alert 用 icon + 文案 + 颜色；成功、警告和错误不能只靠颜色。
- 空态至少说明“当前为什么为空”和“下一步怎么开始”。

### 6.5 图标规范

- 统一 SVG icon family、尺寸、stroke width 和 filled/outline 风格。
- 结构性 icon 优先 14–16px；视觉小图标可以 12–14px，但命中区不能随之变小。
- 装饰图标 `aria-hidden="true"`；有意义的图标提供 label。
- 不使用 emoji、平台相关字体 glyph 或混杂风格的图标。
- DSH 自绘 SVG 应使用 `currentColor`，让 token 控制颜色。

### 6.6 状态矩阵

所有会改变状态的组件在设计时填写以下矩阵：

| 状态 | 视觉 | 行为/语义 |
| --- | --- | --- |
| default | 基础 surface、边界、文字 | 可操作 |
| hover | 轻微 hover token 变化 | 不能是唯一入口 |
| focus-visible | 2px 左右可见 focus ring，至少 3:1 | 键盘可定位 |
| active/pressed | 更明确的 surface/边界或 selected 状态 | `aria-pressed/selected/expanded` 与之同步 |
| disabled | 降低强调但保持可读 | 真正不执行；`disabled` 或 `aria-disabled` |
| loading | spinner/progress，保留上下文 | `aria-busy`，防重复提交 |
| success | success icon + 文案/状态 | `role=status` 或 `aria-live=polite` |
| error | error icon + 原因 + retry/fix | `role=alert` 或 `aria-live=assertive`，给恢复路径 |
| empty | 解释 + 下一步 action | 不能只显示空白 |
| readonly | 仍可读取但不能编辑 | 与 disabled 区分，解释原因 |
| destructive confirmation | 明确后果、Cancel、Confirm | 默认安全选项，支持 Escape/outside click |

状态优先级：`disabled > loading > active > focus > hover > default`。

---

## 7. Slot、React、生命周期与数据状态

### 7.1 Slot 注册模式

发布版 TSX 的通用结构：

```tsx
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'my-plugin',
  order: 50,
  locale: NS,
  label: () => t('nav'),
  inject: () => ({ /* only small runtime faces */ }),
}, MySettingsSection))
```

注意：

- Slot 名、kind、必填字段和 props 先查运行时；不要凭参考代码猜。
- list slot 使用稳定 `id` 和明确 `order`；keyed slot 使用正确 `key`；chain slot 必须提供选择器和 priority 语义。
- Slot 的 render component 不应依赖被随意复制的 live host object。
- settings plugin card 属于 root-scope keyed slot；session UI 需要使用宿主规定的 session props。
- 可选宿主能力使用 nested injection，让主页面在旧宿主上优雅降级，不要因可选 settings service 缺失而让整个插件消失。

动态插件客户端应遵守：

```js
return {
  inject: ['slots'],
  apply(ctx) {
    const style = document.createElement('style')
    style.dataset.plugin = 'my-plugin'
    style.dataset.pluginCss = 'my-plugin/main'
    style.textContent = styles
    document.head.appendChild(style)
    ctx.effect(() => () => style.remove(), 'my-plugin: styles')

    ctx.slots.inject('conversation.view', () => ctx.slots.register({
      name: 'conversation.view', id: 'my-view', order: 30,
    }, props => React.createElement(MyView, props)))
  },
}
```

动态客户端不能写 JSX、import、TypeScript、`require` 或把未确认的 browser global 当成可用能力。

### 7.2 CSS 隔离

推荐：

- CSS Modules，或完整插件前缀：`.my-plugin__root`、`.my-plugin__card`。
- plugin-owned style tag 带 `data-plugin`/`data-plugin-css`，并在 stop/update/HMR 时移除。
- 局部变量写在插件 root，而不是 `:root`。
- 用 `:where(.my-plugin__root .child)` 降低不必要的 specificity；避免宽泛 `.section`、`.title`、`.button`。
- 不覆盖宿主的基础 `button/input/a`；在插件范围内用 class reset。

### 7.3 异步和不可信数据

UI 不应把“加载”当成唯一状态：

1. 初始无数据：显示 loading/skeleton。
2. 已有旧数据刷新：保留旧数据，增加 busy/refresh indicator。
3. 请求失败：显示原因、受影响范围和 retry，不让页面卡在 spinner。
4. 部分数据坏：跳过坏条目，保留其他卡片。
5. projection/log/schema 是外部输入：在边界重新验证数组、标量、嵌套对象和数值范围。

Host projection fold 必须 total；Client parser 必须防御 null、primitive、缺失字段、错误类型和会抛异常的对象。一个坏 event、tool、file entry 或 projection 不能让整个 Slot 变白屏。

### 7.4 错误隔离

复杂会话视图建议使用视图级 ErrorBoundary：

```text
Slot shell
└── plugin root boundary
    ├── header/summary
    ├── data card boundary（可选）
    └── detail boundary（可选）
```

错误卡必须包含：人能读懂的原因、当前影响、retry 或返回路径。不要只渲染技术 stack，也不要让错误直接冒泡到宿主 conversation renderer。

---

## 8. 无障碍、键盘和动效

### 8.1 WCAG baseline

- 普通文字对比度至少 4.5:1；大文字至少 3:1。
- UI 边界和 focus indicator 至少 3:1。
- 不以颜色作为唯一状态含义；配合 icon、文字、符号、pattern 或 shape。
- 图像提供有意义的 alt；装饰图像 `alt=""`/`aria-hidden`。
- 所有 icon-only 控件有 `aria-label`。
- heading 顺序连续；设置分组使用 section heading 或 fieldset/legend。

### 8.2 键盘路径

必须能够只用键盘完成：

- 进入插件、切换 tab、展开/折叠、编辑、提交、取消、重试和关闭
- Modal 打开后焦点进入可操作区域，Escape 关闭，关闭后恢复触发元素焦点
- Menu/Tablist 使用符合语义的 selected/expanded/controls；需要箭头键时实现完整模式
- 拖放排序必须有 ↑/↓ 或其他键盘等效动作
- resize、drag handle、clickable tab 不要只实现 pointer 行为

不要为自定义按钮先 `outline: none`，除非同一规则提供清晰的 `:focus-visible` ring。

### 8.3 ARIA 推荐

```jsx
<button
  type="button"
  aria-expanded={open}
  aria-controls="my-plugin-details"
>
  Details
</button>
<div id="my-plugin-details" hidden={!open}>
  ...
</div>

<input
  id="endpoint"
  aria-invalid={hasError || undefined}
  aria-describedby={hasError ? 'endpoint-error' : 'endpoint-help'}
/>
<p id="endpoint-error" role="alert">说明原因和修复方式。</p>
```

- status/toast 使用 `role="status"` + `aria-live="polite"`，不抢焦点。
- error 使用 `role="alert"` 或合适的 live region。
- loading 容器使用 `aria-busy`；按钮 loading 时提供屏幕阅读器可读的 loading 文案。
- 三态状态不要滥用 `role="switch"` 的 `mixed`；三态更适合 checkbox 语义。
- tooltip 只能补充，不承载唯一重要信息；确保 focus/tap 也能看到核心解释。

### 8.4 Motion

- 微交互通常 120–200ms，复杂进入/退出 150–300ms。
- 入场 ease-out，退出更快；动画 transform/opacity，不动画 layout 尺寸。
- loading shimmer、running pulse、chart reveal 都必须有意义且可中断。
- `@media (prefers-reduced-motion: reduce)` 下关闭循环动画、缩短 transition，并去除装饰性 transform。
- sticky、drag 和 scroll 状态不能因为动画而脱离用户指针或造成 CLS。

示例：

```css
.my-plugin__interactive {
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.my-plugin__interactive:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .my-plugin__interactive,
  .my-plugin__spinner,
  .my-plugin__card {
    transition: none;
    animation: none;
  }
}
```

---

## 9. Screenshot / 效果图分析方法

当用户提供后续 UI 效果图时，不要只说“照着做”。按以下顺序分析：

1. **标出宿主边界**：哪些是 DSH 自带 header、sidebar、dialog chrome，哪些是插件拥有的区域。
2. **提取层级**：背景层、卡片层、控件层、状态层、浮层层分别是什么。
3. **提取可验证事实**：列数、对齐方式、主次标题字号关系、间距节奏、圆角、边框、阴影、动作位置、滚动边界。
4. **匹配 DSH token**：把截图里的灰、蓝、绿、红映射到实际 DSH semantic token，不要直接复制截图 hex。
5. **识别 signature**：保留一个与插件对象相关的视觉记忆点；删除无助于任务的渐变、玻璃、发光和装饰 icon。
6. **还原状态**：询问或补齐 loading、empty、error、hover、focus、disabled、mobile 状态；效果图通常只展示 happy path。
7. **实现后对照**：在亮色和暗色 DSH 页面截图，比较层级和密度，不只比较像素颜色。

如果效果图与 DSH 原生语言冲突，优先级为：

```text
可用性/可访问性 > DSH theme contract > 宿主 Slot/primitive contract > 用户明确设计意图 > 装饰细节
```

---

## 10. 常见失败模式与修复

| 症状 | 常见原因 | 修复 |
| --- | --- | --- |
| UI 看起来像另一个网站 | 独立 palette、独立字体、重阴影、巨大圆角或全屏渐变 | 改用 DSH surface/text/border tokens；只保留一个 signature |
| 暗色发白、skin 下透明 | 硬编码白色或消费了会被 skin 改成透明的 specific token | 使用 layer tokens、label tokens；检查 skin 和 alpha fallback |
| 安装后按钮消失 | 未重启真实 `dsh web`、Slot 名错误、旧宿主 primitive 不存在 | 查 contract、feature gate、pack 后重新安装并重启 |
| settings 页横向溢出 | flex 子项缺 `min-width:0`、content-box width、固定 `100vw` | 加 `min-width:0`、`box-sizing:border-box`、container query |
| 滚动时 header 闪烁/跳回 | 分离 sticky、scroll anchoring 和动态折叠互相作用 | 让 sticky 结构整体移动；必要时 `overflow-anchor:none` |
| 加载后卡片跳动 | 图片/异步区域没有尺寸预留 | width/height、aspect-ratio、skeleton、稳定容器 |
| 点击按钮调用失败 | Typert `{ok,value}` 未解包或 HTTP/Typert 协议混用 | 按数据通道 contract 返回业务 value；不要混用 envelope |
| 错误后页面一直转圈 | 异步 rejection 未落到 visible error state | 所有 fetch/RPC 都有 loading → data/error/retry 完整状态机 |
| 读屏无法理解 | icon-only 无 label、错误只在顶部、tooltip 只靠 hover | semantic HTML、ARIA 关联、附近 error、focus/tap 等价路径 |
| UI 功能好但观感突兀 | 复制了通用 dashboard、所有卡片都高亮或装饰过多 | 重新做 hierarchy pass；删掉一个 accessory，降低 decoration density |
| UI 更新造成状态丢失 | 用组件卸载代替 tab close、refresh 清空旧数据 | 通过正确生命周期释放资源；保留旧数据和 draft |
| 自定义 modal 压住/被压住 | z-index 猜测、多个 overlay 自建层级 | 优先 official Modal；确认 host overlay stack，再使用局部层级 |

---

## 11. 实现模板

### 11.1 CSS 起步模板

```css
.my-plugin__root {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
  color: var(--dsw-alias-label-primary, #1f2328);
  font: var(--dsw-font-s-14, 14px/22px var(--ds-font-family-sans, system-ui, sans-serif));
}

.my-plugin__root *,
.my-plugin__root *::before,
.my-plugin__root *::after {
  box-sizing: inherit;
}

.my-plugin__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #fff);
}

.my-plugin__section-title {
  margin: 0;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
}

.my-plugin__hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary, #8b93a1);
  font-size: 12px;
  line-height: 18px;
}

.my-plugin__button:focus-visible,
.my-plugin__input:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4f6ef7);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .my-plugin__root * {
    transition: none !important;
    animation: none !important;
  }
}
```

上例中的 hex 只是旧宿主的 fallback，不是组件主色。实际项目应先确认 token 是否存在，并为高对比、暗色和自定义 skin 验证 fallback。

### 11.2 Settings row 模板

```tsx
<section aria-labelledby="my-plugin-general-title">
  <div>
    <h2 id="my-plugin-general-title">General</h2>
    <p>Control the behavior users change most often.</p>
  </div>
  <div className={css.row}>
    <div className={css.rowText}>
      <span className={css.title}>Enable notifications</span>
      <span className={css.desc}>Explain the user-visible effect.</span>
    </div>
    <label className={css.switch}>
      <input type="checkbox" checked={enabled} onChange={onChange} />
      <span className={css.switchTrack} aria-hidden="true">
        <span className={css.switchThumb} />
      </span>
    </label>
  </div>
</section>
```

### 11.3 异步 action 模板

```tsx
<Button
  variant="primary"
  disabled={busy}
  aria-busy={busy || undefined}
  onClick={run}
>
  {busy ? 'Saving…' : 'Save changes'}
</Button>
{error !== null && (
  <div role="alert" className={css.error}>
    <span>{error.message}</span>
    <button type="button" onClick={retry}>Retry</button>
  </div>
)}
```

---

## 12. 发布前验证矩阵

### 12.1 静态审查

- [ ] Slot、Service、primitive、theme token 都来自当前 contract，而非猜测。
- [ ] CSS class 有插件命名空间或 CSS Module；没有意外全局 selector。
- [ ] 颜色、字体、边界、阴影、motion 都使用 DSH token 或局部语义 alias。
- [ ] 没有 emoji 结构图标；icon-only 控件有 `aria-label`。
- [ ] 没有 placeholder-only input；错误和状态有语义关联。
- [ ] 组件有 default/hover/focus/active/disabled/loading/error/empty 的适用状态。
- [ ] 所有副作用通过 `ctx.effect`、官方 disposer 或 React cleanup 回收。
- [ ] 动态数据在边界做形状验证；复杂视图有 ErrorBoundary 或等价降级。
- [ ] 中英文词典同步；UI 文案不暴露内部实现术语。

### 12.2 浏览器验收

在真实 DSH Web URL 中，而不是独立 Vite 页面中验证：

- [ ] 亮色主题。
- [ ] 暗色主题。
- [ ] 自定义 skin 或透明/半透明 surface（如可用）。
- [ ] 320–375px 窄宽、480–560px settings、680–768px 断点、1024px 和宽屏。
- [ ] Tab/Shift+Tab 完整操作；Enter/Space/箭头键行为符合组件语义。
- [ ] Modal Escape、outside click、Cancel、焦点进入和焦点恢复。
- [ ] hover、focus-visible、pressed、disabled、loading、success、error。
- [ ] 长中文、长英文、超长 URL、文件路径、代码和大字号文本。
- [ ] 网络慢、空数据、坏数据、旧 projection、请求失败和 retry。
- [ ] `prefers-reduced-motion: reduce`。
- [ ] 没有横向溢出、滚动跳闪、CLS、sticky 遮挡、浮层层级错误或 page error。

### 12.3 真实打包验收

结合 `dsh-plugin-authoring`：

```powershell
pnpm run typecheck
pnpm run build
pnpm pack
# 将 tgz 安装到 scratch/profile，而不是跨盘直接 link 源目录
# 重启真实 dsh web，再验证 Slot、主题和交互
```

修改客户端 bundle 后，确认当前环境的 `pnpm run dev:web` watcher 正在运行，才能承诺 client HMR；apps/web shell 或普通 package 的改动仍需重新构建受影响 Web artifact 并刷新真实页面。不要因为启动了另一个服务器就声称当前 GUI 已更新。

---

## 13. 最终质量门槛

一个 DSH 插件 UI 只有同时满足以下条件才算完成：

```text
视觉上：层级清楚、密度合理、只有一个 signature、没有突兀的独立网站感
主题上：亮暗 skin 都由宿主 token 驱动，状态色和边界在两套主题可读
交互上：主动作明确，异步有反馈，危险操作可撤销或确认，空/错状态可恢复
可访问性：语义 HTML、键盘完整、focus 可见、ARIA 关系正确、颜色不是唯一信息
工程上：Slot/primitive/service 已查证，CSS 隔离，副作用可回收，数据只传 JSON
响应式：嵌入 settings/sidebar 的真实宽度下无溢出、无遮挡、无跳闪
验收上：真实 DSH Web 中完成亮/暗/窄屏/键盘/reduced-motion/失败路径验证
```

当视觉质量和功能正确性冲突时，不要用更多装饰掩盖结构问题。先修正宿主契约、信息层级、状态设计和空间节奏，再做最后的视觉润色。
