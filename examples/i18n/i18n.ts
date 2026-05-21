// EXAMPLE — copy to: src/shared/i18n.ts
// Typed translations with a tiny interpolator. Every locale stays complete via the
// canonical-locale trick (see locales/*).
import { en } from './locales/en.js';
import { ru } from './locales/ru.js';

// `en` is canonical; locales/ru.ts is typed `typeof en`, so every locale has every key.
export const messages = { en, ru };

export type Lang = keyof typeof messages;
export const LANGS = Object.keys(messages) as Lang[];

const DEFAULT_LANG: Lang = 'en';

// Map any IETF tag or discord.js locale ('ru', 'en-US', undefined) to a supported Lang.
export const resolveLang = (locale: string | undefined): Lang => {
    const lang = locale?.toLowerCase().split('-')[0];
    return lang && lang in messages ? (lang as Lang) : DEFAULT_LANG;
};

// Typed message bundle for a locale; access keys directly.
export const t = (locale: string | undefined): typeof en => messages[resolveLang(locale)];

// Fill {placeholders}; unknown ones are left as-is rather than throwing.
export const format = (template: string, vars: Record<string, string | number> = {}) =>
    template.replace(/\{(\w+)\}/g, (_match, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
    );
