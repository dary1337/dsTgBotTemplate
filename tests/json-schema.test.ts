import assert from 'node:assert/strict';
import test from 'node:test';
import { adminSchema } from '../src/db/schema/admins.js';
import { toMongoJsonSchema } from '../src/db/json-schema.js';

test('builds a MongoDB $jsonSchema from a zod object schema', () => {
    assert.deepEqual(toMongoJsonSchema(adminSchema), {
        bsonType: 'object',
        properties: {
            platform: { enum: ['telegram', 'discord'] },
            userId: { bsonType: 'string' },
            source: { enum: ['migration', 'command'] },
            createdBy: { bsonType: 'string' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }, // optional -> still typed, just not required
        },
        required: ['platform', 'userId', 'source', 'createdBy', 'createdAt'],
    });
});
