# Examples

Real-world building blocks pulled out of production bots. They are **not** part of the
build (`tsconfig` only compiles `src/`), but `npm run typecheck` does check them. Copy a
file to the path in its header and wire it into the bot init — each folder's README shows
how. (A couple, like `mongoose-model`, are guides rather than copy-in code.)

| Example | What it shows |
| --- | --- |
| [discord-role-panel](discord-role-panel) | Button panel that grants a role on click (embeds, buttons, interactions) |
| [discord-channel-cleanup](discord-channel-cleanup) | Bulk/iterative message cleanup helper |
| [discord-cron-role-audit](discord-cron-role-audit) | A recurring `cron` job with a start/stop lifecycle |
| [telegram-admin-menu](telegram-admin-menu) | Inline-keyboard admin menu + add/list admin commands |
| [multi-bot](multi-bot) | Run several Discord bots from one process (comma-separated tokens) |
| [welcome-analytics](welcome-analytics) | `guildMemberAdd`: custom welcome message + join tracking in Mongo |
| [language-roles](language-roles) | RU/EN self-assign role buttons in a language channel |
| [moderation-queue](moderation-queue) | Submit → approve/reject with a race-safe atomic state machine |
| [discord-broadcast](discord-broadcast) | Mass-DM with confirm + live Pause/Resume/Stop panel; reusable pacing engine |
| [db-channels](db-channels) | DB CRUD on the schema layer: `getOrInsert` upsert, list, count, delete |
| [mongoose-model](mongoose-model) | Guide: use Mongoose for one collection if you prefer (no dep added) |
| [cooldowns](cooldowns) | Per-user command cooldowns / rate limits for both bots |
| [i18n](i18n) | Tiny dependency-free multi-language translator (en/ru) |
| [mongo-migrations](mongo-migrations) | A one-off data migration in the ModsBot style |

To keep them type-checked in place, examples import core modules via `../../src/...`.
After copying a file into `src/`, change those to local paths (e.g. `../../src/logger/logger.js`
→ `../logger/logger.js`).
