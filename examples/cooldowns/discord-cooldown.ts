// EXAMPLE — copy to: src/ds-bot/cooldown.ts (adjust the import path below)
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { CooldownStore } from './cooldown-store.js';

// One store per command name so cooldowns don't bleed across commands.
const stores = new Map<string, CooldownStore>();

// False means on cooldown; an ephemeral reply has already been sent in that case.
export const checkCommandCooldown = async (
    interaction: ChatInputCommandInteraction,
    windowMs: number,
): Promise<boolean> => {
    let store = stores.get(interaction.commandName);

    if (!store) {
        store = new CooldownStore(windowMs);
        stores.set(interaction.commandName, store);
    }

    const { allowed, retryAfterMs } = store.take(interaction.user.id);

    if (!allowed) {
        await interaction.reply({
            content: `\`/${interaction.commandName}\` is on cooldown — try again in ${Math.ceil(
                retryAfterMs / 1000,
            )}s.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    return allowed;
};
