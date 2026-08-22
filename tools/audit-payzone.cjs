#!/usr/bin/env node
/**
 * Complete ArcPayZone PaymentSystem Audit Tool
 * Inspects vaults, adapters, tokens, yields, liquidity, and claim eligibility
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://rpc.testnet.arc.io';
const CHAIN_ID = 5042002;

// On-chain addresses
const USDC_VAULT = '0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8';
const EURC_VAULT = '0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC';
const USDC_ADAPTER = '0x3a9e2322b49F0dD9CEB9F0aE047975A1B96a8f82';
const EURC_ADAPTER = '0x39E1f8c4D82f5EbbC42DBd6fc798cb134D86D01d';
const USDC_TOKEN = '0x3600000000000000000000000000000000000000';
const EURC_TOKEN = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const OWNER = '0x20EB9790C5dfc744103f8F870236493514C295D1';

const VAULT_ABI = [
  'function getPendingYield(address user) view returns (uint256)',
  'function stakedBalance(address) view returns (uint256)'
];

const TOKEN_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)'
];

const ADAPTER_ABI = [
  'function owner() view returns (address)',
  'function vault() view returns (address)',
  'function rewardToken() view returns (address)',
  'function claimable(address) view returns (uint256)',
  'function claimed(address) view returns (uint256)',
  'function rewardLiquidity() view returns (uint256)',
  'function claim() returns (uint256)'
];

async function readWithRetry(label, read) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${label}: ${lastError?.message || 'read failed'}`);
}

async function audit() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const issues = [];
  const auditBlock = await provider.getBlockNumber();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ARCPAYZONE COMPLETE SYSTEM AUDIT                     ║');
  console.log('║       Arc Testnet | Chain ID 5042002                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('Audit block:', auditBlock);

  // Verify network
  const network = await provider.getNetwork();
  if (network.chainId !== 5042002n) {
    console.error('❌ Wrong network! Expected 5042002, got', network.chainId.toString());
    process.exit(1);
  }

  // ===== VAULT ANALYSIS =====
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  VAULT ANALYSIS                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const usdcVault = new ethers.Contract(USDC_VAULT, VAULT_ABI, provider);
  const eurcVault = new ethers.Contract(EURC_VAULT, VAULT_ABI, provider);

  const usdcVaultCode = await provider.getCode(USDC_VAULT);
  const eurcVaultCode = await provider.getCode(EURC_VAULT);

  console.log('USDC Vault:', USDC_VAULT);
  console.log('  Code deployed:', usdcVaultCode.length > 2 ? '✓ Yes' : '✗ No');
  console.log('  Code length:', (usdcVaultCode.length - 2) / 2, 'bytes');

  console.log('\nEURC Vault:', EURC_VAULT);
  console.log('  Code deployed:', eurcVaultCode.length > 2 ? '✓ Yes' : '✗ No');
  console.log('  Code length:', (eurcVaultCode.length - 2) / 2, 'bytes');

  // ===== TOKEN ANALYSIS =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TOKEN ANALYSIS                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const usdcToken = new ethers.Contract(USDC_TOKEN, TOKEN_ABI, provider);
  const eurcToken = new ethers.Contract(EURC_TOKEN, TOKEN_ABI, provider);

  const [usdcDecimals, eurcDecimals, usdcSymbol, eurcSymbol] = await Promise.all([
    usdcToken.decimals(),
    eurcToken.decimals(),
    usdcToken.symbol(),
    eurcToken.symbol()
  ]);

  console.log('USDC Token:', USDC_TOKEN);
  console.log('  Symbol:', usdcSymbol);
  console.log('  Decimals:', usdcDecimals.toString());
  if (Number(usdcDecimals) !== 6) issues.push(`USDC: unexpected token decimals ${usdcDecimals}`);

  console.log('\nEURC Token:', EURC_TOKEN);
  console.log('  Symbol:', eurcSymbol);
  console.log('  Decimals:', eurcDecimals.toString());
  if (Number(eurcDecimals) !== 6) issues.push(`EURC: unexpected token decimals ${eurcDecimals}`);

  // ===== ADAPTER ANALYSIS =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ADAPTER DEPLOYMENT STATUS                               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const usdcAdapterCode = await provider.getCode(USDC_ADAPTER);
  const eurcAdapterCode = await provider.getCode(EURC_ADAPTER);

  console.log('USDC Adapter:', USDC_ADAPTER);
  console.log('  Code deployed:', usdcAdapterCode.length > 2 ? '✓ Yes' : '✗ No');
  console.log('  Code length:', (usdcAdapterCode.length - 2) / 2, 'bytes');

  if (usdcAdapterCode.length > 2) {
    const usdcAdapter = new ethers.Contract(USDC_ADAPTER, ADAPTER_ABI, provider);
    const [adapterOwner, adapterVault, adapterToken] = await Promise.all([
      usdcAdapter.owner(),
      usdcAdapter.vault(),
      usdcAdapter.rewardToken()
    ]);
    console.log('  Owner:', adapterOwner);
    if (adapterOwner.toLowerCase() !== OWNER.toLowerCase()) issues.push('USDC: unexpected adapter owner');
    console.log('  Vault matches:', adapterVault.toLowerCase() === USDC_VAULT.toLowerCase() ? '✓ Yes' : '✗ No');
    console.log('  Token matches:', adapterToken.toLowerCase() === USDC_TOKEN.toLowerCase() ? '✓ Yes' : '✗ No');
    if (adapterVault.toLowerCase() !== USDC_VAULT.toLowerCase()) issues.push('USDC: adapter vault mismatch');
    if (adapterToken.toLowerCase() !== USDC_TOKEN.toLowerCase()) issues.push('USDC: adapter reward token mismatch');
  }

  console.log('\nEURC Adapter:', EURC_ADAPTER);
  console.log('  Code deployed:', eurcAdapterCode.length > 2 ? '✓ Yes' : '✗ No');
  console.log('  Code length:', (eurcAdapterCode.length - 2) / 2, 'bytes');

  if (eurcAdapterCode.length > 2) {
    const eurcAdapter = new ethers.Contract(EURC_ADAPTER, ADAPTER_ABI, provider);
    const [adapterOwner, adapterVault, adapterToken] = await Promise.all([
      eurcAdapter.owner(),
      eurcAdapter.vault(),
      eurcAdapter.rewardToken()
    ]);
    console.log('  Owner:', adapterOwner);
    if (adapterOwner.toLowerCase() !== OWNER.toLowerCase()) issues.push('EURC: unexpected adapter owner');
    console.log('  Vault matches:', adapterVault.toLowerCase() === EURC_VAULT.toLowerCase() ? '✓ Yes' : '✗ No');
    console.log('  Token matches:', adapterToken.toLowerCase() === EURC_TOKEN.toLowerCase() ? '✓ Yes' : '✗ No');
    if (adapterVault.toLowerCase() !== EURC_VAULT.toLowerCase()) issues.push('EURC: adapter vault mismatch');
    if (adapterToken.toLowerCase() !== EURC_TOKEN.toLowerCase()) issues.push('EURC: adapter reward token mismatch');
  }

  // ===== USDC CLAIM ANALYSIS =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  USDC REWARD CLAIM ANALYSIS                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const usdcAdapter = new ethers.Contract(USDC_ADAPTER, ADAPTER_ABI, provider);

  const [
    usdcVaultPending,
    usdcStaked,
    usdcAdapterLiquidity,
    usdcAdapterClaimable,
    usdcAdapterClaimed,
    usdcOwnerBalance,
    usdcAdapterBalance
  ] = await Promise.all([
    readWithRetry('USDC pending yield', () => usdcVault.getPendingYield(OWNER, { blockTag: auditBlock })),
    readWithRetry('USDC staked balance', () => usdcVault.stakedBalance(OWNER, { blockTag: auditBlock })),
    readWithRetry('USDC reward liquidity', () => usdcAdapter.rewardLiquidity({ blockTag: auditBlock })),
    readWithRetry('USDC claimable', () => usdcAdapter.claimable(OWNER, { blockTag: auditBlock })),
    readWithRetry('USDC claimed', () => usdcAdapter.claimed(OWNER, { blockTag: auditBlock })),
    readWithRetry('USDC owner balance', () => usdcToken.balanceOf(OWNER, { blockTag: auditBlock })),
    readWithRetry('USDC adapter balance', () => usdcToken.balanceOf(USDC_ADAPTER, { blockTag: auditBlock }))
  ]);

  console.log('Owner:', OWNER);
  console.log('  Staked balance:', ethers.formatUnits(usdcStaked, 18), 'USDC (18-dec)');
  console.log('  Wallet balance:', ethers.formatUnits(usdcOwnerBalance, 6), 'USDC');

  console.log('\nVault Accounting:');
  console.log('  Raw getPendingYield:', usdcVaultPending.toString());
  console.log('  As 18-decimal:', ethers.formatUnits(usdcVaultPending, 18), 'USDC');
  console.log('  As 6-decimal (÷1e12):', ethers.formatUnits(usdcVaultPending / 1000000000000n, 6), 'USDC');

  console.log('\nAdapter State:');
  console.log('  Claimable raw:', usdcAdapterClaimable.toString());
  console.log('  Claimable formatted (6-dec):', ethers.formatUnits(usdcAdapterClaimable, 6), 'USDC');
  console.log('  Already claimed:', ethers.formatUnits(usdcAdapterClaimed, 6), 'USDC');
  console.log('  Adapter token balance:', ethers.formatUnits(usdcAdapterBalance, 6), 'USDC');
  console.log('  Adapter rewardLiquidity:', ethers.formatUnits(usdcAdapterLiquidity, 6), 'USDC');
  if (usdcVaultPending / 1000000000000n !== usdcAdapterClaimable + usdcAdapterClaimed) {
    issues.push('USDC: claimable accounting does not match pending minus claimed');
  }

  const usdcCanClaim = usdcAdapterClaimable > 0n && usdcAdapterClaimable <= usdcAdapterLiquidity;
  console.log('\n✓ Claim Eligibility Check:');
  console.log('  claimable > 0:', usdcAdapterClaimable > 0n ? '✓ Yes' : '✗ No');
  console.log('  claimable <= liquidity:', usdcAdapterClaimable <= usdcAdapterLiquidity ? '✓ Yes' : '✗ No');
  console.log('  Can claim NOW:', usdcCanClaim ? '✓ YES' : '✗ NO');

  if (!usdcCanClaim) {
    if (usdcAdapterClaimable > usdcAdapterLiquidity) {
      const deficit = usdcAdapterClaimable - usdcAdapterLiquidity;
      console.log('\n  ⚠️  INSUFFICIENT LIQUIDITY');
      console.log('  Needed:', ethers.formatUnits(deficit, 6), 'more USDC');
    }
  }

  // ===== EURC CLAIM ANALYSIS =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EURC REWARD CLAIM ANALYSIS                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const eurcAdapter = new ethers.Contract(EURC_ADAPTER, ADAPTER_ABI, provider);

  const [
    eurcVaultPending,
    eurcStaked,
    eurcAdapterLiquidity,
    eurcAdapterClaimable,
    eurcAdapterClaimed,
    eurcOwnerBalance,
    eurcAdapterBalance
  ] = await Promise.all([
    readWithRetry('EURC pending yield', () => eurcVault.getPendingYield(OWNER, { blockTag: auditBlock })),
    readWithRetry('EURC staked balance', () => eurcVault.stakedBalance(OWNER, { blockTag: auditBlock })),
    readWithRetry('EURC reward liquidity', () => eurcAdapter.rewardLiquidity({ blockTag: auditBlock })),
    readWithRetry('EURC claimable', () => eurcAdapter.claimable(OWNER, { blockTag: auditBlock })),
    readWithRetry('EURC claimed', () => eurcAdapter.claimed(OWNER, { blockTag: auditBlock })),
    readWithRetry('EURC owner balance', () => eurcToken.balanceOf(OWNER, { blockTag: auditBlock })),
    readWithRetry('EURC adapter balance', () => eurcToken.balanceOf(EURC_ADAPTER, { blockTag: auditBlock }))
  ]);

  console.log('Owner:', OWNER);
  console.log('  Staked balance:', ethers.formatUnits(eurcStaked, 6), 'EURC');
  console.log('  Wallet balance:', ethers.formatUnits(eurcOwnerBalance, 6), 'EURC');

  console.log('\nVault Accounting:');
  console.log('  Raw getPendingYield:', eurcVaultPending.toString());
  console.log('  As 18-decimal:', ethers.formatUnits(eurcVaultPending, 18), 'EURC');
  console.log('  As 6-decimal (÷1e12):', ethers.formatUnits(eurcVaultPending / 1000000000000n, 6), 'EURC');

  console.log('\nAdapter State:');
  console.log('  Claimable raw:', eurcAdapterClaimable.toString());
  console.log('  Claimable formatted (6-dec):', ethers.formatUnits(eurcAdapterClaimable, 6), 'EURC');
  console.log('  Already claimed:', ethers.formatUnits(eurcAdapterClaimed, 6), 'EURC');
  console.log('  Adapter token balance:', ethers.formatUnits(eurcAdapterBalance, 6), 'EURC');
  console.log('  Adapter rewardLiquidity:', ethers.formatUnits(eurcAdapterLiquidity, 6), 'EURC');
  if (eurcVaultPending / 1000000000000n !== eurcAdapterClaimable + eurcAdapterClaimed) {
    issues.push('EURC: claimable accounting does not match pending minus claimed');
  }

  const eurcCanClaim = eurcAdapterClaimable > 0n && eurcAdapterClaimable <= eurcAdapterLiquidity;
  console.log('\n✓ Claim Eligibility Check:');
  console.log('  claimable > 0:', eurcAdapterClaimable > 0n ? '✓ Yes' : '✗ No');
  console.log('  claimable <= liquidity:', eurcAdapterClaimable <= eurcAdapterLiquidity ? '✓ Yes' : '✗ No');
  console.log('  Can claim NOW:', eurcCanClaim ? '✓ YES' : '✗ NO');

  if (!eurcCanClaim) {
    if (eurcAdapterClaimable > eurcAdapterLiquidity) {
      const deficit = eurcAdapterClaimable - eurcAdapterLiquidity;
      console.log('\n  ⚠️  INSUFFICIENT LIQUIDITY');
      console.log('  Needed:', ethers.formatUnits(deficit, 6), 'more EURC');
    } else if (eurcAdapterClaimable === 0n) {
      console.log('\n  ⚠️  NO CLAIMABLE YIELD');
      console.log('  Reason: Vault pending yield is less than 1e12 wei (rounding to 0 after ÷1e12)');
    }
  }

  // ===== FRONTEND CONFIGURATION CHECK =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FRONTEND CONFIGURATION                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const usdcAdapterMatch = envContent.match(/NEXT_PUBLIC_USDC_CLAIM_ADAPTER_ADDRESS=(\S+)/);
    const eurcAdapterMatch = envContent.match(/NEXT_PUBLIC_EURC_CLAIM_ADAPTER_ADDRESS=(\S+)/);

    if (usdcAdapterMatch) {
      const configured = usdcAdapterMatch[1].toLowerCase();
      const deployed = USDC_ADAPTER.toLowerCase();
      console.log('USDC Adapter Address:');
      console.log('  Configured:', configured);
      console.log('  Deployed:', deployed);
      console.log('  Match:', configured === deployed ? '✓ Yes' : '✗ MISMATCH');
      if (configured !== deployed) issues.push('Frontend: USDC adapter address mismatch');
    } else {
      issues.push('Frontend: USDC adapter address is not configured');
    }

    if (eurcAdapterMatch) {
      const configured = eurcAdapterMatch[1].toLowerCase();
      const deployed = EURC_ADAPTER.toLowerCase();
      console.log('\nEURC Adapter Address:');
      console.log('  Configured:', configured);
      console.log('  Deployed:', deployed);
      console.log('  Match:', configured === deployed ? '✓ Yes' : '✗ MISMATCH');
      if (configured !== deployed) issues.push('Frontend: EURC adapter address mismatch');
    } else {
      issues.push('Frontend: EURC adapter address is not configured');
    }
  } catch (err) {
    console.log('  Error reading .env.local:', err.message);
  }

  // ===== SUMMARY =====
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (!usdcCanClaim) issues.push('USDC: Insufficient adapter liquidity');
  if (!eurcCanClaim && eurcAdapterClaimable === 0n) issues.push('EURC: No claimable yield (< 1e12 wei)');
  if (!eurcCanClaim && eurcAdapterClaimable > 0n) issues.push('EURC: Insufficient adapter liquidity');

  if (issues.length === 0) {
    console.log('✓ All systems ready! Claims can proceed.');
    process.exit(0);
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    process.exit(1);
  }
}

audit().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
