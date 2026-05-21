# DB operations: tracked channels (get-or-insert)

A end-to-end CRUD example on top of the schema layer. A `/addchannel` command lets users
register the current channel for their guild — and it works **on a completely empty
database**, because `getOrInsert` upserts the row on first use. No manual seeding.

This is the example to read if you're new to raw MongoDB: it shows a schema, a typed
repository, and the common operations (upsert, list, count, delete).

## Files → target path

- `channels-schema.ts` → `src/db/schema/channels.ts`
- `channels-repo.ts` → `src/db/repositories/channels.ts`
- `discord-add-channel.ts` → `src/ds-bot/features/add-channel.ts`

## Wire the schema in (2 edits)

```ts
// src/db/schema/index.ts
import { channelsCollection } from './channels.js';
export const COLLECTION_DEFINITIONS = [adminsCollection, channelsCollection];
```

```ts
// src/db/db.ts
import { channelsCollection, type Channel } from './schema/index.js';

export type AppCollections = {
    admins: Collection<Admin>;
    channels: Collection<Channel>;
};

const buildCollections = (db: Db): AppCollections => ({
    admins: db.collection<Admin>(adminsCollection.name),
    channels: db.collection<Channel>(channelsCollection.name),
});
```

`syncSchema()` then creates the unique `{ guildId, channelId }` index on startup.

## Register the command (Discord)

```ts
// src/ds-bot/commands.ts
new SlashCommandBuilder().setName('addchannel').setDescription('Track this channel'),

// src/index.ts — pass the collection into the Discord handlers, then:
bot.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'addchannel') {
        await handleAddChannel(i, database.collections.channels, logger);
    }
});
```

## The operations shown

| Method | MongoDB | Notes |
| --- | --- | --- |
| `getOrInsert` | `findOneAndUpdate` + `$setOnInsert`, `upsert: true` | atomic; returns `{ channel, created }`; safe on empty DB |
| `list` | `find().sort().toArray()` | all channels for a guild |
| `count` | `countDocuments` | how many tracked |
| `remove` | `deleteOne` | returns whether something was deleted |

`getOrInsert` validates the new document with `channelSchema.parse(...)` before writing,
so a malformed value fails loudly instead of corrupting the collection.
