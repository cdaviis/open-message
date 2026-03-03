import { AdapterValidationError } from '../../types.js';

const SERVICE_NAME = 'slack';

export function validateMessage(message: Record<string, unknown>): void {
  if (!message.blocks && !message.text) {
    throw new AdapterValidationError(
      SERVICE_NAME,
      'message must have either "blocks" or "text"'
    );
  }
  if (message.blocks !== undefined && !Array.isArray(message.blocks)) {
    throw new AdapterValidationError(SERVICE_NAME, '"blocks" must be an array');
  }
}

/** Validate destination/settings (channel required). Supports settings, slack, or top-level legacy. */
export function validateDestination(destination: Record<string, unknown>): void {
  const opts = (destination.settings ?? destination.slack ?? destination) as Record<string, unknown>;
  const channel = opts?.channel as string | undefined;
  if (!channel) {
    throw new AdapterValidationError(
      SERVICE_NAME,
      'destination.settings.channel is required (legacy: destination.slack.channel or destination.channel)'
    );
  }
}
