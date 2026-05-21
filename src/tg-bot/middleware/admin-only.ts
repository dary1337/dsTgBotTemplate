import type { MiddlewareFn, Context } from 'telegraf';
import type { AdminsRepository } from '../../db/repositories/admins.js';

export const getTgUserId = (ctx: Context) => ctx.from?.id.toString();

export const adminOnly =
    (admins: AdminsRepository): MiddlewareFn<Context> =>
    async (ctx, next) => {
        const userId = getTgUserId(ctx);

        if (userId && (await admins.has(userId))) {
            return next();
        }

        if ('answerCbQuery' in ctx && typeof ctx.answerCbQuery === 'function') {
            await ctx.answerCbQuery('Access denied');
            return;
        }

        await ctx.reply('You do not have access to this bot admin area.');
    };
