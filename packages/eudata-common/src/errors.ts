export type ErrorSource = string

export interface EuDataErrorOptions {
  source: ErrorSource
  cause?: unknown
  url?: string
  status?: number
  body?: string
}

export class EuDataError extends Error {
  readonly source: ErrorSource
  readonly url?: string
  readonly status?: number
  readonly body?: string

  constructor(message: string, opts: EuDataErrorOptions) {
    super(message)
    this.name = 'EuDataError'
    this.source = opts.source
    if (opts.url !== undefined) this.url = opts.url
    if (opts.status !== undefined) this.status = opts.status
    if (opts.body !== undefined) this.body = opts.body
    if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause
  }
}

export class HttpError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'HttpError'
  }
}

export class TimeoutError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'TimeoutError'
  }
}

export class ValidationError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'NotFoundError'
  }
}

export class ParseError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'ParseError'
  }
}

export class RateLimitError extends EuDataError {
  constructor(message: string, opts: EuDataErrorOptions) {
    super(message, opts)
    this.name = 'RateLimitError'
  }
}
