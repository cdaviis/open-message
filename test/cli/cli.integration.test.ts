/**
 * Integration tests for the CLI as invoked by users: `open-message send <path>`, etc.
 * Run after build (npm run build && npm test) so dist/cli/index.js exists.
 * Skipped when dist is not present so plain `npm test` still passes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const CLI_BIN = path.join(ROOT, 'dist/cli/index.js');
const FIXTURES_DIR = path.join(ROOT, 'test/fixtures/templates');
const VALID_TEMPLATE = path.join(FIXTURES_DIR, 'valid-slack.yml');

const hasBuiltCli = () => fs.existsSync(CLI_BIN);

function runOpenMessage(args: string[], cwd = ROOT): { stdout: string; stderr: string; status: number | null } {
  const cmd = `node "${CLI_BIN}" ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`;
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, SLACK_TOKEN: 'xoxb-test' },
    });
    return { stdout, stderr: '', status: 0 };
  } catch (err: unknown) {
    const e = err as { status: number | null; stdout?: string; stderr?: string };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      status: e.status ?? null,
    };
  }
}

describe.skipIf(!hasBuiltCli())(
  'CLI (open-message) integration — run after build',
  () => {
    it('exits 0 and prints usage for --help', () => {
      const { stdout, status } = runOpenMessage(['--help']);
      expect(status).toBe(0);
      expect(stdout).toContain('open-message');
      expect(stdout).toContain('send');
      expect(stdout).toContain('validate');
      expect(stdout).toContain('list');
    });

    it('exits 0 for "open-message send <path> --dry-run" with valid template', () => {
      const { stdout, status } = runOpenMessage([
        'send',
        VALID_TEMPLATE,
        '--dry-run',
        '--var',
        'greeting=Hello',
      ]);
      expect(status).toBe(0);
      expect(stdout).toMatch(/resolved|blocks|message/i);
    });

    it('exits 0 for "open-message validate <path>" with valid template', () => {
      const { status } = runOpenMessage(['validate', VALID_TEMPLATE]);
      expect(status).toBe(0);
    });

    it('exits 0 for "open-message list <dir>"', () => {
      const { status, stdout } = runOpenMessage(['list', FIXTURES_DIR]);
      expect(status).toBe(0);
      expect(stdout).toMatch(/\S/);
    });
  }
);
