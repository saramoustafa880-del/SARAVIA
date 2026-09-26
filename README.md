# SARAVIA Testnet

This branch is the Pi Testnet build for https://saravia2.netlify.app on the Netlify site saravia2. It is intentionally isolated from Mainnet.

## Deployment contract

- **Branch:** Testnet
- **Publish directory:** public
- **Functions directory:** netlify/functions
- **Node:** 20
- **Pi SDK:** https://sdk.minepi.com/pi-sdk.js, initialized with sandbox: true
- **Network guard:** every server function requires PI_NETWORK=testnet

Create a separate Pi Developer Portal app named SARAVIA Testnet on Pi Testnet. Set its production URL to https://saravia2.netlify.app and place the portal validation value in public/validation-key.txt. Do not reuse a Mainnet app, wallet, API key, or domain for this site.

## Netlify environment

Set these variables on saravia2 only. Never commit their values:

PI_NETWORK=testnet
PI_API_KEY=<TESTNET_APP_API_KEY>
PI_APP_ID=<TESTNET_APP_ID>
PI_APP_WALLET_PRIVATE_SEED=<TESTNET_APP_WALLET_SEED>

The wallet seed is used only inside pi-get-pi.js; it is never returned to the browser. Fund the Testnet app wallet from the Pi Testnet faucet before testing A2U payouts.

## Shipped flows

- Pi-only login with username, payments, and wallet_address scopes.
- Server verification through GET https://api.minepi.com/v2/me before a session record is written.
- One-time 0.1 Test-Pi Get Pi payout using the official pi-backend A2U sequence: create, submit, then complete.
- Netlify Blobs records for verified sessions and claim state, so deploys do not reset eligibility.
- 0.1 Test-Pi user-to-app support payments with server approval and completion.
- Incomplete-payment recovery: complete an existing transaction on the next login, or offer cancellation when no transaction exists.
- Cancelled payments never unlock the supporter mark.

## Acceptance checks in Pi Browser

1. The black/yellow Testnet bar is visible.
2. Outside Pi Browser, sign-in explains that Pi Browser is required.
3. Pi login requests all three required scopes and the verified username appears.
4. A pioneer wallet and the app wallet both have Test-Pi from the faucet.
5. Get Pi succeeds once; a second attempt is rejected.
6. Support approval and completion unlock the supporter mark only after Pi confirms completion.
7. An incomplete payment is recovered or cancelled on the next login.
8. No Mainnet key or wallet is present in the saravia2 environment.
9. This build contains no email, Google, Apple, or Stripe login.

Do not merge this branch into Mainnet until the Testnet checklist passes. Mainnet requires a separate URL, Developer Portal app, wallet, API key, and sandbox: false build.
