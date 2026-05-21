export type TelegramCommand = {
    command: string;
    description: string;
    usage?: string;
};

export const TELEGRAM_COMMANDS: TelegramCommand[] = [
    { command: 'start', description: 'Show the welcome message' },
    { command: 'ping', description: 'Check bot availability' },
];

export const formatTelegramCommands = (commands = TELEGRAM_COMMANDS) =>
    commands.map(({ command, description, usage }) =>
        usage ? `/${command} ${usage} - ${description}` : `/${command} - ${description}`,
    );
