// EXAMPLE — copy to: src/ds-bot/features/language-roles/panel.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    type Client,
} from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';
import { LANG_BUTTON_PREFIX, type LanguageConfig } from './config.js';

// Posts the language picker into the configured channel (call once on `ready`).
export const sendLanguagePanel = async (
    bot: Client,
    logger: AppLogger,
    config: LanguageConfig | undefined,
) => {
    if (!config) {
        logger.info('Language roles are not configured, skipping panel');
        return;
    }

    const channel = await bot.channels.fetch(config.channelId);
    if (!channel?.isSendable()) {
        logger.warn('Language channel is missing or not text-based');
        return;
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${LANG_BUTTON_PREFIX}ru`)
            .setLabel('Русский')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`${LANG_BUTTON_PREFIX}en`)
            .setLabel('English')
            .setStyle(ButtonStyle.Primary),
    );

    await channel.send({
        embeds: [
            new EmbedBuilder().setTitle('Choose your language · Выберите язык').setColor('Blurple'),
        ],
        components: [buttons],
    });

    logger.info({ channelId: config.channelId }, 'Language panel posted');
};
