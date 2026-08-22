# PayZone staking

## Verified

- Network: Arc Testnet
- Chain ID: `5042002`
- USDC token: `0x3600000000000000000000000000000000000000`
- EURC token: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`
- USDC token decimals: `6`
- EURC token decimals: `6`
- USDC vault: `0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8`
- EURC vault: `0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC`
- USDC vault methods in the configured ABI: `deposit() payable`, `withdraw(uint256)`, `stakedBalance(address)`, `getPendingYield(address)`
- EURC vault methods in the configured ABI: `deposit(uint256)`, `withdraw(uint256)`, `stakedBalance(address)`, `getPendingYield(address)`

The application waits for deposit and withdrawal receipts, then refreshes token balances,
staked balances, and pending yield from the Arc RPC. EURC approval is checked and only
requested when the live allowance is insufficient.

## Claim status

The configured vault ABIs do not expose a verified `claim`, `claimReward`, or `claimable`
method. The repository includes source-only claim adapters that read `getPendingYield`,
subtract adapter-recorded `claimed` amounts, enforce funded reward liquidity, and transfer
the matching token after a confirmed claim transaction. The UI enables claims only when
real deployed adapter addresses are configured and their on-chain liquidity is sufficient.

- USDC claim adapter method: `claim()` after deployment
- EURC claim adapter method: `claim()` after deployment
- USDC reward formula: REQUIRES USER INPUT unless verified in deployed vault source
- EURC reward formula: REQUIRES USER INPUT unless verified in deployed vault source
- Reward funding/accounting semantics: REQUIRES USER INPUT

No separate reward token, localStorage reward state, memo claim, or frontend-only claim state
is used.

## Swap

- Router: `0xB92428D440c335546b69138F7fAF689F5ba8D436`
- Factory: `0x7cC023C7184810B84657D55c1943eBfF8603B72B`
- USDC/EURC pair: `0x01bbfB0367F9508b2955968497052f861C3463Fc`
- Pair order: USDC, then EURC
- Method: `swapExactTokensForTokens`
- Approval spender: configured router
- Quote: live `getAmountsOut`
- Slippage: existing user-configurable PayZone setting
- Deadline: existing router deadline

The application validates router/factory and pair token ordering, reads live token balances,
checks allowance, waits for approval receipts, waits for swap receipts, and refreshes balances.

## Deployment

The adapters are not deployed in this environment. Solidity compiler/toolchain, compiled
artifacts, deployer key, and reward funding are unavailable. Deployment is blocked until
these are supplied.

```text
node scripts/deploy-claim-adapters.mjs
```

Required environment variables include `ARC_DEPLOYER_PRIVATE_KEY`, compiled artifact paths,
the existing vault/token addresses, and then frontend configuration:
`NEXT_PUBLIC_USDC_CLAIM_ADAPTER_ADDRESS` and `NEXT_PUBLIC_EURC_CLAIM_ADAPTER_ADDRESS`.

After deployment, approve each adapter for its matching token and call `fundRewards(amount)`.
Claims remain disabled until the adapters are both deployed and funded.

### REQUIRES USER INPUT BEFORE DEPLOYMENT

1. Solidity compiler/toolchain and compiled artifacts.
2. Deployer private key entered locally in `.env`.
3. Verified reward-token funding amounts for USDC and EURC.
4. Deployed adapter addresses.
5. Confirmation that the existing vault pending-yield units match the reward-token units.

## Validation

```text
npm run typecheck
npm run lint
npm run build
```

A wallet transaction test requires a user-controlled Arc Testnet wallet and is not run
automatically by the project validation commands.
