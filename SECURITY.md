# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub: the repository's **Security → Report a vulnerability**
(Private Vulnerability Reporting). If that isn't enabled on a fork, contact the
maintainer directly instead of filing a public issue.

Please include: what the issue is, how to reproduce it, and the impact. We'll acknowledge
within a few days and keep you updated until it's resolved.

## Scope

This is a template you fork and run yourself. The most important security boundary is
**your `.env` / secrets and your server**, not this code:

- Never commit `.env`; rotate any leaked Discord/Telegram token in its dashboard.
- Keep the MongoDB container off the public internet (the bundled compose does this).
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the hardening checklist.

Dependencies are kept current via Dependabot; run `npm audit` after updates.
