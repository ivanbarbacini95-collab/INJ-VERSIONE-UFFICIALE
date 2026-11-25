# Smart Compound — testnet only

This preview is not a deployed automation service. No production keys or signatures are accepted by INJ Node. Use two **disposable testnet-only** accounts, never the mainnet Ledger seed. Browser checks are read-only; the optional Node runner sends one transaction only if explicitly requested. The CLI and the actual signature path have not been integration-tested.

1. Install the official injectived CLI and Node 20+. Check `injectived tx authz grant --help` and `injectived tx authz exec --help` against your installed version. Create two testnet-only accounts in its local keyring. Fund both with testnet INJ using https://testnet.faucet.injective.network/ . Stake test INJ to a bonded testnet validator using https://testnet.hub.injective.network/ . Wait for rewards.
2. Set GRANTER, GRANTEE, VALIDATOR to the actual testnet addresses, and EXPIRY to a Unix timestamp within the next hour. Use a separate operator keyring. Review each grant in the signing device; the following are CLI examples, not verified Ledger signing instructions:
```sh
injectived tx authz grant "$GRANTEE" generic --msg-type=/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward --expiration "$EXPIRY" --from "$GRANTER" --chain-id injective-888 --node https://testnet.sentry.tm.injective.network:443
injectived tx authz grant "$GRANTEE" delegate --allowed-validators "$VALIDATOR" --spend-limit 10000000000000000inj --expiration "$EXPIRY" --from "$GRANTER" --chain-id injective-888 --node https://testnet.sentry.tm.injective.network:443
```
Set suitable testnet gas/fees as required by the CLI, check successful inclusion before continuing. The generic withdrawal grant covers reward withdrawals across validators; only the staking grant is restricted to one validator. A grant permits using existing liquid balance, not just rewards, so even the 99% buffer is not a consensus-level guarantee. Do not deploy to mainnet without independent review and atomicity/concurrency tests.
3. In the repository directory, run the read-only preview:
```sh
node smart-compound-testnet.mjs "$GRANTER" "$GRANTEE" "$VALIDATOR" 0.0001
```
The fourth argument is the hard fee cap in INJ; it is illustrative, not a measured fee. If eligible, and after verifying the chain, amount, fee and permissions, append `--broadcast-testnet` to execute a single atomic MsgExec with claim and delegate. The operator pays the fee. The script rejects stale chain status, mismatched withdrawal address, insufficient or broad staking grants, unbonded/jailed validators, and uneconomic cycles. It does not retry a transaction with unknown outcome. Check transaction hash and code on the testnet explorer before any further attempt.
4. Revoke both grants from the granter after the test:
```sh
injectived tx authz revoke "$GRANTEE" /cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward --from "$GRANTER" --chain-id injective-888 --node https://testnet.sentry.tm.injective.network:443
injectived tx authz revoke "$GRANTEE" /cosmos.staking.v1beta1.MsgDelegate --from "$GRANTER" --chain-id injective-888 --node https://testnet.sentry.tm.injective.network:443
```
Do not use production wallets. A 30-minute server scheduler, secret-management policy, Ledger signing test, fee simulation and mainnet release gate remain outstanding.
