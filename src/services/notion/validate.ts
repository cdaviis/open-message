import { AdapterValidationError } from '../../types.js';

const SERVICE_NAME = 'notion';

/**
 * Validate destination/settings for Notion.
 * Requires page_id (append to page) or database_id (create page).
 */
export function validateDestination(destination: Record<string, unknown>): void {
  const opts = (destination.settings ?? destination.notion ?? destination) as Record<string, unknown>;
  const pageId = opts?.page_id as string | undefined;
  const databaseId = opts?.database_id as string | undefined;
  if (!pageId && !databaseId) {
    throw new AdapterValidationError(
      SERVICE_NAME,
      'destination.settings.page_id or destination.settings.database_id is required'
    );
  }
}

/**
 * Validate message shape for Notion Blocks API.
 * Expects block children format: { children: [ { object: 'block', type, ... } ] }
 * or a simple blocks array that we can map to Notion block format.
 */
export function validateMessage(message: Record<string, unknown>): void {
  // Notion append block children: body has "children" array
  const children = message.children as unknown[] | undefined;
  const blocks = message.blocks as unknown[] | undefined;
  if (!children && !blocks) {
    throw new AdapterValidationError(
      SERVICE_NAME,
      'message must have "children" (Notion block format) or "blocks" (to be mapped)'
    );
  }
  if (children !== undefined && !Array.isArray(children)) {
    throw new AdapterValidationError(SERVICE_NAME, '"children" must be an array');
  }
  if (blocks !== undefined && !Array.isArray(blocks)) {
    throw new AdapterValidationError(SERVICE_NAME, '"blocks" must be an array');
  }
}
