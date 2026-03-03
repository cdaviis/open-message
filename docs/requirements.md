# Pigeon requirements

Single list of requirements we follow: **code and design standards**, **template/product rules**, and **functional (product) requirements**. Status is noted where relevant.

---

## 1. Code and design standards

- **SOLID**
  - **S** — One clear purpose per module/class (e.g. interpolator, limits, one service per platform).
  - **O** — Extend via new services and new template attributes; avoid changing core for every feature.
  - **L** — All services interchangeable via `ServiceAdapter`; no reliance on a specific service type.
  - **I** — Small, focused interfaces (e.g. optional `compile?`, `getLimits?` on the adapter).
  - **D** — Core depends on `ServiceAdapter` and the registry; it does not import concrete Slack/Notion.
- **Scoping** — Helpers are module-private (not exported); export only what callers need.
- **Complexity** — Short, single-purpose functions; extract named helpers so the main flow is easy to follow; avoid deep nesting.
- **Services pattern** — One folder per platform under `src/services/<name>/` with `<name>.ts` as the entry; each service owns validation, limits, compilation (if any), and send. See `docs/services-pattern.md`.

---

## 2. Template and product rules

- **Non-breaking template design** — No backwards-incompatible changes to the template processor. New attributes are additive; legacy forms stay supported. If a breaking change is unavoidable, document it, add warnings, and alert users.
- **Templates and DSL** — Prefer Pigeon templates and the Slack DSL over hard-coded payloads.
- **CI/CD friendly** — Design for `pigeon send` with `--var`, `--dry-run`, `--json` in pipelines.
- **Variables**
  - Case-sensitive: `{{USER}}` ≠ `{{user}}`.
  - ALL_CAPS tokens are candidates for env lookup; mixed-case are not.
  - Resolution order (do not change without updating tests/docs): built-ins → caller vars → env (ALL_CAPS) → template defaults → missing error.
- **Built-ins** — Do not override `{{now}}`, `{{timestamp}}`, `{{uuid}}`; use different names if needed.
- **Validation** — Use `pigeon validate` and `--dry-run` in CI when adding or changing templates.
- **Docs and tests** — When changing interpolation, validation, or DSL behavior, update `docs/edge-cases.md` (or equivalent), README, and tests under `test/core/*`.

---

## 3. Functional (product) requirements

### Implemented (current behavior)

- **Core purpose** — CI-oriented messaging: read YAML/JSON templates, interpolate vars, render message, send to a comms channel (e.g. Slack).
- **Templates** — `version`, `name`, `destination` or `destinations`, `variables`, `message`. Destination uses `destination.settings` (and legacy forms) for service-specific options.
- **Multiple destinations** — Same message can be sent to multiple channels/services via `destinations` array; one `message` block.
- **Interpolation** — `{{var}}`, `{{MY_ENV_VAR}}` (env), `{{now}}`, `{{timestamp}}`, `{{uuid}}`; resolution order as above.
- **Pipeline** — Load template → validate schema → validate required vars → interpolate → get service → validate destination → compile (if any) → validate message → apply limits/chunking → send (per destination, per chunk).
- **Limits and chunking** — Platform limits via `service.getLimits()`; caller can pass `opts.limits` and `opts.chunking`. Chunking is enabled by default: we only split when content would exceed limits. **Content-size validation** runs before send; when over limits and chunking is disabled, `ContentSizeError` is thrown. When chunking is enabled, messages are split with a cutoff slightly below the limit; each chunk gets a “Part 1 of N” footer, and continuation chunks (2, 3, …) start with a configurable continuation message (default `\n...message continued\n`) so the next chunk fits under the limit.
- **Services** — Slack (full: DSL, validate, limits, send); Notion (stub: validate, limits; send not implemented). New services implement `ServiceAdapter` and are registered.
- **CLI** — `pigeon send`, `pigeon validate`, `pigeon list`; `--var`, `--dry-run`, `--json`, `--config`, `--env-file`.
- **Output** — ESM only (no CJS build).

### Not implemented (optional / future)

- **Central config** — No single `.pigeon/config.yaml` with `channels`, `templates`, `routes`; destination is per-template.
- **Canonical runtime payload** — No versioned `run`/`jobs`/`tests`/`code`/`env`; input is flat vars.
- **Platform-agnostic DSL** — DSL is Slack Block Kit–oriented; no canonical block set for multiple platforms.
- **Config-driven limits** — Limits come from service defaults and `opts.limits`, not from a config file.
- **File upload for oversized blocks** — Chunking splits by block count; no automatic file upload for a single block over `max_block_chars`.

---

## 4. Quick reference

| Area              | Requirement summary |
|-------------------|---------------------|
| **Code**          | SOLID; narrow exports; small, clear functions. |
| **Templates**     | Non-breaking; `destination.settings`; vars case-sensitive; resolution order fixed. |
| **Pipeline**      | Load → validate schema/vars → interpolate → service validate/compile → limits/chunk → send. |
| **Services**      | One folder per platform; `<serviceName>.ts` entry; implement `ServiceAdapter`. |
| **Implemented**   | Multi-destination, limits, chunking, Slack + Notion (Notion send stub). |
| **Not implemented** | Central config, canonical payload, platform-agnostic DSL, config-driven limits. |
