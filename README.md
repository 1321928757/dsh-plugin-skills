# DSH Plugin Skills

English | [简体中文](README.zh-CN.md)

A community-maintained collection of reusable skills for building, designing, documenting, and publishing [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) plugins.

> This is an unofficial community project. It is not produced, endorsed, or maintained by DeepSeek Harness.

## What this repository provides

This repository contains instruction-oriented skills rather than an executable DSH plugin. Each skill gives an agent a focused workflow, implementation constraints, reusable templates, and validation guidance.

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
    │   │   └── publish-runbook.md
    │   └── templates/
    │       ├── client.js
    │       ├── cordis.patch.yml
    │       ├── install.ps1
    │       ├── package.json
    │       └── typert.host.js
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
