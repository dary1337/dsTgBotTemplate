import { Composer } from 'telegraf';
import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { registerPing } from './features/ping.js';
import { registerStart } from './features/start.js';
import { adminOnly } from './middleware/admin-only.js';
import type { TgBot, TgBotDeps } from './types.js';

export const initTgBotHandlers = (bot: TgBot, deps: TgBotDeps) => {
    // Everything below this router is restricted to admins (see migration 001
    // for how the first admins are seeded) and to private chats.
    const adminRouter = new Composer<Context<Update>>();

    adminRouter.use(adminOnly(deps.admins));
    registerStart(adminRouter, deps);
    registerPing(adminRouter, deps);

    bot.use(Composer.privateChat(adminRouter.middleware()));
    bot.catch((error, ctx) => {
        deps.logger.error(
            { err: error, updateId: ctx.update.update_id, userId: ctx.from?.id },
            'Telegram update failed',
        );
    });
};

export type { TgBot } from './types.js';
