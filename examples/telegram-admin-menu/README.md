# Telegram admin menu

Builds on the core admin-only Telegram bot: an inline-keyboard menu plus commands to
list and add admins (stored via the `admins` repository/schema).

## Files → target path

- `admin-menu.ts` → `src/tg-bot/features/admin-menu.ts` (replaces `start.ts`)
- `admin-list.ts` → `src/tg-bot/features/admin-list.ts`
- `add-admin.ts`  → `src/tg-bot/features/add-admin.ts`

## Steps

1. Copy the files above.
2. Add the commands to `TELEGRAM_COMMANDS` in `src/tg-bot/commands.ts`:
   ```ts
   { command: 'adminlist', description: 'Show Telegram admins' },
   { command: 'addadmin', description: 'Add a Telegram admin', usage: '<user_id>' },
   ```
3. Register them in `src/tg-bot/init.ts` (inside the admin router), e.g.:
   ```ts
   registerAdminMenu(adminRouter, deps); // instead of registerStart
   registerPing(adminRouter, deps);
   registerAdminList(adminRouter, deps);
   registerAddAdmin(adminRouter, deps);
   ```
   `admin-menu` also expects a `admin:ping` action — add one in `ping.ts` if you want
   the Ping button to work, or remove that button.
