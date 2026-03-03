import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate } from '../../src/core/template-loader.js';
import { InvalidTemplatePathError, TemplateNotFoundError } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../fixtures/templates');

describe('loadTemplate', () => {
  it('loads a YAML template by explicit path', async () => {
    const template = await loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.yml'));
    expect(template.name).toBe('Test Slack Template');
    expect(template.version).toBe('1');
    expect(template.destination.service).toBe('slack');
  });

  it('loads a JSON template when path has .json extension', async () => {
    const template = await loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.yml'));
    expect(template).toBeDefined();
  });

  it('throws TemplateNotFoundError for a non-existent path', async () => {
    await expect(loadTemplate('/does/not/exist.yml')).rejects.toThrow(TemplateNotFoundError);
    await expect(loadTemplate('/does/not/exist.yml')).rejects.toThrow(/not found/);
  });

  it('throws TemplateNotFoundError for a relative path that does not exist', async () => {
    await expect(loadTemplate('./no-such-template.yml')).rejects.toThrow(TemplateNotFoundError);
  });

  describe('path validation', () => {
    it('throws InvalidTemplatePathError for empty path', async () => {
      await expect(loadTemplate('')).rejects.toThrow(InvalidTemplatePathError);
      await expect(loadTemplate('')).rejects.toThrow(/cannot be empty/);
    });

    it('throws InvalidTemplatePathError for whitespace-only path', async () => {
      await expect(loadTemplate('   ')).rejects.toThrow(InvalidTemplatePathError);
    });

    it('throws InvalidTemplatePathError for path containing null character', async () => {
      await expect(loadTemplate('/some/path\u0000file.yml')).rejects.toThrow(InvalidTemplatePathError);
      await expect(loadTemplate('/some/path\u0000file.yml')).rejects.toThrow(/null/);
    });

    it('throws InvalidTemplatePathError for invalid file extension', async () => {
      await expect(loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.txt'))).rejects.toThrow(
        InvalidTemplatePathError
      );
      await expect(loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.txt'))).rejects.toThrow(
        /\.yml, \.yaml, or \.json/
      );
    });

    it('throws InvalidTemplatePathError for path with no extension', async () => {
      await expect(loadTemplate(path.join(FIXTURES_DIR, 'valid-slack'))).rejects.toThrow(
        InvalidTemplatePathError
      );
      await expect(loadTemplate(path.join(FIXTURES_DIR, 'valid-slack'))).rejects.toThrow(
        /no extension/
      );
    });

    it('throws InvalidTemplatePathError when path is a directory', async () => {
      const dirWithYmlName = path.join(FIXTURES_DIR, 'dir-as-file.yml');
      await fs.mkdir(dirWithYmlName, { recursive: true });
      try {
        await expect(loadTemplate(dirWithYmlName)).rejects.toThrow(InvalidTemplatePathError);
        await expect(loadTemplate(dirWithYmlName)).rejects.toThrow(/not a file/);
      } finally {
        await fs.rm(dirWithYmlName, { recursive: true }).catch(() => {});
      }
    });
  });
});
