export class IntegrationError extends Error {
  readonly code: string;
  readonly meta: Record<string, unknown>;

  constructor(code: string, message: string, meta: Record<string, unknown> = {}) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
    this.meta = meta;
  }
}

export class DatabaseDomainError extends Error {
  readonly code: string;
  readonly meta: Record<string, unknown>;

  constructor(code: string, message: string, meta: Record<string, unknown> = {}) {
    super(message);
    this.name = "DatabaseDomainError";
    this.code = code;
    this.meta = meta;
  }
}
