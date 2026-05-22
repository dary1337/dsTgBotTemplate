import { SlashCommandBuilder } from 'discord.js';

// Registered on the `ready` event (init.ts). Add commands here, handle them in interactionCreate.
export const DISCORD_COMMANDS = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot availability'),
].map((command) => command.toJSON());
