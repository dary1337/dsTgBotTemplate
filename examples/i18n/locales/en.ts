// EXAMPLE — copy to: src/shared/locales/en.ts
// Canonical locale: defines the message shape every other locale is typed against.
// {placeholder} values get filled by format() in i18n.ts.
export const en = {
    greeting: 'Hello, {name}!',
    ping: { reply: 'Pong.' },
    errors: { accessDenied: 'You do not have access to this bot.' },
};
