// EXAMPLE — copy to: src/db/schema/members.ts
// Register it in src/db/schema/index.ts + buildCollections (src/db/db.ts).
import { z } from 'zod';
import { defineCollection } from '../../src/db/collection.js';

export const memberSchema = z.object({
    guildId: z.string().min(1),
    userId: z.string().min(1),
    username: z.string(),
    joinedAt: z.date(),
});

export type Member = z.infer<typeof memberSchema>;

export const membersCollection = defineCollection({
    name: 'members',
    schema: memberSchema,
    indexes: [{ key: { guildId: 1, userId: 1 }, unique: true, name: 'guild_user_unique' }],
});
