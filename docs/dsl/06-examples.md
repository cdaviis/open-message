# DSL examples

Full template examples using the Slack DSL shorthand and variable interpolation.

## Deploy notification

```yaml
version: '1'
name: Deploy Notification
description: Posted when a deployment completes

destination:
  service: slack
  settings:
    channel: '#deployments'

variables:
  app_name:
    description: Application or service name
    required: true
  version:
    description: Version or tag deployed
    required: true
  environment:
    description: Target environment
    default: production

message:
  blocks:
    - header:
        text: ':rocket: {{app_name}} deployed to {{environment}}'
    - section:
        fields:
          - '*Version:*\n`{{version}}`'
          - '*When:*\n{{now}}'
    - context:
        - 'Deployed at {{now}}'
```

```bash
pigeon send ./templates/deploy.yml --var app_name=api --var version=2.0.0
```

## CI / test run with link

```yaml
version: '1'
name: CI Tests Notification
description: Posted when CI (tests) complete, with link to the run

destination:
  service: slack
  settings:
    channel: '#tests'

variables:
  status:
    description: Run conclusion (success, failure, etc.)
    required: true
  branch:
    description: Git branch
    required: true
  sha:
    description: Commit SHA
    required: true
  workflow:
    description: Workflow name
    required: true
  run_url:
    description: URL to the GitHub Actions run
    required: true

message:
  blocks:
    - header:
        text: ':test_tube: Tests ran — {{status}}'
    - section:
        fields:
          - '*Branch:*\n`{{branch}}`'
          - '*Commit:*\n`{{sha}}`'
    - section:
        text: '<{{run_url}}|View workflow run ({{workflow}})>'
    - context:
        - 'Sent at {{now}}'
```

## Release notification (body from env)

```yaml
version: '1'
name: Release Notification
description: Posted to #releases when a new release is created

destination:
  service: slack
  settings:
    channel: '#releases'

variables:
  tag_name:
    description: Release tag (e.g. v1.2.0)
    required: true
  name:
    description: Release title/name
    required: true
  RELEASE_BODY:
    description: Release notes (set RELEASE_BODY in env in CI)
    default: ''
  html_url:
    description: URL to the GitHub release page
    required: true

message:
  blocks:
    - header:
        text: ':package: New release — {{name}}'
    - section:
        fields:
          - '*Tag:*\n`{{tag_name}}`'
          - '*Released:*\n{{now}}'
    - section:
        text: '{{RELEASE_BODY}}'
    - section:
        text: '<{{html_url}}|View release on GitHub>'
    - context:
        - '{{now}}'
```

In CI, set `RELEASE_BODY` from the release body so multiline notes don’t need shell escaping:

```yaml
env:
  RELEASE_BODY: ${{ github.event.release.body }}
run: |
  pigeon send ./templates/release-notification.yml \
    --var tag_name="${{ github.event.release.tag_name }}" \
    --var name="${{ github.event.release.name }}" \
    --var html_url="${{ github.event.release.html_url }}"
```

## Section with button accessory

```yaml
version: '1'
name: Approval Request
destination:
  service: slack
  settings:
    channel: '#reviews'

variables:
  title:
    required: true
  summary:
    required: true
  link_url:
    required: true

message:
  blocks:
    - header:
        text: '{{title}}'
    - section:
        text: '{{summary}}'
        accessory:
          button:
            text: 'Open'
            url: '{{link_url}}'
            action_id: open_link
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
```

## Raw Block Kit (no DSL)

You can still use raw Slack Block Kit in `message.blocks`. Interpolation still applies.

```yaml
version: '1'
name: Raw Block Kit Example
destination:
  service: slack
  settings:
    channel: '#general'

variables:
  title:
    required: true

message:
  blocks:
    - type: header
      text:
        type: plain_text
        text: '{{title}}'
        emoji: true
    - type: section
      text:
        type: mrkdwn
        text: 'Sent at {{now}}'
```

---

**DSL docs:** [Overview](01-overview.md) · [Template structure](02-template-structure.md) · [Variables](03-variables.md) · [Slack blocks](04-slack-blocks.md) · [Slack elements](05-slack-elements.md) · [Examples](06-examples.md)

[← Previous: Slack elements](05-slack-elements.md)
