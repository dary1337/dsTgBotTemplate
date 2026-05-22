// EXAMPLE — copy to: src/shared/locales/ru.ts
import type { en } from './en.js';

// `: typeof en` forces parity with the canonical locale: a missing key fails the build.
export const ru: typeof en = {
    greeting: 'Привет, {name}!',
    ping: { reply: 'Понг.' },
    errors: { accessDenied: 'У вас нет доступа к этому боту.' },
};
