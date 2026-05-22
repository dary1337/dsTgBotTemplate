// EXAMPLE — copy to: src/ds-bot/features/add-channel.ts
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import type { Collection } from 'mongodb';
import { createChannelsRepository } from './channels-repo.js';
import type { Channel } from './channels-schema.js';
import type { AppLogger } from '../../src/logger/logger.js';

// `/addchannel`: registers the current channel. Pass database.collections.channels.
export const handleAddChannel = async (
    interaction: ChatInputCommandInteraction,
    channels: Collection<Channel>,
    logger: AppLogger,
) => {
    if (!interaction.inGuild()) {
        await interaction.reply({
            content: 'Use this command inside a server.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const repo = createChannelsRepository(channels);
    const { channel, created } = await repo.getOrInsert({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        addedBy: interaction.user.id,
    });

    logger.info(
        { guildId: channel.guildId, channelId: channel.channelId, created },
        'Channel registration requested',
    );

    await interaction.reply({
        content: created
            ? `Added <#${channel.channelId}> to the tracked channels.`
            : `<#${channel.channelId}> is already tracked.`,
        flags: MessageFlags.Ephemeral,
    });
};
