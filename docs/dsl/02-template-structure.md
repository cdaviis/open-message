# Template structure

Every Pigeon template is a single YAML or JSON file with a fixed top-level shape. This page describes each part.

## Required fields

### `version`

Must be the string `'1'`. Reserved for future schema changes.

```yaml
version: '1'
```

### `name`

A non-empty, human-readable name for the template (e.g. used in logs and `pigeon list`).

```yaml
name: Deploy Notification
```

### `destination`

Where to send the message. Must include `service`; other keys depend on the service.

**Slack:**

```yaml
destination:
  service: slack
  settings:
    channel: '#deployments'   # or a channel ID (e.g. C01234ABCD)
```

Service-specific options go under **`settings`** so we can add more destination attributes later without breaking templates. Channel can be a channel name (e.g. `#general`) or a Slack channel ID. Interpolation works: `channel: '{{CHANNEL_ID}}'` with `CHANNEL_ID` from env.

**Backward compatibility:** Legacy forms are still supported and will never be removed: `destination.slack.channel` and top-level `destination.channel`.

### Multiple destinations

You can send the **same message** to multiple channels or services by using `destinations` (array) instead of `destination` (object). Each entry can be:

- **Explicit service:** `{ service: slack, settings: { channel: 'C...' } }`
- **Keyed by service:** `{ slack: { settings: { channel: 'C...' } } }` (one key = service name)

Example (same message to two Slack channels):

```yaml
destinations:
  - slack:
      settings:
        channel: '{{SLACK_CHANNEL_TESTS}}'
  - slack:
      settings:
        channel: '{{SLACK_CHANNEL_RELEASES}}'
message:
  blocks: [ ... ]
```

Use a single `destination` when sending to one place; use `destinations` when sending to several. The same `message` is sent to every entry.

### `message`

The service-specific payload. For Slack, this is the body of `chat.postMessage`: at minimum either `text` (fallback) or `blocks`.

**Slack with blocks (DSL shorthand):**

```yaml
message:
  blocks:
    - header:
        text: 'Hello'
    - section:
        text: 'World'
```

**Slack with plain text fallback:**

```yaml
message:
  text: 'Deployed {{app_name}} at {{now}}'
  blocks:
    - header:
        text: 'Deploy'
```

Optional top-level keys for Slack (passed through to the API): `thread_ts`, `reply_broadcast`, `unfurl_links`, `unfurl_media`.

### Threading: replying in a thread

To send a message **in a thread** (as a reply to a parent message), set **`thread_ts`** to the parent message’s `ts`. You can define it in the **message** or in **destination `settings`**; both are sent to the Slack API.

**Option A — in the message (good when `thread_ts` is a variable):**

```yaml
variables:
  thread_ts:
    description: Parent message ts (from the first send's response)
    required: true

message:
  thread_ts: '{{thread_ts}}'
  blocks:
    - section:
        text: 'Reply in thread'
```

**Option B — in destination settings (same idea, useful with multiple destinations):**

```yaml
destination:
  service: slack
  settings:
    channel: '{{SLACK_CHANNEL}}'
    thread_ts: '{{thread_ts}}'
message:
  blocks: [ ... ]
```

**Passing `thread_ts` from one send to the next**

1. Send the **parent** message with your usual template. The Slack API returns a response that includes **`ts`** (the message timestamp).
2. Use that **`ts`** as **`thread_ts`** for any reply.

**CLI:** Capture the first response (e.g. from a script or CI), then pass it into the next send:

```bash
# First: send parent (example: capture ts from JSON output in your script)
pigeon send ./templates/parent.yml --var channel_id=C123 --json

# Then: send reply (thread_ts comes from the parent response)
pigeon send ./templates/reply.yml --var thread_ts=1234567890.123456
```

**Programmatic API:** Use the **`response`** from the first send (Slack returns `{ ok: true, ts: "…", channel: "…" }`):

```ts
const parent = await pigeon.send('./templates/parent.yml', { channel_id: 'C123' });
const thread_ts = (parent.response as { ts?: string })?.ts;
if (thread_ts) {
  await pigeon.send('./templates/reply.yml', { thread_ts, body: 'First reply' });
  await pigeon.send('./templates/reply.yml', { thread_ts, body: 'Second reply' });
}
```

**Multiple child posts in the same thread:** Use the **same** `thread_ts` (the parent’s `ts`) for every reply. Send the parent once, then send as many reply messages as you need, each with that same `thread_ts`.

## Optional fields

### `description`

Short description of when or why to use this template. Purely for humans and tooling.

```yaml
description: Posted to #releases when a new GitHub release is created
```

### `variables`

Declares variables the template expects. Used for validation (`pigeon validate`), documentation, and default values. Keys are variable names; values can include:

| Key | Description |
|-----|--------------|
| `description` | What the variable is for |
| `required` | If `true`, caller must provide it (or it must resolve from env/default). Defaults to `true` when `default` is not set |
| `default` | Fallback when the variable is not provided. Can reference other variables, e.g. `default: production` |

```yaml
variables:
  app_name:
    description: Name of the app or service
    required: true
  version:
    description: Version or tag
    required: true
  environment:
    description: Target environment
    default: production
```

Interpolation and resolution order are described in [Variables](03-variables.md).

## Full minimal example

```yaml
version: '1'
name: Simple Alert
description: One-line alert to Slack

destination:
  service: slack
  settings:
    channel: '#alerts'

variables:
  message:
    description: Alert text
    required: true

message:
  blocks:
    - section:
        text: '{{message}}'
```

## File format

- **YAML** — Preferred; supports comments. Loaded for `.yml` / `.yaml`.
- **JSON** — Same structure; loaded for `.json`.

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[← Previous: Overview](01-overview.md) | [Next: Variables →](03-variables.md)
