# Discord role panel

A message with a button; clicking it grants a configured role and verifies it.

> Add the **GuildMembers** intent to the client in `src/index.ts` (it fetches members to
> grant the role).

## Files → target path

- `config.ts` → `src/ds-bot/features/role-panel/config.ts`
- `panel.ts` → `src/ds-bot/features/role-panel/panel.ts`
- `interactions.ts` → `src/ds-bot/features/role-panel/interactions.ts`
- also needs [discord-channel-cleanup](../discord-channel-cleanup) at `src/ds-bot/features/channel-cleanup.ts`

## Config

The core template keeps guild/role/channel IDs **out of env** on purpose — they are
example-specific operational config, not secrets. This example reads them from env
(`DS_GUILD_ID`, `DS_ROLE_ID`, `DS_CHANNEL_ID`) via `loadRolePanelConfig()` just to keep
the example simple.

In a real bot you'll likely want per-guild settings in MongoDB instead: add a
`settings` collection (a Zod schema in `src/db/schema/`) and load the config from there
rather than from env. That mirrors how the author's production bots store this.

## Wiring (`src/ds-bot/init.ts`)

```ts
import { loadRolePanelConfig } from './features/role-panel/config.js';
import { refreshRolePanel } from './features/role-panel/panel.js';
import { handleRolePanelButton } from './features/role-panel/interactions.js';

const config = loadRolePanelConfig(); // or load from a Mongo settings collection

bot.once('ready', () => refreshRolePanel(bot, logger, config));
bot.on('interactionCreate', (i) => {
    if (i.isButton()) return handleRolePanelButton(i, logger, config);
});
```
