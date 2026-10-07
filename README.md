# Playmint

Browser-game marketplace: visitors discover and play free games without signing in;
developers upload HTML/CSS/JS game ZIPs for manual admin approval.
Each game has its own optional monthly subscription price and benefits, set by its developer.
There is no Playmint Premium plan or site pricing page.

## Revenue
- Verified net rewarded-ad revenue: 50% developer, 50% Playmint, attributed to the actual game.
- Odd cents go to the platform so ledger totals remain exact.
- Game subscription payments belong to their game's developer after reported payment fees.
  No subscription platform commission is configured; that decision remains open.
- Settlement currency currently USD. Test payments are excluded from finance and payouts.
- Legacy subscriptions are preserved for audit but do not grant access to other games.
- Monthly draft/final ledger and existing payout hold/minimum controls are retained.

## Current integrations
Production payments are not connected. Only a game's owner/admin can run an explicit
no-charge plan test. Visitors see payment unavailable rather than a fake purchase.

Rewarded ads are unavailable until a provider adapter implementing the protocol below is
configured. The browser cannot mint revenue or claim completion itself.

Developer SDK: `https://playmint.tr/playmint-sdk.js`
`await Playmint.requestReward("revive")` returns `{completed, reason}`.
Grant HP, revive, coins etc. only when `completed === true`.

Provider configuration (server environment):
- `AD_PROVIDER_URL`: HTTPS endpoint receiving POST {requestId, gameId, placement, currency, callbackUrl}.
- `AD_PROVIDER_KEY`: bearer credential used by the host's server.
- `AD_ALLOWED_ORIGINS`: comma-separated allowlist for the returned ad URL origin.
- `AD_WEBHOOK_SECRET`: independent secret for signed completion callbacks.
The provider returns {url} for an ad in a sandboxed iframe.
It POSTs {requestId,eventId,completed:true,netCents,currency} to `/api/ads/callback`.
Sign exact bytes with HMAC-SHA256 over `timestamp + "." + body`; send lowercase hex in
`x-ad-signature`, epoch seconds in `x-ad-timestamp`. Replay window five minutes;
event ID unique and completion idempotent. The event must be pending and <15 minutes old.
A provider-specific adapter is needed to translate real network callbacks to this protocol.
Parent validates iframe source and binds requests to signed play sessions and their user/visitor.
Closing or failing an ad does not produce a reward; browser polls server verification.

## Administration
`/tr/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4` (also `/en/` and `/az/`). Old `/admin` routes do not exist.
Email/password login and server-checked admin role are required on pages and all actions.
The first administrator can claim a 24-hour, one-use setup link: the server stores only its
SHA256 hash, requires a signed-in account, checks no admin exists, and consumes it atomically.
Emails alone no longer automatically grant admin: promote an existing verified owner account
with `pnpm admin:promote owner@example.com` on the server.
ZIP reports detect unsafe paths, symlinks, limits, executable types, suspicious source patterns
and external hosts. They are static review aids, not antivirus certification. Large/binary files
are flagged for manual inspection. Admin approval is required for each upload/update.

## Commands
`pnpm build && pm2 restart playmint` deploys to the existing nginx/Cloudflare host.
`pnpm test` verifies money splits, callback signatures and hostile ZIP uploads.
`node --env-file=.env node_modules/drizzle-kit/bin.cjs migrate` applies database migrations.
Existing database, game files, sessions, and deployment architecture are preserved.

## Public catalogue
Light Playables-style browsing with compact cards and category filters. Only non-demo games
with a published, approved and reviewed live version appear in catalogue, creator profiles,
counts, favorites or play history. Bundled fixtures are marked is_demo and unlisted; the seed
script prepares internal pending fixtures without automatically approving or publishing them.
Visitors cannot open demo game pages, start their play sessions or download their source ZIPs.
Admins/developers can still review their files. No public games means an honest empty state.

## Accounts and creator workspace
Registration asks for player/developer role, name, unique username, email, password and
password confirmation. Only player/developer roles are accepted server-side. Developer
profiles are created atomically with signup; players land in the public catalogue.
Creators can open Studio with independent overview, games, analytics, game subscriptions,
subscribers, earnings, ads, profile/payout settings and account security routes. Player
accounts have independent home, library, subscriptions and account settings routes.
Subscriber lists are scoped to owned games, with test records hidden by default. Analytics
use real recorded sessions with game and date filters and period-unique player counts.
The first-upload wizard collects metadata, cover and ZIP. The server generates the slug and safe defaults;
ZIP checks and admin approval remain mandatory. License defaults to Developer (no implicit
open-source grant). Source material is private during review and removed after approval.
Profile, category, cover, licensing and prices remain editable after upload. Password
changes require the current password and confirmation and revoke other sessions.

## Project ZIP uploads
Accepts plain HTML games and full Node.js/Vite/TypeScript projects. A ready dist/, build/
or out/ entry takes priority over source index.html. Dependencies, VCS, test output, raw
assets and old release archives are skipped; node_modules symlinks are ignored, while
symlinks in retained code and unsafe paths are rejected. Retained source is stored under
DATA_DIR/projects privately; only selected browser output is copied to the game mount.
Known root-relative bundle assets are rebased for the version URL. Public game assets
have CORS headers so modules can load within the strict opaque-origin sandbox.
Projects with only package.json + source are accepted as pending frontend-source/node-source
submissions. Their code is never executed on the host; approval is disabled until a
playable output/runtime is prepared. A dedicated Node backend runner is not implemented.
The admin and owner can inspect source through an authenticated text-only file viewer.
Original project ZIPs retain the uploader's original archive; source-only projects must
be reviewed before any build/runtime preparation. File limits still apply to ZIP size;
the upload error explains oversized archives rather than presenting a generic failure.

## Large, automatic ZIP preparation
The uploader transfers archives in 8 MiB chunks (up to 2 GiB). Each chunk streams to a
private disk file with ownership checks, strict byte counts and idempotent retries. It
never submits the whole archive as a giant multipart request. Finalization queues a
file-backed preparation job, then polls progress; Next after() runs the work after the
response. Persistent job records permit recovery on a later authenticated status poll
after a server restart. Partial upload slots are canceled on failure, with expired
records cleaned on subsequent uploads. No more than two active uploads per account.
Archive scan is bounded at 250,000 entries; retained game/review files at 10,000 files
and 512 MiB. Node_modules and known generated junk are skipped. Nested dist/build/out
exports are detected; irrelevant unsupported files outside selected output are skipped
with review warnings. Unsafe paths and executables inside playable output still fail.
The original archive is retained privately for project review. Source-only Node.js
projects still require a prepared runtime before publication; no arbitrary code is run
on the host. Automatic preparation does not bypass manual publication approval.

## Arcade / Studio redesign

Branch: `redesign/arcade-studio-20261007`. Arcade is dark; developer Studio and admin use the related light palette. Semantic tokens and responsive rules live in `src/app/globals.css`, with their contract in `DESIGN.md`. SVG flags are local assets; no `flag-icons` package is needed. Dependencies at every nesting level are ignored by Git.

The upload wizard requests game details, category, mobile/fullscreen capability, cover and ZIP, then shows a review step. Archives up to the configured 2 GiB limit transfer in 8 MiB chunks. Selected playable output is capped at 512 MiB and 10,000 files. Upload completion alone never publishes a game. Every version needs admin approval. After approval original source/project material is deleted permanently; only playable output remains. Keep your own backups. Licensing does not imply public source downloads after cleanup. Terms, privacy, developer, copyright and refund pages are explicitly drafts until operator details are confirmed. Contact submissions are saved in the admin request queue, without claiming automatic email delivery.

Checkout remains disabled by owner instruction. Game plans accept USD or TRY; neither currency creates a charge while checkout is disabled. H5 approval, separate runtime DNS/TLS, Google channel mapping and advertising consent are launch prerequisites. Ad SDK rewards never imply a financial credit; only confirmed received bank income creates withdrawable TRY balances. No exchange rate, subscription commission, refund timing or provider policy is invented.

Validation: `pnpm test` and `pnpm test:e2e`. Playwright includes mobile immersive exit with preserved iframe, localized SVG flags/query preservation, responsive catalogue checks and serious/critical axe accessibility checks. Set `PLAYMINT_TEST_ORIGIN` for a test host and `PLAYMINT_CHROMIUM_PATH` for an installed browser. Financial tests must use private test accounts and never real bank references.

Build into a fresh release directory with `PLAYMINT_BUILD_DIR=.next-<release> pnpm build`, verify the release, then restart PM2 with that same environment value. Never rebuild the directory currently serving production. Retain the preceding release directory for rollback.

## Free user subscriptions

`/people` discovers players and creators; `/u/<username-or-handle>` shows public profiles and subscriber counts. `/me/community` lists subscribers and followed users with pagination. These are free social relationships in `user_follows`, entirely separate from paid game subscriptions. Following cannot unlock a paid game or create revenue. The API uses authenticated actor identity, rejects self/cross-origin subscriptions, limits payload size, and serializes idempotent updates per pair. User deletion cascades relationships; blocked users are excluded from public counts/lists.

Typography is self-hosted Montserrat with a semibold body and bold headings/wordmark. Font preloading is disabled to avoid preloading unused language subsets. SVG language flags are the exact unmodified assets supplied in the approved Pocket Factory game. Language navigation preserves query/hash and uses a touch-friendly button disclosure, keeping upload state alive through soft navigation.

`pnpm test:community` uses temporary users and exercises social API/concurrency, ordinary-player profiles, unsubscribe/count refresh, monetary separation, responsive pages, Chromium/Firefox touch language selection, Montserrat and main-document Standards Mode. It cleans its test users afterward.

Google's AdSense script remains in the head as requested. The site's document uses Standards Mode; browser privacy diagnostics or Google-owned iframe/CSP/ORB messages may still vary by browser, privacy mode and ad response. We do not silence console methods or disable tracking protection to hide diagnostics.
