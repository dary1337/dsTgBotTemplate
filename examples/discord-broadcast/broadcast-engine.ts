// EXAMPLE — copy to: src/shared/broadcast-engine.ts
//
// Paced bulk sender: hourly cap, jittered gaps, 429 retries, pause/cancel.
// Only deals in string ids + callbacks, so it works for Telegram too.
export type BroadcastStatus = 'sent' | 'blocked' | 'unreachable' | 'failed';

export type SendClassification = {
    status: BroadcastStatus;
    // transient error (e.g. 429): wait this long, then retry the same user
    retryAfterMs?: number;
    // abort the whole run (e.g. bot quarantined)
    critical?: boolean;
};

export type BroadcastControl = { paused: boolean; canceled: boolean };

export type BroadcastStats = {
    total: number;
    processed: number;
    sent: number;
    failed: number;
    lastError: string;
    stoppedEarly: boolean;
};

export type BroadcastOptions = {
    recipientIds: string[];
    send: (userId: string) => Promise<void>;
    classify: (error: unknown) => SendClassification;
    control: BroadcastControl;
    onProgress?: (stats: BroadcastStats) => void;
    logAttempt?: (entry: {
        userId: string;
        status: BroadcastStatus;
        errorCode?: string;
    }) => Promise<void>;
    maxPerHour?: number;
    minGapMs?: number;
};

const HOUR_MS = 3_600_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runBroadcast = async (options: BroadcastOptions): Promise<BroadcastStats> => {
    const { recipientIds, send, classify, control, onProgress, logAttempt } = options;
    const maxPerHour = options.maxPerHour ?? 1000;
    const minGapMs = options.minGapMs ?? 700;

    const sentAt: number[] = [];
    const stats: BroadcastStats = {
        total: recipientIds.length,
        processed: 0,
        sent: 0,
        failed: 0,
        lastError: '—',
        stoppedEarly: false,
    };

    const pruneWindow = () => {
        const cut = Date.now() - HOUR_MS;
        while (sentAt.length > 0 && sentAt[0]! < cut) {
            sentAt.shift();
        }
    };

    for (let i = 0; i < recipientIds.length; i += 1) {
        while (control.paused && !control.canceled) {
            await sleep(400);
        }
        if (control.canceled) {
            stats.stoppedEarly = true;
            break;
        }

        // at quota: wait for the oldest send to age out of the window
        pruneWindow();
        if (sentAt.length >= maxPerHour) {
            await sleep(Math.max(500, sentAt[0]! + HOUR_MS - Date.now()));
        }

        const userId = recipientIds[i]!;

        try {
            await send(userId);
            sentAt.push(Date.now());
            stats.sent += 1;
            stats.processed += 1;
            await logAttempt?.({ userId, status: 'sent' });
        } catch (error) {
            const verdict = classify(error);

            if (verdict.retryAfterMs) {
                await sleep(verdict.retryAfterMs);
                i -= 1; // retry the same recipient
                continue;
            }

            stats.failed += 1;
            stats.processed += 1;
            stats.lastError = verdict.critical ? `${verdict.status} (critical)` : verdict.status;
            await logAttempt?.({ userId, status: verdict.status, errorCode: verdict.status });

            if (verdict.critical) {
                stats.stoppedEarly = true;
                onProgress?.(stats);
                break;
            }
        }

        onProgress?.(stats);

        // jitter the gap so the cadence isn't obviously a bot
        const slot = HOUR_MS / maxPerHour;
        await sleep(Math.max(minGapMs, Math.round(slot * (0.6 + Math.random() * 0.8))));
    }

    return stats;
};
