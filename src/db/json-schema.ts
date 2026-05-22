import { z } from 'zod';

// Turns a zod schema into a MongoDB $jsonSchema validator. Emits bsonType (incl. `date`),
// leaves unknown nodes unconstrained, and allows extra fields like `_id`.
type MongoSchema = Record<string, unknown>;

const nodeToMongo = (schema: z.ZodType): MongoSchema => {
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return nodeToMongo(schema.unwrap() as z.ZodType);
    }
    if (schema instanceof z.ZodString) {
        return { bsonType: 'string' };
    }
    if (schema instanceof z.ZodNumber) {
        return { bsonType: ['int', 'long', 'double', 'decimal'] };
    }
    if (schema instanceof z.ZodBoolean) {
        return { bsonType: 'bool' };
    }
    if (schema instanceof z.ZodDate) {
        return { bsonType: 'date' };
    }
    if (schema instanceof z.ZodEnum) {
        return { enum: Object.values(schema.enum) };
    }
    if (schema instanceof z.ZodArray) {
        return { bsonType: 'array', items: nodeToMongo(schema.element as z.ZodType) };
    }
    if (schema instanceof z.ZodObject) {
        return objectToMongo(schema);
    }
    // Unknown node: leave it open.
    return {};
};

const objectToMongo = (schema: z.ZodObject): MongoSchema => {
    const properties: Record<string, MongoSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape)) {
        const field = value as z.ZodType;
        properties[key] = nodeToMongo(field);
        if (!(field instanceof z.ZodOptional)) {
            required.push(key);
        }
    }

    const result: MongoSchema = { bsonType: 'object', properties };
    if (required.length > 0) {
        result.required = required;
    }
    return result;
};

export const toMongoJsonSchema = (schema: z.ZodType): MongoSchema => nodeToMongo(schema);
