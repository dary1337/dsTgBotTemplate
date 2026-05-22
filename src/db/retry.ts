export type RetryAttempt = {
    // 1-based index of the attempt that just failed.
    attempt: number;
    // How long withRetry will wait before the next attempt.
    nextDelayMs: number;
    error: unknown;
};

export type RetryOptions = {
    // Total number of attempts, including the first one (must be >= 1).
    attempts: number;
    // Delay before the second attempt; doubles each retry up to maxDelayMs.
    baseDelayMs: number;
    maxDelayMs: number;
    // Called after a failed attempt that will be retried (not after the last one).
    onRetry?: (attempt: RetryAttempt) => void;
    // Injectable so tests don't actually wait.
    sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Run `operation`, retrying on rejection with exponential backoff. Resolves with
// the first success; if every attempt fails it rejects with the last error.
export const withRetry = async <T>(
    operation: () => Promise<T>,
    options: RetryOptions,
): Promise<T> => {
    const { attempts, baseDelayMs, maxDelayMs, onRetry, sleep = defaultSleep } = options;

    // Validate up front: an invalid `attempts` would skip the loop entirely and make
    // the final `throw lastError` throw `undefined` instead of a real error.
    if (!Number.isInteger(attempts) || attempts < 1) {
        throw new RangeError('`attempts` must be an integer >= 1');
    }
    if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
        throw new RangeError('`baseDelayMs` must be a finite number >= 0');
    }
    if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) {
        throw new RangeError('`maxDelayMs` must be a finite number >= 0');
    }
    if (maxDelayMs < baseDelayMs) {
        throw new RangeError('`maxDelayMs` must be >= `baseDelayMs`');
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt >= attempts) {
                break;
            }

            const nextDelayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            onRetry?.({ attempt, nextDelayMs, error });
            await sleep(nextDelayMs);
        }
    }

    throw lastError;
};
