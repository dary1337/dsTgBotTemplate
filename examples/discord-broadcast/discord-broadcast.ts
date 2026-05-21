// EXAMPLE — copy to: src/ds-bot/features/broadcast.ts
// A user-friendly /broadcast: confirm step (shows audience size), then a live progress
// panel with Pause / Resume / Cancel buttons. The heavy lifting (pacing, retries,
// classification, auto-stop) lives in the platform-agnostic broadcast-engine.
import { randomUUID } from 'node:crypto';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    DiscordAPIError,
    MessageFlags,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
    type Client,
    type Message,
} from 'discord.js';
import type { Collection } from 'mongodb';
import type { BroadcastLog } from './broadcast-logs-schema.js';
import type { AppLogger } from '../../src/logger/logger.js';
import {
    runBroadcast,
    type BroadcastControl,
    type BroadcastStats,
    type SendClassification,
} from './broadcast-engine.js';

const PANEL_EDIT_MIN_MS = 2500;

type PendingRun = { ownerId: string; text: string };
type LiveRun = { control: BroadcastControl; ownerId: string; panel: Message; lastEditTs: number };

const pending = new Map<string, PendingRun>();
const live = new Map<string, LiveRun>();

const confirmRow = (sessionId: string) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`bcast:confirm:${sessionId}`)
            .setLabel('Send')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`bcast:cancel:${sessionId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );

const controlRow = (runId: string, paused: boolean) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`bcast:pause:${runId}`)
            .setLabel(paused ? 'Resume' : 'Pause')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`bcast:stop:${runId}`)
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger),
    );

const panelText = (stats: BroadcastStats, finished: boolean) =>
    [
        `**Broadcast** — ${finished ? 'finished' : 'running'}`,
        `Progress: **${stats.processed} / ${stats.total}**`,
        `Sent: **${stats.sent}** · Failed: **${stats.failed}**`,
        `Last error: ${stats.lastError}`,
    ].join('\n');

// Map Discord errors onto the engine's vocabulary.
const classifyDiscordError = (error: unknown): SendClassification => {
    if (error instanceof DiscordAPIError) {
        if (error.status === 429) {
            const retryAfter = (error.rawError as { retry_after?: number } | undefined)
                ?.retry_after;
            return {
                status: 'failed',
                retryAfterMs: Math.max(1000, Math.ceil((retryAfter ?? 1) * 1000)),
            };
        }
        if (error.code === 50007) {
            return { status: 'blocked' }; // user has DMs closed / blocked the bot
        }
        if (error.code === 10013 || error.code === 50033) {
            return { status: 'unreachable' };
        }
    }
    const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    if (text.toLowerCase().includes('anti-spam')) {
        return { status: 'failed', critical: true }; // quarantined — stop everything
    }
    return { status: 'failed' };
};

export type BroadcastDeps = {
    // who receives the broadcast — e.g. () => usersRepo.getSubscriberIds()
    getRecipientIds: () => Promise<string[]>;
    broadcastLogs: Collection<BroadcastLog>;
    logger: AppLogger;
};

export const createBroadcastFeature = (deps: BroadcastDeps) => {
    const startRun = async (interaction: ButtonInteraction, text: string) => {
        const runId = randomUUID();
        const control: BroadcastControl = { paused: false, canceled: false };
        const recipientIds = await deps.getRecipientIds();

        const initialStats: BroadcastStats = {
            total: recipientIds.length,
            processed: 0,
            sent: 0,
            failed: 0,
            lastError: '—',
            stoppedEarly: false,
        };
        await interaction.update({
            content: panelText(initialStats, false),
            components: [controlRow(runId, false)],
        });
        const panel = interaction.message;

        live.set(runId, { control, ownerId: interaction.user.id, panel, lastEditTs: Date.now() });

        const client: Client = interaction.client;
        const finalStats = await runBroadcast({
            recipientIds,
            control,
            classify: classifyDiscordError,
            send: async (userId) => {
                const user = await client.users.fetch(userId);
                await user.send(text);
            },
            logAttempt: async (entry) => {
                await deps.broadcastLogs.insertOne({ runId, at: new Date(), ...entry });
            },
            onProgress: (stats) => {
                const session = live.get(runId);
                if (!session || Date.now() - session.lastEditTs < PANEL_EDIT_MIN_MS) {
                    return;
                }
                session.lastEditTs = Date.now();
                void session.panel.edit({
                    content: panelText(stats, false),
                    components: [controlRow(runId, control.paused)],
                });
            },
        });

        live.delete(runId);
        await panel.edit({ content: panelText(finalStats, true), components: [] });
        deps.logger.info({ runId, ...finalStats }, 'Broadcast finished');
    };

    // `/broadcast <text>` — show a confirm panel with the audience size.
    const handleBroadcastCommand = async (interaction: ChatInputCommandInteraction) => {
        const text = interaction.options.getString('text', true);
        const recipientIds = await deps.getRecipientIds();

        if (recipientIds.length === 0) {
            await interaction.reply({ content: 'No recipients.', flags: MessageFlags.Ephemeral });
            return;
        }

        const sessionId = randomUUID();
        pending.set(sessionId, { ownerId: interaction.user.id, text });

        await interaction.reply({
            content: `Send this message to **${recipientIds.length}** users?\n>>> ${text}`,
            components: [confirmRow(sessionId)],
        });
    };

    const handleBroadcastButton = async (interaction: ButtonInteraction) => {
        const [ns, action, id] = interaction.customId.split(':');
        if (ns !== 'bcast' || !action || !id) {
            return;
        }

        if (action === 'confirm' || action === 'cancel') {
            const session = pending.get(id);
            if (!session || interaction.user.id !== session.ownerId) {
                await interaction.reply({
                    content: 'This confirmation is not yours or expired.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            pending.delete(id);
            if (action === 'cancel') {
                await interaction.update({ content: 'Broadcast cancelled.', components: [] });
                return;
            }
            await startRun(interaction, session.text);
            return;
        }

        // pause / stop on a running broadcast
        const session = live.get(id);
        if (!session || interaction.user.id !== session.ownerId) {
            await interaction.reply({
                content: 'This broadcast is not yours or already finished.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (action === 'pause') {
            session.control.paused = !session.control.paused;
        } else if (action === 'stop') {
            session.control.canceled = true;
        }
        await interaction.deferUpdate();
    };

    return { handleBroadcastCommand, handleBroadcastButton };
};
