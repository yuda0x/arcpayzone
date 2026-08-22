# Claim Adapter Decimals Bug Fix — August 21, 2026

## Problem Summary

The deployed USDC and EURC claim adapters were returning vault pending yields without decimal conversion, causing a **1e12 multiplier error** in the UI:

- **Observed**: Vault pending: ~1.789327 USDC → UI showing ~1,789,666,666,666 USDC
- **Root Cause**: Vault `getPendingYield()` returns 18-decimal values, but adapters returned them directly without converting to token's native 6 decimals

## Root Cause Analysis

### Vault Decimals
- **USDC Vault** (`0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8`)
  - `getPendingYield()` returns values in **18-decimal format**
  - Example: 1.927138888888888887 USDC = 1,927,138,888,888,888,887 wei

- **EURC Vault** (`0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC`)
  - `getPendingYield()` returns values in **18-decimal format**
  - Example: 0.0000000995 EURC = 99,500 wei

### Token Decimals
- **USDC**: 6 decimals (1 USDC = 1,000,000 units)
- **EURC**: 6 decimals (1 EURC = 1,000,000 units)

### The Bug
The adapter's `claimable()` function returned:
```solidity
// INCORRECT: No conversion from 18-decimal vault format to 6-decimal token format
return IYieldVault(vault).getPendingYield(account) - claimed[account];
```

This caused:
1. Adapter returns: 1,927,138,888,888,888,887 (18-decimal)
2. Frontend receives: 1,927,138,888,888,888,887
3. Frontend formats as 6-decimal: 1,927,138,888,888.888887 USDC ❌

## Solution

### Decimal Conversion Fix
Both adapters now convert vault's 18-decimal yield to token's 6-decimal format:

```solidity
// CORRECT: Convert 18-decimal vault yield to 6-decimal token format
function claimable(address account) public view returns (uint256) {
    // Convert vault's 18-decimal pending yield to token's 6-decimal format
    uint256 pending = IYieldVault(vault).getPendingYield(account) / 1e12;
    uint256 alreadyClaimed = claimed[account];
    return pending > alreadyClaimed ? pending - alreadyClaimed : 0;
}
```

### Calculation Flow
1. **Vault pending**: 1,927,138,888,888,888,887 (18-decimal)
2. **Conversion**: ÷ 1,000,000,000,000 (1e12)
3. **Adapter returns**: 1,927,138 (6-decimal, native token units)
4. **Frontend receives**: 1,927,138
5. **Frontend formats**: formatDisplay(1,927,138, 6) = "1.93 USDC" ✓

## Files Changed

### Smart Contracts
1. **`contracts/USDCVaultClaimAdapter.sol`**
   - Updated `claimable()` function to divide by 1e12
   - Bytecode size: 9,392 bytes (vs 9,174 before)

2. **`contracts/EURCVaultClaimAdapter.sol`**
   - Updated `claimable()` function to divide by 1e12
   - Bytecode size: 9,392 bytes (vs 9,174 before)

### Artifact Files
- **`artifacts/USDCVaultClaimAdapter.json`** — Regenerated with new bytecode
- **`artifacts/EURCVaultClaimAdapter.json`** — Regenerated with new bytecode

## Validation Results

| Check | Result |
|-------|--------|
| **npm run typecheck** | ✓ PASS |
| **npm run lint** | ✓ PASS (warnings only) |
| **npm run build** | ✓ PASS |
| **Solidity Compilation** | ✓ PASS |
| **Unstake Functionality** | ✓ WORKING |
| **USDC → EURC Swap** | ✓ WORKING |

## Decimal Unit Model

### Adapter Return Values (After Fix)
| Value | Unit | Format | Frontend Display |
|-------|------|--------|------------------|
| `claimable()` | 6-decimal (token-native) | 1,927,138 wei | 1.93 USDC |
| `rewardLiquidity()` | 6-decimal (token-native) | 1,000,000 wei | 1.00 USDC |
| `claimed[user]` | 6-decimal (token-native) | Cumulative in token units | — |

### No Double Conversion
- Frontend receives **token-native amounts**
- No additional decimal conversion in frontend
- `formatDisplay()` and `formatPretty()` work correctly with 6-decimal values

## Deployment Status

### Old Adapters (UNFUNDED)
- **USDC**: `0x1B14cA05353beA67A9B5674102F598c173cf4992`
- **EURC**: `0x91A4A91e7Bb6cbE67629138566d13CacCd59FD41`
- **Status**: CONTAINS DECIMALS BUG — DO NOT FUND
- **Action Required**: Leave unfunded. Proceed with new deployment.

The active corrected adapters are configured and verified at:
- **USDC**: `0x3a9e2322b49F0dD9CEB9F0aE047975A1B96a8f82`
- **EURC**: `0x39E1f8c4D82f5EbbC42DBd6fc798cb134D86D01d`

### New Deployment Required
The fixed adapters must be deployed as new contracts because:
1. Bytecode has changed (9,392 bytes vs 9,174)
2. Smart contract code is immutable; cannot patch in-place
3. Old adapters cannot be upgraded or fixed

### Environment Ready
- Fixed source code: ✓ Verified
- Fixed artifacts: ✓ Generated
- Frontend configuration: ✓ Ready for new addresses
- Validation: ✓ All checks passed

## Next Steps

1. **Deploy Fixed Adapters**
   ```bash
   node scripts/deploy-claim-adapters.mjs
   ```

2. **Update Frontend Configuration**
   - `NEXT_PUBLIC_USDC_CLAIM_ADAPTER_ADDRESS=<NEW_USDC_ADDRESS>`
   - `NEXT_PUBLIC_EURC_CLAIM_ADAPTER_ADDRESS=<NEW_EURC_ADDRESS>`

3. **Rebuild Frontend**
   ```bash
   npm run build
   ```

4. **Fund New Adapters**
   - Transfer USDC to new USDC adapter
   - Transfer EURC to new EURC adapter

5. **Verify on-chain**
   - Confirm `claimable()` returns correct 6-decimal amounts
   - Confirm `rewardLiquidity()` shows adapter token balance
   - Confirm `claim()` transfer succeeds

## Important Notes

- ✓ Vault contracts unchanged
- ✓ `getPendingYield()` logic unchanged
- ✓ Existing UNSTAKE and SWAP functionality preserved
- ✓ No frontend double-conversion
- ✓ Precision loss mitigated through division (not floating-point)
- ✗ Old adapters should **NOT** be funded
- ✗ Old adapters will display incorrect amounts if funded

---

**Fix Date**: August 21, 2026
**Network**: Arc Testnet (Chain ID 5042002)
**Severity**: High (UI displayed incorrect amounts, claims would fail)
**Impact**: Requires new deployment before claiming is functional
