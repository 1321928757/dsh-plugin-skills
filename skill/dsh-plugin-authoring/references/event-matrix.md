# Event mode and selection guide (0.2.0-rc.2)

This is a navigation index, not a versioned signature catalog. Query the current contract before writing a listener — the cheapest check is:

```text
cordis_inspect_query(platform: 'host', provider: 'Event', method: 'listEvents')
```

It returns the live catalog with each event's name, `mode`, and exact signature for the composition you are actually running. Signatures in this file are abbreviated for readability; **always take the exact parameters from the live catalog or the installed types.**

## Modes

| Mode | Meaning | Listener obligation |
|---|---|---|
| `emit` | One-way broadcast | Observe; do not expect a downstream result |
| `parallel` | Run listeners concurrently and await all of them | Do not rely on listener order; follow the event's rejection contract |
| `bail` | Stop when a listener returns the contract's terminating value | Return only the documented result |
| `serial` | Run listeners in sequence under the event's serial contract | Follow the event's exact arguments; do not invent `next()` |
| `waterfall` | Wrap/decorate a downstream result | Call `next()` exactly as the event contract requires |

A mode is part of the event contract. Do not change a listener from `emit` to `waterfall` based on a similarly named event.

## Tool pipeline

| Event | Mode | Typical use |
|---|---|---|
| `tools/pre-execute` | `waterfall` | permission/approval gate; allow, deny, cancel, or ask |
| `tools/execute` | `waterfall` | timeout/retry/metrics wrapper (only `exec.signal` is replaceable) |
| `tools/post-execute` | `waterfall` | alter an outcome or content |
| `tools/ptc-dispatch-log` | `waterfall` | replace content in the durable log copy of one `run_code` sub-dispatch |
| `tools/result` | `emit` | observe normalized, frozen tool results |
| `tools/change` | `emit` | observe visible tool-set changes (registry-wide) |

> `tools/ptc-dispatch-log` is the current name. `tools/code-dispatch-log` was the 0.1.x name and **no longer exists** — a listener registered under it never fires and never warns.

## Agent and session

| Event | Mode | Typical use |
|---|---|---|
| `agent/created` | `serial` | an entered agent is ready for per-agent initialization |
| `agent/disposed` | `emit` | an agent left the registry (after driver quiescence and scoped-registration unwind) |
| `agent/status` | `emit` | `idle` ⇄ `running` transitions |
| `agent/turn-stopping` | `serial` | ordered work just before a turn closes |
| `agent/error` | `emit` | a step or turn errored |
| `agent/pre-step` | `waterfall` | reject a proposed step or replace the messages entering it |
| `agent/request` | `waterfall` | replace the frozen call configuration |
| `agent/request-error` | `waterfall` | handle one failed model-request attempt before retry/close |
| `agent/inbox/inserted` / `claimed` / `discarded` | `emit` | observe live inbox movement |
| `session/created` / `session/disposed` | `emit` | session publication lifecycle |
| `session/event` | `emit` | post-commit, fire-and-forget append feed |
| `session/flush` | `parallel` | awaited durability checkpoint (no waterfall veto) |
| `api-session/added` / `removed` / `status` / `activity` | `emit` | Session-list level notifications |
| `goal/changed` / `goal/activation-changed` | `emit` | goal state changes |

> `agent/session-start` does **not** exist in the 0.2.0-rc.2 catalog. Use `agent/created` for per-agent initialization and `session/created` for publication.

## LLM, prompt and settings

| Event | Mode | Typical use |
|---|---|---|
| `llm/stream` | `waterfall` | wrap a model stream (retry, replay, routing) |
| `llm/adapters-updated` | `emit` | provider topology changed |
| `system-prompt/assemble` | `waterfall` | contribute/transform prompt assembly |
| `system-prompt/change` | `emit` | any prompt provider changed |
| `settings/document-updated` | `emit` | one profile entry's form values/availability/page policy changed |
| `domain/changed` | `emit` | a domain record or the global singleton changed, after durability |

## HTTP, plugins, shell and HMR

| Event | Mode | Typical use |
|---|---|---|
| `connection/request` | `waterfall` | admit or wrap an authenticated shared API request (including body transfer) |
| `webserver/index-inject` | `emit` | collect the structured index injection table |
| `app-boot/config-reload` | `emit` | profile patches reconciled into the running Loader tree |
| `plugin-manager/changed` | `emit` | profile plugins/bundles/composition changed |
| `plugin-manager/install-state` | `emit` | an installation moved between Host phases |
| `plugin-manager/install-log` | `emit` | one chunk of a pnpm run's output |
| `commands/change` | `emit` | a command was registered or unregistered |
| `skills/change` | `emit` | a skill provider/catalog may have changed |
| `hmr/change` / `hmr/reload` | `emit` | watched file with no handler / module replacements finished |

## Subagents, workflows and workspaces

| Event | Mode | Typical use |
|---|---|---|
| `subagent/start` / `subagent/end` | `emit` | a published child established/settled |
| `subagent/provider-added` / `provider-removed` | `emit` | provider registry changes |
| `workflow/start` / `phase` / `log` / `end` | `emit` | workflow run narration and lifecycle |
| `workflow/agent-start` / `agent-end` | `emit` | one `agent()` call established/settled |
| `workspace/session-activity` | `waterfall` | ask providers what still runs for a session before archiving |
| `workspace/session-stop` | `parallel` | stop a session's running work |

## Persisted session events are different

`turn/*`, `step/*`, `tool/call`, `tool/result`, and `compaction/*` are persisted `SessionEvent` types. Observe them through `session/event` and inspect `event.type`; do not infer that a persisted event is a Cordis event with the same name or mode.

## Resource hygiene

Register with `ctx.on()` so the listener is fiber-owned. For `waterfall`, preserve the downstream value and cancellation semantics. Test disposal and HMR replacement: after the disposer runs, no new callback should begin.

If you renamed or removed a listener target, an old registration is silent rather than loud — a `waterfall` listener on a non-existent event simply never runs. After any DSH upgrade, diff your listener names against `listEvents` instead of trusting that "it still boots".
