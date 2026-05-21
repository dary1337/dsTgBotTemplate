// EXAMPLE — copy to: src/ds-bot/features/language-roles/interactions.ts
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';
import { LANG_BUTTON_PREFIX, type LanguageConfig } from './config.js';

// Handles the RU/EN buttons: grants the chosen language role and drops the other one,
// so a user only ever has one.
export const handleLanguageButton = async (
    interaction: ButtonInteraction,
    logger: AppLogger,
    config: LanguageConfig | undefined,
) => {
    if (!interaction.customId.startsWith(LANG_BUTTON_PREFIX)) {
        return;
    }

    if (!config) {
        await interaction.reply({
            content: 'Language roles are not configured yet.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.inGuild() || !interaction.guild) {
        return;
    }

    const lang = interaction.customId.slice(LANG_BUTTON_PREFIX.length);
    const roleId = lang === 'ru' ? config.roles.ru : config.roles.en;
    const otherRoleId = lang === 'ru' ? config.roles.en : config.roles.ru;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.roles.add(roleId);
    if (member.roles.cache.has(otherRoleId)) {
        await member.roles.remove(otherRoleId);
    }

    await interaction.editReply(
        lang === 'ru' ? 'Готово — выдана роль «Русский».' : 'Done — granted the "English" role.',
    );
    logger.info({ userId: interaction.user.id, lang }, 'Language role set');
};
