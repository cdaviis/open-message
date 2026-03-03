/**
 * Slack service: Block Kit DSL, validation, limits, and send.
 * Implements platform requirements (blocks schema, character limits).
 */

import type { ServiceAdapter } from '../../types.js';
import { MissingCredentialsError } from '../../types.js';
import { isDSLMessage, compileDSL } from './dsl.js';
import { SLACK_LIMITS } from './limits.js';
import { validateMessage, validateDestination } from './validate.js';
import { sendMessage } from './send.js';

export { isDSLMessage, compileDSL } from './dsl.js';
export type { DSLBlock, SlackDSLMessage, DSLFileUpload } from './dsl.js';
export { SLACK_LIMITS } from './limits.js';
export { validateMessage, validateDestination } from './validate.js';
export { sendMessage } from './send.js';
export type { SlackFileUpload } from './send.js';

export class SlackService implements ServiceAdapter {
  readonly serviceName = 'slack';

  compile(message: Record<string, unknown>): Record<string, unknown> {
    return isDSLMessage(message)
      ? (compileDSL(message as Parameters<typeof compileDSL>[0]) as Record<string, unknown>)
      : message;
  }

  validate(message: Record<string, unknown>): void {
    validateMessage(message);
  }

  validateDestination(destination: Record<string, unknown>): void {
    validateDestination(destination);
  }

  getLimits() {
    return { ...SLACK_LIMITS };
  }

  async send(
    message: Record<string, unknown>,
    destination: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<unknown> {
    validateDestination(destination);
    const token = credentials.botToken;
    if (!token) {
      throw new MissingCredentialsError('slack', 'botToken');
    }
    return sendMessage(message, destination, token);
  }
}
