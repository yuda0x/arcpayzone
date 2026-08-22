#!/usr/bin/env node
const fs = require('node:fs');
const { ethers } = require('ethers');

function loadLocalEnv() {
  if (!fs.existsSync('.env.local')) return;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)=(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

loadLocalEnv();

const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io';
const CHAIN_ID = 5042002n;
const PRIVATE_KEY = process.env.ARC_DEPLOYER_PRIVATE_KEY;
const OWNER = '0x20EB9790C5dfc744103f8F870236493514C295D1';
const AUDC = '0x3d28BA614DFf368BDfaA587ae7D7FcDF4934A406';
const STAKING = '0x4715262e64AA5E16851498cD5CaB5aE1f9C8366d';
const USDC = '0x3600000000000000000000000000000000000000';
const AMOUNT = 1_000_000n;
const EXPECTED_RATE = 10_000_000_000n;
const POOL_ID = 0n;
const RESUME_EXISTING = process.env.RESUME_EXISTING === '1';

const tokenAbi = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];
const stakingAbi = [
  'function owner() view returns (address)',
  'function rewardToken() view returns (address)',
  'function availableRewardBalance() view returns (uint256)',
  'function getPool(uint256) view returns (address stakingToken,uint8 stakingTokenDecimals,uint256 rewardRate,uint256 totalStaked,uint256 lastUpdateTime,uint256 rewardPerTokenStored,bool active)',
  'function getUserInfo(uint256,address) view returns (uint256 amount,uint256 rewardPerTokenPaid,uint256 rewards,uint256 startedAt)',
  'function earned(uint256,address) view returns (uint256)',
  'function stake(uint256,uint256)',
  'function claimRewards(uint256) returns (uint256)',
  'function withdraw(uint256,uint256)'
];

function assertCondition(condition, message) {
  if (!condition) throw new Error(`PRECONDITION FAILED: ${message}`);
}

async function receiptOrFail(tx, label) {
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${label} receipt was not successful.`);
  return receipt;
}

async function blockTimestamp(provider, blockNumber) {
  const block = await provider.getBlock(blockNumber);
  if (!block) throw new Error(`Unable to read block ${blockNumber}.`);
  return BigInt(block.timestamp);
}

async function waitForBlock(provider, targetBlock) {
  while ((await provider.getBlockNumber()) < targetBlock) {
    await new Promise((resolve) => provider.once('block', resolve));
  }
  return provider.getBlockNumber();
}

async function main() {
  if (!PRIVATE_KEY) throw new Error('ARC_DEPLOYER_PRIVATE_KEY is not configured locally.');
  const provider = new ethers.JsonRpcProvider(RPC_URL, Number(CHAIN_ID), { staticNetwork: true });
  const network = await provider.getNetwork();
  assertCondition(network.chainId === CHAIN_ID, `expected chain ${CHAIN_ID}, got ${network.chainId}`);

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  assertCondition(wallet.address.toLowerCase() === OWNER.toLowerCase(), 'deployer wallet does not match configured staking owner');

  const usdc = new ethers.Contract(USDC, tokenAbi, provider);
  const audc = new ethers.Contract(AUDC, tokenAbi, provider);
  const staking = new ethers.Contract(STAKING, stakingAbi, provider);
  const [stakingCode, audcCode, usdcCode, owner, rewardToken, usdcDecimals, audcDecimals, usdcBalanceBefore, audcBalanceBefore, pool, userBefore, rewardLiquidityBefore, nativeBalance] = await Promise.all([
    provider.getCode(STAKING),
    provider.getCode(AUDC),
    provider.getCode(USDC),
    staking.owner(),
    staking.rewardToken(),
    usdc.decimals(),
    audc.decimals(),
    usdc.balanceOf(wallet.address),
    audc.balanceOf(wallet.address),
    staking.getPool(POOL_ID),
    staking.getUserInfo(POOL_ID, wallet.address),
    staking.availableRewardBalance(),
    provider.getBalance(wallet.address)
  ]);

  assertCondition(stakingCode !== '0x' && audcCode !== '0x' && usdcCode !== '0x', 'deployed contract code is missing');
  assertCondition(owner.toLowerCase() === OWNER.toLowerCase(), 'staking owner mismatch');
  assertCondition(rewardToken.toLowerCase() === AUDC.toLowerCase(), 'staking reward token mismatch');
  assertCondition(Number(usdcDecimals) === 6, `USDC decimals are ${usdcDecimals}`);
  assertCondition(Number(audcDecimals) === 18, `AUDC decimals are ${audcDecimals}`);
  assertCondition(pool.stakingToken.toLowerCase() === USDC.toLowerCase(), 'USDC pool token mismatch');
  assertCondition(Number(pool.stakingTokenDecimals) === 6, 'USDC pool decimal metadata mismatch');
  assertCondition(pool.active, 'USDC pool is paused/inactive');
  assertCondition(pool.rewardRate === EXPECTED_RATE, `unexpected USDC reward rate ${pool.rewardRate}`);
  assertCondition(rewardLiquidityBefore > 0n, 'AUDC reward liquidity is zero');
  assertCondition(usdcBalanceBefore >= AMOUNT, `USDC balance ${usdcBalanceBefore} is below 1 USDC`);
  assertCondition(
    (userBefore.amount === 0n && userBefore.rewards === 0n) ||
      (RESUME_EXISTING && userBefore.amount === AMOUNT),
    'wallet has an unexpected USDC staking position or reward'
  );
  assertCondition(nativeBalance > 0n, 'wallet has no native gas balance');

  console.log('Preflight passed');
  console.log(`Wallet: ${wallet.address}`);
  console.log(`USDC balance before: ${ethers.formatUnits(usdcBalanceBefore, 6)}`);
  console.log(`AUDC balance before: ${ethers.formatUnits(audcBalanceBefore, 18)}`);
  console.log(`AUDC liquidity before: ${ethers.formatUnits(rewardLiquidityBefore, 18)}`);
  console.log(`Pool rate: ${ethers.formatUnits(pool.rewardRate, 18)} AUDC / whole USDC / second`);

  const signer = wallet;
  const writableUsdc = new ethers.Contract(USDC, tokenAbi, signer);
  const writableStaking = new ethers.Contract(STAKING, stakingAbi, signer);

  let stakeBlock;
  let stakeStartedAt;
  let usdcBalanceAfterStake;
  if (RESUME_EXISTING) {
    stakeBlock = await provider.getBlockNumber();
    stakeStartedAt = userBefore.startedAt;
    usdcBalanceAfterStake = usdcBalanceBefore;
    console.log('Resuming the existing successful 1 USDC stake; no approval or stake transaction is repeated.');
  } else {
    const approvalTx = await writableUsdc.approve(STAKING, AMOUNT);
    const approvalReceipt = await receiptOrFail(approvalTx, 'USDC approval');
    console.log(`Approval TX: ${approvalReceipt.hash}`);

    const stakeTx = await writableStaking.stake(POOL_ID, AMOUNT);
    const stakeReceipt = await receiptOrFail(stakeTx, 'USDC stake');
    usdcBalanceAfterStake = await usdc.balanceOf(wallet.address);
    stakeBlock = stakeReceipt.blockNumber;
    stakeStartedAt = await blockTimestamp(provider, stakeReceipt.blockNumber);
    console.log(`Stake TX: ${stakeReceipt.hash}`);
    console.log(`Stake block: ${stakeReceipt.blockNumber}`);
  }
  console.log(`Staking start timestamp: ${stakeStartedAt}`);

  const rewardBlock = await waitForBlock(provider, stakeBlock + 3);
  const rewardBlockTimestamp = await blockTimestamp(provider, rewardBlock);
  const elapsed = rewardBlockTimestamp - stakeStartedAt;
  const userAfterWait = await staking.getUserInfo(POOL_ID, wallet.address, { blockTag: rewardBlock });
  const earnedBeforeClaim = await staking.earned(POOL_ID, wallet.address, { blockTag: rewardBlock });
  const expectedReward = elapsed * EXPECTED_RATE;
  const rewardDifference = earnedBeforeClaim > expectedReward ? earnedBeforeClaim - expectedReward : expectedReward - earnedBeforeClaim;
  assertCondition(userAfterWait.amount === AMOUNT, `staked amount is ${userAfterWait.amount}`);
  assertCondition(earnedBeforeClaim > 0n, 'earned AUDC did not increase after three blocks');
  assertCondition(rewardDifference <= EXPECTED_RATE, `earned reward differs from formula by ${rewardDifference} base units`);

  console.log(`Reward block: ${rewardBlock}`);
  console.log(`Elapsed seconds: ${elapsed}`);
  console.log(`Earned AUDC before claim: ${ethers.formatUnits(earnedBeforeClaim, 18)}`);
  console.log(`Expected AUDC: ${ethers.formatUnits(expectedReward, 18)}`);
  console.log(`Formula difference: ${rewardDifference} AUDC base units`);

  const audcBalanceBeforeClaim = await audc.balanceOf(wallet.address);
  const claimTx = await writableStaking.claimRewards(POOL_ID);
  const claimReceipt = await receiptOrFail(claimTx, 'AUDC claim');
  const claimTimestamp = await blockTimestamp(provider, claimReceipt.blockNumber);
  const audcBalanceAfterClaim = await audc.balanceOf(wallet.address);
  const audcReceived = audcBalanceAfterClaim - audcBalanceBeforeClaim;
  const expectedClaimReward = (claimTimestamp - stakeStartedAt) * EXPECTED_RATE;
  const claimDifference = audcReceived > expectedClaimReward ? audcReceived - expectedClaimReward : expectedClaimReward - audcReceived;
  const userAtClaimBlock = await staking.getUserInfo(POOL_ID, wallet.address, { blockTag: claimReceipt.blockNumber });
  assertCondition(audcReceived >= earnedBeforeClaim, `AUDC received ${audcReceived} is below the pre-claim earned amount ${earnedBeforeClaim}`);
  assertCondition(claimDifference <= EXPECTED_RATE, `claimed reward differs from formula by ${claimDifference} base units`);
  assertCondition(userAtClaimBlock.rewards === 0n, `stored reward after claim is ${userAtClaimBlock.rewards}`);
  console.log(`Claim TX: ${claimReceipt.hash}`);
  console.log(`AUDC received: ${ethers.formatUnits(audcReceived, 18)}`);

  const withdrawTx = await writableStaking.withdraw(POOL_ID, AMOUNT);
  const withdrawReceipt = await receiptOrFail(withdrawTx, 'USDC withdrawal');
  const usdcBalanceAfter = await usdc.balanceOf(wallet.address);
  const finalUser = await staking.getUserInfo(POOL_ID, wallet.address);
  const finalEarned = await staking.earned(POOL_ID, wallet.address);
  const principalReturned = usdcBalanceAfter - usdcBalanceAfterStake;
  assertCondition(finalUser.amount === 0n, `final staked amount is ${finalUser.amount}`);
  assertCondition(finalUser.rewards === 0n, `final stored reward is ${finalUser.rewards}`);
  assertCondition(principalReturned === AMOUNT, `USDC returned ${principalReturned}; expected ${AMOUNT}`);
    console.log(`Expected AUDC at claim timestamp: ${ethers.formatUnits(expectedClaimReward, 18)}`);
  console.log(`Withdraw TX: ${withdrawReceipt.hash}`);
  console.log(`USDC balance after: ${ethers.formatUnits(usdcBalanceAfter, 6)}`);
    console.log(`USDC principal returned: ${ethers.formatUnits(principalReturned, 6)}`);
  console.log(`Final staked balance: ${ethers.formatUnits(finalUser.amount, 6)}`);
  console.log(`Final earned AUDC: ${ethers.formatUnits(finalEarned, 18)}`);
  console.log('USDC staking -> reward accrual -> claim -> principal withdrawal: PASS');
}

main().catch((error) => {
  console.error(`LIVE TEST STOPPED: ${error.shortMessage || error.message}`);
  process.exit(1);
});
