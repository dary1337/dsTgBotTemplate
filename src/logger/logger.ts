import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pino, { type Logger as PinoLogger } from 'pino';
import type { LoggerEnv } from '../config/env.js';

export type AppLogger = PinoLogger;

export type LoggerManager = {
    logger: AppLogger;
    flush: () => void;
};

// Daily rotation, also rolled at 10 MB, keeping the last 7 files — so logs never fill
// the disk on a long-running server.
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

    // Pretty, colourised logs while developing; plain JSON in production (NODE_ENV is
    // set to "production" in the Dockerfile) so log collectors can parse them.
    const prettyStdout = process.env.NODE_ENV !== 'production';

    const targets: pino.TransportTargetOptions[] = [
        {
            target: prettyStdout ? 'pino-pretty' : 'pino/file',
            level: env.LOG_LEVEL,
            options: prettyStdout ? { colorize: true } : { destination: 1 },
        },
        // rotating files on disk
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
