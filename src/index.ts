import { dispatch } from './core/dispatcher.js';
import { validateContentSize } from './core/limits.js';
import type {
  SendOptions,
  SendResult,
  ServiceAdapter,
  PigeonTemplate,
  CredentialStore,
  MessageLimits,
  ChunkingConfig,
  TemplateDestination,
  TemplateVariable,
  ContentSizeValidationResult,
} from './types.js';
import { ContentSizeError, InvalidTemplatePathError, TemplateNotFoundError } from './types.js';

export async function send(
  template: string,
  vars?: Record<string, string>,
  opts?: Omit<SendOptions, 'vars'>
): Promise<SendResult> {
  return dispatch(template, { ...opts, vars });
}

export type {
  SendOptions,
  SendResult,
  ServiceAdapter,
  PigeonTemplate,
  CredentialStore,
  MessageLimits,
  ChunkingConfig,
  TemplateDestination,
  TemplateVariable,
  ContentSizeValidationResult,
};

export { validateContentSize, ContentSizeError, InvalidTemplatePathError, TemplateNotFoundError };

export default { send };
