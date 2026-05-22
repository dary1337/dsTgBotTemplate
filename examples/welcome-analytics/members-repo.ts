// EXAMPLE — copy to: src/db/repositories/members.ts
import type { Collection } from 'mongodb';
import { memberSchema, type Member } from './members-schema.js';

export const createMembersRepository = (collection: Collection<Member>) => ({
    // Idempotent upsert; true means first time we saw this member.
    recordJoin: async (input: { guildId: string; userId: string; username: string }) => {
        const doc = memberSchema.parse({ ...input, joinedAt: new Date() });
        const result = await collection.updateOne(
            { guildId: input.guildId, userId: input.userId },
            { $setOnInsert: doc },
            { upsert: true },
        );
        return result.upsertedCount > 0;
    },

    countInGuild: (guildId: string) => collection.countDocuments({ guildId }),

    countJoinedSince: (guildId: string, since: Date) =>
        collection.countDocuments({ guildId, joinedAt: { $gte: since } }),
});
