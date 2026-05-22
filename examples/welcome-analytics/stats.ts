// EXAMPLE — copy to: src/ds-bot/features/stats.ts (pairs with welcome.ts)
// Reads from the `members` collection that welcome.ts fills.
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import type { Collection } from 'mongodb';
import { createMembersRepository } from './members-repo.js';
import type { Member } from './members-schema.js';

const DAY_MS = 86_400_000;

export const handleStats = async (
    interaction: ChatInputCommandInteraction,
    members: Collection<Member>,
) => {
    if (!interaction.inGuild()) {
        await interaction.reply({
            content: 'Use this in a server.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const repo = createMembersRepository(members);
    const now = Date.now();
    const [total, last24h, last7d] = await Promise.all([
        repo.countInGuild(interaction.guildId),
        repo.countJoinedSince(interaction.guildId, new Date(now - DAY_MS)),
        repo.countJoinedSince(interaction.guildId, new Date(now - 7 * DAY_MS)),
    ]);

    await interaction.reply({
        content: [
            `**Members tracked:** ${total}`,
            `**Joined (24h):** ${last24h}`,
            `**Joined (7d):** ${last7d}`,
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
    });
};
