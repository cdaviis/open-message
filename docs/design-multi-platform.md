# Multi-platform design: Notion, Teams, and others

This doc outlines what’s already generic in Pigeon, what’s Slack-specific, and what we’d need to redesign or add to support Notion, Microsoft Teams, and other comms platforms.

## What already works for multiple services

These parts of the codebase are **service-agnostic** and don’t need to change for new platforms:

| Layer | Current design | Notes |
|-------|----------------|--------|
| **Template top-level** | `version`, `name`, `destination`, `variables`, `message` | `destination.service` selects the adapter; `destination` can hold any service-specific keys (channel, page_id, webhook_url, etc.). |
| **Variables / interpolation** | `{{var}}`, built-ins, env (ALL_CAPS) | Same for every service. |
| **Dispatcher** | Load → validate schema → validate vars → resolve credentials → interpolate → get adapter → **compile?** → validate message → send | Only adapter lookup and optional `compile()` are service-specific. |
| **Adapter interface** | `serviceName`, `compile?()`, `validate()`, `send(message, destination, credentials)` | Each platform implements this. |
| **Credentials** | `CredentialStore` keyed by service; env `PIGEON_{SERVICE}_{KEY}` and shorthand (e.g. `SLACK_TOKEN`) | Add Notion/Teams keys and optional shorthands. |

So: **template shape, routing, variables, and the adapter contract are already generalized.** The main decisions are how **messages** are represented and how much we share across platforms.

---

## Message shape: two approaches

### Option A: Service-native message only (minimal change)

**Idea:** Each template targets one service. The `message` field is always in that service’s native format. No shared block vocabulary.

- **Slack:** `message` = Slack payload (`blocks` and/or `text`). Keep existing Slack DSL as a **Slack-only** shorthand that compiles to Block Kit inside the Slack adapter.
- **Notion:** `message` = Notion block children (e.g. `{ children: [ { object: 'block', type: 'paragraph', paragraph: { rich_text: [...] } }, ... ] }`). Notion adapter expects this shape (and could support a small Notion-specific shorthand if useful).
- **Teams:** `message` = Adaptive Card JSON (e.g. `{ type: 'message', attachments: [ { contentType: 'application/vnd.microsoft.card.adaptive', content: { type: 'AdaptiveCard', body: [...], actions: [...] } } ] }`). Teams adapter expects this.

**Tweaks needed:**

1. **Documentation** — Rename “DSL” in the docs to **“Slack DSL”** and state that block types (header, section, context, etc.) are Slack Block Kit. Add separate sections (or docs) for “Notion blocks” and “Teams Adaptive Cards” when those adapters exist, with their native message shapes.
2. **Adapters** — Implement `NotionAdapter` and `TeamsAdapter` (and any others). Each:
   - Declares `serviceName` (`'notion'`, `'teams'`).
   - Optionally implements `compile()` if we add a small platform-specific shorthand later.
   - Implements `validate(message)` for that platform’s payload.
   - Implements `send(message, destination, credentials)` using the platform’s API.
3. **Destination** — Each adapter documents and validates the keys it needs, e.g.:
   - Notion: `page_id` (append blocks) or `database_id` (create page) + optional `parent` details.
   - Teams: `webhook_url` (Incoming Webhook) or `conversation_id` + `service_url` (Bot Framework).
4. **Credentials** — Extend `CredentialStore` and env resolution (already structured for this):
   - Notion: `notion.apiKey` / `NOTION_API_KEY` (already in types).
   - Teams: e.g. `teams.webhookUrl` for webhooks, or `teams.botToken` / `teams.appId` + `teams.appPassword` for Bot Framework.

**Pros:** Smallest change, no new abstraction. Templates are explicit about which service they target.  
**Cons:** One template can’t “compile” to multiple platforms; you maintain separate templates per platform if you want the same content in Slack and Notion.

---

### Option B: Canonical (shared) block model

**Idea:** Define a single **Pigeon block vocabulary** (e.g. `heading`, `paragraph`, `list`, `image`, `divider`, `actions`, `section` with fields). Templates use this canonical form. Each adapter **compiles** canonical → native (Slack Block Kit, Notion blocks, Adaptive Cards).

- **Canonical example:**  
  `{ type: 'heading', level: 1, text: '{{title}}' }`  
  `{ type: 'paragraph', text: '{{body}}' }`  
  `{ type: 'section', fields: [ ['Status', '{{status}}'], ['Env', '{{env}}'] ] }`  
  `{ type: 'actions', buttons: [ { id: 'ok', label: 'OK', style: 'primary' } ] }`

- **Adapters:**  
  - Slack: canonical → Block Kit (heading → header, paragraph → section, section → section with fields, actions → actions block with button elements).  
  - Notion: canonical → Notion blocks (heading → heading_1/2/3, paragraph → paragraph, etc.).  
  - Teams: canonical → Adaptive Card (heading → TextBlock with size, paragraph → TextBlock, section → FactSet or ColumnSet, actions → ActionSet).

**Redesign / tweaks needed:**

1. **Canonical block types** — Define a small schema (TypeScript types + runtime validation) for the canonical blocks and elements. Document it as “Pigeon block DSL” (platform-agnostic). Limit to what maps reasonably to Slack, Notion, and Teams (e.g. headings, paragraphs, lists, images, dividers, key-value sections, buttons/links).
2. **Template format** — Either:
   - `message.blocks` is an array of canonical blocks (and `destination.service` decides which adapter compiles it), or  
   - Keep `message` service-native and add a separate top-level (e.g. `canonical_blocks`) used only when you want multi-platform; then the adapter compiles from that when present. (More complex.)
3. **Compile in each adapter** — Each adapter gets a **canonical → native** compiler (in addition to or instead of a platform-specific shorthand like the current Slack DSL). So SlackAdapter would: canonical blocks → Block Kit; NotionAdapter: canonical → Notion blocks; TeamsAdapter: canonical → Adaptive Card.
4. **Gaps and fallbacks** — Not all concepts exist everywhere (e.g. Slack “context” is small text; Notion has callouts; Teams has FactSet). Define simple rules (e.g. “context” → Notion as a small paragraph or callout; “context” → Teams as a secondary TextBlock) and document limitations.
5. **Docs** — Document the canonical model first; then “Slack output”, “Notion output”, “Teams output” as compile targets. Existing Slack-only shorthand can stay as an alternative for Slack-only templates (or be deprecated in favor of canonical + Slack compiler).

**Pros:** One template can target multiple services by changing only `destination.service` (and maybe a few variables). Single vocabulary to learn for simple messages.  
**Cons:** Larger redesign; canonical schema and three compilers to build and maintain; some concepts don’t map 1:1 (need fallbacks and doc).

---

## Platform-specific notes

### Notion

- **API:** Append blocks to a page (`PATCH /v1/blocks/{block_id}/children`) or create a page with children. Blocks are objects with `object: 'block'`, `type`, and a type-specific key (`paragraph`, `heading_1`, `bulleted_list_item`, etc.). Rich text is `rich_text: [ { type: 'text', text: { content: '...' } } ]`.
- **Destination:** e.g. `page_id` (append) or `database_id` (create page). Optional: `parent` for nesting.
- **Credentials:** API key (integration). Already in `CredentialStore` as `notion.apiKey`; add env resolution (e.g. `NOTION_API_KEY` or `PIGEON_NOTION_API_KEY`).
- **Mapping from Slack-like ideas:** Header → heading_1/2/3; section text → paragraph; context → paragraph (small) or callout; divider → divider; list → bulleted_list_item / numbered_list_item. Buttons/actions don’t map directly (Notion has no message-level actions in the same way).

### Microsoft Teams

- **Incoming Webhook:** Simple: POST JSON to a webhook URL. Payload is usually an Adaptive Card in `attachments[].content`. No bot identity.
- **Bot Framework / Graph:** Richer (conversations, threading) but needs app registration, bot token, conversation IDs. Different auth and API.
- **Adaptive Cards:** JSON schema with `body` (array of elements: TextBlock, FactSet, Image, ColumnSet, etc.) and `actions` (Action.OpenUrl, Action.Submit). Different from Slack Block Kit but similar ideas (text, facts, images, actions).
- **Destination:** For webhooks: `webhook_url`. For bot: e.g. `conversation_id`, `service_url`, and optionally `tenant_id`.
- **Credentials:** Webhook: URL can be in destination or in credentials (e.g. `teams.webhookUrl`). Bot: `teams.botToken` or app id + password; resolve via env.
- **Mapping:** Section with fields → FactSet or ColumnSet; header → TextBlock (large); buttons → Action.OpenUrl / Action.Submit. Context → secondary TextBlock.

---

## Recommended path

- **Short term (Option A):** Treat the current block DSL as **Slack-only**. Add **Notion** and **Teams** adapters with **service-native** `message` shapes. Document Slack DSL under “Slack”, and add “Notion blocks” and “Teams Adaptive Cards” as separate reference sections. No change to the template file format; only new adapters and docs. This gets multi-platform working with minimal redesign.
- **Later (Option B), if you want one template → many platforms:** Introduce a small **canonical block schema** and implement canonical → Slack (extend or replace current DSL compile), canonical → Notion, and canonical → Teams. Then the “DSL” in the docs becomes the canonical model, and Slack/Notion/Teams become compile targets. Existing Slack-only templates can keep using raw Block Kit or the current Slack shorthand until you decide to deprecate.

---

## Checklist: what to redesign / tweak

| Area | Option A (service-native) | Option B (canonical) |
|------|---------------------------|----------------------|
| **Template `message`** | Per-service format; no change to current design | Add canonical block format; adapters compile to native |
| **Docs** | Rename to “Slack DSL”; add Notion/Teams message docs | Document canonical blocks; then “Slack / Notion / Teams output” |
| **Slack adapter** | No change (keep current DSL → Block Kit) | Add canonical → Block Kit compiler (or replace DSL) |
| **New adapters** | NotionAdapter, TeamsAdapter (native message) | NotionAdapter, TeamsAdapter (canonical → native) |
| **Destination** | Document per-service keys (channel, page_id, webhook_url, …) | Same |
| **Credentials** | Add Notion/Teams keys + env (NOTION_API_KEY, etc.) | Same |
| **Validation** | Each adapter validates its native payload | Each adapter validates compiled native payload |
| **Shared types** | None | Canonical block types (and maybe a shared compile entry point) |

The core architecture (template, destination, variables, adapter interface, credentials) already supports multiple platforms; the main design choice is **message shape** (service-native vs canonical) and **documentation** so it’s clear which parts are Slack-specific vs shared.
