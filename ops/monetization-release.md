# Monetization release gates

Owner decision: no payment provider yet; production checkout stays disabled. Game plans accept USD and TRY but do not charge. Owner/admin tests remain mock and excluded from finance. A bank-confirmed TRY advertising ledger remains the only source of withdrawable income.

## SDK contract

Public API: `Playmint.init({pause,resume})`, `requestReward(placement) -> Promise<{completed,reason}>`, `gameBreak()`, `purchases.available=false`. A provider may grant a gameplay reward only on a verified completed view; no-fill, cancellation, timeout and errors resume gameplay and never grant reward. SDK callbacks never credit money. Google H5 uses `adBreak`; the signed provider endpoint requires timestamp/HMAC and idempotent provider event IDs. Additional providers must implement the same lifecycle and result contract before being enabled. No alternate provider is currently connected.

## Required before advertising launch

Google H5 approval; separate HTTPS game hostname and DNS/TLS; per-game provider channel mapping; approved consent/CMP configuration and legal policies; provider policy review; no fabricated 5-second video or forced rewarded view. Use Google test mode first, then a small opted-in set of games. Bank receipts and report allocations must be manually verified before confirmation. Provider reports may use USD/TRY, but payout amounts are based on actually received TRY, not invented FX conversion.

## Required before payment launch

Selected provider and eligible operator account; credentials securely provisioned; approved operator identity/country; checkout/recurring subscription/cancel/webhook/refund/chargeback contracts; idempotency and signed webhooks; precise provider fees and subscription commission decision; explicit currency conversion policy if needed; sandbox replay/duplicate/late event tests; consented and tightly capped production pilot. None of those operations should be called live merely to complete this checklist.

## Existing accounting safeguards

Confirmed receipts split 50/50 in integer kuruş. Settlement bank references are unique. Drafts are invisible in developer balances. Withdrawal requests reserve available balance under transaction locks. Minimum is 1,000 TRY; TR IBAN only. Paid withdrawals require a bank reference. Rejected requests release reserves. Mock subscriptions and browser messages do not create balances.
