# Arc PayZone integration

This project keeps `arcpayzone-main` as the final app and integrates the previously supplied Nexio feature set under `/dashboard/payzone`.

## Integrated feature set
- Overview and portfolio views
- USDC / EURC wallet balances
- Send / receive / payment request flows
- QR recipient scanning
- Batch transfers
- Swap and slippage controls
- USDC/EURC liquidity pool management
- DeFi vault staking / withdrawal / same-token yield flow
- Daily GM and streak flow
- Human-readable domain registration / resolution UI
- TrustPass / identity card view
- Transaction history and ArcScan links
- Learn / Arc information section
- Light / dark theme handling scoped to the PayZone experience

## Arc source-of-truth
Use the official Arc documentation at https://docs.arc.io/ for Arc-specific network and contract information. The current official Arc Testnet docs list:
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`

The Nexio application's AMM, Daily GM, ANS, and vault contracts are application-level contracts and remain separate from Arc's core stablecoin addresses.

The official Arc Testnet RPC is `https://rpc.testnet.arc.io`.

The Arc Testnet read-only verification used by this integration returned chain ID
`5042002`, USDC decimals `6`, EURC decimals `6`, and the following live wiring:

- USDC: `0x3600000000000000000000000000000000000000`
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`
- Factory: `0x7cC023C7184810B84657D55c1943eBfF8603B72B`
- Router: `0xB92428D440c335546b69138F7fAF689F5ba8D436`
- Pair: `0x01bbfB0367F9508b2955968497052f861C3463Fc`
- Pair order: USDC, then EURC
- Swap method: `swapExactTokensForTokens`

The pair had non-zero reserves when checked. The application validates the router's
factory, pair token addresses/order, live quote, allowance, approval receipt, swap
receipt, and post-transaction balance refresh. The ERC-20 pair uses no native-ETH swap
method.

## Vault reward status

The configured USDC and EURC vault ABIs expose `deposit`, `withdraw`,
`stakedBalance`, and `getPendingYield`. They do not expose a verified `claim`,
`claimReward`, or `claimable` method. The portfolio therefore reads pending yield
directly from each vault and keeps Claim USDC / Claim EURC disabled until the
corresponding deployed vault ABI and method are verified.

No separate rewards contract is used. The same-token claim mechanism is:

- USDC stake -> USDC vault pending yield -> REQUIRES USER INPUT for verified USDC claim method
- EURC stake -> EURC vault pending yield -> REQUIRES USER INPUT for verified EURC claim method

No reward formula is invented in the frontend. If the deployed vaults cannot claim
same-token yield, a vault upgrade or replacement requires verified tokenomics, funding,
claim rules, and deployment parameters before implementation.

## Dependency additions
- `ethers` `^6.16.0`
- `@yudiel/react-qr-scanner` `^2.6.0`

Run your normal package-manager install before building. The execution environment used for this integration did not have Bun and npm dependency installation timed out, so a full production build was not executed here.
