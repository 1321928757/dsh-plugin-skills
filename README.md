# DSH Plugin Skills

English | [简体中文](README.zh-CN.md)

A community-maintained collection of reusable skills for building, designing, documenting, and publishing [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) plugins.

> This is an unofficial community project. It is not produced, endorsed, or maintained by DeepSeek Harness.

## What this repository provides

This repository contains instruction-oriented skills rather than an executable DSH plugin. Each skill gives an agent a focused workflow, implementation constraints, reusable templates, and validation guidance.

> **Target version: DSH `0.2.0-rc.2`.** See [Scope and compatibility](#scope-and-compatibility) for the 0.1.x → 0.2 changes the authoring skill now documents.

The collection follows a plugin's practical delivery path:

```text
Plan and build  →  Design the Web UI  →  Document and publish
      │                    │                    │
      └─ authoring ────────┴─ ui ───────────────┴─ readme
```

## Included skills

| Skill | Use it when you need to | Main coverage |
| --- | --- | --- |
| [`dsh-plugin-authoring`](skill/dsh-plugin-authoring/) | create or ship a DSH plugin | profile bundles, `package.json`, `cordis.patch.yml`, Host/Client halves, Typert or HTTP channels, local verification, versioning, GitHub and marketplace preparation |
| [`dsh-plugin-ui`](skill/dsh-plugin-ui/) | design, implement, review, or refactor a DSH Web UI | Slots, runtime contracts, DSH theme tokens, layout and density, responsive behavior, accessibility, async states, lifecycle cleanup, and browser acceptance |
| [`dsh-plugin-readme`](skill/dsh-plugin-readme/) | write or maintain plugin documentation | evidence-first README writing, bilingual parity, installation and troubleshooting, security boundaries, screenshots, `screenshots.json`, package files, and release validation |

The skills are independent, but they work best together for a complete plugin project.

## Which skill should I use?

### Starting a new plugin

Use [`dsh-plugin-authoring`](skill/dsh-plugin-authoring/) first. It helps you choose between a temporary dynamic Cordis plugin and a publishable profile bundle, then covers the repository skeleton and runtime integration path.

### Building a Web interface

Add [`dsh-plugin-ui`](skill/dsh-plugin-ui/) whenever the plugin has settings, conversation surfaces, sidebar integration, dashboards, overlays, or other browser UI. It is especially useful before writing Slot registration or custom CSS because it requires checking the current host contract rather than relying on copied examples.

### Preparing documentation or a release

Add [`dsh-plugin-readme`](skill/dsh-plugin-readme/) when the plugin needs a README, screenshots, security disclosure, compatibility notes, or marketplace submission material. It keeps user-facing claims tied to source and validation evidence.

### A typical combined workflow

```text
1. dsh-plugin-authoring  — choose the plugin shape and build the runtime skeleton
2. dsh-plugin-ui         — implement and verify the browser experience, if applicable
3. dsh-plugin-readme     — document installation, usage, limits, and release evidence
```

## Installation

Clone the repository, then copy the skill directories you need into the DSH user skill directory. The following PowerShell example installs all three:

```powershell
git clone https://github.com/<owner>/dsh-plugin-skills.git
cd dsh-plugin-skills

$DshSkills = Join-Path $HOME '.dsh\skills'
New-Item -ItemType Directory -Path $DshSkills -Force | Out-Null

Copy-Item .\skill\dsh-plugin-authoring $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-ui $DshSkills -Recurse -Force
Copy-Item .\skill\dsh-plugin-readme $DshSkills -Recurse -Force
```

Replace `<owner>` with the GitHub account that owns the repository after it is published. To install only one skill, copy only its directory. For example:

```powershell
Copy-Item .\skill\dsh-plugin-ui (Join-Path $DshSkills 'dsh-plugin-ui') -Recurse -Force
```

After copying, invoke the skill by its directory name in an Agent environment that supports DSH skills. If the current session has already catalogued its skills, start a new session or use the host's skill refresh mechanism before expecting the new copy to appear.

## Repository layout

```text
.
├── README.md
├── README.zh-CN.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── skill/
    ├── dsh-plugin-authoring/
    │   ├── SKILL.md
    │   ├── references/
    │   │   ├── boot-and-activation.md
    │   │   ├── client-module-contract.md
    │   │   ├── event-matrix.md
    │   │   ├── evidence-matrix.md
    │   │   ├── llm-adapter-guide.md
    │   │   ├── publish-runbook.md
    │   │   ├── testing-strategy.md
    │   │   ├── tool-contract.md
    │   │   └── typert-contract.md
    │   └── templates/
    │       ├── client.js
    │       ├── cordis.patch.yml
    │       ├── install.ps1
    │       ├── llm-adapter.js
    │       ├── package*.json
    │       ├── tests/
    │       ├── tool.js
    │       ├── typert.host-service.js
    │       ├── typert.host.js
    │       └── typert.remote-client.js
    ├── dsh-plugin-readme/
    │   └── SKILL.md
    └── dsh-plugin-ui/
        └── SKILL.md
```

`SKILL.md` is the entry point for every skill. Additional files are supporting material and should be read when the entry point refers to them; they are not separate skills.

## Working principles

- **Evidence before claims.** Check the target plugin's source, manifests, runtime contracts, tests, and actual package contents before making specific promises.
- **Host contract before implementation.** Slot names, services, primitives, theme tokens, and wire shapes can change; inspect the current host instead of treating an old example as authoritative.
- **Security boundaries stay explicit.** Loopback fences, write permissions, credential handling, result limits, and parser limitations should be documented as implementation boundaries, not absolute guarantees.
- **Lifecycle matters.** Styles, listeners, timers, subscriptions, routes, and Slot registrations must have a disposer or Fiber-owned cleanup path.
- **User-visible states are part of the feature.** Loading, empty, error, readonly, disabled, saving, success, narrow layouts, keyboard paths, and reduced motion need deliberate handling.
- **Community, not official.** DSH compatibility and publishing rules should be described conservatively and re-checked when the host or target platform changes.

## Scope and compatibility

These skills are guidance, not a substitute for the current DSH runtime contract or the target plugin's tests. Examples may contain placeholder package names, paths, versions, and repository owners; replace them with values verified for your project.

**Target version: DSH `0.2.0-rc.2`.** The authoring skill was retargeted from `0.1.1-rc.2` and now documents the 0.2 contracts, including the changes that break older plugins:

| Change | Impact |
| --- | --- |
| Typert strict codec `schema` → `create()` factory | A generated or hand-written `./typert` artifact in the old shape fails at load and takes every RPC route in the profile down with it |
| `@deepseek-ai/dsh*` `peerDependencies` became an enforced compatibility gate | An old peer range is now refused at install/start, with an explicit risk-accepting exemption as the only override |
| `tools/code-dispatch-log` → `tools/ptc-dispatch-log` | A stale listener name is silent rather than loud |
| Client bundles served as combo routes; `rev` derived from file metadata; boot graph gained `batches` | Do not depend on the 0.1.x per-plugin URL shape or on content-hash caching |
| Plugin-page slots renamed (`plugins.item`, `plugins.detail.*`, …) | `settings.plugin.item` no longer exists in the Web composition |

Official documentation moved under `/reference/…`; several older link paths now 404. The evidence matrix in the authoring skill records exactly which claims were verified against official docs, which against tag-pinned source, and which against the installed runtime — and lists what could not be verified.

Treat `engines.dsh` as declarative at this version: it expresses intent and is read by tooling, but the enforced check is the `@deepseek-ai/dsh*` peer range.

The skills currently focus on DSH Web/profile-bundle plugin work. A future skill can be added for testing, debugging, security review, or other areas when it has a clear scope and reusable guidance.

## Contributing

Issues and pull requests are welcome for corrections, new examples, compatibility updates, and reusable templates. Before submitting a change:

1. Keep each skill focused on its declared responsibility.
2. Keep English and Chinese README facts aligned when changing repository-level documentation.
3. Verify commands, paths, links, and DSH-specific claims against an available source or runtime observation.
4. Do not commit credentials, tokens, private database information, generated local state, or machine-specific configuration.
5. Do not present community practice as an official DSH guarantee.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution checklist.

## License

The contents of this repository are available under the [MIT License](LICENSE).
