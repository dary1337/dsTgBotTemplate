# Using Mongoose for a collection (optional)

The template is intentionally raw-driver + zod (see "Why raw MongoDB" in the root README).
But if you genuinely prefer Mongoose for some collection, you can use it for that one
**without** changing the rest — the bots, config, logging and migrations are unaffected.

This is a guide, not compiled code: Mongoose is **not** a dependency of the template, so
there's nothing to copy verbatim. Install it only if you take this path.

```bash
npm install mongoose
```

## 1. Define a model

```ts
// src/db/models/admin.model.ts
import { Schema, model } from 'mongoose';

const adminSchema = new Schema(
    {
        platform: { type: String, enum: ['telegram', 'discord'], required: true },
        userId: { type: String, required: true },
        source: { type: String, enum: ['migration', 'command'], required: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true },
);

adminSchema.index({ platform: 1, userId: 1 }, { unique: true });

export const AdminModel = model('Admin', adminSchema);
```

## 2. Connect once at startup

Mongoose keeps its own connection, separate from the raw `MongoClient`. Connect it
alongside `connectDatabase()` in `src/index.ts`:

```ts
import mongoose from 'mongoose';

await mongoose.connect(env.MONGO_URI, { dbName: env.MONGO_DB_NAME });
```

## 3. Use it

```ts
await AdminModel.updateOne(
    { platform: 'telegram', userId },
    { $setOnInsert: { source: 'command', createdBy } },
    { upsert: true },
);
const admins = await AdminModel.find({ platform: 'telegram' }).lean();
```

## Trade-offs to be aware of

- The Mongoose schema is now a **second source of truth** next to any zod schema — keep
  them in sync yourself.
- Mongoose validates in the app, not in the database. You lose the generated
  `$jsonSchema` validator unless you also keep the zod-based one.
- Two connections (raw `MongoClient` + Mongoose) to the same database. Fine, but remember
  to close both on shutdown.

For most bots the raw + zod layer is simpler and stricter. Reach for this only when you
specifically want Mongoose's modeling/middleware.
