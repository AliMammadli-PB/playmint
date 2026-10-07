# Curated open-source collection

26 real browser games by **mashukui**, imported from `https://github.com/mashukui/web-games` at revision `38094525ad727f40e3bbc7cfc91eb6dcbe042f11`. MIT copyright and license text stay in every runtime copy. The manifest records each source URL and original author. Playmint Open Source is the hosting curator, not the original author.

Categories: arcade, puzzle, strategy, casual, platformer, shooter, action, sports. No invented engagement metrics, payments or revenue; all imports begin with zero plays/likes and are free.

Prepare a pinned checkout with `python3 catalogue/open-source/prepare.py <upstream-checkout> <prepared-directory>`. Browser screenshots from actual gameplay must be placed at `<prepared-directory>/covers/<key>.png`. The import uses `PLAYMINT_IMPORT_PREPARED=<prepared-directory> pnpm exec tsx --conditions=react-server --env-file=.env scripts/import-open-source.ts stage`, then `scan` and `approve`. Never expose `.env`.

The small shared bundle includes the selected games, shared i18n layer, LICENSE and NOTICE.txt. Runtime file timestamps are normalized; an actual VirusTotal result for this complete bundle may be reused only after repacking and verifying the exact SHA-256 of each version. The normal `approveVersion` function enforces clean scan, real cover, authenticated admin reviewer identity and source cleanup. No scan result is synthesized. Each game has its own ID, entry, version and catalogue metadata. Approved versions retain runtime files only.

Hosting changes: upstream analytics disabled, unrelated promotional link removed, catalogue navigation updated, viewport zoom enabled, and guarded score storage added for opaque iframe compatibility. In opaque mode, scores persist for the current game document only; native storage is used when permitted on a separate game origin. Original game menus support eight upstream languages, including English; Turkish and Azerbaijani catalogue descriptions do not imply those in-game translations.

A second candidate, `jakesgordon/javascript-racer`, was excluded because its README identifies non-original placeholder sprites and separately licensed music. It is not published.
