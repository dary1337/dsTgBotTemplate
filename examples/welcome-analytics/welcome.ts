// EXAMPLE — copy to: src/ds-bot/features/welcome.ts
// Needs GatewayIntentBits.GuildMembers in the Client (src/index.ts) and the
// Server Members Intent toggle enabled in the Discord Developer Portal.
import { EmbedBuilder, type Client } from 'discord.js';
import type { Collection } from 'mongodb';
import { createMembersRepository } from './members-repo.js';
import type { Member } from './members-schema.js';
import type { AppLogger } from '../../src/logger/logger.js';

const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID ?? '';

export const registerWelcome = (bot: Client, members: Collection<Member>, logger: AppLogger) => {
    const repo = createMembersRepository(members);

    bot.on('guildMemberAdd', async (member) => {
        try {
            const isNew = await repo.recordJoin({
                guildId: member.guild.id,
                userId: member.id,
                username: member.user.username,
            });
            const total = await repo.countInGuild(member.guild.id);

            const channel = await member.client.channels.fetch(WELCOME_CHANNEL_ID);
            if (channel?.isSendable()) {
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setDescription(`Welcome <@${member.id}>! You're member **#${total}**.`);
                await channel.send({ embeds: [embed] });
            }

            logger.info(
                { guildId: member.guild.id, userId: member.id, total, isNew },
                'Member joined',
            );
        } catch (error) {
            logger.error({ err: error, userId: member.id }, 'guildMemberAdd handler failed');
        }
    });
};
