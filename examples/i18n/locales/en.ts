// EXAMPLE — copy to: src/shared/locales/en.ts
// The CANONICAL locale: it defines the message shape. Every other locale is typed
// against `typeof en`, so a missing or renamed key is a compile error (see ru.ts).
// Use {placeholder} for runtime values — fill them with format() from i18n.ts.
export const en = {
    greeting: 'Hello, {name}!',
    ping: { reply: 'Pong.' },
    errors: { accessDenied: 'You do not have access to this bot.' },
};
