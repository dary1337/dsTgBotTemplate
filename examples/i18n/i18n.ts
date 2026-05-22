// EXAMPLE — copy to: src/shared/i18n.ts
import { en } from './locales/en.js';
import { ru } from './locales/ru.js';

// en is canonical; other locales are typed `typeof en` so missing keys won't compile.
export const messages = { en, ru };

export type Lang = keyof typeof messages;
export const LANGS = Object.keys(messages) as Lang[];

const DEFAULT_LANG: Lang = 'en';

// Maps a discord.js locale ('en-US', 'ru', undefined) to a supported Lang.
export const resolveLang = (locale: string | undefined): Lang => {
    const lang = locale?.toLowerCase().split('-')[0];
    return lang && lang in messages ? (lang as Lang) : DEFAULT_LANG;
};

export const t = (locale: string | undefined): typeof en => messages[resolveLang(locale)];

// Unknown placeholders are left untouched instead of throwing.
export const format = (template: string, vars: Record<string, string | number> = {}) =>
    template.replace(/\{(\w+)\}/g, (_match, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
    );
