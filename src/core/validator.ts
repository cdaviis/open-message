import { z } from 'zod';
import type { PigeonTemplate } from '../types.js';
import { TemplateValidationError, MissingVariableError } from '../types.js';

const TemplateVariableSchema = z.object({
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
});

const DestinationEntrySchema = z
  .object({
    service: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .passthrough();

const TemplateSchema = z
  .object({
    version: z.literal('1'),
    name: z.string().min(1, 'name is required'),
    description: z.string().optional(),
    destination: DestinationEntrySchema.optional(),
    destinations: z.array(z.record(z.unknown())).optional(),
    variables: z.record(TemplateVariableSchema).optional(),
    message: z.record(z.unknown()),
  })
  .refine(
    (t) => {
      const hasSingle = t.destination != null && (t.destination as { service?: string }).service;
      const hasMulti = Array.isArray(t.destinations) && t.destinations.length > 0;
      return hasSingle || hasMulti;
    },
    { message: 'Either destination (with service) or non-empty destinations array is required' }
  );

export function validateSchema(template: unknown): asserts template is PigeonTemplate {
  const result = TemplateSchema.safeParse(template);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new TemplateValidationError(details);
  }
}

export function validateVariables(template: PigeonTemplate, vars: Record<string, string>): void {
  const declared = template.variables ?? {};
  const missing: string[] = [];

  for (const [key, decl] of Object.entries(declared)) {
    const isRequired = decl.required !== false && decl.default === undefined;
    if (isRequired && !(key in vars)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new MissingVariableError(missing, template.name);
  }
}
