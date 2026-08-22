# AUDC Controlled Staking

## Status

The repository now contains a project-owned multi-asset staking system. It does not use the external USDC/EURC vault `getPendingYield()` behavior.

The system is deployed on Arc Testnet. No USDC or EURC principal was transferred.

## Deployment

- Network: Arc Testnet
- Chain ID: `5042002`
- Owner: `0x20EB9790C5dfc744103f8F870236493514C295D1`
- AUDC: `0x3d28BA614DFf368BDfaA587ae7D7FcDF4934A406`
- AUDC deployment TX: `0xa124426591a6087358aaeca88dcb78ee0391914a0524a88260407836707c8bcb`
- AUDCStaking: `0x4715262e64AA5E16851498cD5CaB5aE1f9C8366d`
- AUDCStaking deployment TX: `0x8510fde510e9397b97b0aa5fb4a007f5630be0fe431f89b05d677af3187bf31d`
- USDC: `0x3600000000000000000000000000000000000000`
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`
- AUDC decimals: `18`
- USDC/EURC decimals: `6`
- USDC reward rate: `0.00000001 AUDC per whole USDC per second`
- EURC reward rate: `0.00000001 AUDC per whole EURC per second`
- Initial AUDC supply: `1,000,000 AUDC`
- AUDC reward pool: `100,000 AUDC`
- AUDC funding TX: `0x2f00d40d293df3567350f253faad2cdf80ea560f8a01290adb3272b42bda1dd5`

Pool initialization transactions are recorded in `deployments/audc-staking.json`.

## Contracts

- `contracts/AUDC.sol`: 18-decimal ERC-20 reward token with fixed initial supply.
- `contracts/AUDCStaking.sol`: USDC/EURC pools with AUDC rewards.

Addresses are written to `deployments/audc-staking.json` by the deployment script after a successful deployment. Frontend variables are:

```env
NEXT_PUBLIC_AUDC_TOKEN_ADDRESS=
NEXT_PUBLIC_AUDC_STAKING_ADDRESS=
```

## Accounting Model

For each pool, `rewardRate` is AUDC base units paid per second for one whole staking token. With 6-decimal USDC/EURC and 18-decimal AUDC:

```text
rewardPerToken += elapsedSeconds * rewardRate * 1e18 / 1e6
userReward = userAmount * (rewardPerToken - userRewardPerTokenPaid) / 1e18
```

All values are integer base units. There is no floating-point arithmetic or implicit 18-decimal assumption for staking tokens.

Each user has:

- staked amount
- reward-per-token checkpoint
- accrued AUDC reward
- first-stake timestamp

Pool state exposes staking token, token decimals, reward rate, total staked, last update timestamp, accumulator, and active status.

## Security Properties

- OpenZeppelin `SafeERC20`, `Ownable`, `Pausable`, and `ReentrancyGuard`.
- Owner-only reward funding and rate changes.
- Claims revert when AUDC liquidity is insufficient.
- User principal tokens cannot be recovered by the owner.
- AUDC cannot be recovered by the owner through the generic recovery function.
- Pausing blocks new stakes and claims but leaves normal withdrawals and emergency principal withdrawals available.
- Emergency withdrawal forfeits accrued rewards explicitly and returns principal only.

## Deployment

Compile and test locally:

```bash
npm run contracts:compile
npm run contracts:test
```

Configure these locally without committing `.env.local`:

```env
AUDC_INITIAL_SUPPLY=1000000
AUDC_USDC_REWARD_RATE=0.00000001
AUDC_EURC_REWARD_RATE=0.00000001
AUDC_REWARD_FUNDING=100000
```

The testnet rate is `1e10` AUDC base units per whole staking token per second (`1e-8` human AUDC). It is below the contract's `1e15` base-unit ceiling. A 100,000 AUDC pool covers approximately three years at 1,000 total staked tokens per pool.

Then run:

```bash
node scripts/deploy-audc-staking.mjs
```

The script validates Arc Testnet chain ID `5042002`, deployer gas, USDC/EURC contract code, and both token decimals before deployment. It never prints the private key and never transfers USDC/EURC.

`AUDC_REWARD_FUNDING` may be set to an explicit AUDC amount for project-owned reward-pool funding. It defaults to zero and does not move any user principal.

## Remaining Manual Actions

1. Choose and configure the intended reward rates and AUDC initial supply.
2. Deploy the AUDC token and staking contract.
3. Configure the resulting public addresses in `.env.local`.
4. Fund the AUDC reward pool explicitly if claims are required.
5. Perform any USDC/EURC staking test only with explicit testnet-user authorization.
