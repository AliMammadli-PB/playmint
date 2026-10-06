# Playmint

Open-source HTML5 game platform: developers upload zipped games, an admin approves them,
players play free or subscribe to Premium, and 70% of subscription revenue is split across
the games each subscriber actually played.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind 4 · PostgreSQL 16 + Drizzle · pm2 + nginx

## Layout
- `src/lib/revenue.ts` — user-centric revenue split (pure, unit tested)
- `src/lib/finance.ts` — monthly periods, developer balances
- `src/lib/play.ts` — play sessions, heartbeats, likes
- `src/lib/zip.ts` — upload validation / extraction / scan
- `src/lib/payments/` — payment provider boundary (mock provider today)
- `src/lib/i18n/dict/` — TR / AZ / EN strings
- `src/app/[locale]/dev` — developer panel, `src/app/[locale]/admin` — admin panel

## Data
- DB: `playmint` on local Postgres (credentials in `.env`)
- Files: `/var/lib/playmint/{games,sources,covers}`
- Backups: `/usr/local/bin/playmint-backup.sh` nightly at 03:30 → `/var/backups/playmint`

## Commands
```
pnpm build && pm2 restart playmint     # deploy
pnpm test                              # revenue unit tests
pnpm db:generate && pnpm db:migrate    # after schema changes
pnpm seed:demo                         # publish bundled demo games
pnpm admin:promote you@example.com     # make an existing account admin
```
Accounts registered with an address listed in `ADMIN_EMAILS` become admin automatically.

## Game isolation
Uploaded files are served under `/play/` with a CSP `sandbox` header (opaque origin), so game
code can never act as playmint.tr. Once `play.playmint.tr` has DNS + a certificate, enable the
commented server block in the nginx config and set `GAME_ORIGIN=https://play.playmint.tr`;
games then get a real (separate) origin and full localStorage.
