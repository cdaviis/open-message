/**
 * Adapters: re-export from services for backward compatibility.
 * New code should use services; adapters remain the public entry for getAdapter / SlackAdapter.
 */

export { getService as getAdapter } from '../services/index.js';
export { SlackService as SlackAdapter } from '../services/slack/slack.js';
