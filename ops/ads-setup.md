# Playmint H5 activation

The publisher verification script is already in the public document head:
`ca-pub-7307363660550938`. Live game ads remain disabled until H5 approval.

## Separate game origin

1. Create `games.playmint.tr` DNS pointing to the same origin as Playmint.
2. Provision a TLS certificate covering that exact hostname.
3. Install `ops/nginx-games.conf` with the actual certificate paths, run
   `nginx -t`, then reload nginx.
4. Set `GAME_ORIGIN=https://games.playmint.tr` in the existing private `.env`.
5. Verify an approved game plays, cannot read `playmint.tr` cookies or parent DOM,
   persists its own saves, and that main-site `/game-runtime/...` returns 404.

The dedicated handler permits same-origin storage only on the game hostname.
The current `/play` fallback keeps its opaque sandbox.

## Google activation

- Wait for Google H5/site approval and configure Google-required consent/age
  treatment in the publisher account before serving live game ads.
- Create custom channels in AdSense, one per game, and enter their IDs on the
  admin **Ad revenue** page. Placement names are not revenue channel IDs.
- Developers opt into ads per game. Midgame/rewarded placements need
  `Playmint.init({pause,resume})`; without it they fail closed.
- After successful provider test-ad validation, set `H5_ADS_APPROVED=true` and
  restart Playmint. Both the flag and GAME_ORIGIN are required; unknown channel
  games stay disabled. Preview builds never serve live ads.
- SDK callbacks grant gameplay rewards only; they cannot mint monetary balances.

## Revenue reports and bank receipts

Until report API OAuth is connected, export Google's custom-channel earnings
report and enter normalized CSV:

```csv
channel_id,amount
123456,125.40
234567,87.20
```

Use one currency throughout the provider report. The admin also records the
actual net TRY received, its bank reference, receipt date and covered closed
period. Drafts are invisible to developers. Confirmation releases a 50% creator
pool allocated by reported game proportions. The remainder is Playmint's 50%
pool; integer kuruş rounding conserves the received total. A unique bank
reference prevents reconciling the same transfer twice.

Optional Google read-only reporting:
`GOOGLE_ADSENSE_ACCOUNT_ID=pub-7307363660550938`,
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REFRESH_TOKEN` with adsense.readonly access. Keep credentials in
private `.env`; never put them in frontend config. Admin-only
`GET /api/admin/ad-report?period=YYYY-MM` returns normalized CSV for review.
This API reports estimates; it never credits a developer automatically.

Withdrawals require a valid TR IBAN, account holder and at least 100000 kuruş.
Requests reserve available credit atomically. The admin transfers funds through
its bank, then records a reference and marks the request paid. Rejections require
a reason and release the reservation. Purchases/gems remain unavailable.
