const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

export function isRetryableFetchError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return false;
  if (err instanceof TypeError) return true;
  if (err instanceof HttpError) return isRetryableHttpStatus(err.status);
  return false;
}

export function retryDelayMs(attempt: number): number {
  return Math.min(15_000, 1000 * Math.pow(2, attempt));
}
