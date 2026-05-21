// EXAMPLE — copy to: src/db/repositories/channels.ts
import type { Collection } from 'mongodb';
import { channelSchema, type Channel } from './channels-schema.js';

export type GetOrInsertResult = { channel: Channel; created: boolean };

export type AddChannelInput = {
    guildId: string;
    channelId: string;
    addedBy: string;
};

export const createChannelsRepository = (collection: Collection<Channel>) => ({
    // get-or-insert (upsert): returns the existing row, or creates it if missing.
    // Works on a completely empty database — the first call just creates the row,
    // so users can register guilds/channels with no manual seeding.
    getOrInsert: async (input: AddChannelInput): Promise<GetOrInsertResult> => {
        const toInsert = channelSchema.parse({ ...input, createdAt: new Date() });

        const result = await collection.findOneAndUpdate(
            { guildId: input.guildId, channelId: input.channelId },
            { $setOnInsert: toInsert },
            { upsert: true, returnDocument: 'after', includeResultMetadata: true },
        );

        return {
            channel: result.value as Channel,
            created: Boolean(result.lastErrorObject?.upserted),
        };
    },

    list: (guildId: string) => collection.find({ guildId }).sort({ createdAt: 1 }).toArray(),

    count: (guildId: string) => collection.countDocuments({ guildId }),

    remove: async (guildId: string, channelId: string) => {
        const { deletedCount } = await collection.deleteOne({ guildId, channelId });
        return deletedCount > 0;
    },
});
