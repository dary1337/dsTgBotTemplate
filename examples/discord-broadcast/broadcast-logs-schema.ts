// EXAMPLE — copy to: src/db/schema/broadcast-logs.ts
// Register it in src/db/schema/index.ts + buildCollections (src/db/db.ts).
import { z } from 'zod';
import { defineCollection } from '../../src/db/collection.js';

export const BROADCAST_STATUSES = ['sent', 'blocked', 'unreachable', 'failed'] as const;

export const broadcastLogSchema = z.object({
    runId: z.string(),
    userId: z.string(),
    status: z.enum(BROADCAST_STATUSES),
    errorCode: z.string().optional(),
    at: z.date(),
});

export type BroadcastLog = z.infer<typeof broadcastLogSchema>;

export const broadcastLogsCollection = defineCollection({
    name: 'broadcast_logs',
    schema: broadcastLogSchema,
    indexes: [{ key: { runId: 1, at: 1 }, name: 'runId_at' }],
});
