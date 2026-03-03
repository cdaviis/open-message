/**
 * Message limits and chunking (render → validate → overflow handling).
 * When a message exceeds limits, it is split into multiple messages with optional footers.
 */

import type { MessageLimits, ChunkingConfig, ContentSizeValidationResult } from '../types.js';
import { ContentSizeError } from '../types.js';

export type { MessageLimits, ChunkingConfig };

const DEFAULT_LIMITS: Required<MessageLimits> = {
  maxMessageChars: 8000,
  maxBlockChars: 2000,
  maxBlocksPerMessage: 40,
};

const DEFAULT_FOOTER = 'Part {{ index }} of {{ total }}';
const DEFAULT_CONTINUATION = '\n...message continued\n';
const FOOTER_RESERVED = 50;

/** Approximate character count of a Block Kit block (text content only). */
function blockCharCount(block: Record<string, unknown>): number {
  let n = 0;
  if (block.text && typeof (block.text as Record<string, unknown>).text === 'string') {
    n += ((block.text as Record<string, unknown>).text as string).length;
  }
  if (Array.isArray(block.fields)) {
    for (const f of block.fields) {
      if (f && typeof (f as Record<string, unknown>).text === 'string') {
        n += ((f as Record<string, unknown>).text as string).length;
      }
    }
  }
  if (Array.isArray(block.elements)) {
    for (const el of block.elements) {
      if (el && typeof (el as Record<string, unknown>).text === 'string') {
        n += ((el as Record<string, unknown>).text as string).length;
      }
    }
  }
  return n;
}

export function countMessageStats(message: Record<string, unknown>): {
  totalChars: number;
  blockCount: number;
  blockChars: number[];
} {
  const blocks = message.blocks as Record<string, unknown>[] | undefined;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { totalChars: 0, blockCount: 0, blockChars: [] };
  }
  const blockChars = blocks.map((b) => blockCharCount(b as Record<string, unknown>));
  const totalChars = blockChars.reduce((a, b) => a + b, 0);
  return { totalChars, blockCount: blocks.length, blockChars };
}

/**
 * Validate message size against limits before sending.
 * Returns validation result with stats and any violations; does not modify the message.
 * Use this to check size prior to posting, or to fail fast when chunking is disabled.
 */
export function validateContentSize(
  message: Record<string, unknown>,
  limits: MessageLimits = {}
): ContentSizeValidationResult {
  const resolved = { ...DEFAULT_LIMITS, ...limits };
  const stats = countMessageStats(message);
  const violations: string[] = [];

  if (stats.totalChars > resolved.maxMessageChars) {
    violations.push(
      `totalChars ${stats.totalChars} exceeds maxMessageChars ${resolved.maxMessageChars}`
    );
  }
  if (stats.blockCount > resolved.maxBlocksPerMessage) {
    violations.push(
      `blockCount ${stats.blockCount} exceeds maxBlocksPerMessage ${resolved.maxBlocksPerMessage}`
    );
  }
  const overBlockChar = stats.blockChars.findIndex((n) => n > resolved.maxBlockChars);
  if (overBlockChar !== -1) {
    violations.push(
      `block at index ${overBlockChar} has ${stats.blockChars[overBlockChar]} chars (max ${resolved.maxBlockChars})`
    );
  }

  return {
    valid: violations.length === 0,
    stats: { ...stats },
    violations,
  };
}

/** Build a context block with the continuation text (for top of chunk 2, 3, …). */
function continuationBlock(continuationTemplate: string): Record<string, unknown> {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: continuationTemplate }],
  };
}

/**
 * Split message.blocks into one or more messages so each chunk is under
 * maxBlocksPerMessage and maxMessageChars. Uses a cutoff slightly below the limit
 * so the next chunk can start with a continuation message. Adds footer and (for
 * chunks 2+) a continuation block at the top.
 */
export function chunkMessage(
  message: Record<string, unknown>,
  limits: MessageLimits = {},
  chunking: ChunkingConfig = {}
): Record<string, unknown>[] {
  const maxBlocks = limits.maxBlocksPerMessage ?? DEFAULT_LIMITS.maxBlocksPerMessage;
  const maxChars = limits.maxMessageChars ?? DEFAULT_LIMITS.maxMessageChars;
  const enabled = chunking.enabled !== false;
  const footerTemplate = chunking.footerTemplate ?? DEFAULT_FOOTER;
  const continuationTemplate = chunking.continuationTemplate ?? DEFAULT_CONTINUATION;
  const continuationReserved = continuationTemplate.length + 20;

  const blocks = message.blocks as Record<string, unknown>[] | undefined;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [{ ...message }];
  }

  const blockCharCounts = blocks.map((b) => blockCharCount(b as Record<string, unknown>));
  const totalChars = blockCharCounts.reduce((a, b) => a + b, 0);

  // Only chunk when there is a risk of exceeding limits; otherwise return as-is (no footer)
  if (blocks.length <= maxBlocks && totalChars <= maxChars) {
    return [{ ...message }];
  }

  if (!enabled) {
    return [{ ...message }];
  }

  const chunks: Record<string, unknown>[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < blocks.length) {
    const isFirstChunk = chunkIndex === 0;
    const contentLimit =
      maxChars - FOOTER_RESERVED - (isFirstChunk ? 0 : continuationReserved);

    let count = 0;
    let chunkChars = 0;
    while (
      start + count < blocks.length &&
      count < maxBlocks &&
      chunkChars + (blockCharCounts[start + count] ?? 0) <= contentLimit
    ) {
      chunkChars += blockCharCounts[start + count] ?? 0;
      count += 1;
    }
    if (count === 0) {
      count = 1;
    }

    chunkIndex += 1;
    const slice = blocks.slice(start, start + count);
    start += count;

    const footerText = footerTemplate.replace(/\{\{\s*index\s*\}\}/gi, String(chunkIndex));
    const footerBlock: Record<string, unknown> = {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: footerText }],
    };

    const chunkBlocks: Record<string, unknown>[] =
      isFirstChunk ? [...slice] : [continuationBlock(continuationTemplate), ...slice];
    chunkBlocks.push(footerBlock);

    chunks.push({
      ...message,
      blocks: chunkBlocks,
    });
  }

  const totalChunks = chunks.length;
  for (const c of chunks) {
    const blockList = c.blocks as Record<string, unknown>[];
    const footer = blockList[blockList.length - 1] as Record<string, unknown> | undefined;
    const elements = footer?.elements as { text?: string }[] | undefined;
    if (elements?.[0]?.text) {
      elements[0].text = elements[0].text.replace(
        /\{\{\s*total\s*\}\}/gi,
        String(totalChunks)
      );
    }
  }

  return chunks;
}

/**
 * Apply limits: validate size first; if within limits return [message].
 * If over limits and chunking enabled, split into multiple messages; if chunking disabled, throw.
 */
export function applyLimits(
  message: Record<string, unknown>,
  limits: MessageLimits = {},
  chunking: ChunkingConfig = {}
): Record<string, unknown>[] {
  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };
  const validation = validateContentSize(message, resolvedLimits);

  if (validation.valid) {
    return [message];
  }

  if (chunking.enabled === false) {
    throw new ContentSizeError(
      `Message exceeds size limits. Enable chunking or reduce content. ${validation.violations.join('; ')}`,
      validation.stats,
      validation.violations
    );
  }

  return chunkMessage(message, resolvedLimits, chunking);
}
