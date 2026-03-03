<p align="center">
  <img src="pigeon.png" alt="pigeon" width="180" />
</p>

<h1 align="center">PigeonJS</h1>

<p align="center">
  Template-first messaging for Slack and more.
</p>

<p align="center">
  <a href="https://codecov.io/gh/cdaviis/pigeon"><img src="https://codecov.io/gh/cdaviis/pigeon/branch/main/graph/badge.svg" alt="Coverage" /></a>
</p>

---

PigeonJS lets you define your messages as YAML or JSON templates — including the destination, formatting, and variables — and send them from the CLI or your Node.js code.

## Features

- **Template-first** — message structure, destination, and variables all live in one file
- **YAML or JSON** templates
- **CLI** for use in CI/CD pipelines
- **Programmatic API** for use in Node.js applications
- **Variable interpolation** with `{{var}}`, env vars (`{{MY_ENV_VAR}}`), and built-ins (`{{now}}`, `{{uuid}}`)
- Built-in adapter for **Slack** (Block Kit)

## Documentation

Detailed **template and DSL** docs (templates, variables, Slack blocks and elements):

| Doc | Description |
|-----|-------------|
| [DSL overview](docs/dsl/01-overview.md) | What the template DSL is, Slack shorthand vs raw Block Kit |
| [Template structure](docs/dsl/02-template-structure.md) | `version`, `name`, `destination`, `variables`, `message` |
| [Variables](docs/dsl/03-variables.md) | Interpolation, `{{tokens}}`, resolution order, built-ins, env |
| [Slack blocks](docs/dsl/04-slack-blocks.md) | header, section, context, divider, actions, image, video, markdown, file, table, raw |
| [Slack elements](docs/dsl/05-slack-elements.md) | button, overflow, select, multi_select, datepicker, timepicker |
| [Examples](docs/dsl/06-examples.md) | Full template examples |

Each doc has **Previous** / **Next** links at the bottom to move through the guide.

## Installation

```bash
npm install pigeon-js
```

For CLI use, install globally:

```bash
npm install -g pigeon-js
```

## Quick start

**1. Create a template** (`./templates/deploy.yml`):

```yaml
version: '1'
name: Deploy Notification
destination:
  service: slack
  settings:
    channel: '#deployments'
variables:
  app_name:
    required: true
  version:
    required: true
  environment:
    default: production
message:
  blocks:
    - type: header
      text:
        type: plain_text
        text: ':rocket: {{app_name}} deployed to {{environment}}'
    - type: section
      fields:
        - type: mrkdwn
          text: '*Version:*\n`{{version}}`'
        - type: mrkdwn
          text: '*Status:*\n:large_green_circle: Success'
    - type: context
      elements:
        - type: mrkdwn
          text: 'Deployed at {{now}}'
```

**2. Set your credentials:**

```bash
export SLACK_TOKEN=xoxb-your-token
```

**3. Send it:**

```bash
pigeon send ./templates/deploy.yml --var app_name=api --var version=1.2.3
```

## CLI

```
pigeon send <path> [options]        Send a message
pigeon validate <path>              Validate a template
pigeon list <dir>                   List templates in a directory
```

### `pigeon send` options

| Flag | Description |
|---|---|
| `-v, --var <key=value>` | Set a template variable (repeatable) |
| `--dry-run` | Print resolved payload without sending |
| `--json` | Output result as JSON (for scripting) |
| `--config <file>` | Path to a credentials config file |
| `-e, --env-file <file>` | Load a `.env` file for credentials |

### Examples

```bash
# Send with variables
pigeon send ./templates/deploy.yml --var app_name=api --var version=2.0.0

# Preview the resolved payload
pigeon send ./templates/deploy.yml --var app_name=api --var version=2.0.0 --dry-run

# JSON output for CI/CD scripting
pigeon send ./templates/build-report.yml --var branch=main --var status=passing --json

# Validate a template
pigeon validate ./templates/slack-deploy.yml

# List templates in a directory
pigeon list ./templates
```

## Programmatic API

```typescript
import pigeon from 'pigeon-js';

// Send a message
await pigeon.send('./templates/deploy.yml', { app_name: 'api', version: '1.2.3' });

// With options (dry-run, limits/chunking for long messages)
await pigeon.send('./templates/deploy.yml', { app_name: 'api', version: '2.0.0' }, {
  dryRun: true,
  limits: { maxBlocksPerMessage: 40, maxMessageChars: 8000 },
  chunking: { enabled: true, footerTemplate: 'Part {{ index }} of {{ total }}' },
});
```

Templates can use **multiple destinations** (`destinations` array) to send the same message to several channels or services; see [Template structure](docs/dsl/02-template-structure.md#multiple-destinations).

## Template DSL

All templates share a common shape: `version`, `name`, `destination`, optional `variables`, and `message`. For Slack you can use **DSL shorthand** (e.g. `header`, `section`, `context`) or **raw Block Kit**.

Quick reference:

- **Variable tokens** — `{{my_var}}` (caller/API), `{{MY_ENV_VAR}}` (env, ALL_CAPS only), `{{now}}`, `{{timestamp}}`, `{{uuid}}`. Resolution order: built-ins → caller vars → env (ALL_CAPS) → template defaults.
- **Full reference** — See [Documentation](#documentation) above for the full DSL guide (template structure, variables, Slack blocks and elements, examples).

## Credentials

Credentials are resolved in this priority order (highest wins):

1. Programmatic `opts.credentials`
2. CLI `--config <file>`
3. Environment variables
4. `.pigeon.yml` in the current directory
5. `~/.pigeon/config.yml`

### Environment variables

```bash
SLACK_TOKEN=xoxb-...
```

### Config file (`.pigeon.yml` or `~/.pigeon/config.yml`)

```yaml
slack:
  botToken: xoxb-your-token
```

## Slack notifications (CI)

The release and CI notification workflows send to Slack using channel IDs from **Actions secrets** (so channel IDs are not stored in the repo). In **Settings → Secrets and variables → Actions**, add:

| Secret | Used by | Description |
|--------|---------|-------------|
| `SLACK_TOKEN` | All Slack workflows | Slack bot token (`xoxb-...`) |
| `SLACK_CHANNEL_RELEASES` | Publish workflow | Channel ID for #releases |
| `SLACK_CHANNEL_TESTS` | CI Slack Notification workflow | Channel ID for #tests |

Channel IDs are in the Slack channel URL when you open a channel, or use **Copy link** on the channel.

## Publishing to npm

Releases are automated with [Release Please](https://github.com/googleapis/release-please) and the **Publish to npm** workflow.

### How it works

1. **Use conventional commits** on `main` (e.g. `feat: ...`, `fix: ...`, `docs: ...`). Release Please uses them to decide the next version and to build the changelog.
2. **Push to main** — Release Please runs and opens (or updates) a **Release PR** that bumps the version in `package.json` and updates `CHANGELOG.md`.
3. **Merge the Release PR** — Release Please creates the GitHub Release and tag. That triggers the **Publish to npm** workflow (build → publish → Slack #releases).

Example after you land changes:

```bash
git add -A
git status   # review
git commit -m "feat: add template path validation and error handling"
git push origin main
```

Then merge the **Release PR** that Release Please opens (or updates). No need to create the release or tag manually.

### Required secrets

In **Settings → Secrets and variables → Actions**:

- **`NPM_TOKEN`** — [npm Access Token](https://www.npmjs.com/settings/~/tokens) with **Automation** or **Publish** permission (used by Publish to npm).
- **`SLACK_TOKEN`** and **`SLACK_CHANNEL_RELEASES`** — optional; used to post to #releases after publish.

## License

MIT
