# DSL overview

Pigeon templates use a **template DSL** (domain-specific language): a single YAML or JSON file that defines the message **destination**, **variables**, and **message content**. For Slack, the message can be written in either **raw Slack Block Kit** or Pigeon’s **Slack DSL shorthand**, which compiles to Block Kit for you.

## What is the template DSL?

- **One file per message type** — Deploy notification, release note, CI alert, etc.
- **Destination and message together** — Channel (or other target) and payload live in the same template.
- **Declared variables** — Optional `variables` section documents and validates inputs (`--var`, API `vars`, env, defaults).
- **Interpolation** — Any string (or key) in the template can use `{{variable}}` tokens; see [Variables](03-variables.md).

## Template file shape

Every template has this top-level structure:

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Must be `'1'` |
| `name` | Yes | Human-readable template name |
| `description` | No | Short description of when to use it |
| `destination` | Yes | Where to send: `service` plus `settings` (service-specific options). Extensible so we can add attributes later. |
| `variables` | No | Declare variables (description, required, default) |
| `message` | Yes | Service-specific payload (e.g. Slack `blocks` or `text`) |

See [Template structure](02-template-structure.md) for details.

## Template compatibility (no breaking changes)

**We do not make non-backwards-compatible changes to the template processor.** Existing templates must keep working. New attributes (e.g. under `destination.settings`) are added in an additive way; legacy forms remain supported. If a breaking change were ever unavoidable, we would document it clearly, add warnings, and notify users before removal.

## Slack: DSL shorthand vs raw Block Kit

For Slack, `message` can be:

1. **Raw Block Kit** — The same structure the Slack API expects: `blocks` with objects like `{ type: 'header', text: { type: 'plain_text', text: '...' } }`. You can paste from Slack’s Block Kit Builder.
2. **Slack DSL shorthand** — A shorter form where each block is a single key (e.g. `header`, `section`, `context`). Pigeon compiles this to Block Kit before sending.

If **any** block in `message.blocks` has a shorthand key (`header`, `section`, `context`, `divider`, `actions`, `image`, `video`, `markdown`, `file`, `table`, `raw`), the whole message is treated as DSL and compiled. Otherwise the message is sent as-is (raw Block Kit).

**Example — DSL shorthand:**

```yaml
message:
  blocks:
    - header:
        text: ':tada: Release {{version}}'
    - section:
        fields:
          - '*Branch:*\n`{{branch}}`'
          - '*Status:*\n{{status}}'
    - context:
        - 'Sent at {{now}}'
```

**Example — raw Block Kit:**

```yaml
message:
  blocks:
    - type: header
      text:
        type: plain_text
        text: ':tada: Release {{version}}'
    - type: section
      fields:
        - type: mrkdwn
          text: '*Branch:*\n`{{branch}}`'
```

Both support `{{variable}}` interpolation. Use shorthand for less boilerplate; use raw when you need exact control or copy-paste from Slack.

## What’s covered in this guide

| Doc | Content |
|-----|---------|
| [Template structure](02-template-structure.md) | `version`, `name`, `destination`, `variables`, `message` in detail |
| [Variables](03-variables.md) | Declaration, `{{tokens}}`, resolution order, built-ins, env |
| [Slack blocks](04-slack-blocks.md) | All DSL block types: header, section, context, divider, actions, image, video, markdown, file, table, raw |
| [Slack elements](05-slack-elements.md) | Elements for section accessories and actions: button, overflow, select, datepicker, timepicker |
| [Examples](06-examples.md) | Full template examples |

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[Next: Template structure →](02-template-structure.md)
