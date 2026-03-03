/**
 * Slack platform limits (Block Kit / API).
 * @see https://api.slack.com/reference/block-kit/blocks
 */

import type { MessageLimits } from '../../types.js';

/** Slack: max 50 blocks per message, ~40k character limit for message text, 3000 per block text. */
export const SLACK_LIMITS: Required<MessageLimits> = {
  maxMessageChars: 40_000,
  maxBlockChars: 3000,
  maxBlocksPerMessage: 50,
};
