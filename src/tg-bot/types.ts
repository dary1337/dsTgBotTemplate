import { Composer, Telegraf, type Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import type { AdminsRepository } from '../db/repositories/admins.js';
import type { AppLogger } from '../logger/logger.js';

export type TgBot = Telegraf<Context<Update>>;

export type TgRouter = Composer<Context<Update>>;

export type TgBotDeps = {
    admins: AdminsRepository;
    logger: AppLogger;
};
