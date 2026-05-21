// EXAMPLE — copy to: src/db/repositories/members.ts
import type { Collection } from 'mongodb';
import { memberSchema, type Member } from './members-schema.js';

export const createMembersRepository = (collection: Collection<Member>) => ({
    // Records a join once per member (idempotent). Returns true if it was new.
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

    // Simple analytics: joins since a given moment (e.g. last 24h / 7d).
    countJoinedSince: (guildId: string, since: Date) =>
        collection.countDocuments({ guildId, joinedAt: { $gte: since } }),
});
