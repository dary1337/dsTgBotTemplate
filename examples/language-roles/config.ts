// EXAMPLE — copy to: src/ds-bot/features/language-roles/config.ts
// IDs are example config, so they live in env (read here), not in the core env schema.
export const LANG_BUTTON_PREFIX = 'lang:set:';

export type LanguageConfig = {
    channelId: string;
    roles: { ru: string; en: string };
};

export const loadLanguageConfig = (): LanguageConfig | undefined => {
    const channelId = process.env.LANG_CHANNEL_ID?.trim();
    const ru = process.env.ROLE_RU_ID?.trim();
    const en = process.env.ROLE_EN_ID?.trim();

    if (!channelId || !ru || !en) {
        return undefined;
    }

    return { channelId, roles: { ru, en } };
};
