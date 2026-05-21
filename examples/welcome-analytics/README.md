# Welcome message + join analytics

On `guildMemberAdd`: record the join in Mongo (so you can count members / joins over
time) and post a custom welcome message in a channel.

## Files → target path

- `members-schema.ts` → `src/db/schema/members.ts`
- `members-repo.ts` → `src/db/repositories/members.ts`
- `welcome.ts` → `src/ds-bot/features/welcome.ts`
- `stats.ts` → `src/ds-bot/features/stats.ts` (optional `/stats` command)

## Discord setup

- Add the **GuildMembers** intent to the client in `src/index.ts`, and turn on
  **Server Members Intent** in the Developer Portal → your app → Bot.
- Set the welcome channel:

  ```env
  WELCOME_CHANNEL_ID=123456789012345678
  ```

## Wiring (`src/index.ts`)

After registering the `members` collection in the schema layer:

```ts
import { registerWelcome } from './ds-bot/features/welcome.js';

registerWelcome(dsBot, database.collections.members, logger.child({ feature: 'welcome' }));
```

`recordJoin` is idempotent (unique `{ guildId, userId }`).

## Optional: `/stats` command

`stats.ts` reports membership analytics from the same collection. Register a `/stats`
slash command and route it:

```ts
import { handleStats } from './ds-bot/features/stats.js';

bot.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'stats') {
        await handleStats(i, database.collections.members);
    }
});
```

Shows members tracked + joins in the last 24h / 7d (via `countJoinedSince`).
