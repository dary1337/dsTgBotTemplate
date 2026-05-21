// EXAMPLE — copy to: src/ds-bot/features/role-panel/panel.ts
// Needs the channel-cleanup example at src/ds-bot/features/channel-cleanup.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    type GuildTextBasedChannel,
} from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';
import { cleanupChannelMessages } from '../discord-channel-cleanup/channel-cleanup.js';
import {
    type RolePanelConfig,
    ROLE_PANEL_BUTTON_ID,
    ROLE_PANEL_DESCRIPTION,
    ROLE_PANEL_TITLE,
} from './config.js';

const getRolePanelChannel = async (
    bot: Client<boolean>,
    config: RolePanelConfig | undefined,
): Promise<GuildTextBasedChannel | undefined> => {
    if (!config) {
        return undefined;
    }

    const guild = await bot.guilds.fetch(config.guildId);
    const channel = await guild.channels.fetch(config.channelId);

    if (!channel?.isTextBased() || !('send' in channel)) {
        return undefined;
    }

    return channel;
};

export const refreshRolePanel = async (
    bot: Client<boolean>,
    logger: AppLogger,
    config: RolePanelConfig | undefined,
) => {
    const channel = await getRolePanelChannel(bot, config);

    if (!channel) {
        logger.warn('Discord role panel channel is not configured or is not text based');
        return;
    }

    const deletedCount = await cleanupChannelMessages(
        channel,
        bot,
        {
            mode: 'fast',
            onlyBotMessages: true,
        },
        logger,
    );

    const panel = new EmbedBuilder()
        .setTitle(ROLE_PANEL_TITLE)
        .setDescription(ROLE_PANEL_DESCRIPTION)
        .setColor('Blue');

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(ROLE_PANEL_BUTTON_ID)
            .setLabel('Get role')
            .setStyle(ButtonStyle.Primary),
    );

    await channel.send({
        embeds: [panel],
        components: [buttons],
    });

    logger.info({ channelId: channel.id, deletedCount }, 'Discord role panel refreshed');
};
