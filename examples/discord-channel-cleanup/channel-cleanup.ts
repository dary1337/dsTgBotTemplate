// EXAMPLE — copy to: src/ds-bot/features/channel-cleanup.ts
import type { Client, Message, TextBasedChannel } from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';

export type ChannelCleanupMode = 'fast' | 'full';

export type ChannelCleanupSettings = {
    mode: ChannelCleanupMode;
    onlyBotMessages: boolean;
    batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;

const canBulkDelete = (
    channel: TextBasedChannel,
): channel is TextBasedChannel & {
    bulkDelete: (messages: Message[] | number, filterOld?: boolean) => Promise<unknown>;
} => 'bulkDelete' in channel && typeof channel.bulkDelete === 'function';

const shouldDeleteMessage = (
    message: Message,
    client: Client<boolean>,
    settings: ChannelCleanupSettings,
) => !settings.onlyBotMessages || message.author.id === client.user?.id;

const deleteMessageSafely = async (message: Message, logger: AppLogger) => {
    try {
        await message.delete();
    } catch (e) {
        logger.debug({ err: e, messageId: message.id }, 'Message delete skipped');
    }
};

export const cleanupChannelMessages = async (
    channel: TextBasedChannel,
    client: Client<boolean>,
    settings: ChannelCleanupSettings,
    logger: AppLogger,
) => {
    const batchSize = settings.batchSize ?? DEFAULT_BATCH_SIZE;
    let deletedCount = 0;

    if (settings.mode === 'fast' && canBulkDelete(channel)) {
        try {
            const messages = await channel.messages.fetch({ limit: batchSize });
            const targetMessages = messages.filter((message) =>
                shouldDeleteMessage(message, client, settings),
            );

            if (targetMessages.size > 0) {
                const deleted = (await channel.bulkDelete([...targetMessages.values()], true)) as {
                    size?: number;
                };
                deletedCount += deleted.size ?? targetMessages.size;
            }

            return deletedCount;
        } catch (e) {
            logger.warn({ err: e }, 'Bulk channel cleanup failed, falling back to latest messages');
        }
    }

    let before: string | undefined;

    do {
        // exactOptionalPropertyTypes rejects an explicit `before: undefined`, so omit it instead.
        const messages = await channel.messages.fetch(
            before ? { limit: batchSize, before } : { limit: batchSize },
        );

        if (messages.size === 0) {
            break;
        }

        for (const message of messages.values()) {
            if (!shouldDeleteMessage(message, client, settings)) {
                continue;
            }

            await deleteMessageSafely(message, logger);
            deletedCount++;
        }

        before = messages.last()?.id;
    } while (settings.mode === 'full' && before);

    return deletedCount;
};
