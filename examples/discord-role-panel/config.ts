// EXAMPLE — copy to: src/ds-bot/features/role-panel/config.ts
// Wiring instructions: examples/discord-role-panel/README.md
//
// IDs stay out of the core env schema since they're example config. Source them
// however suits your fork: env vars (below) or a settings store (see README).
export type RolePanelConfig = {
    guildId: string;
    roleId: string;
    channelId: string;
};

export const ROLE_PANEL_BUTTON_ID = 'role-panel:get-role';

export const ROLE_PANEL_TITLE = 'Get server access';

export const ROLE_PANEL_DESCRIPTION = 'Press the button below to receive the configured role.';

export const loadRolePanelConfig = (): RolePanelConfig | undefined => {
    const guildId = process.env.DS_GUILD_ID?.trim();
    const roleId = process.env.DS_ROLE_ID?.trim();
    const channelId = process.env.DS_CHANNEL_ID?.trim();

    if (!guildId || !roleId || !channelId) {
        return undefined;
    }

    return { guildId, roleId, channelId };
};
