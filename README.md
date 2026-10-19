# ANIMEVERSE

A full-stack anime encyclopedia and power-scaling playground. The app ships with a real REST API, a persistent SQLite database, per-account data, and a responsive React interface. Everything in the interface reads from the local database; there is no mock backend.

The seeded roster is demo data. Power values are community-style interpretations created for this build, not official statistics.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Power scale and battle formula](#power-scale-and-battle-formula)
- [Data provenance and content policy](#data-provenance-and-content-policy)
- [API reference](#api-reference)
- [Security notes](#security-notes)
- [Tests and verification](#tests-and-verification)
- [Project structure](#project-structure)
- [Deploy](#deploy)
- [Production checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

## Features

- **Dashboard** with server-driven totals, personal counts, popular and newly added characters, highest-tier entries, quick actions, and a live character search.
- **Character database** with search by name/alias, anime/tier/status filters, sorting, server-side pagination, full detail pages, and admin-only create/edit/delete flows with confirmation.
- **VS Battle** with two character pickers, side-by-side stats, per-parameter bars, a transparent weighted score, coverage and insufficient-data handling, a separate hax readout, reset, and optional save to the account.
- **Power Scaling** with 31 non-linear bands from `10-C` to `Tier 0`, per-band descriptions and examples, indexed characters, the nine parameters, and admin editing of band definitions.
- **Tier List Maker** with stable drag-and-drop plus keyboard sorting, rename/add/recolour tiers, board title editing, save/update/load/delete (with confirmation), and PNG export.
- **Anime Gallery** with search, anime/category filters, favorites-only view, lazy-loaded original artwork, preview modal with zoom and previous/next navigation, per-image attribution, and error placeholders.
- **Favorites** per account, available for both characters and gallery artwork.
- **Accounts and settings** with register/login/logout, admin/member roles, appearance (dark/light), tier editor, anime library management, data notes, and a development-only demo account panel.
- **Global search**, notifications via toast/live region only for real events, responsive sidebar/bottom navigation, and functional light/dark themes.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 6, Axios, Lucide React, `@dnd-kit/core`, `html-to-image` |
| Backend | Node.js, Express 4, Zod, Helmet, CORS, express-rate-limit, cookie-parser, bcryptjs |
| Database | SQLite via the built-in `node:sqlite` module (no native compilation) |
| Tests | Node.js built-in test runner (`node --test`) |

## Requirements

- **Node.js 22.5 or newer** (required for `node:sqlite`). Tested on Node 24.18 on Windows.
- npm 10 or newer.
- No external database server is needed.

## Quick start

From the repository root:

```bash
npm install
```

Create the server environment file:

```bash
# macOS / Linux / Git Bash
cp server/.env.example server/.env

# Windows PowerShell
Copy-Item server\.env.example server\.env
```

Review `server/.env`. The defaults work locally. Then create and seed the database:

```bash
npm run db:reset
```

Start both apps:

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000
- Health check: http://localhost:4000/api/health

The database is also created and seeded automatically on first API boot when it is empty and `AUTO_SEED=true`. `npm run db:reset` simply guarantees a clean demo dataset.

## Demo accounts

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Admin | `admin@animeverse.dev` | `Admin#1234` | All member features plus character/anime/tier management |
| Member | `explorer@animeverse.dev` | `Explore#1234` | Favorites, saved battles, personal tier lists |

These accounts are seeded only when the database is empty. Change the seed credentials in `server/.env` before seeding anything that will be exposed publicly, and run `npm run db:reset` so the new values take effect.

Registration through the UI always creates a `member`; it cannot create an admin.

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start API (`node --watch`) and Vite dev server together |
| `npm run dev:server` | Start only the API on port 4000 |
| `npm run dev:client` | Start only Vite on port 5173 |
| `npm run db:migrate` | Apply database migrations without deleting data |
| `npm run db:seed` | Insert demo content into an existing database (idempotent) |
| `npm run db:reset` | Delete the local SQLite file, migrate, and seed fresh data |
| `npm test` | Run the backend test suite |
| `npm run build` | Build the production frontend into `client/dist` |
| `npm start` | Start the production API server on port 4000 |

Stop the dev server before `db:reset` on Windows; the running process holds the SQLite file and the reset will fail with `EPERM` / `EBUSY`.

## Environment variables

Server variables live in `server/.env` (see `server/.env.example`). A production template is provided at `server/.env.production.example`. Nothing secret belongs in the client.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | `production` enforces a strong session secret and stronger bcrypt cost |
| `CLIENT_ORIGINS` | `http://localhost:5173,http://localhost:4000` | Comma-separated CORS/Origin allowlist |
| `PUBLIC_ORIGIN` | unset | Optional canonical public origin automatically added to the allowlist (useful for Docker/VPS) |
| `RENDER_EXTERNAL_URL` | set by Render | Automatically added to the allowlist when present |
| `SESSION_SECRET` | insecure dev fallback | Session-token HMAC secret. Required (32+ chars) in production |
| `SESSION_DAYS` | `7` | Session lifetime in days |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS |
| `DATABASE_PATH` | `./data/animeverse.db` | SQLite path, resolved from `server/` |
| `AUTO_SEED` | `true` | Seed demo content when the database is empty |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Demo values | Seeded admin account |
| `DEMO_NAME` / `DEMO_EMAIL` / `DEMO_PASSWORD` | Demo values | Seeded member account |

Passwords containing `#` must be quoted, otherwise dotenv treats the rest of the line as a comment:

```dotenv
ADMIN_PASSWORD="Admin#1234"
```

The frontend always calls the relative `/api` base. In development Vite proxies that to port 4000; in production the Express server serves `client/dist` when it exists.

## Database

SQLite runs in WAL mode with foreign keys enabled and a busy timeout. Schema changes are versioned with `PRAGMA user_version` and applied by `server/src/database/migrations/001_initial.sql`.

Tables: `users`, `sessions`, `anime`, `tiers`, `characters`, `tier_lists`, `tier_list_items`, `battles`, `favorites`, `gallery_items`, `gallery_favorites`.

Integrity rules include primary keys, foreign keys, unique constraints (emails, character names, one favorite per user/character), and indexes on character name, anime, tier, session expiry, favorites, gallery relations, and battle history. Saved battles store a JSON snapshot of both fighters so a saved comparison remains readable after a character is edited or deleted.

The database file lives at `server/data/animeverse.db`. It is ignored by git. To back it up, copy the database together with any `-wal` and `-shm` files while the server is stopped, or use SQLite's backup API.

Seed content: 31 tiers, 8 anime series, 12 characters, 8 original gallery pieces, 2 demo accounts, seeded favorites, one starter tier list, and one saved battle.

## Power scale and battle formula

The scale has 31 bands from `10-C` through `Tier 0`. Bands are ordered but deliberately non-linear: a step near the bottom is not the same size as a step near the top. Each band has a stored label, description, and example, editable by an admin. The labels describe context; they never decide a battle automatically.

Nine parameters are tracked per character: Attack Potency, Speed, Durability, Strength, Intelligence, Stamina, Hax, Range, and Combat Skill. Values use a 0-100 comparison scale. Hax is displayed separately and is **not** included in the numeric battle score.

The VS Battle score uses eight weighted parameters:

| Parameter | Weight |
| --- | --- |
| Attack Potency | 20% |
| Speed | 15% |
| Durability | 15% |
| Combat Skill | 15% |
| Strength | 10% |
| Intelligence | 10% |
| Stamina | 10% |
| Range | 5% |

Rules:

- AP, Speed, and Durability are required on both sides.
- Each side needs at least 60% weighted coverage; otherwise the comparison is marked insufficient.
- The score is normalized over the parameters that are actually present, so missing values are excluded instead of guessed.
- A margin below 3 points is a draw.
- Per-stat rows mark a winner only when the gap is at least 4 points.
- Tier labels and hax do not add points; the summary explicitly says the result is a directional reading of community-entered parameters, not a guaranteed outcome.

Weights are published to the client by the API so the UI can show the exact formula used by the server.

## Data provenance and content policy

- All seeded characters are stored with `data_source = 'community'` and render "Community interpretation" labels. Demo banners distinguish seeded content from a real dataset.
- The app does not invent official sources, quotes, or cited feats. Descriptive text, weaknesses, abilities, and numeric values are demo/community interpretations for this local build.
- "First appearance" and similar metadata are demo fields. Verify against primary sources before using the app for factual reference.
- Gallery artwork is **original AI-generated concept art** created for this demo, not copyrighted anime screenshots or stills. Files are served locally from `client/public/gallery`.
- Every gallery preview displays: "Original AI-generated concept art created for the ANIMEVERSE demo. Unofficial and not affiliated with the series or its rights holders."
- No external image hotlinking is used for gallery items.

If you replace the demo data with real series material, confirm that you have the rights to distribute every image and do not label community interpretations as official.

## API reference

Base path: `/api`. Requests and responses are JSON. Authentication uses the `av_session` httpOnly cookie, so browser requests send credentials with the cookie.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/health` | Public | API and database liveness |
| POST | `/auth/register` | Public (rate limited) | `{ name, email, password }`; password 8-72 chars with a letter and a number |
| POST | `/auth/login` | Public (rate limited) | Sets the session cookie |
| POST | `/auth/logout` | Public | Deletes the session row and clears the cookie |
| GET | `/auth/me` | Public | Returns the current user or `null` |
| GET | `/characters` | Public | Pagination, search, filters, sorting |
| GET | `/characters/:id` | Public | Full character profile |
| POST / PUT / DELETE | `/characters` / `/characters/:id` | Admin | Create, update, delete |
| GET | `/anime` / `/anime/:id` | Public | Anime library |
| POST / PUT / DELETE | `/anime` / `/anime/:id` | Admin | Manage the library |
| GET | `/tiers` | Public | Ordered tier definitions |
| PUT | `/tiers/:key` | Admin | Edit label, description, example, order |
| GET / POST | `/tier-lists` | Signed in | List/create boards owned by the current user |
| GET / PUT / DELETE | `/tier-lists/:id` | Owner | Read/update/delete a board |
| POST | `/battles/analyze` | Public (rate limited) | `{ characterAId, characterBId }`; returns the full comparison |
| GET / POST | `/battles` | Signed in | List or save a battle snapshot |
| GET | `/battles/:id` | Owner | Read a saved battle |
| GET | `/favorites` / `/favorites/ids` | Signed in | Favorite characters for the current user |
| POST / DELETE | `/favorites` / `/favorites/:characterId` | Signed in | Add/remove a character favorite |
| GET | `/gallery` | Public | `favorites=true` additionally requires a session |
| POST / DELETE | `/gallery/:id/favorite` | Signed in | Add/remove a gallery favorite |
| GET | `/dashboard/stats` | Public | Global stats, plus personal stats when signed in |

Character list query parameters:

| Parameter | Values |
| --- | --- |
| `page` | Positive integer, default 1 |
| `limit` | 1-100, default 12 |
| `search` | Name/alias text, max 100 chars |
| `animeId` | Positive integer |
| `tier` | Tier key such as `3-A` |
| `status` | `Alive`, `Deceased`, `Unknown`, `Sealed`, `Inactive` |
| `sort` | `name_asc`, `name_desc`, `newest`, `oldest`, `tier_asc`, `tier_desc`, `updated_desc` |

Character lists return `{ data, pagination: { page, limit, total, totalPages } }`. Gallery supports `search`, `category` (`Cinematic`, `Action`, `Landscape`, `Character`), `animeId`, and `favorites`. Favorites support `search` and `sort` (`recent`, `name_asc`, `name_desc`).

Example session flow:

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@animeverse.dev","password":"Admin#1234"}' \
  http://localhost:4000/api/auth/login

curl -b cookies.txt "http://localhost:4000/api/characters?search=naruto&page=1&limit=12"
```

Errors use a consistent envelope:

```json
{
  "error": {
    "message": "Validation failed.",
    "code": "VALIDATION_ERROR",
    "details": { "fieldErrors": { "name": ["Name must be at least 2 characters."] } }
  }
}
```

Rate limits (per 15 minutes): 900 requests globally, 30 auth attempts, and 120 battle analyses. Responses include standard rate-limit headers and return `429` with code `RATE_LIMITED` when exceeded. Rate limiting is disabled when `NODE_ENV=test`.

## Security notes

- Passwords are hashed with bcrypt (cost 10 in development, 12 in production). Plaintext passwords are never stored.
- Session tokens are random 32-byte values. Only an HMAC-SHA256 hash is stored in the `sessions` table; the raw token lives in an httpOnly, SameSite=Lax cookie. Set `COOKIE_SECURE=true` behind HTTPS.
- Logout deletes the server-side session row, so a copied cookie stops working.
- CORS is an explicit allowlist with credentials enabled. A second Origin guard rejects unsafe methods from unlisted origins, reducing cross-site request risk.
- Helmet sets a Content Security Policy and other hardening headers. `x-powered-by` is disabled.
- Register creates members only. Character, anime, tier, and tier-delete mutations require the admin role; tier lists, favorites, saved battles, and gallery favorites are scoped to the owning account.
- Inputs are validated with Zod; SQL uses prepared statements with parameter binding, escaped LIKE patterns, and whitelisted sort expressions. JSON bodies are limited to 200 KB.
- No API keys, passwords, or secrets are included in the frontend bundle. Configuration comes from server environment variables.
- UI deletion flows require explicit confirmation. Removing data from the database is permanent.
- SQLite is not used as a localStorage stand-in: favorites, boards, battles, sessions, and characters are all persisted server-side. Only the theme preference is stored in the browser.

Registration is open by default, as required for the demo accounts flow. There is no email verification, password reset, MFA, or account-lockout policy; add those before treating this as an internet-facing production service.

## Tests and verification

Run the backend suite:

```bash
npm test
```

Result at the time of writing: **47 tests across 9 suites, all passing**. Each run uses a temporary SQLite database on an ephemeral port, seeds it, and removes the files afterward; your development database is untouched. Coverage includes:

- Authentication, registration validation, session behavior, admin authorization, and logout.
- Character pagination, search/alias matching, LIKE wildcard escaping, filters, sorting, validation, duplicate handling, and admin CRUD.
- Anime and tier reference validation and admin management.
- Battle analysis: weights sum to 100, normalization, draw threshold, coverage/core-stat insufficiency, hax exclusion, tier labels never deciding, and per-stat thresholds.
- Battle save/list/ownership.
- Favorites isolation between accounts.
- Tier list create/read/update/delete, ownership, and invalid references.
- Gallery filters, favorites, and auth requirements.
- 404 envelopes, invalid JSON, untrusted origins, security headers, persistence after reopening the database, and demo provenance labels.

The frontend was manually verified in a browser at desktop (1440x900), tablet (820x1180), and phone (about 591x651) widths in both themes. Flows exercised include: register/login/logout, role-restricted controls, character CRUD and search, saved detail pages, VS analysis and saving, power-scaling expansion, admin tier editing, tier-list drag-and-drop (pointer and keyboard), save/load/delete and PNG export, gallery preview/favorites, theme persistence, account menu, and mobile navigation.

There is no automated frontend test suite in this build; the manual checklist above is the frontend verification record.

A production-mode smoke check also verified the server serving `client/dist` and SPA fallback, `/api/health`, cookie login with `PUBLIC_ORIGIN` in the allowlist, and a `403 ORIGIN_REJECTED` response for an untrusted origin.

## Project structure

```text
animeverse/
├── client/
│   ├── public/gallery/          # Original AI-generated demo artwork
│   └── src/
│       ├── api/                 # Axios client and error helpers
│       ├── components/          # Layout, brand, UI building blocks
│       ├── context/             # Auth, favorites, theme, toast
│       ├── hooks/               # Fetch, debounce, document title
│       ├── layouts/             # App shell and auth shell
│       ├── pages/               # Dashboard, characters, battle, scaling,
│       │                        # tier list, gallery, favorites, settings, auth
│       ├── styles/              # Tokens, base, layout, components, pages
│       └── utils/               # Constants and formatters
├── server/
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── database/            # Connection, migrations, seed, CLI
│   │   ├── middleware/          # Auth, errors, Origin guard, rate limits
│   │   ├── routes/              # REST route definitions
│   │   ├── services/            # Battle math, sessions, character queries
│   │   ├── utils/               # HTTP errors, mappers, validation
│   │   ├── validators/          # Zod schemas
│   │   ├── app.js               # Express app and static client serving
│   │   └── server.js            # API entry point
│   ├── tests/                   # API, formula, and persistence tests
│   ├── data/                    # Local SQLite database (git ignored)
│   ├── .env.example
│   └── .env.production.example  # Production template for Docker/VPS
├── docker/entrypoint.sh         # Prepares the data volume, drops privileges
├── Dockerfile                   # Multi-stage Node 24 image
├── compose.yaml                 # Docker Compose with a named data volume
├── render.yaml                  # Render Blueprint with a persistent disk
├── package.json                 # npm workspaces and root scripts
└── README.md
```

## Deploy

The Express server also serves the built React client, so the app deploys as one Node service. The SQLite database must live on a persistent disk; static hosting and free ephemeral tiers will lose data.

### Render (blueprint included)

The repository ships `render.yaml` and `.node-version`, configured for a Node service with a 1 GB disk mounted at `/var/data`.

1. Push this folder to a GitHub or GitLab repository:

   ```bash
   git init
   git add .
   git commit -m "ANIMEVERSE"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. In the Render Dashboard choose **New > Blueprint**, connect the repository, and select the branch that contains `render.yaml`.
3. When prompted, enter a real `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_EMAIL`, and `DEMO_PASSWORD`. Render generates `SESSION_SECRET` automatically. Use strong passwords; these accounts are seeded on first boot.
4. The blueprint requests an instance/disk that supports persistent disks (the database path is `/var/data/animeverse.db`). A free instance has an ephemeral filesystem and is not suitable for persistent accounts.
5. Deploy. Render watches `/api/health` and serves the app at `https://<service>.onrender.com`.
6. The service URL is allowlisted automatically through `RENDER_EXTERNAL_URL`. When you add a custom domain, also set `CLIENT_ORIGINS=https://your-domain.example` in the Render environment and redeploy. Without it, login and other unsafe requests return `403 ORIGIN_REJECTED`.
7. Seed credentials only apply to an empty database. Changing them later will not rewrite existing accounts; reseed deliberately if that is what you want.

### Docker / VPS

The repository ships a multi-stage `Dockerfile`, a Compose file with a named volume, and a production env template.

1. Create the production env file and edit every value:

   ```bash
   cp server/.env.production.example server/.env.production
   ```

2. Put an HTTPS reverse proxy (Caddy, Nginx, or your platform's load balancer) in front of port 4000. Keep `COOKIE_SECURE=true` in production; for a quick plain-HTTP local test, set it to `false`.
3. Build and start:

   ```bash
   docker compose up -d --build
   docker compose logs -f animeverse
   curl http://localhost:4000/api/health
   ```

4. SQLite persists in the `animeverse-data` volume mounted at `/data`. Back it up by stopping the service and archiving that volume, or by using SQLite's backup API.
5. Update the deployment with `git pull` followed by `docker compose up -d --build`.
6. `PUBLIC_ORIGIN` / `CLIENT_ORIGINS` must match the browser's exact origin (scheme, host, and port). The container entrypoint prepares the data directory and drops from root to the `node` user; if your runtime is rootless, ensure the mounted volume is writable by UID 1000.

The production start path was smoke-tested locally (`NODE_ENV=production`, built client served by Express, cookie login, `PUBLIC_ORIGIN` allowlisting, untrusted-origin rejection). Docker itself was not available in the development environment, so build the image once on your host before exposing it.

## Production checklist

1. Set `NODE_ENV=production` and a random `SESSION_SECRET` of at least 32 characters. The server refuses to start otherwise.
2. Use strong, unique admin/member seed passwords, then seed a fresh database. Remove or change the demo accounts if the app is public.
3. Set `COOKIE_SECURE=true` and serve over HTTPS, preferably behind a reverse proxy.
4. Set `CLIENT_ORIGINS` (or `PUBLIC_ORIGIN`) to the exact public origin(s). Do not use wildcards with credentials.
5. Run `npm run build`, then `npm start`. Express serves `client/dist` and the API on the same origin.
6. Mount a persistent volume for `DATABASE_PATH` and confirm data survives a redeploy.
7. Back up the SQLite database and test restore. Run the app as a single writer process.
8. Review rate limits, logging, and monitoring for your expected traffic.

Generate a suitable secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Troubleshooting

**`node:sqlite` is not available** - Upgrade to Node 22.5+ (Node 24 recommended).

**Port 4000 or 5173 already in use** - Stop the other process or change `PORT` / Vite's `strictPort` setting. The dev proxy expects the API on port 4000 unless you update `client/vite.config.js`.

**`EPERM` or `EBUSY` during `db:reset` on Windows** - A running API process still holds the SQLite file. Stop `npm run dev`, run the reset, then restart.

**Login fails after changing `.env`** - Existing users are not rewritten by the seed. Quote passwords containing `#`, then run `npm run db:reset` to recreate the accounts with the new values.

**Browser requests are blocked by CORS** - Add the exact origin (scheme, host, port) to `CLIENT_ORIGINS` or `PUBLIC_ORIGIN` and restart/redeploy the API. An empty `Origin` header is allowed for same-origin and non-browser clients.

**Login returns `403 ORIGIN_REJECTED` after deployment** - The browser's origin is not allowlisted. On Render, the service's own URL is added automatically, but custom domains must be added to `CLIENT_ORIGINS`, followed by a redeploy. Check that scheme and host match exactly.

**Accounts or characters disappear after a redeploy** - The database is on an ephemeral filesystem. Attach a persistent disk/volume and point `DATABASE_PATH` at it (Render blueprint uses `/var/data/animeverse.db`).

**Docker cannot write the database** - Mount a writable volume at `/data`. The entrypoint chowns the data directory when the container starts as root; with rootless containers, make the volume writable by UID 1000.

**The UI asks to sign in after a restart** - Sessions live in SQLite and survive restarts, but a `db:reset` removes them. Sign in again after resetting.

**Saved comparison still shows a deleted character** - This is intentional. Battles store a JSON snapshot of both fighters at save time.

**React Router warns about v7 future flags** - Development-only warnings from React Router 6. They do not change app behavior.

## Known limitations

- This is a local-first single-instance app. SQLite in WAL mode is reliable here but is not a horizontally scaled database, and managed hosts require a persistent (usually paid) disk.
- The included admin seed account cannot be recovered through the UI; store production credentials safely and reseed deliberately if they are lost.
- Power values and character prose are demo/community interpretations, not an official reference dataset.
- Images are limited to local assets or provided URLs; there is no file-upload pipeline.
- No email verification, password reset, MFA, audit log, or admin user-management UI.
- The tier-list PNG export renders the board on the client and can be affected by very large custom fonts or unusually long tier names.
- Frontend behavior is covered by the manual browser checklist, not automated end-to-end tests.
- No license has been declared for the code or artwork in this repository. Add one before redistributing.
