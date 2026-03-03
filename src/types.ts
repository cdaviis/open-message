export interface TemplateVariable {
  description?: string;
  default?: string;
  required?: boolean;
}

/** Single destination: service + settings (and optional passthrough). */
export interface TemplateDestination {
  service: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PigeonTemplate {
  version: string;
  name: string;
  description?: string;
  /** Single destination (legacy and when sending to one place). */
  destination?: TemplateDestination;
  /** Multiple destinations: same message sent to each. Use when sending to several channels/services. */
  destinations?: TemplateDestination[];
  variables?: Record<string, TemplateVariable>;
  message: Record<string, unknown>;
}

export interface ResolvedTemplate extends PigeonTemplate {
  _resolved: true;
}

export interface MessageLimits {
  maxMessageChars?: number;
  maxBlockChars?: number;
  maxBlocksPerMessage?: number;
}

export interface ChunkingConfig {
  /** When true (default), split when over limits; when false, throw instead of chunking. */
  enabled?: boolean;
  /** Footer text for each chunk, e.g. "Part {{ index }} of {{ total }}". */
  footerTemplate?: string;
  /** Text prepended to the top of continuation chunks (2, 3, …). Room is reserved below the limit. */
  continuationTemplate?: string;
}

export interface SendOptions {
  vars?: Record<string, string>;
  credentials?: Partial<CredentialStore>;
  dryRun?: boolean;
  configFile?: string;
  envFile?: string;
  /** When set, messages over limits are chunked (with footer). */
  limits?: MessageLimits;
  chunking?: ChunkingConfig;
}

export interface SendResult {
  success: boolean;
  service: string;
  templateName: string;
  resolvedMessage?: Record<string, unknown>;
  response?: unknown;
  error?: Error;
}

export interface CredentialStore {
  slack?: { botToken: string };
  notion?: { apiKey: string };
  [service: string]: Record<string, string> | undefined;
}

export interface ServiceAdapter {
  readonly serviceName: string;
  /** Validate message shape for this platform (blocks schema, required fields). */
  validate(message: Record<string, unknown>): void;
  /** Optional: compile DSL/shorthand to service-native payload. Called before validate and send. */
  compile?(message: Record<string, unknown>): Record<string, unknown>;
  /** Optional: validate destination/settings for this platform (e.g. channel, page_id). */
  validateDestination?(destination: Record<string, unknown>): void;
  /** Optional: platform default limits (max message/block chars, max blocks). Core merges with opts.limits. */
  getLimits?(): MessageLimits;
  send(
    message: Record<string, unknown>,
    destination: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<unknown>;
}


export class PigeonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PigeonError';
  }
}

export class TemplateNotFoundError extends PigeonError {
  constructor(name: string, searched: string[]) {
    super(
      `Template "${name}" not found. Searched:\n${searched.map(p => `  - ${p}`).join('\n')}`
    );
    this.name = 'TemplateNotFoundError';
  }
}

export class InvalidTemplatePathError extends PigeonError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTemplatePathError';
  }
}

export class MissingVariableError extends PigeonError {
  constructor(tokens: string[], templateName: string) {
    super(
      `Missing required variable${tokens.length > 1 ? 's' : ''} in template "${templateName}": ${tokens.join(', ')}`
    );
    this.name = 'MissingVariableError';
  }
}

export class UnknownServiceError extends PigeonError {
  constructor(service: string, available: string[]) {
    super(
      `Unknown service "${service}". Available adapters: ${available.join(', ')}`
    );
    this.name = 'UnknownServiceError';
  }
}

export interface ContentSizeValidationResult {
  valid: boolean;
  stats: { totalChars: number; blockCount: number; blockChars: number[] };
  violations: string[];
}

export class ContentSizeError extends PigeonError {
  constructor(
    message: string,
    public readonly stats: ContentSizeValidationResult['stats'],
    public readonly violations: string[]
  ) {
    super(message);
    this.name = 'ContentSizeError';
  }
}

export class AdapterValidationError extends PigeonError {
  constructor(service: string, message: string) {
    super(`[${service}] Invalid message: ${message}`);
    this.name = 'AdapterValidationError';
  }
}

export class TemplateValidationError extends PigeonError {
  constructor(details: string) {
    super(`Invalid template schema:\n${details}`);
    this.name = 'TemplateValidationError';
  }
}

export class MissingCredentialsError extends PigeonError {
  constructor(service: string, key: string) {
    super(
      `Missing credentials for "${service}": "${key}" is required.\n` +
      `Set it via environment variable or credentials config file.`
    );
    this.name = 'MissingCredentialsError';
  }
}
