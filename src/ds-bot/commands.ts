import { SlashCommandBuilder } from 'discord.js';

// Slash commands are registered with Discord on the `ready` event (see init.ts).
// Add new commands here and handle them in the interactionCreate listener.
export const DISCORD_COMMANDS = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot availability'),
].map((command) => command.toJSON());
