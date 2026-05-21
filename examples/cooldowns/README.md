# Cooldowns / rate limits

Per-user command cooldowns for both bots, built on one tiny framework-agnostic store.

## Files → target path

- `cooldown-store.ts` → `src/shared/cooldown-store.ts` (the shared core)
- `telegram-cooldown.ts` → `src/tg-bot/middleware/cooldown.ts`
- `discord-cooldown.ts` → `src/ds-bot/cooldown.ts`

Keep the files together, or fix the `./cooldown-store.js` import to point at wherever
you put the store.

## Telegram

```ts
import { cooldown } from './middleware/cooldown.js';

// in initTgBotHandlers, before your handlers:
bot.use(cooldown(3000)); // max one update per user per 3s
```

## Discord

```ts
import { checkCommandCooldown } from './cooldown.js';

bot.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    if (!(await checkCommandCooldown(i, 5000))) return; // 5s per command per user
    // ...handle command
});
```

## Scaling note

The store is in-memory, so each process has its own counters — fine for one instance.
Running multiple instances (or the [multi-bot](../multi-bot) example)? Back it with a
Mongo collection (TTL index on `expiresAt`) or Redis; the `take()` API stays the same.
