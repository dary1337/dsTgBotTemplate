# Broadcast (mass DM) with live control

A user-friendly `/broadcast` for Discord: a confirm step that shows the audience size,
then a **live progress panel** with Pause / Resume / Stop buttons. The pacing and
resilience logic is split into a platform-agnostic engine you can reuse for Telegram.

This distills two of the author's production bots: the **UX** (confirm + live panel +
controls, throttled edits) from **modshub-bot**, and the **resilience** (hourly send cap,
jittered spacing, 429 retry, error classification, auto-stop on quarantine) from
**kamikazeBot**.

## Files → target path

- `broadcast-logs-schema.ts` → `src/db/schema/broadcast-logs.ts`
- `broadcast-engine.ts` → `src/shared/broadcast-engine.ts` (platform-agnostic)
- `discord-broadcast.ts` → `src/ds-bot/features/broadcast.ts`

## What the engine does

| Concern | Behaviour |
| --- | --- |
| Pacing | `maxPerHour` sliding-window cap + jittered gap between sends |
| Rate limits | on HTTP 429 it waits `retry_after` and retries the **same** user |
| Errors | `classify()` buckets each failure: `blocked` / `unreachable` / `failed` |
| Auto-stop | a `critical` classification (e.g. anti-spam quarantine) ends the run |
| Control | a mutable `{ paused, canceled }` object — flip it from your buttons |
| Logging | `logAttempt()` writes one row per recipient to `broadcast_logs` |

The engine takes plain `string` recipient IDs plus `send()` / `classify()` callbacks, so
the **same file drives a Telegram broadcast** — just pass `telegram.sendMessage` as
`send` and classify Telegram 403 / 429 instead.

## Wiring (Discord)

```ts
// build the feature once (inject recipients + the logs collection)
const broadcast = createBroadcastFeature({
    getRecipientIds: () => usersRepo.getSubscriberIds(), // your audience source
    broadcastLogs: database.collections.broadcastLogs,
    logger: logger.child({ feature: 'broadcast' }),
});

// register the command (src/ds-bot/commands.ts): /broadcast text:<string>
bot.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'broadcast') {
        await broadcast.handleBroadcastCommand(i);
    }
    if (i.isButton() && i.customId.startsWith('bcast:')) {
        await broadcast.handleBroadcastButton(i);
    }
});
```

> Sessions are kept in memory (per process). If you run multiple instances or restart
> mid-run, persist `runId` progress to Mongo and resume from a cursor — see how
> kamikazeBot stores `stage3Cursor` and `broadcast_logs`.
