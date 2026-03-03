/**
 * Notion service: validation and limits for Notion Blocks API.
 * Send is not implemented yet; use this module to validate destination/message and get limits.
 */

import type { ServiceAdapter } from '../../types.js';
import { MissingCredentialsError } from '../../types.js';
import { NOTION_LIMITS } from './limits.js';
import { validateMessage, validateDestination } from './validate.js';

export { NOTION_LIMITS } from './limits.js';
export { validateMessage, validateDestination } from './validate.js';

export class NotionService implements ServiceAdapter {
  readonly serviceName = 'notion';

  validate(message: Record<string, unknown>): void {
    validateMessage(message);
  }

  validateDestination(destination: Record<string, unknown>): void {
    validateDestination(destination);
  }

  getLimits() {
    return { ...NOTION_LIMITS };
  }

  async send(
    _message: Record<string, unknown>,
    _destination: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<unknown> {
    const apiKey = credentials.apiKey;
    if (!apiKey) {
      throw new MissingCredentialsError('notion', 'apiKey');
    }
    throw new Error('Notion send is not implemented yet. Use this service for validation and limits.');
  }
}
