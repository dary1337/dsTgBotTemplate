import type { Client } from 'discord.js';
import type { AppLogger } from '../logger/logger.js';
import { DISCORD_COMMANDS } from './commands.js';

export const initDsBotHandlers = (bot: Client<boolean>, logger: AppLogger) => {
    bot.once('ready', async () => {
        try {
            // Register slash commands globally. For instant updates while
            // developing, register per-guild instead (see discord.js docs).
            await bot.application?.commands.set(DISCORD_COMMANDS);
            logger.info({ botId: bot.user?.id, username: bot.user?.tag }, 'Discord bot is ready');
        } catch (e) {
            logger.error({ err: e }, 'Discord ready handler failed');
        }
    });

    bot.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
                await interaction.reply('Pong.');
            }
        } catch (e) {
            logger.error(
                { err: e, interactionId: interaction.id, userId: interaction.user.id },
                'Discord interaction handler failed',
            );
        }
    });
};
