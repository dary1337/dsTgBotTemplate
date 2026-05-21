# Deploying to a VPS with Docker

A practical, copy-paste guide to running this bot on a fresh Linux VPS the modern way:
**Docker + Docker Compose**. No PM2, no juggling Node versions on the host, no "works on
my machine".

> **Why not PM2?** PM2 runs Node directly on the host, so you still install and pin Node
> yourself, install MongoDB yourself, and hope the server matches your laptop. Docker
> ships the exact Node version, your build, **and** MongoDB as one reproducible unit,
> isolated from the host, with restart-on-crash and restart-on-reboot built in.

This bot uses Telegram **long polling** and Discord's gateway (both outbound
connections), so you do **not** need a public IP, open ports, a domain, or a reverse
proxy. That keeps deployment simple and the attack surface small.

---

## 0. What you need

- A VPS (Ubuntu 24.04 LTS is a fine default) and SSH access.
- Your Discord and/or Telegram bot tokens.
- A fork of this repo on your own GitHub account.

```bash
ssh root@YOUR_SERVER_IP
```

> Prefer a non-root user with `sudo`: `adduser deploy && usermod -aG sudo deploy`,
> then log in as `deploy`.

---

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER          # run docker without sudo
sudo systemctl enable --now docker     # start on boot
# log out and back in so the group change takes effect
```

Verify: `docker --version && docker compose version`.

---

## 2. Make a home for the app

A predictable place for server apps. One folder per app under `/srv/apps`:

```bash
sudo mkdir -p /srv/apps/mybot
sudo chown "$USER:$USER" /srv/apps/mybot
cd /srv/apps/mybot
```

Everything below happens in that folder.

---

## 3. Get the app onto the server — pick one

**The bot's code lives inside the Docker image**, so you don't need the full repo on the
server. Two ways to ship it:

### Path A — pull a prebuilt image (recommended)

Your fork builds the image in CI and publishes it to **your own** GitHub Container
Registry (GHCR). The server then only needs a compose file and `.env` — no source, no
build, no full clone.

**The image name must be lowercase.** GHCR names are always lowercase, even if your
GitHub username or repo has capitals. So `github.com/Yuri/My-Bot` publishes to
**`ghcr.io/yuri/my-bot`**. CI lowercases it automatically when pushing — you just have to
remember to type it lowercase yourself in the compose file and `pull` commands.

1. **One-time, on GitHub.** The included [`release.yml`](../.github/workflows/release.yml)
   workflow builds and pushes the image on every push to `main` (and on `v*` tags). Push
   once, then open your repo → **Packages** (right sidebar) → your package →
   **Package settings**.

2. **Choose public or private** for the package:
   - **Public (simplest):** Package settings → **Change visibility → Public**. Now your
     server can pull it with **no login at all**. This is safe — the image contains only
     compiled code, never your tokens (those live in `.env` on the server and are read at
     runtime).
   - **Private:** the image stays hidden, so the server has to prove it may pull it — do
     the token step below.

3. **On the server,** grab just the production compose file (no clone):

   ```bash
   curl -fsSL -o docker-compose.yml \
     https://raw.githubusercontent.com/<your-user>/<your-repo>/main/docker-compose.prod.yml
   ```

   Edit the `image:` line to your **lowercase** name, e.g. `image: ghcr.io/yuri/my-bot:main`
   (or set `APP_IMAGE` in `.env`).

#### Private package? Log in once with a token

A private package can't be pulled anonymously, and GitHub **won't accept your account
password** for this. You authenticate with a **Personal Access Token (PAT)** — think of
it as a narrow, revocable password scoped to a single permission, so even if it leaks no
one gets your account.

1. Create one at **github.com/settings/tokens → Tokens (classic) → Generate new token**,
   tick **only `read:packages`**, and copy it.
2. On the server, log in once (Docker stores it in `~/.docker/config.json`, so you won't
   repeat this):

   ```bash
   echo YOUR_TOKEN | docker login ghcr.io -u <your-user> --password-stdin
   ```

**What happens if you skip this on a private package?** `docker compose pull` fails with
`denied` / `unauthorized` / `manifest unknown`, and the bot never starts. The fix is
either: make the package **public** (step 2, no token needed) or log in with the token
above. Public packages need none of this — which is why it's the easy default.

### Path B — build on the server (no CI, no registry)

Simplest if you don't want to set up CI: clone your fork and let the server build the
image.

```bash
git clone https://github.com/<your-user>/<your-repo>.git .
```

(The trailing `.` clones into the current `/srv/apps/mybot` folder.)

> Good for kicking the tires, but for anything real use Path A. With Path B every update
> means rebuilding by hand on the box — exactly the drift CI exists to prevent (see §8).

---

## 4. Configure secrets

```bash
cp .env.sample .env   # Path B only; for Path A create .env fresh: nano .env
nano .env
```

Fill in at least one bot token:

```env
DS_BOT_TOKEN=your-discord-token
TG_BOT_TOKEN=your-telegram-token
SEED_TG_ADMIN_IDS=11111111,22222222
```

`.env` stays on the server and is gitignored — your tokens never leave it.

### Where does `MONGO_URI` come from?

- **Using the bundled Mongo (default):** you **don't set it**. The compose file already
  injects `MONGO_URI=mongodb://mongodb:27017`, where `mongodb` is the database service's
  name on the compose network. Leave it out of `.env`.
- **Using a managed database** (MongoDB Atlas, or your own Mongo elsewhere): copy the
  connection string from the provider — in Atlas it's **Connect → Drivers**, a
  `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/` string — and set it yourself:

  ```env
  MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/
  MONGO_DB_NAME=ds-tg-bot-template
  ```

  Then delete the `mongodb` service from the compose file (you no longer run your own DB),
  and allow your server's IP in the provider's network access list.

### Alternative: keep config in GitHub, not a `.env` file

`.env` is the simplest option, but not the only one. If you deploy **through** GitHub
Actions (a CD workflow that connects to your server), store config in GitHub and let the
workflow deliver it — no hand-edited file on the box:

- **Secrets** — encrypted and **masked in logs**. Use for anything sensitive:
  `DS_BOT_TOKEN`, `TG_BOT_TOKEN`, a managed-DB password.
- **Variables** — plain text, visible in the UI and logs. Use for non-sensitive config:
  `MONGO_DB_NAME`, `LOG_LEVEL`, or `MONGO_URI` when it just points at the internal
  `mongodb` service.
- **Environments (preferred)** — bundle those secrets + variables under a named
  environment like `production`, with protections (required reviewers, allowed branches).
  Prod credentials then aren't exposed to every workflow run, and you can keep separate
  `staging` / `production` sets.

> **Important:** secrets and variables only exist **inside** GitHub Actions — they are
> not automatically present on a server you SSH into. They replace `.env` only when a CD
> workflow writes them onto the server (or passes them with `docker ... -e`) while
> deploying. Without such a workflow, the `.env` file above is what the bot reads.

---

## 5. Launch

```bash
docker compose up -d            # Path A. For Path B add --build the first time.
```

`-d` means detached (runs in the background). `restart: unless-stopped` makes the bot
**restart on crash and on reboot** automatically.

---

## 6. Docker in 60 seconds (so the rest makes sense)

- An **image** is your frozen app + Node + dependencies. A **container** is one running
  copy of an image. Compose here runs two containers: `app` (your bot) and `mongodb`.
- See what's running and their health:

  ```bash
  docker compose ps          # this project's containers + STATUS
  docker ps                  # every running container on the box
  docker ps -a               # also stopped/crashed ones (note the NAMES and CONTAINER ID)
  ```

- Read logs (this is how you find out what happened):

  ```bash
  docker compose logs -f app          # follow the bot's logs; Ctrl+C to stop following
  docker logs -f <container-id>       # same, by id/name from `docker ps -a` (e.g. mybot-app-1)
  ```

  `docker compose logs` is just `docker logs` scoped to this project — use whichever.

---

## 7. Did it actually start?

Right after launch:

```bash
docker compose ps
```

- **Good:** `app` shows `Up ...` and `mongodb` shows `Up (healthy)`.
- **Bad:** `app` shows `Restarting` or `Exited (1)` — it crashed. Read why:

  ```bash
  docker compose logs app          # the error is near the bottom
  ```

What healthy startup looks like in the logs:

```
MongoDB connected
Database schema synced
Migrations up to date
Discord bot is ready
Telegram bot is ready
Application started
```

Common failures and what you'll see:

| Symptom in logs | Cause | Fix |
| --- | --- | --- |
| `An invalid token was provided` / Telegram `401` | wrong/empty token | fix `DS_BOT_TOKEN` / `TG_BOT_TOKEN` in `.env`, then `docker compose up -d` |
| `MongoServerSelectionError` / can't connect | Mongo not ready or wrong URI | check `docker compose ps` (mongodb healthy?); leave `MONGO_URI` as the compose default |
| `app` keeps `Restarting` | crash on boot | `docker compose logs app` shows the stack trace |

After changing `.env`, re-run `docker compose up -d` to apply it.

---

## 8. Real updates: push code, let CI build, pull the image

Don't rebuild by hand on the server — that's how environments drift and "works locally,
broken in prod" happens. Use the loop the included [`release.yml`](../.github/workflows/release.yml)
already gives you:

```bash
# 1. on your machine — change code, then:
git commit -am "fix: ..." && git push

# 2. GitHub builds & pushes the new image (watch your repo's Actions tab go green)

# 3. on the server — pull what CI built:
docker compose pull && docker compose up -d
docker image prune -f            # optional: drop old layers
```

Migrations run automatically on startup, so schema/data changes apply themselves.

**Building on it:** `release.yml` is a normal workflow — extend it by adding steps
(e.g. run `npm run lint && npm test` before the build, or add `v*` tag releases). It's
your file now; the registry/image naming follows your fork automatically.

> **Fully hands-free:** add [Watchtower](https://containrrr.dev/watchtower/) and the
> server pulls new images on its own — no SSH needed for updates.

### Is CI free? Yes, for this.

- **Public repo:** GitHub Actions minutes are **unlimited and free**. Nothing to worry
  about.
- **Private repo (Free plan):** **2,000 Actions minutes/month** + 500 MB package storage,
  free. One image build of this bot takes ~2–3 minutes, so even a build every day uses a
  fraction of that. **If you update the bot rarely, it's effectively free** — and pulling
  the image on the server costs no Actions minutes at all.

---

## 9. Logs & data

- **App logs:** `docker compose logs`, plus `./logs/app.log` and `./logs/error.log`
  (Pino writes to the mounted `logs` volume).
- **Database:** stored in the named volume `mongodb_data`; survives `docker compose down`
  and updates. Removed only by `docker compose down -v`.

### Back up MongoDB

```bash
docker compose exec -T mongodb mongodump --archive --db=ds-tg-bot-template > backup-$(date +%F).archive
docker compose exec -T mongodb mongorestore --archive < backup-2026-05-21.archive
```

Schedule the dump with cron for real backups.

---

## 10. Security checklist

- The container runs as a non-root `node` user (see the Dockerfile).
- MongoDB has no published ports; it's only on the internal compose network. Keep it that way.
- Firewall, SSH only: `sudo ufw allow OpenSSH && sudo ufw enable`.
- Use SSH keys, disable password login (`PasswordAuthentication no` in
  `/etc/ssh/sshd_config`), enable `unattended-upgrades`.
- Never commit `.env`. If a token leaks, rotate it in the Discord/Telegram dashboard.

---

## 11. Common commands

Run from `/srv/apps/mybot`:

| Task | Command |
| --- | --- |
| Start | `docker compose up -d` (`--build` for Path B) |
| Update (Path A) | `docker compose pull && docker compose up -d` |
| Stop | `docker compose down` |
| Restart the bot | `docker compose restart app` |
| Live logs | `docker compose logs -f app` |
| Shell into the bot | `docker compose exec app sh` |
| Mongo shell | `docker compose exec mongodb mongosh ds-tg-bot-template` |
| Status | `docker compose ps` |

---