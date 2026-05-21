// EXAMPLE — copy to: src/tg-bot/features/admin-list.ts
// Also add `adminlist` to TELEGRAM_COMMANDS and register it in tg-bot/init.ts
import type { TgBotDeps, TgRouter } from '../../src/tg-bot/types.js';

const formatAdmins = async (deps: TgBotDeps) => {
    const telegramAdmins = await deps.admins.getMany('telegram');
    const adminList = telegramAdmins.map((admin) => admin.userId).join('\n');

    return `Telegram admins:\n${adminList || 'No admins found.'}`;
};

export const registerAdminList = (router: TgRouter, deps: TgBotDeps) => {
    router.command('adminlist', async (ctx) => {
        try {
            return await ctx.reply(await formatAdmins(deps));
        } catch (e) {
            deps.logger.error(
                { err: e, userId: ctx.from?.id },
                'Telegram adminlist handler failed',
            );
        }
    });

    router.action('admin:list', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            return await ctx.reply(await formatAdmins(deps));
        } catch (e) {
            deps.logger.error(
                { err: e, userId: ctx.from?.id },
                'Telegram admin list action failed',
            );
        }
    });
};
