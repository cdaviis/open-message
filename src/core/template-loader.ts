import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { PigeonTemplate } from '../types.js';
import { InvalidTemplatePathError, TemplateNotFoundError } from '../types.js';

const ALLOWED_EXTS = ['.yml', '.yaml', '.json'];

function validateTemplatePath(filePath: string): void {
  const trimmed = filePath.trim();
  if (trimmed.length === 0) {
    throw new InvalidTemplatePathError('Template path cannot be empty');
  }
  if (filePath.includes('\0')) {
    throw new InvalidTemplatePathError('Template path must not contain null characters');
  }
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new InvalidTemplatePathError(
      `Template must be a .yml, .yaml, or .json file; got "${ext || '(no extension)'}"`
    );
  }
}

function parseContent(filePath: string, content: string): PigeonTemplate {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(content) as PigeonTemplate;
  }
  return yaml.load(content) as PigeonTemplate;
}

export async function loadTemplate(filePath: string): Promise<PigeonTemplate> {
  validateTemplatePath(filePath);
  const resolved = path.resolve(filePath);

  let stat: { isFile: () => boolean };
  try {
    stat = await fs.stat(resolved);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw new TemplateNotFoundError(filePath, [resolved]);
    }
    throw err;
  }

  if (!stat.isFile()) {
    throw new InvalidTemplatePathError(`Template path is not a file: ${resolved}`);
  }

  let content: string;
  try {
    content = await fs.readFile(resolved, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw new TemplateNotFoundError(filePath, [resolved]);
    }
    throw err;
  }

  return parseContent(resolved, content);
}
