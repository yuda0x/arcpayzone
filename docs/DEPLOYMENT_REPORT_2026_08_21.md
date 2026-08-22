# Arc PayZone Claim Adapter Deployment — August 21, 2026

> Historical report: the adapter addresses in this document are superseded deployment records. Active configuration is maintained in `.env.local` and verified by `tools/audit-payzone.cjs`.

## Deployment Summary

Both USDC and EURC yield claim adapters have been successfully deployed to **Arc Testnet** (Chain ID: 5042002).

## Deployed Contracts

### USDC Claim Adapter
- **Address**: `0x1B14cA05353beA67A9B5674102F598c173cf4992`
- **Deployment TX**: `0xc8cb851b2186d88c9cccec6e84c9ee2451451454f5563c427c83e537c299e198`
- **Block**: 58123696
- **Owner**: `0x20EB9790C5dfc744103f8F870236493514C295D1`
- **Vault**: `0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8`
- **Reward Token**: `0x3600000000000000000000000000000000000000` (USDC)
- **Bytecode**: ✓ Deployed
- **Claimable**: 1713838888888888887 wei (pending yield from vault)
- **Reward Liquidity**: 0 (NOT FUNDED)

### EURC Claim Adapter
- **Address**: `0x91A4A91e7Bb6cbE67629138566d13CacCd59FD41`
- **Deployment TX**: `0x9bd95b07a620c3d51b4514b6f2022317e2298f2a55cb1f21e788e5529c52f23f`
- **Block**: 58123707
- **Owner**: `0x20EB9790C5dfc744103f8F870236493514C295D1`
- **Vault**: `0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC`
- **Reward Token**: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (EURC)
- **Bytecode**: ✓ Deployed
- **Claimable**: 86055 wei (pending yield from vault)
- **Reward Liquidity**: 0 (NOT FUNDED)

## Frontend Configuration

The following environment variables have been configured in `.env.local`:

```env
NEXT_PUBLIC_USDC_CLAIM_ADAPTER_ADDRESS=0x1B14cA05353beA67A9B5674102F598c173cf4992
NEXT_PUBLIC_EURC_CLAIM_ADAPTER_ADDRESS=0x91A4A91e7Bb6cbE67629138566d13CacCd59FD41
```

The frontend has been rebuilt and will now:
- Display claimable amounts for both USDC and EURC
- Show reward liquidity balances
- Allow claim transactions (once funded)

## Build Status

- ✓ Solidity Compilation: PASS
- ✓ npm run typecheck: PASS
- ✓ npm run lint: PASS (warnings only)
- ✓ npm run build: PASS
- ✓ Unstake functionality: WORKING
- ✓ USDC → EURC swap: WORKING

## Funding Required

### To enable USDC claims:
1. Transfer USDC to the adapter: `0x1B14cA05353beA67A9B5674102F598c173cf4992`
2. Minimum amount required: **1.71 USDC** (to cover pending yield)
3. Use `fundRewards(amount)` function or direct transfer

### To enable EURC claims:
1. Transfer EURC to the adapter: `0x91A4A91e7Bb6cbE67629138566d13CacCd59FD41`
2. Minimum amount required: **0.000086 EURC** (to cover pending yield)
3. Use `fundRewards(amount)` function or direct transfer

## Next Steps

1. **Funding**: Transfer tokens to both adapters
2. **Verification**: Confirm adapter token balances via `balanceOf()`
3. **Testing**: Execute real claim transaction with connected wallet
4. **Monitoring**: Track claimed vs claimable amounts post-transaction

## Adapter Functions Reference

All adapters implement the following interface:

```solidity
function claimable(address account) external view returns (uint256)
function rewardLiquidity() external view returns (uint256)
function claimed(address account) external view returns (uint256)
function claim() external returns (uint256)
function fundRewards(uint256 amount) external onlyOwner
function emergencyRecover(address token, address recipient, uint256 amount) external onlyOwner
```

## Important Notes

- Both adapters compute claimable rewards from the vault's `getPendingYield()` minus `claimed[user]`
- Claims fail if adapter liquidity < claimable amount
- Reentrancy protection is enabled on all state-changing functions
- Owner is the deployer wallet and can fund/recover tokens

---

**Deployment Date**: August 21, 2026
**Network**: Arc Testnet (Chain ID 5042002)
**Deployer**: 0x20EB9790C5dfc744103f8F870236493514C295D1
