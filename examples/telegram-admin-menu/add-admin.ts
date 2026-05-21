// EXAMPLE — copy to: src/tg-bot/features/add-admin.ts
// Also add `addadmin` to TELEGRAM_COMMANDS and register it in tg-bot/init.ts
import type { Context } from 'telegraf';
import { getTgUserId } from '../../src/tg-bot/middleware/admin-only.js';
import type { TgBotDeps, TgRouter } from '../../src/tg-bot/types.js';

const parseAddAdminPayload = (ctx: Context) => {
    if (!ctx.message || !('text' in ctx.message)) {
        return undefined;
    }

    return ctx.message.text.trim().split(/\s+/)[1];
};

const isValidTelegramUserId = (value: string | undefined): value is string =>
    Boolean(value && /^\d+$/.test(value) && Number(value) > 0);

export const registerAddAdmin = (router: TgRouter, deps: TgBotDeps) => {
    router.command('addadmin', async (ctx) => {
        try {
            const userId = getTgUserId(ctx);
            const targetUserId = parseAddAdminPayload(ctx);

            if (!userId) {
                return await ctx.reply('Cannot resolve your Telegram user ID.');
            }

            if (!isValidTelegramUserId(targetUserId)) {
                return await ctx.reply('Usage: /addadmin <telegram_user_id>');
            }

            const inserted = await deps.admins.add({
                userId: targetUserId,
                createdBy: userId,
                source: 'command',
            });

            if (!inserted) {
                return await ctx.reply(`Telegram admin ${targetUserId} already exists.`);
            }

            deps.logger.info(
                {
                    adminUserId: userId,
                    targetUserId,
                },
                'Telegram admin added',
            );

            return await ctx.reply(`Telegram admin ${targetUserId} added.`);
        } catch (e) {
            deps.logger.error({ err: e, userId: ctx.from?.id }, 'Telegram addadmin handler failed');
        }
    });
};
