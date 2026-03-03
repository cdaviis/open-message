/**
 * Notion platform limits (Blocks API).
 * @see https://developers.notion.com/reference/request-limits
 */

import type { MessageLimits } from '../../types.js';

/** Notion: 100 blocks per append request, 2000 chars per rich_text content, ~500KB payload. */
export const NOTION_LIMITS: Required<MessageLimits> = {
  maxMessageChars: 200_000, // ~500KB conservative as char count
  maxBlockChars: 2000,
  maxBlocksPerMessage: 100,
};
