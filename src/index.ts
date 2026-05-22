import { Client, GatewayIntentBits } from 'discord.js';
import { Telegraf } from 'telegraf';
import { loadEnv, loadLoggerEnv } from './config/env.js';
import { connectDatabase, syncSchema, type DatabaseConnection } from './db/db.js';
import { runMigrations } from './db/migrations/runner.js';
import { createAdminsRepository } from './db/repositories/admins.js';
import { initDsBotHandlers } from './ds-bot/init.js';
import { createLogger, type LoggerManager } from './logger/logger.js';
import { TELEGRAM_COMMANDS } from './tg-bot/commands.js';
import { initTgBotHandlers, type TgBot } from './tg-bot/init.js';

const createDsBot = () =>
    new Client({
        // Minimal: slash commands need only Guilds. Add GuildMembers / GuildMessages /
        // MessageContent (the last two are privileged) only when a feature needs them —
        // the relevant examples say which.
        intents: [GatewayIntentBits.Guilds],
    });

type Shutdown = (reason: string) => Promise<void>;

// Process-level safety net: clean shutdown on signals, last-resort logging for
// errors that escaped every other boundary. Registered once the logger exists.
const installProcessHandlers = (loggerManager: LoggerManager, shutdown: Shutdown) => {
    const { logger } = loggerManager;

    process.once('SIGINT', () => {
        void shutdown('SIGINT').then(() => process.exit(0));
    });

    process.once('SIGTERM', () => {
        void shutdown('SIGTERM').then(() => process.exit(0));
    });

    process.on('unhandledRejection', (reason) => {
        logger.error({ err: reason }, 'Unhandled promise rejection');
        void shutdown('unhandledRejection').then(() => process.exit(1));
    });

    process.on('uncaughtException', (error) => {
        logger.fatal({ err: error }, 'Uncaught exception');
        void shutdown('uncaughtException').then(() => process.exit(1));
    });
};

const main = async () => {
    const loggerEnv = loadLoggerEnv();

    // Build the logger first, under its own guard: it is the only thing the rest of
    // the boot sequence has to report failures with, so if it cannot be created we
    // have nothing better than the console and must give up.
    let loggerManager: LoggerManager;
    try {
        loggerManager = createLogger(loggerEnv.env);
    } catch (error) {
        console.error('Failed to initialise the logger, aborting startup:', error);
        process.exit(1);
    }

    const { logger } = loggerManager;

    if (loggerEnv.issues.length > 0) {
        logger.warn({ issues: loggerEnv.issues }, 'Invalid logger environment, using defaults');
    }

    let database: DatabaseConnection | undefined;
    let dsBot: Client<boolean> | undefined;
    let tgBot: TgBot | undefined;
    let isShuttingDown = false;

    const shutdown: Shutdown = async (reason) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info({ reason }, 'Application shutdown started');

        try {
            if (tgBot) {
                tgBot.stop(reason);
                logger.info('Telegram bot stopped');
            }

            if (dsBot) {
                await dsBot.destroy();
                logger.info('Discord bot stopped');
            }

            if (database) {
                await database.close();
            }
        } catch (e) {
            logger.error({ err: e }, 'Application shutdown failed');
        } finally {
            logger.info('Application shutdown completed');
            loggerManager.flush();
        }
    };

    installProcessHandlers(loggerManager, shutdown);

    try {
        const env = loadEnv();

        database = await connectDatabase(env, logger.child({ module: 'database' }));
        await syncSchema(database.db, logger.child({ module: 'schema' }));
        await runMigrations(database.db, logger.child({ module: 'migrations' }));

        const admins = createAdminsRepository(database.collections.admins);

        // Each bot starts in isolation: if one fails, we log it and keep the other
        // running. (The database above is shared, so a DB failure is still fatal.)
        if (env.DS_BOT_TOKEN) {
            try {
                dsBot = createDsBot();
                initDsBotHandlers(dsBot, {
                    token: env.DS_BOT_TOKEN,
                    admins,
                    logger: logger.child({ bot: 'discord' }),
                });
                await dsBot.login(env.DS_BOT_TOKEN);
            } catch (error) {
                logger.error({ err: error }, 'Discord bot failed to start — continuing without it');
                await dsBot?.destroy().catch(() => undefined);
                dsBot = undefined;
            }
        } else {
            logger.info('DS_BOT_TOKEN is not set, skipping Discord startup');
        }

        if (env.TG_BOT_TOKEN) {
            try {
                tgBot = new Telegraf(env.TG_BOT_TOKEN);
                initTgBotHandlers(tgBot, { admins, logger: logger.child({ bot: 'telegram' }) });
                await tgBot.telegram.setMyCommands(TELEGRAM_COMMANDS);
                // launch() only resolves when long polling STOPS, so don't await it —
                // the onLaunch callback fires once the bot is actually up.
                void tgBot
                    .launch({}, () => logger.info('Telegram bot is ready'))
                    .catch((error) => {
                        logger.error({ err: error }, 'Telegram bot stopped with an error');
                    });
            } catch (error) {
                logger.error(
                    { err: error },
                    'Telegram bot failed to start — continuing without it',
                );
                tgBot = undefined;
            }
        } else {
            logger.info('TG_BOT_TOKEN is not set, skipping Telegram startup');
        }

        if (!dsBot && !tgBot) {
            logger.error('No bot is running — check your tokens.');
        }

        logger.info('Application started');
    } catch (e) {
        logger.fatal({ err: e }, 'Application startup failed');
        await shutdown('startup-error');
        process.exitCode = 1;
    }
};

void main();
