// EXAMPLE — copy to: src/shared/cooldown-store.ts (keep the cooldowns/ files together)
// Per-key sliding cooldown, framework-agnostic. In-memory => works for a single
// process. For multiple instances back it with Mongo (a TTL index on `expiresAt`)
// or Redis instead — the public API stays the same.
export type CooldownResult = {
    allowed: boolean;
    retryAfterMs: number;
};

export class CooldownStore {
    private readonly readyAt = new Map<string, number>();

    constructor(private readonly windowMs: number) {}

    take(key: string): CooldownResult {
        const now = Date.now();
        const readyAt = this.readyAt.get(key) ?? 0;

        if (now < readyAt) {
            return { allowed: false, retryAfterMs: readyAt - now };
        }

        this.readyAt.set(key, now + this.windowMs);
        return { allowed: true, retryAfterMs: 0 };
    }

    clear(key: string) {
        this.readyAt.delete(key);
    }
}
