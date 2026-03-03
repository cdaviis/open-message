import { describe, it, expect } from 'vitest';
import { countMessageStats, chunkMessage, applyLimits, validateContentSize } from '../../src/core/limits.js';
import { ContentSizeError } from '../../src/types.js';

describe('countMessageStats', () => {
  it('returns zeros when no blocks', () => {
    expect(countMessageStats({})).toEqual({ totalChars: 0, blockCount: 0, blockChars: [] });
    expect(countMessageStats({ blocks: [] })).toEqual({ totalChars: 0, blockCount: 0, blockChars: [] });
  });

  it('counts block text and fields', () => {
    const msg = {
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: 'Hello' } },
        { type: 'section', fields: [{ type: 'mrkdwn', text: 'A' }, { type: 'mrkdwn', text: 'B' }] },
      ],
    };
    const r = countMessageStats(msg);
    expect(r.blockCount).toBe(2);
    expect(r.totalChars).toBe(5 + 1 + 1);
    expect(r.blockChars).toEqual([5, 2]);
  });
});

describe('validateContentSize', () => {
  it('returns valid when under all limits', () => {
    const msg = { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Hi' } }] };
    const r = validateContentSize(msg, { maxMessageChars: 8000, maxBlocksPerMessage: 40 });
    expect(r.valid).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(r.stats.blockCount).toBe(1);
    expect(r.stats.totalChars).toBe(2);
  });

  it('returns invalid when totalChars exceeds maxMessageChars', () => {
    const long = 'x'.repeat(9000);
    const msg = { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: long } }] };
    const r = validateContentSize(msg, { maxMessageChars: 8000 });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v) => v.includes('totalChars') && v.includes('maxMessageChars'))).toBe(true);
  });

  it('returns invalid when blockCount exceeds maxBlocksPerMessage', () => {
    const blocks = Array.from({ length: 50 }, () => ({ type: 'section', text: { text: 'x' } }));
    const r = validateContentSize({ blocks }, { maxBlocksPerMessage: 40 });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v) => v.includes('blockCount') && v.includes('maxBlocksPerMessage'))).toBe(true);
  });

  it('returns invalid when a single block exceeds maxBlockChars', () => {
    const long = 'x'.repeat(2500);
    const msg = { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: long } }] };
    const r = validateContentSize(msg, { maxBlockChars: 2000 });
    expect(r.valid).toBe(false);
    expect(r.violations.some((v) => v.includes('block at index'))).toBe(true);
  });
});

describe('chunkMessage', () => {
  it('returns single message when under block limit (no footer)', () => {
    const msg = { blocks: [{ type: 'section', text: { text: 'Hi' } }] };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 40 });
    expect(out).toHaveLength(1);
    expect((out[0].blocks as unknown[]).length).toBe(1);
  });

  it('splits when over maxBlocksPerMessage and adds footer', () => {
    const blocks = Array.from({ length: 5 }, (_, i) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `Block ${i}` },
    }));
    const msg = { blocks };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 2 }, { enabled: true });
    expect(out).toHaveLength(3); // 5 blocks / 2 = 3 chunks
    expect((out[0].blocks as unknown[]).length).toBe(3); // 2 content + 1 footer
    const lastBlock = (out[0].blocks as Record<string, unknown>[]).slice(-1)[0];
    expect(lastBlock?.type).toBe('context');
    expect((lastBlock?.elements as { text: string }[])?.[0]?.text).toMatch(/Part 1 of 3/);
  });

  it('prepends continuation message at top of chunk 2 and later', () => {
    const blocks = Array.from({ length: 5 }, (_, i) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `Block ${i}` },
    }));
    const msg = { blocks };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 2 }, { enabled: true });
    expect(out).toHaveLength(3);
    expect((out[0].blocks as Record<string, unknown>[])[0]).not.toMatchObject({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: expect.stringContaining('message continued') }],
    });
    const chunk2First = (out[1].blocks as Record<string, unknown>[])[0];
    expect(chunk2First).toMatchObject({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '\n...message continued\n' }],
    });
  });

  it('uses custom continuationTemplate', () => {
    const blocks = Array.from({ length: 3 }, () => ({ type: 'section', text: { text: 'x' } }));
    const msg = { blocks };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 1 }, {
      enabled: true,
      continuationTemplate: '_Continued below—_',
    });
    expect(out).toHaveLength(3);
    const chunk2First = (out[1].blocks as Record<string, unknown>[])[0];
    expect((chunk2First?.elements as { text: string }[])?.[0]?.text).toBe('_Continued below—_');
  });

  it('uses custom footer template', () => {
    const msg = { blocks: Array.from({ length: 3 }, () => ({ type: 'divider' })) };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 1 }, {
      enabled: true,
      footerTemplate: 'Chunk {{ index }}/{{ total }}',
    });
    expect(out).toHaveLength(3);
    expect((out[0].blocks as Record<string, unknown>[]).slice(-1)[0]).toMatchObject({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Chunk 1/3' }],
    });
  });

  it('splits by maxMessageChars when total chars exceed limit', () => {
    const blockSize = 3000;
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: 'a'.repeat(blockSize) } },
      { type: 'section', text: { type: 'mrkdwn', text: 'b'.repeat(blockSize) } },
      { type: 'section', text: { type: 'mrkdwn', text: 'c'.repeat(blockSize) } },
    ];
    const msg = { blocks };
    const out = chunkMessage(msg, { maxBlocksPerMessage: 10, maxMessageChars: 5000 }, { enabled: true });
    expect(out.length).toBeGreaterThanOrEqual(2);
    const firstChunkStats = countMessageStats(out[0] as Record<string, unknown>);
    expect(firstChunkStats.totalChars).toBeLessThanOrEqual(5050);
  });
});

describe('applyLimits', () => {
  it('returns single message when under limits', () => {
    const msg = { blocks: [{ type: 'section', text: { text: 'Hi' } }] };
    const out = applyLimits(msg);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(msg);
  });

  it('chunks when over maxBlocksPerMessage', () => {
    const blocks = Array.from({ length: 45 }, (_, i) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `Line ${i}` },
    }));
    const msg = { blocks };
    const out = applyLimits(msg, { maxBlocksPerMessage: 40 });
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect((out[0].blocks as unknown[]).length).toBeLessThanOrEqual(41); // 40 + footer
  });

  it('throws ContentSizeError when over limits and chunking disabled', () => {
    const blocks = Array.from({ length: 50 }, () => ({ type: 'section', text: { text: 'x' } }));
    expect(() => applyLimits({ blocks }, { maxBlocksPerMessage: 40 }, { enabled: false })).toThrow(ContentSizeError);
    try {
      applyLimits({ blocks }, { maxBlocksPerMessage: 40 }, { enabled: false });
    } catch (e) {
      expect(e).toBeInstanceOf(ContentSizeError);
      expect((e as ContentSizeError).violations.length).toBeGreaterThan(0);
      expect((e as ContentSizeError).stats.blockCount).toBe(50);
    }
  });
});
