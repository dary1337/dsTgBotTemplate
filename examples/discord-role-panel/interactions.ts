// EXAMPLE — copy to: src/ds-bot/features/role-panel/interactions.ts
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';
import { type RolePanelConfig, ROLE_PANEL_BUTTON_ID } from './config.js';

export const handleRolePanelButton = async (
    interaction: ButtonInteraction,
    logger: AppLogger,
    config: RolePanelConfig | undefined,
) => {
    if (interaction.customId !== ROLE_PANEL_BUTTON_ID) {
        return false;
    }

    if (!config) {
        await interaction.reply({
            content: 'Discord role panel is not configured yet.',
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = await interaction.client.guilds.fetch(config.guildId);
    const member = await guild.members.fetch(interaction.user.id);

    await member.roles.add(config.roleId);

    const updatedMember = await guild.members.fetch(interaction.user.id);
    const hasRole = updatedMember.roles.cache.has(config.roleId);

    if (!hasRole) {
        logger.error(
            {
                guildId: config.guildId,
                roleId: config.roleId,
                userId: interaction.user.id,
            },
            'Discord role add finished but verification failed',
        );

        await interaction.editReply('The role was requested, but verification failed.');
        return true;
    }

    logger.info(
        {
            guildId: config.guildId,
            roleId: config.roleId,
            userId: interaction.user.id,
        },
        'Discord role granted and verified',
    );

    await interaction.editReply('Role granted.');
    return true;
};
