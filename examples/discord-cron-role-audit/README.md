# Discord cron role audit

A `cron`-driven background job (`RoleAuditJob`) that hourly ensures every member has a
configured role. Shows the start/stop lifecycle pattern: `start()` runs once
immediately then on schedule, `stop()` is awaited during graceful shutdown.

Copy to `src/ds-bot/jobs/role-audit.ts` (depends on the role-panel `config.ts`). Needs the
**GuildMembers** intent on the client (it fetches the full member list).

## Wiring

```ts
const job = new RoleAuditJob(bot, logger.child({ job: 'role-audit' }), config);
bot.once('ready', () => job.start());
// in your shutdown handler:
await job.stop();
```

Change `ENSURE_ROLE_MEMBERS_CRON` to any cron expression (e.g. `*/5 * * * *`).
