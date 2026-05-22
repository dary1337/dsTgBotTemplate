import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pino, { type Bindings, type LogFn } from 'pino';
import type { LoggerEnv } from '../config/env.js';

// The logging interface the app depends on, so call sites never import pino directly
// and the implementation can be swapped. The pino instance below satisfies it.
export type AppLogger = {
    readonly level: string;
    fatal: LogFn;
    error: LogFn;
    warn: LogFn;
    info: LogFn;
    debug: LogFn;
    trace: LogFn;
    child: (bindings: Bindings) => AppLogger;
};

export type LoggerManager = {
    logger: AppLogger;
    flush: () => void;
};

// Roll daily or at 10 MB, keep the last 7 files, so logs don't fill the disk.
const rollOptions = (file: string) => ({
    file,
    extension: '.log',
    frequency: 'daily' as const,
    size: '10m',
    mkdir: true,
    limit: { count: 7 },
});

export const createLogger = (env: LoggerEnv): LoggerManager => {
    mkdirSync(env.LOG_DIR, { recursive: true });

    // Pretty logs in dev, JSON in production so log collectors can parse them.
    const prettyStdout = process.env.NODE_ENV !== 'production';

    const targets: pino.TransportTargetOptions[] = [
        {
            target: prettyStdout ? 'pino-pretty' : 'pino/file',
            level: env.LOG_LEVEL,
            options: prettyStdout ? { colorize: true } : { destination: 1 },
        },
        {
            target: 'pino-roll',
            level: env.LOG_LEVEL,
            options: rollOptions(path.join(env.LOG_DIR, 'app')),
        },
        {
            target: 'pino-roll',
            level: 'error',
            options: rollOptions(path.join(env.LOG_DIR, 'error')),
        },
    ];

    const transport = pino.transport({ targets });

    const logger = pino(
        {
            level: env.LOG_LEVEL,
            base: { app: 'ds-tg-bot-template' },
            timestamp: pino.stdTimeFunctions.isoTime,
        },
        transport,
    );

    return {
        logger,
        flush: () => {
            logger.flush();
        },
    };
};
