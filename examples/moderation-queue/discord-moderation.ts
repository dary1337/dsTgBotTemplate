// EXAMPLE — copy to: src/ds-bot/features/moderation.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
} from 'discord.js';
import { ObjectId, type Collection } from 'mongodb';
import { createSubmissionsRepository } from './submissions-repo.js';
import type { Submission } from './submissions-schema.js';
import type { AppLogger } from '../../src/logger/logger.js';

const APPROVE_PREFIX = 'mod:approve:';
const REJECT_PREFIX = 'mod:reject:';
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID ?? '';

const reviewButtons = (id: string) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${APPROVE_PREFIX}${id}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`${REJECT_PREFIX}${id}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger),
    );

// `/submit <content>` — queue a submission and post it to the review channel.
export const handleSubmit = async (
    interaction: ChatInputCommandInteraction,
    submissions: Collection<Submission>,
    logger: AppLogger,
) => {
    const content = interaction.options.getString('content', true);
    const repo = createSubmissionsRepository(submissions);
    const id = await repo.create({ submittedBy: interaction.user.id, content });

    const channel = await interaction.client.channels.fetch(REVIEW_CHANNEL_ID);
    if (channel?.isSendable()) {
        const message = await channel.send({
            content: `New submission from <@${interaction.user.id}>:\n>>> ${content}`,
            components: [reviewButtons(id.toHexString())],
        });
        await repo.attachReviewMessage(id, message.id);
    }

    await interaction.reply({ content: 'Submitted for review.', flags: MessageFlags.Ephemeral });
    logger.info(
        { submissionId: id.toHexString(), userId: interaction.user.id },
        'Submission queued',
    );
};

// Approve / Reject button handler. The atomic repo.resolve() guarantees one winner.
export const handleModerationButton = async (
    interaction: ButtonInteraction,
    submissions: Collection<Submission>,
    logger: AppLogger,
) => {
    const isApprove = interaction.customId.startsWith(APPROVE_PREFIX);
    const isReject = interaction.customId.startsWith(REJECT_PREFIX);

    if (!isApprove && !isReject) {
        return;
    }

    const id = interaction.customId.slice((isApprove ? APPROVE_PREFIX : REJECT_PREFIX).length);
    const repo = createSubmissionsRepository(submissions);
    const updated = await repo.resolve(
        new ObjectId(id),
        isApprove ? 'approved' : 'rejected',
        interaction.user.id,
    );

    if (!updated) {
        await interaction.reply({
            content: 'Already handled by someone else.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.update({
        content: `${isApprove ? '✅ Approved' : '❌ Rejected'} by <@${interaction.user.id}>\n>>> ${updated.content}`,
        components: [],
    });
    logger.info(
        { submissionId: id, status: updated.status, reviewedBy: interaction.user.id },
        'Submission resolved',
    );
};
