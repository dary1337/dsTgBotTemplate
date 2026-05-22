// EXAMPLE — copy to: src/ds-bot/jobs/role-audit.ts
// Pairs with the role-panel example.
import { CronJob } from 'cron';
import { Client } from 'discord.js';
import type { AppLogger } from '../../src/logger/logger.js';
import { type RolePanelConfig } from '../discord-role-panel/config.js';

const ENSURE_ROLE_MEMBERS_CRON = '0 * * * *';

export class RoleAuditJob {
    private readonly name = this.constructor.name;
    private job: CronJob | undefined;
    private readonly bot: Client<boolean>;
    private readonly logger: AppLogger;
    private readonly config: RolePanelConfig | undefined;
    private handlerBusy = false;

    constructor(bot: Client<boolean>, logger: AppLogger, config: RolePanelConfig | undefined) {
        this.bot = bot;
        this.logger = logger;
        this.config = config;
    }

    public start() {
        if (this.job) {
            throw new Error(`Job (${this.name}) already started`);
        }

        void this.handler();
        this.job = this.create(ENSURE_ROLE_MEMBERS_CRON, () => this.handler());
        this.logger.info({ job: this.name }, 'Job started');
    }

    public async stop() {
        if (!this.job) {
            return;
        }

        await this.job.stop();
        this.job = undefined;
        this.logger.info({ job: this.name }, 'Job stopped');
    }

    private create(expression: string, handler: () => void | Promise<void>) {
        return CronJob.from<null, null>({
            cronTime: expression,
            onTick: handler,
            start: true,
        });
    }

    private async handler() {
        if (!this.bot.isReady() || this.handlerBusy || !this.config) {
            return;
        }

        this.handlerBusy = true;
        try {
            const guild = await this.bot.guilds.fetch(this.config.guildId);
            const members = await guild.members.fetch();
            let checkedCount = 0;
            let grantedCount = 0;
            let failedCount = 0;

            for (const member of members.values()) {
                if (member.user.bot) {
                    continue;
                }

                checkedCount++;

                if (member.roles.cache.has(this.config.roleId)) {
                    continue;
                }

                try {
                    await member.roles.add(this.config.roleId);
                    const updatedMember = await guild.members.fetch(member.user.id);

                    if (updatedMember.roles.cache.has(this.config.roleId)) {
                        grantedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    failedCount++;
                    this.logger.warn(
                        {
                            err: error,
                            guildId: this.config.guildId,
                            roleId: this.config.roleId,
                            userId: member.user.id,
                        },
                        'Failed to ensure Discord role for member',
                    );
                }
            }

            this.logger.info(
                {
                    job: this.name,
                    guildId: this.config.guildId,
                    roleId: this.config.roleId,
                    checkedCount,
                    grantedCount,
                    failedCount,
                },
                'Discord role audit completed',
            );
        } catch (error) {
            this.logger.error({ err: error, job: this.name }, 'Discord role audit failed');
        } finally {
            this.handlerBusy = false;
        }
    }
}
