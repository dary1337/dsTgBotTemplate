import { z } from 'zod';
import { defineCollection } from '../collection.js';

export const ADMIN_PLATFORMS = ['telegram', 'discord'] as const;
export const ADMIN_SOURCES = ['migration', 'command'] as const;

// An `admins` document. Types and runtime validation both derive from this schema.
export const adminSchema = z.object({
    platform: z.enum(ADMIN_PLATFORMS),
    userId: z.string().min(1),
    source: z.enum(ADMIN_SOURCES),
    createdBy: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
});

export type Admin = z.infer<typeof adminSchema>;
export type AdminPlatform = (typeof ADMIN_PLATFORMS)[number];
export type AdminSource = (typeof ADMIN_SOURCES)[number];

export const adminsCollection = defineCollection({
    name: 'admins',
    schema: adminSchema,
    indexes: [{ key: { platform: 1, userId: 1 }, unique: true, name: 'platform_userId_unique' }],
});
