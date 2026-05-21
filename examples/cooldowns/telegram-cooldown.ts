// EXAMPLE — copy to: src/tg-bot/middleware/cooldown.ts (adjust the import path below)
import type { Context, MiddlewareFn } from 'telegraf';
import { CooldownStore } from './cooldown-store.js';

// Rate-limit every update per Telegram user. Place it high in the middleware
// chain (before your command handlers).
export const cooldown = (windowMs: number): MiddlewareFn<Context> => {
    const store = new CooldownStore(windowMs);

    return async (ctx, next) => {
        const userId = ctx.from?.id;

        if (userId === undefined) {
            return next();
        }

        const { allowed, retryAfterMs } = store.take(String(userId));

        if (!allowed) {
            await ctx.reply(`Slow down — try again in ${Math.ceil(retryAfterMs / 1000)}s.`);
            return;
        }

        return next();
    };
};
