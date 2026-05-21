# Language roles (RU / EN self-assign)

A panel in a `langChannel` with two buttons. Clicking one grants the matching language
role and removes the other, so a member always has exactly one.

## Files → target path

- `config.ts` → `src/ds-bot/features/language-roles/config.ts`
- `panel.ts` → `src/ds-bot/features/language-roles/panel.ts`
- `interactions.ts` → `src/ds-bot/features/language-roles/interactions.ts`

## Env

```env
LANG_CHANNEL_ID=123456789012345678
ROLE_RU_ID=123456789012345678
ROLE_EN_ID=123456789012345678
```

> The bot's role must be **above** the RU/EN roles in Server Settings → Roles, or it
> can't assign them.

## Wiring (`src/ds-bot/init.ts`)

```ts
import { loadLanguageConfig } from './features/language-roles/config.js';
import { sendLanguagePanel } from './features/language-roles/panel.js';
import { handleLanguageButton } from './features/language-roles/interactions.js';

const lang = loadLanguageConfig();

bot.once('ready', () => sendLanguagePanel(bot, logger, lang));
bot.on('interactionCreate', (i) => {
    if (i.isButton()) return handleLanguageButton(i, logger, lang);
});
```

Pairs naturally with the [i18n](../i18n) example — the role you grant here is the same
locale you'd store and pass to `t(locale)`.
