import { loadTemplate } from './template-loader.js';
import { validateSchema, validateVariables } from './validator.js';
import { interpolate } from './interpolator.js';
import { applyLimits } from './limits.js';
import { getService } from '../services/index.js';
import { resolveCredentials } from '../credentials/index.js';
import type { SendOptions, SendResult } from '../types.js';
import type { TemplateDestination } from '../types.js';

/** Normalize destination entry: { service, settings } or { slack: { settings } } → { service, settings }. */
function normalizeDestination(entry: Record<string, unknown>): TemplateDestination {
  const service = entry.service as string | undefined;
  if (service) {
    return {
      service,
      settings: (entry.settings as Record<string, unknown>) ?? {},
      ...entry,
    };
  }
  const keys = Object.keys(entry).filter((k) => k !== 'service');
  if (keys.length !== 1) {
    throw new Error(
      'Each destination entry must have "service" or a single key (e.g. slack: { settings: ... })'
    );
  }
  const serviceName = keys[0]!;
  const value = entry[serviceName] as Record<string, unknown> | undefined;
  const settings = value?.settings ?? value ?? {};
  return { service: serviceName, settings: settings as Record<string, unknown>, ...value };
}

/** Get a flat list of normalized destinations from a resolved template. */
function getDestinationList(resolved: {
  destination?: TemplateDestination;
  destinations?: TemplateDestination[] | Record<string, unknown>[];
}): TemplateDestination[] {
  if (resolved.destination != null) {
    return [normalizeDestination(resolved.destination as Record<string, unknown>)];
  }
  if (Array.isArray(resolved.destinations) && resolved.destinations.length > 0) {
    return resolved.destinations.map((d) =>
      normalizeDestination(d as Record<string, unknown>)
    );
  }
  return [];
}

export async function dispatch(nameOrPath: string, opts: SendOptions = {}): Promise<SendResult> {
  const vars = opts.vars ?? {};

  // 1. Load template
  const template = await loadTemplate(nameOrPath);

  // 2. Validate template schema
  validateSchema(template);

  // 3. Validate that all required variables have values
  validateVariables(template, vars);

  // 4. Interpolate variables into the template
  const resolved = interpolate(template, vars);

  const destinations = getDestinationList(resolved);
  if (destinations.length === 0) {
    throw new Error('Template has no destination or destinations');
  }

  // 5. Dry-run: compile with first service and return (no send)
  if (opts.dryRun) {
    const firstService = getService(destinations[0]!.service);
    const compiled = firstService.compile?.(resolved.message) ?? resolved.message;
    firstService.validate(compiled);
    const destPayload = { service: destinations[0]!.service, settings: destinations[0]!.settings };
    firstService.validateDestination?.(destPayload);
    return {
      success: true,
      service: firstService.serviceName,
      templateName: resolved.name,
      resolvedMessage: compiled,
    };
  }

  // 6. Send to each destination (compile per service; validate destination; apply service limits + chunking; send each chunk)
  let lastResponse: unknown;
  for (const dest of destinations) {
    const service = getService(dest.service);
    const destPayload = { service: dest.service, settings: dest.settings } as Record<string, unknown>;
    service.validateDestination?.(destPayload);

    const compiledMessage = service.compile?.(resolved.message) ?? resolved.message;
    service.validate(compiledMessage);

    const mergedLimits = { ...service.getLimits?.(), ...opts.limits };
    const messagesToSend = applyLimits(compiledMessage, mergedLimits, opts.chunking);

    const credentials = await resolveCredentials(dest.service, {
      overrides: opts.credentials,
      configFile: opts.configFile,
      envFile: opts.envFile,
    });

    for (const msg of messagesToSend) {
      service.validate(msg);
      lastResponse = await service.send(
        msg,
        destPayload,
        credentials
      );
    }
  }

  return {
    success: true,
    service: destinations.length === 1 ? destinations[0]!.service : 'multiple',
    templateName: resolved.name,
    response: lastResponse,
  };
}
