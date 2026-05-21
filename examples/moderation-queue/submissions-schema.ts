// EXAMPLE — copy to: src/db/schema/submissions.ts
// Then register it: add `submissionsCollection` to COLLECTION_DEFINITIONS in
// src/db/schema/index.ts and a `submissions` accessor in buildCollections (src/db/db.ts).
import { z } from 'zod';
import { defineCollection } from '../../src/db/collection.js';

export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const submissionSchema = z.object({
    submittedBy: z.string().min(1),
    content: z.string().min(1),
    status: z.enum(SUBMISSION_STATUSES),
    reviewMessageId: z.string().optional(),
    reviewedBy: z.string().optional(),
    createdAt: z.date(),
    reviewedAt: z.date().optional(),
});

export type Submission = z.infer<typeof submissionSchema>;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const submissionsCollection = defineCollection({
    name: 'submissions',
    schema: submissionSchema,
    indexes: [
        { key: { status: 1, createdAt: 1 }, name: 'status_createdAt' },
        { key: { submittedBy: 1 }, name: 'submittedBy' },
    ],
});
