import { formatTelegramCommands } from '../commands.js';
import type { TgBotDeps, TgRouter } from '../types.js';

export const registerStart = (router: TgRouter, deps: TgBotDeps) => {
    router.start(async (ctx) => {
        try {
            return await ctx.reply(`Available commands:\n${formatTelegramCommands().join('\n')}`);
        } catch (e) {
            deps.logger.error({ err: e, userId: ctx.from?.id }, 'Telegram start handler failed');
        }
    });
};
