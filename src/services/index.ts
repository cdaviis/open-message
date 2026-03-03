/**
 * Service registry: one module per comms platform (Slack, Notion, …).
 * Each service implements validation, limits, compilation (if any), and send.
 * Core dispatcher uses this to get the right service and offload platform logic.
 */

import type { ServiceAdapter } from '../types.js';
import { UnknownServiceError } from '../types.js';
import { SlackService } from './slack/slack.js';
import { NotionService } from './notion/notion.js';

const registry = new Map<string, ServiceAdapter>([
  ['slack', new SlackService()],
  ['notion', new NotionService()],
]);

export function getService(serviceName: string): ServiceAdapter {
  const service = registry.get(serviceName);
  if (!service) {
    throw new UnknownServiceError(serviceName, [...registry.keys()]);
  }
  return service;
}

export { SlackService } from './slack/slack.js';
export { NotionService } from './notion/notion.js';
