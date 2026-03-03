# Slack elements

**Elements** are interactive or decorative pieces used inside **section** blocks (as `accessory`) or **actions** blocks (in `elements`). The DSL shorthand for each element is a single key (`button`, `overflow`, `select`, etc.) with an object value.

## `button`

Clickable button. Can open a URL or submit an action; optional confirmation dialog and style.

```yaml
button:
  text: 'Approve'
  action_id: approve_btn
  value: 'approved'
  style: primary    # or danger; omit for default
  url: 'https://...' # optional; if set, opens URL instead of sending action
  confirm:          # optional confirmation dialog
    title: 'Confirm'
    text: 'Really approve?'
    confirm: 'Yes'
    deny: 'No'
    style: primary   # or danger
  accessibility_label: 'Approve request'
```

- **text** — Button label (plain text).
- **action_id** — Identifies the button in interaction payloads.
- **value** — Optional string sent with the action.
- **style** — `primary` (green) or `danger` (red); omit for default gray.
- **url** — If present, clicking opens the URL (no action payload).
- **confirm** — Optional; `title`, `text`, `confirm`, `deny`, and optional `style`.
- **accessibility_label** — Optional for screen readers.

## `overflow`

Dropdown menu of options (static list).

```yaml
overflow:
  action_id: menu_actions
  options:
    - text: 'Option A'
      value: 'a'
      description: 'Does A'
    - text: 'Option B'
      value: 'b'
    - text: 'Link'
      url: 'https://example.com'
```

- **action_id** — Optional.
- **options** — List of `{ text, value?, url?, description? }`. `value` defaults to `text` if omitted.

## `select` (static select)

Single-choice dropdown. Compiled to Slack’s `static_select`.

```yaml
select:
  placeholder: 'Choose one'
  action_id: choice
  options:
    - text: 'Yes'
      value: 'yes'
    - text: 'No'
      value: 'no'
      description: 'Select no'
```

- **placeholder** — Optional; shown when nothing is selected.
- **action_id** — Optional.
- **options** — Same shape as overflow: `text`, `value?`, `url?`, `description?`.

## `multi_select` (static multi-select)

Multi-choice dropdown. Compiled to `multi_static_select`.

```yaml
multi_select:
  placeholder: 'Pick environments'
  action_id: envs
  options:
    - text: 'Staging'
      value: 'staging'
    - text: 'Production'
      value: 'prod'
```

Same option shape as `select` and `overflow`.

## `datepicker`

Date picker element.

```yaml
datepicker:
  action_id: start_date
  placeholder: 'Select date'
  initial_date: '2025-01-15'   # YYYY-MM-DD
```

## `timepicker`

Time picker element.

```yaml
timepicker:
  action_id: start_time
  placeholder: 'Select time'
  initial_time: '14:30'
  timezone: 'America/New_York'
```

## `raw`

Pass a Slack element object through unchanged when the DSL doesn’t cover a given element type.

```yaml
raw:
  type: 'checkboxes'
  action_id: checks
  options:
    - text: { type: 'plain_text', text: 'Option 1' }
      value: 'opt1'
```

The value of `raw` is sent as one element in the parent block.

## Where elements are used

- **Section accessory** — One element on the right side of a section:
  ```yaml
  - section:
      text: 'Review this request'
      accessory:
        button:
          text: 'Review'
          action_id: review
          style: primary
  ```
- **Actions block** — One or more elements in a row:
  ```yaml
  - actions:
      elements:
        - button:
            text: 'Approve'
            action_id: approve
            style: primary
        - button:
            text: 'Reject'
            action_id: reject
            style: danger
        - datepicker:
            action_id: due_date
            placeholder: 'Due date'
  ```

## Summary

| Element       | DSL key        | Use |
|---------------|----------------|-----|
| Button        | `button`       | Single action or link |
| Overflow menu | `overflow`     | Dropdown of options/links |
| Select        | `select`       | Single-choice dropdown |
| Multi-select  | `multi_select` | Multi-choice dropdown |
| Datepicker    | `datepicker`   | Date selection |
| Timepicker    | `timepicker`   | Time selection |
| Raw           | `raw`          | Passthrough Block Kit element |

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[← Previous: Slack blocks](04-slack-blocks.md) | [Next: Examples →](06-examples.md)
