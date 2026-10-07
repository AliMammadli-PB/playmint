# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players open Playmint in a browser to find and play independent games without creating an account. Developers sign up to upload a game, set that game's own subscription, and configure its ads. Admins review every upload before it can be public. Inferred from the shipped product and README; not re-confirmed in a separate interview.

## Product Purpose

Playmint is a browser-game marketplace. A visitor can play a published game immediately. A developer can publish an HTML, CSS, and JavaScript game and charge for that game alone. Success is a published, playable game that reached players without a download, and a developer who can see their own games, subscribers, and earnings.

## Positioning

Each game carries its own optional monthly price and benefits. There is no Playmint-wide Premium plan and no site pricing page. Players do not need an account to play free games.

## Operating Context

The public site is https://playmint.tr in Turkish, Azerbaijani, and English. Players browse and play in the browser. Developers work in Studio: upload a ZIP, wait for review, then manage that game's page, subscription, ads, and earnings. Admins use the private studio review queue. The app runs on this VPS behind nginx and Cloudflare.

## Capabilities and Constraints

- Free, published games are playable without an account. Demo fixtures stay unlisted.
- A game becomes public only after an admin approves its live version.
- Registration creates a player or a developer. Admin is not a signup role.
- Production payments are not connected. Visitors see payment as unavailable. Only a game's owner or an admin can run a no-charge plan test.
- Rewarded ads are not live until a provider adapter is configured. The browser cannot invent revenue.
- Confirmed net rewarded-ad revenue splits 50% to the developer and 50% to Playmint. Odd cents stay with the platform.
- A game's subscription payments belong to that game's developer after reported payment fees. Whether Playmint takes a subscription commission is undecided.
- Settlement currency is USD. Test payments stay out of finance and payouts.
- Legacy subscriptions remain for audit and do not unlock other games.

## Brand Commitments

The product name is Playmint. Interface copy addresses the reader directly, in Turkish, Azerbaijani, and English.

## Evidence on Hand

Product behavior is the running Next.js app and its README. Brand images live under `public/brand/`. There are no customer testimonials, press quotes, or usage benchmarks in the repository. Do not invent them.

## Product Principles

- A published game should be playable without an account or a download.
- A developer owns their game, its price, and its audience.
- Nothing unfinished or unreviewed is presented as public.
- A payment or reward that did not happen is never shown as if it did.
- An empty catalogue says so, instead of filling itself with fake games.
