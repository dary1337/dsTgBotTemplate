// EXAMPLE — copy to: src/shared/locales/ru.ts
import type { en } from './en.js';

// `: typeof en` enforces full parity with the canonical locale — drop or misspell a
// key and the build fails right here, so a half-translated locale can never ship.
export const ru: typeof en = {
    greeting: 'Привет, {name}!',
    ping: { reply: 'Понг.' },
    errors: { accessDenied: 'У вас нет доступа к этому боту.' },
};
