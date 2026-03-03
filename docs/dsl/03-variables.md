# Variables

Templates use **interpolation**: anywhere you can put a string (or an object key), you can use `{{variable_name}}` tokens. Variables are resolved in a fixed order; optional ones can have defaults or come from the environment.

## Where tokens work

- **Strings** — In block text, field values, destination values, etc.
- **Object keys** — Keys of objects are interpolated (e.g. `{{env}}` in a key name).

Example:

```yaml
message:
  blocks:
    - header:
        text: 'Deployed {{app_name}} to {{environment}}'
    - section:
        fields:
          - '*Version:*\n`{{version}}`'
```

## Resolution order

Variables are resolved in this order (first match wins):

1. **Built-ins** — `{{now}}`, `{{timestamp}}`, `{{uuid}}`
2. **Caller vars** — Values from CLI `--var key=value` or API `vars: { key: 'value' }`
3. **Environment** — For **ALL_CAPS** tokens only: `{{MY_ENV_VAR}}` → `process.env.MY_ENV_VAR`
4. **Template default** — The `default` in `variables.<name>` in the template
5. **Missing** — If none of the above apply, resolution fails with a missing-variable error (unless the variable is optional with a default)

Case is significant: `{{USER}}` and `{{user}}` are different. Only tokens that are entirely uppercase (matching `^[A-Z_][A-Z0-9_]*$`) are considered for env lookup.

## Built-in variables

| Token | Value |
|-------|--------|
| `{{now}}` | Current date/time in ISO 8601 format |
| `{{timestamp}}` | Current Unix timestamp in milliseconds |
| `{{uuid}}` | A new random UUID v4 |

These are evaluated at send time. Do not override them; use different names (e.g. `release_date`) if you need to pass a value.

## Caller variables (CLI and API)

**CLI:**

```bash
pigeon send ./templates/deploy.yml --var app_name=api --var version=1.2.0
```

**API:**

```ts
await pigeon.send('./templates/deploy.yml', { app_name: 'api', version: '1.2.0' });
```

Names and values are case-sensitive.

## Environment variables (ALL_CAPS)

If a token is **all uppercase** (e.g. `{{RELEASE_BODY}}`, `{{CHANNEL_ID}}`), Pigeon will try to resolve it from `process.env` when not provided by the caller. Useful in CI so you don’t pass secrets or long values on the command line.

```yaml
# In template
message:
  blocks:
    - section:
        text: '{{RELEASE_BODY}}'
```

```bash
# In CI
export RELEASE_BODY="$RELEASE_NOTES"
pigeon send ./templates/release.yml --var tag_name=v1.0.0 --var html_url=...
```

If `RELEASE_BODY` is set in the environment, it is used; otherwise the template’s `variables.RELEASE_BODY.default` (if any) or missing-variable error.

## Template `variables` section

Use the optional `variables` block to:

- Document what each variable is for
- Mark required vs optional and set defaults
- Validate before send (`pigeon validate` checks that required variables are supplied)

```yaml
variables:
  app_name:
    description: Application or service name
    required: true
  version:
    description: Version or tag
    required: true
  environment:
    description: Deployment environment
    default: production

message:
  blocks:
    - section:
        text: 'Deployed {{app_name}} to {{environment}} ({{version}})'
```

- **Required** — If `required: true` (or omitted when there is no `default`), the variable must be provided or resolved from env/default.
- **Default** — `default` can be a fixed string or reference other variables, e.g. `default: '{{environment}}-instance'`. Circular references in defaults are detected and rejected.

### Slack @mentions via interpolation

For **Slack** messages, @mention users and groups using normal string interpolation and Slack’s mrkdwn syntax. No special schema—you control the exact text.

**Preferred:** Keep the variable as an ID and build the mention in the template. That keeps the use case open and less strict (same variable works for user IDs, and you can combine with other mrkdwn like `<!here>` or `<!subteam^{{team_id}}>`).

```yaml
variables:
  reviewer_id:
    description: Slack user ID (e.g. U01234ABCD)
    required: true

message:
  blocks:
    - section:
        text: 'Please review: <@{{reviewer_id}}>'
```

```bash
pigeon send ./templates/review.yml --var reviewer_id=U01234ABCD
```

Alternatively, you can pass the full mention string and interpolate it as-is: `--var reviewer='<@U01234ABCD>'` with `text: 'Please review: {{reviewer}}'`.

## Edge cases

- **Empty string** — An empty string is a valid value; `--var x=` or `vars: { x: '' }` resolves `{{x}}` to empty.
- **ALL_CAPS** — Only tokens that look like env var names (all caps, underscores) are looked up in `process.env`. `{{User}}` is not.
- **Do not override built-ins** — Use different names (e.g. `release_time`) instead of relying on overriding `{{now}}`.

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[← Previous: Template structure](02-template-structure.md) | [Next: Slack blocks →](04-slack-blocks.md)
