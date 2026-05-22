// EXAMPLE — copy to: src/ds-bot/multi-bot.ts
// Set DS_BOT_TOKENS=token1,token2,... and call startDiscordBots() from index.ts
// instead of the single-token login.
import { Client, GatewayIntentBits } from 'discord.js';
import { initDsBotHandlers } from '../../src/ds-bot/init.js';
import type { AppLogger } from '../../src/logger/logger.js';

const parseTokens = (raw: string | undefined) =>
    (raw ?? '')
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);

export const startDiscordBots = async (logger: AppLogger): Promise<Client[]> => {
    const tokens = parseTokens(process.env.DS_BOT_TOKENS);

    if (tokens.length === 0) {
        logger.info('DS_BOT_TOKENS is empty, no Discord bots started');
        return [];
    }

    const clients: Client[] = [];

    for (const [index, token] of tokens.entries()) {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        initDsBotHandlers(client, logger.child({ bot: `discord-${index}` }));
        await client.login(token);
        clients.push(client);
    }

    logger.info({ count: clients.length }, 'Discord bots started');
    return clients;
};
