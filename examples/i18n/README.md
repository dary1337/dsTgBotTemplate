# i18n / multi-language

Lightweight, fully-typed translations. Combines the strong points of two approaches:

- **Typed direct access** — `t(locale).ping.reply`, autocompleted and checked by the
  compiler. No magic dot-path strings, so a typo is a build error, not a silent runtime
  fallback.
- **Locale completeness guaranteed** — `en` is the canonical locale; every other locale
  is typed `: typeof en`, so a missing/renamed key fails the build. You can never ship a
  half-translated locale.
- **Built-in interpolation** — `format(template, vars)` fills `{placeholder}`s (no manual
  `.replace` scattered across call sites).
- **Safe locale resolution** — `resolveLang('en-US' | 'ru' | undefined)` always returns a
  supported `Lang`.

## Files → target path

- `i18n.ts` → `src/shared/i18n.ts`
- `locales/en.ts` (canonical), `locales/ru.ts` → `src/shared/locales/`

## Usage

```ts
import { t, format, resolveLang } from './shared/i18n.js';

// Telegram: ctx.from?.language_code · Discord: interaction.locale
const m = t(ctx.from?.language_code);

await ctx.reply(m.ping.reply);                  // "Понг." / "Pong."
await ctx.reply(format(m.greeting, { name }));  // "Привет, Yuri!"
```

## Adding a locale

1. Create `locales/es.ts` typed `export const es: typeof en = { … }` — TypeScript will
   list every key you still owe.
2. Add it to `messages` in `i18n.ts`. `Lang`, `LANGS`, and `resolveLang` update for free.

## Persisting a user's choice

Pair it with the schema layer: add a `locale` field to a `users`/`admins` schema and pass
the stored value to `t(user.locale)` instead of the platform locale.
