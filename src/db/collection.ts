import type { IndexDescription } from 'mongodb';
import type { z } from 'zod';

// A collection's zod schema plus the indexes it should always have, in one place.
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
