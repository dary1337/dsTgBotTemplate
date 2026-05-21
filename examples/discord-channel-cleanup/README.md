# Discord channel cleanup

`cleanupChannelMessages(channel, client, settings, logger)` deletes messages from a
text channel. `mode: 'fast'` uses `bulkDelete` (messages < 14 days) and falls back to
iterative deletion; `mode: 'full'` walks the whole history. `onlyBotMessages` limits
deletion to the bot's own messages.

Copy to `src/ds-bot/features/channel-cleanup.ts`. Used by the role-panel example.
