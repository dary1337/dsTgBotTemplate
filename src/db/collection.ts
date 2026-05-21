import type { IndexDescription } from 'mongodb';
import type { z } from 'zod';

// One collection's definition in one place: its zod schema (the document shape and
// runtime validation) plus the indexes it should always have.
export type CollectionDefinition<TSchema extends z.ZodType> = {
    name: string;
    schema: TSchema;
    indexes: IndexDescription[];
};

export const defineCollection = <TSchema extends z.ZodType>(
    definition: CollectionDefinition<TSchema>,
): CollectionDefinition<TSchema> => definition;

export type DocumentOf<TDefinition> =
    TDefinition extends CollectionDefinition<infer TSchema> ? z.infer<TSchema> : never;
