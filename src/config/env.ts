import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().optional(),
);

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const loggerEnvSchema = z.object({
    LOG_LEVEL: logLevelSchema.default('info'),
    LOG_DIR: z.string().trim().min(1).default('logs'),
});

const envSchema = loggerEnvSchema
    .extend({
        DS_BOT_TOKEN: optionalTrimmedString,
        TG_BOT_TOKEN: optionalTrimmedString,
        MONGO_URI: z.string().trim().min(1).default('mongodb://127.0.0.1:27017'),
        MONGO_DB_NAME: z.string().trim().min(1).default('ds-tg-bot-template'),
    })
    .superRefine((env, ctx) => {
        if (!env.DS_BOT_TOKEN && !env.TG_BOT_TOKEN) {
            ctx.addIssue({
                code: 'custom',
                path: ['DS_BOT_TOKEN', 'TG_BOT_TOKEN'],
                message: 'At least one bot token must be provided.',
            });
        }
    });

export type LoggerEnv = z.infer<typeof loggerEnvSchema>;
export type AppEnv = z.infer<typeof envSchema>;

const normalizeEnv = () => ({
    ...process.env,
    MONGO_URI: process.env.MONGO_URI ?? process.env.DB_URI,
    MONGO_DB_NAME: process.env.MONGO_DB_NAME ?? process.env.DB_NAME,
});

export class EnvValidationError extends Error {
    public readonly issues: string[];

    constructor(issues: string[]) {
        super(`Environment validation failed: ${issues.join('; ')}`);
        this.name = 'EnvValidationError';
        this.issues = issues;
    }
}

const formatIssues = (error: z.ZodError) =>
    error.issues.map((issue) => {
        const path = issue.path.join('.') || 'env';
        return `${path}: ${issue.message}`;
    });

export type LoggerEnvResult = {
    env: LoggerEnv;
    // Problems we tolerated by falling back to defaults; the caller logs them once the logger exists.
    issues: string[];
};

const LOGGER_ENV_DEFAULTS: LoggerEnv = { LOG_LEVEL: 'info', LOG_DIR: 'logs' };

// Logging config must never block startup, so invalid values fall back to defaults.
// The issues are returned so the caller can warn once the logger is up.
export const loadLoggerEnv = (): LoggerEnvResult => {
    const result = loggerEnvSchema.safeParse(process.env);

    if (result.success) {
        return { env: result.data, issues: [] };
    }

    return { env: LOGGER_ENV_DEFAULTS, issues: formatIssues(result.error) };
};

export const loadEnv = (): AppEnv => {
    const result = envSchema.safeParse(normalizeEnv());

    if (!result.success) {
        throw new EnvValidationError(formatIssues(result.error));
    }

    return result.data;
};
