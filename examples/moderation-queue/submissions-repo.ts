// EXAMPLE — copy to: src/db/repositories/submissions.ts
import type { Collection, ObjectId, WithId } from 'mongodb';
import { submissionSchema, type Submission, type SubmissionStatus } from './submissions-schema.js';

export const createSubmissionsRepository = (collection: Collection<Submission>) => ({
    create: async (input: { submittedBy: string; content: string }) => {
        const doc = submissionSchema.parse({ ...input, status: 'pending', createdAt: new Date() });
        const { insertedId } = await collection.insertOne(doc);
        return insertedId;
    },

    attachReviewMessage: (id: ObjectId, reviewMessageId: string) =>
        collection.updateOne({ _id: id }, { $set: { reviewMessageId } }),

    // The status: 'pending' filter makes this resolve-once: a concurrent second click
    // matches nothing and returns null, so no double approval.
    resolve: (
        id: ObjectId,
        status: Exclude<SubmissionStatus, 'pending'>,
        reviewedBy: string,
    ): Promise<WithId<Submission> | null> =>
        collection.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { $set: { status, reviewedBy, reviewedAt: new Date() } },
            { returnDocument: 'after' },
        ),

    listPending: () => collection.find({ status: 'pending' }).sort({ createdAt: 1 }).toArray(),
});
