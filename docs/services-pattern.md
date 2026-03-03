# Services pattern

Platform-specific logic (Slack, Notion, etc.) lives under **`src/services/`**, one folder per platform. The core dispatcher loads templates, interpolates, then delegates to the right service for validation, limits, compilation, and send. This keeps the core serializer/platform-agnostic and makes it straightforward to add new comms platforms.

## Contract (ServiceAdapter)

Each service implements the same interface in `src/types.ts`:

- **`serviceName`** — e.g. `'slack'`, `'notion'`.
- **`validate(message)`** — Validate message shape for this platform (e.g. Slack: `blocks` or `text`; Notion: `children` or `blocks`).
- **`validateDestination(destination)`** — Validate destination/settings (e.g. Slack: `channel`; Notion: `page_id` or `database_id`).
- **`getLimits()`** — Return platform limits: `maxMessageChars`, `maxBlockChars`, `maxBlocksPerMessage`. Core merges these with caller `opts.limits` and uses them for chunking.
- **`compile?(message)`** — Optional: convert DSL or canonical format to platform payload (e.g. Slack DSL → Block Kit).
- **`send(message, destination, credentials)`** — Perform the API call(s).

## Per-service layout

```
src/services/
  slack/
    slack.ts    # SlackService class, implements ServiceAdapter
    dsl.ts      # Block Kit DSL → compiled blocks (types, isDSLMessage, compileDSL)
    limits.ts   # SLACK_LIMITS (max chars, max blocks)
    validate.ts # validateMessage, validateDestination
    send.ts     # sendMessage, file upload helpers
  notion/
    notion.ts   # NotionService (stub: validate + limits, send not implemented)
    limits.ts   # NOTION_LIMITS
    validate.ts # validateMessage, validateDestination
  index.ts      # Registry: getService(name), registers slack + notion
```

Entry file per service follows the pattern **`<serviceName>.ts`** (e.g. `slack.ts`, `notion.ts`).

Each service owns:

- **Platform limits** — Character and block limits imposed by the API (e.g. Slack 50 blocks, 40k chars; Notion 100 blocks, 2000 chars per rich text).
- **Message validation** — Required fields and shape (blocks array, children array, etc.).
- **Destination validation** — Required settings (channel, page_id, database_id, etc.).
- **Compilation** — If the platform has a DSL or canonical format, compile to the native payload here.
- **Send** — HTTP calls, file uploads, retries as needed.

## Adding a new service

1. **Create `src/services/<name>/`** with:
   - `limits.ts` — Platform limits (see Slack/Notion).
   - `validate.ts` — `validateMessage`, `validateDestination` (throw `AdapterValidationError` from `src/types.js`).
   - `send.ts` — Send logic (credentials, API base URL, request shape).
   - **`<name>.ts`** — Main entry: class implementing `ServiceAdapter`, composing the above (pattern: `slack.ts`, `notion.ts`). Optional `dsl.ts` if the platform has a DSL.

2. **Register in `src/services/index.ts`**: import from `./<name>/<name>.js` and add to the `registry` Map; export the class if desired.

3. **Credentials**: add the service to `CredentialStore` in `src/types.ts` and, if needed, env shorthand in `src/credentials/index.js` (e.g. `NOTION_API_KEY`).

4. **Docs**: update README and any “supported platforms” list; add or link to platform-specific docs (blocks schema, limits).

The core does **not** know about Slack blocks or Notion blocks; it only calls `getService(destination.service)`, then `validateDestination`, `compile`, `validate`, `getLimits`, and `send`. Chunking and limits are applied in core using the merged limits (service defaults + opts.limits).
