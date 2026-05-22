import type { Collection } from 'mongodb';
import { adminSchema, type Admin, type AdminPlatform, type AdminSource } from '../schema/admins.js';

export type AddAdminInput = {
    userId: string;
    createdBy: string;
    source: AdminSource;
    platform?: AdminPlatform;
};

export type AdminsRepository = {
    getMany: (platform?: AdminPlatform) => Promise<Admin[]>;
    has: (userId: string, platform?: AdminPlatform) => Promise<boolean>;
    add: (input: AddAdminInput) => Promise<boolean>;
    removeManyByIds: (userIds: string[], platform?: AdminPlatform) => Promise<number>;
};

export const buildAdminFilter = (userId: string, platform: AdminPlatform = 'telegram') => ({
    platform,
    userId,
});

export const createAdminsRepository = (collection: Collection<Admin>): AdminsRepository => ({
    getMany: (platform: AdminPlatform = 'telegram') =>
        collection.find({ platform }).sort({ userId: 1 }).toArray(),
    has: async (userId: string, platform: AdminPlatform = 'telegram') => {
        const admin = await collection.findOne(buildAdminFilter(userId, platform), {
            projection: { _id: 1 },
        });

        return Boolean(admin);
    },
    add: async (input: AddAdminInput) => {
        const now = new Date();
        const platform = input.platform ?? 'telegram';

        // Validate before writing so a bad value fails here, not in the collection.
        const document = adminSchema.parse({
            platform,
            userId: input.userId,
            source: input.source,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now,
        });

        const result = await collection.updateOne(
            buildAdminFilter(input.userId, platform),
            {
                $setOnInsert: {
                    platform: document.platform,
                    userId: document.userId,
                    source: document.source,
                    createdBy: document.createdBy,
                    createdAt: document.createdAt,
                },
                $set: { updatedAt: now },
            },
            { upsert: true },
        );

        return result.upsertedCount > 0;
    },
    removeManyByIds: async (userIds: string[], platform: AdminPlatform = 'telegram') => {
        const result = await collection.deleteMany({ platform, userId: { $in: userIds } });

        return result.deletedCount;
    },
});
