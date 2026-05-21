// EXAMPLE — copy to: src/db/schema/channels.ts (register it in schema/index.ts + db.ts)
import { z } from 'zod';
import { defineCollection } from '../../src/db/collection.js';

export const channelSchema = z.object({
    guildId: z.string().min(1),
    channelId: z.string().min(1),
    addedBy: z.string().min(1),
    createdAt: z.date(),
});

export type Channel = z.infer<typeof channelSchema>;

export const channelsCollection = defineCollection({
    name: 'channels',
    schema: channelSchema,
    indexes: [{ key: { guildId: 1, channelId: 1 }, unique: true, name: 'guild_channel_unique' }],
});
