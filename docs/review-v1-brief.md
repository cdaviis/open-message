# Review: Current Pigeon vs v1 Requirements Brief

This document compares the current codebase to the v1 requirements brief (CI-oriented messaging, YAML config, block DSL, canonical payload, render→validate→send pipeline). **Summary: we align on core purpose and template-based sending, but we do not yet implement the central config, canonical payload, limits/chunking, or platform-agnostic DSL described in the brief.**

---

## 1) Core purpose

| Brief | Current | Status |
|-------|---------|--------|
| CI-oriented messaging tool | CLI and API used from GitHub Actions; `--var`, `--dry-run`, `--json` | ✅ Aligned |
| Reads YAML config and templates | Templates are YAML (or JSON); config is credentials only (`.pigeon.yml` etc.) | ⚠️ Partial — no central “pigeon” config for channels/routes |
| Renders messages with block-based DSL | Slack DSL (header, section, context, etc.) compiles to Block Kit | ⚠️ Partial — DSL is Slack-specific, not platform-agnostic |
| Sends to comms channels (e.g. Slack) | Slack adapter only | ✅ Aligned |
| Interpolates runtime data (CI env, etc.) | `{{var}}`, `{{NOW}}` from env, built-ins `{{now}}`, `{{uuid}}` | ✅ Aligned |

**Verdict:** Purpose and “template + vars → send” flow match. Missing: single declarative config (channels, templates, routes).

---

## 2) Configuration in YAML

| Brief | Current | Status |
|-------|---------|--------|
| All config and examples in **YAML** | Templates and credential config support YAML; README/docs use YAML | ✅ Examples are YAML |
| Main config (e.g. `.pigeon/config.yaml`) with **channels**, **templates**, **routing rules** | No such file. Destination lives **inside each template** (`destination.service`, `destination.settings`). Credential config (`.pigeon.yml`, `~/.pigeon/config.yml`) holds only **tokens**, not channel definitions or routes. | ❌ Not implemented |
| Declarative: *what* to send and *where*, not how to call APIs | Caller chooses template path and passes vars (`pigeon send ./templates/ci-tests.yml --var status=...`). No “on: ci_run_failed → template X → channel Y”. | ❌ Not implemented |

**Verdict:** We do **not** have the brief’s config model. We have:

- **Per-template destination** (service + settings, e.g. channel).
- **Credentials** in config files / env (tokens only).
- **No** `pigeon.channels`, `pigeon.templates`, or `pigeon.routes`.

---

## 3) Templates and DSL

| Brief | Current | Status |
|-------|---------|--------|
| Block-based DSL (heading, paragraph, bullet_list, link_list, divider, code, file_ref) | Slack-oriented blocks: header, section, context, divider, actions, image, video, markdown, file, table, raw | ⚠️ Different vocabulary; no generic “heading”/“paragraph”/“bullet_list” |
| DSL is **platform-agnostic**; adapters map to Slack/others | DSL is **Slack-specific**; compiles only to Slack Block Kit. No Notion/Teams adapter. | ❌ Not platform-agnostic |
| Interpolation `{{ ... }}` | Supported in template strings and keys | ✅ Aligned |
| Users write Pigeon DSL, not Slack JSON | Users can write either: Slack DSL shorthand or raw Block Kit. Both supported. | ⚠️ Optional Slack JSON still allowed |

**Verdict:** We have a block DSL and interpolation, but it is **Slack Block Kit–aligned**, not the brief’s canonical, platform-agnostic DSL. The design doc (`docs/design-multi-platform.md`) describes a possible future “canonical block model” (Option B) that would match the brief.

---

## 4) Runtime data model (canonical payload)

| Brief | Current | Status |
|-------|---------|--------|
| **Canonical versioned payload** (e.g. `version: v1`) with `run`, `jobs`, `tests`, `code`, `env` | No canonical payload. **Flat vars** from CLI/API (e.g. `status`, `branch`, `sha`, `workflow`, `run_url`). No nested `run.id`, `run.workflow`, `tests.failed`, `code.repo`, etc. | ❌ Not implemented |
| CI integration produces payload; Pigeon reads, validates, interpolates | CI workflows pass individual `--var` flags. No single payload file or schema. | ❌ Not implemented |

**Verdict:** Runtime input is **flat key-value vars**, not the brief’s structured, versioned payload. No `run`/`jobs`/`tests`/`code`/`env` schema or validation.

---

## 5) Render → validate → send pipeline

| Brief | Current | Status |
|-------|---------|--------|
| **Render**: template + payload → resolved DSL (no `{{ }}` left) | We interpolate template with vars → resolved template. No canonical payload. | ✅ Render step exists (interpolation) |
| **Validate against limits**: max_message_chars, max_block_chars, max_blocks_per_message | No character or block limits. No config for limits. | ❌ Not implemented |
| **Overflow**: chunking with “Part 1 of N” footers; file upload for oversized blocks | No chunking. No footer. No file upload fallback for large blocks. | ❌ Not implemented |
| **Send**: pass final message(s) to adapter | Single message sent to adapter. No multi-chunk send. | ✅ Send exists; no chunking |
| **Error surface**: clear error; optional minimal fallback message | Errors thrown with message; no size reporting or fallback message. | ⚠️ Partial |

**Verdict:** We have **render (interpolate) → validate (schema + required vars) → send**, but **no** limits, **no** chunking, and **no** overflow/file handling as in the brief.

---

## 6) Responsibilities and boundaries

| Brief | Current | Status |
|-------|---------|--------|
| **Core**: parse config, load templates, accept payload, render, validate limits, chunk, pass to adapters | Core: load template by path, validate schema/vars, interpolate, compile DSL (in adapter), send. No config for channels/routes, no limits, no chunking. | ⚠️ Partial |
| **Adapters**: only see final DSL; map to platform; handle tokens, rate limits, retries, file uploads | Adapters get resolved message (Slack DSL or raw). Slack adapter compiles DSL → Block Kit and sends. No explicit retries or rate limits; file upload exists for `destination.settings.files`. | ⚠️ Mostly aligned; adapters do see “final” message |

**Verdict:** Separation is roughly right (core does template + vars; adapter does platform send), but core does not do config/routes, limits, or chunking.

---

## 7) v1 “done” checklist from the brief

| Requirement | Current | Status |
|-------------|---------|--------|
| **Config**: YAML-only examples; `pigeon.channels`, `pigeon.templates`, `pigeon.routes`, `pigeon.limits`, `pigeon.chunking` | No central pigeon config. Only credential config and per-template destination. | ❌ |
| **DSL**: Minimal documented block types; interpolation; no platform-specific leak | Documented Slack block types; interpolation. DSL is Slack-specific. | ⚠️ |
| **Payload**: Canonical `version: v1` schema; at least `run`, `jobs`, `tests`, `code`, `env` | Flat vars only. No payload schema. | ❌ |
| **Pipeline**: Render → validate (limits) → overflow (chunking, file fallback) → send | Render → validate (schema/vars) → send. No limits or overflow. | ❌ |
| **Separation**: Core platform-agnostic; adapters only see finalized DSL | Core is template-agnostic; adapters see resolved message. DSL is Slack-specific. | ⚠️ |

---

## Summary: what we have vs what the brief asks for

**We have:**

- CI-oriented CLI and API; YAML (and JSON) templates.
- Per-template destination (service + settings) and credentials from config/env.
- Block-based Slack DSL with `{{ }}` interpolation; compile to Block Kit and send.
- Render (interpolate) → validate (schema + required vars) → send; dry-run; list/validate commands.

**We do not have (vs brief):**

1. **Central declarative config** — No `.pigeon/config.yaml` (or equivalent) with `channels`, `templates`, `routes`. Destination is per-template; caller picks template path and vars.
2. **Canonical runtime payload** — No versioned `run`/`jobs`/`tests`/`code`/`env`; only flat vars.
3. **Platform-agnostic DSL** — Current DSL is Slack Block Kit–oriented; no canonical block set mapped to multiple platforms.
4. **Limits and overflow** — No `max_message_chars`, `max_block_chars`, `max_blocks_per_message`, no chunking, no “Part 1 of N” footers, no file-upload fallback for huge blocks.
5. **Config-driven limits/chunking** — No `pigeon.limits` or `pigeon.chunking` in config.

So: **we match the brief’s core idea (CI messaging, templates, interpolation, send)** but **we do not yet implement** the full config model, canonical payload, limits/chunking pipeline, or platform-agnostic DSL. The current design is a smaller, “template + vars → send” MVP; the brief describes a larger v1 with central config, canonical payload, and a full render→validate→overflow→send pipeline.
