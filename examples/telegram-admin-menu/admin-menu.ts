// EXAMPLE — copy to: src/tg-bot/features/admin-menu.ts (replaces start.ts)
// Buttons map to ping/admin-list actions. Register instead of registerStart.
import { Markup } from 'telegraf';
import type { Context } from 'telegraf';
import { formatTelegramCommands } from '../../src/tg-bot/commands.js';
import type { TgBotDeps, TgRouter } from '../../src/tg-bot/types.js';

const adminMenu = () =>
    Markup.inlineKeyboard([
        [Markup.button.callback('Ping', 'admin:ping')],
        [Markup.button.callback('Admin list', 'admin:list')],
    ]);

const replyAdminMenu = async (ctx: Context) =>
    ctx.reply(`Available commands:\n${formatTelegramCommands().join('\n')}`, adminMenu());

export const registerAdminMenu = (router: TgRouter, deps: TgBotDeps) => {
    router.start(async (ctx) => {
        try {
            return await replyAdminMenu(ctx);
        } catch (e) {
            deps.logger.error({ err: e, userId: ctx.from?.id }, 'Telegram start handler failed');
        }
    });

    router.help(async (ctx) => {
        try {
            return await replyAdminMenu(ctx);
        } catch (e) {
            deps.logger.error({ err: e, userId: ctx.from?.id }, 'Telegram help handler failed');
        }
    });
};
