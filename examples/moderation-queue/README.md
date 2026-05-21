# Moderation queue (approve / reject)

A submit → review → approve/reject flow with a **race-safe state machine**
(`pending → approved | rejected`). This is the pattern behind the author's
mediaApproveBot / newsApproveBot / requestBot.

The teaching point is the atomic transition: `findOneAndUpdate` filters on
`status: 'pending'`, so the row can only be resolved **once** — two moderators clicking
Approve/Reject at the same instant can't both succeed.

## Files → target path

- `submissions-schema.ts` → `src/db/schema/submissions.ts`
- `submissions-repo.ts` → `src/db/repositories/submissions.ts`
- `discord-moderation.ts` → `src/ds-bot/features/moderation.ts`

## Env

```env
REVIEW_CHANNEL_ID=123456789012345678   # channel where moderators see submissions
```

## Wiring

1. Register the schema (see `submissions-schema.ts` header) so `syncSchema` builds the
   indexes.
2. Add a `/submit` command in `src/ds-bot/commands.ts` with a `content` string option.
3. Route interactions in `src/index.ts` / your Discord init:

```ts
bot.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'submit') {
        await handleSubmit(i, database.collections.submissions, logger);
    }
    if (i.isButton()) {
        await handleModerationButton(i, database.collections.submissions, logger);
    }
});
```

## Status flow

```
pending ──approve──▶ approved
   │
   └────reject────▶ rejected
```

Extend it with a third step (e.g. `fulfilled`) the same way: guard the transition on the
previous status. Adapting it for Telegram is the same idea — post the submission to an
admin chat with inline Approve/Reject buttons and call `repo.resolve(...)` from the
`action` handler.
