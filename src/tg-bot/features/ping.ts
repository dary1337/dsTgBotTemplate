import type { TgBotDeps, TgRouter } from '../types.js';

export const registerPing = (router: TgRouter, deps: TgBotDeps) => {
    router.command('ping', async (ctx) => {
        try {
            return await ctx.reply('Pong.');
        } catch (e) {
            deps.logger.error({ err: e, userId: ctx.from?.id }, 'Telegram ping handler failed');
        }
    });
};
