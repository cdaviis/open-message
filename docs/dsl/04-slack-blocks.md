# Slack blocks (DSL shorthand)

In a Slack template, `message.blocks` can use **DSL shorthand**: each block is a single key (`header`, `section`, `context`, etc.) with a short value shape. Pigeon compiles these to Slack’s Block Kit format before sending. You can also use **raw** Block Kit (objects with `type: 'header'`, etc.); see [Overview](01-overview.md).

Text inside blocks supports Slack **mrkdwn** by default (bold `*text*`, code `` `code` ``, links `<url|label>`, etc.) unless the block uses `plain_text`.

## `header`

Title line. Rendered as a large heading. DSL accepts a string or an object with `text` and optional `block_id`.

```yaml
- header: 'Release {{version}}'
# or
- header:
    text: 'Release {{version}}'
    block_id: my_header
```

## `section`

Body content: one main text and/or up to 10 fields (two-column style), and an optional **accessory** (image, button, select, etc.). See [Slack elements](05-slack-elements.md) for accessories.

```yaml
- section:
    text: 'Main paragraph with *mrkdwn*.'
# or with fields (left/right columns)
- section:
    fields:
      - '*Label 1:*\nValue 1'
      - '*Label 2:*\nValue 2'
# or both
- section:
    text: 'Summary'
    fields:
      - '*Key:*\nValue'
    block_id: optional_id
# with accessory (e.g. button)
- section:
    text: 'Approve this?'
    accessory:
      button:
        text: Approve
        action_id: approve_btn
        style: primary
```

- **text** — Single mrkdwn string.
- **fields** — Array of mrkdwn strings; displayed in two columns.
- **block_id** — Optional; for interactions and debugging.
- **accessory** — Optional element (button, image, select, etc.).

## `context`

Small, gray footer line. Good for timestamps, source, or small images. DSL accepts an array of elements, or an object `{ elements: [...] }` with optional `block_id`.

Elements can be:
- **Strings** — Rendered as mrkdwn.
- **Images** — `{ image: { url: '...', alt: '...' } }` or `{ image: { slack_file: '...', alt: '...' } }`.

```yaml
- context:
    - 'Sent at {{now}}'
# or multiple items
- context:
    - '*Branch:* {{branch}}'
    - 'Commit `{{sha}}`'
# with image
- context:
    - 'Deployed by {{user}}'
    - image:
        url: 'https://...'
        alt: 'Avatar'
```

## `divider`

Horizontal rule. DSL accepts `true` or an object with optional `block_id`.

```yaml
- divider: true
# or
- divider:
    block_id: sep1
```

## `actions`

Row of interactive elements (buttons, selects, datepicker, timepicker, overflow). Use the `elements` array; each item is an element object. See [Slack elements](05-slack-elements.md).

```yaml
- actions:
    elements:
      - button:
          text: Approve
          action_id: approve
          style: primary
      - button:
          text: Reject
          action_id: reject
          style: danger
```

## `image`

Standalone image block.

```yaml
- image:
    url: 'https://example.com/image.png'
    alt: 'Description of image'
    title: 'Optional title'
    block_id: img1
# or Slack file
- image:
    slack_file: 'https://files.slack.com/...'
    alt: 'Uploaded image'
```

- **url** or **slack_file** — Image source.
- **alt** — Required; accessibility and fallback.
- **title** — Optional plain text title.
- **block_id** — Optional.

## `video`

Video block (Slack video unfurl).

```yaml
- video:
    url: 'https://...'
    thumbnail: 'https://...'
    alt: 'Video description'
    title: 'Video title'
    description: 'Optional description'
    provider: 'YouTube'
    title_url: 'https://...'
    block_id: vid1
```

- **url**, **thumbnail**, **alt**, **title** — Required.
- **description**, **provider**, **title_url**, **block_id** — Optional.

## `markdown`

Richer markdown block (Slack’s `mrkdwn`-style in a dedicated block).

```yaml
- markdown: |
    *Bold* and _italic_ and `code`.
    <https://example.com|Link>.
```

Value is a single string (multiline supported).

## `file`

Reference to a file already uploaded to Slack (e.g. via files API).

```yaml
- file:
    external_id: 'F12345678'
    block_id: optional
```

## `table`

Table block (Slack table layout).

```yaml
- table:
    columns:
      - label: 'Name'
        align: left
      - label: 'Status'
        align: center
    rows:
      - - 'Service A'
        - 'OK'
      - - 'Service B'
        - 'Fail'
    block_id: tbl1
```

- **columns** — Optional; `label`, `align` (`left` | `center` | `right`), `is_wrapped`.
- **rows** — Array of rows; each row is an array of cell values (strings or objects per Slack spec).
- **block_id** — Optional.

## `raw`

Escape hatch: pass a Block Kit block object through unchanged. Use when the DSL doesn’t support a block type or you need exact API shape.

```yaml
- raw:
    type: 'input'
    block_id: my_input
    element:
      type: 'plain_text_input'
      action_id: reply
    label:
      type: 'plain_text'
      text: 'Your reply'
```

The value of `raw` is sent as a single block in `blocks` (no further compilation).

## Summary

| Block   | DSL key   | Main use |
|---------|-----------|----------|
| Header  | `header`  | Title |
| Section | `section` | Body text, fields, optional accessory |
| Context | `context` | Footer, small text/images |
| Divider | `divider` | Horizontal rule |
| Actions | `actions` | Buttons, selects, date/time pickers, overflow |
| Image   | `image`   | Standalone image |
| Video   | `video`   | Video unfurl |
| Markdown| `markdown`| Rich text block |
| File    | `file`    | Reference to Slack file |
| Table   | `table`   | Table layout |
| Raw     | `raw`     | Passthrough Block Kit object |

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[← Previous: Variables](03-variables.md) | [Next: Slack elements →](05-slack-elements.md)
