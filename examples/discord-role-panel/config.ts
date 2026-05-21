// EXAMPLE — copy to: src/ds-bot/features/role-panel/config.ts
// Wiring instructions: examples/discord-role-panel/README.md
//
// This example owns its own config. The core template intentionally does NOT put
// guild/role/channel IDs in env — they are example-specific operational config.
// Source them however suits your fork: env vars (as below) or, like the author's
// production bots, a Mongo `settings` collection (see the README).
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
