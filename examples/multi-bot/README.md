# Multi-bot

Run several Discord bots from a single process using one comma-separated env var.
Useful when you ship the same bot to many servers under different tokens.

## Env

```env
DS_BOT_TOKENS=token_a,token_b,token_c
```

## Wiring (`src/index.ts`)

Replace the single-token Discord block with:

```ts
import { startDiscordBots } from '../examples/multi-bot/multi-bot.js'; // or copy into src/
const dsBots = await startDiscordBots(logger);
// on shutdown: await Promise.all(dsBots.map((c) => c.destroy()));
```

Each client gets its own child logger (`bot: discord-0`, `discord-1`, ...).
