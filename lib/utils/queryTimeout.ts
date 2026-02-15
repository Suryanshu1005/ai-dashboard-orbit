/**
 * Query timeout protection utility
 * Wraps promises with timeout functionality
 */

export class QueryTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Query execution timed out after ${timeoutMs}ms`);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Execute a promise with a timeout
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves/rejects with the original result or timeout error
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new Error('Timeout must be greater than 0');
  }

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new QueryTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  // Race between the actual promise and timeout
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Get timeout from connection config or use default
 */
export function getQueryTimeout(connectionTimeout?: number, defaultTimeout: number = 30000): number {
  if (connectionTimeout && connectionTimeout > 0) {
    return Math.min(connectionTimeout, 300000); // Max 5 minutes
  }
  return defaultTimeout;
}

