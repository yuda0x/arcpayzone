#!/usr/bin/env node
const fs = require('node:fs');
const { ethers } = require('ethers');

const RPC_URL = 'https://rpc.testnet.arc.io';
const CHAIN_ID = 5042002n;
const manifest = JSON.parse(fs.readFileSync('deployments/audc-staking.json', 'utf8'));
const stakingAbi = [
  'function owner() view returns (address)',
  'function rewardToken() view returns (address)',
  'function poolCount() view returns (uint256)',
  'function availableRewardBalance() view returns (uint256)',
  'function getPool(uint256) view returns (address stakingToken,uint8 stakingTokenDecimals,uint256 rewardRate,uint256 totalStaked,uint256 lastUpdateTime,uint256 rewardPerTokenStored,bool active)',
  'function getUserInfo(uint256,address) view returns (uint256 amount,uint256 rewardPerTokenPaid,uint256 rewards,uint256 startedAt)',
  'function earned(uint256,address) view returns (uint256)'
];
const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

function readEnv(name) {
  if (!fs.existsSync('.env.local')) return '';
  const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((value) => value.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, Number(CHAIN_ID), { staticNetwork: true });
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) throw new Error(`Wrong chain ID: ${network.chainId}`);

  const audcCode = await provider.getCode(manifest.audc.address);
  const stakingCode = await provider.getCode(manifest.staking.address);
  const audc = new ethers.Contract(manifest.audc.address, erc20Abi, provider);
  const staking = new ethers.Contract(manifest.staking.address, stakingAbi, provider);
  const usdc = new ethers.Contract(manifest.usdc.address, erc20Abi, provider);
  const eurc = new ethers.Contract(manifest.eurc.address, erc20Abi, provider);
  const [audcDecimals, usdcDecimals, eurcDecimals, owner, rewardToken, poolCount, rewardBalance, usdcPool, eurcPool, audcOwnerBalance, usdcOwnerBalance, eurcOwnerBalance, usdcUser, eurcUser, usdcEarned, eurcEarned] = await Promise.all([
    audc.decimals(),
    usdc.decimals(),
    eurc.decimals(),
    staking.owner(),
    staking.rewardToken(),
    staking.poolCount(),
    staking.availableRewardBalance(),
    staking.getPool(0),
    staking.getPool(1),
    audc.balanceOf(manifest.owner),
    usdc.balanceOf(manifest.owner),
    eurc.balanceOf(manifest.owner),
    staking.getUserInfo(0, manifest.owner),
    staking.getUserInfo(1, manifest.owner),
    staking.earned(0, manifest.owner),
    staking.earned(1, manifest.owner)
  ]);

  const configuredAudc = readEnv('NEXT_PUBLIC_AUDC_TOKEN_ADDRESS');
  const configuredStaking = readEnv('NEXT_PUBLIC_AUDC_STAKING_ADDRESS');
  const checks = {
    chainId: network.chainId === CHAIN_ID,
    audcCode: audcCode !== '0x',
    stakingCode: stakingCode !== '0x',
    audcDecimals: Number(audcDecimals) === 18,
    usdcDecimals: Number(usdcDecimals) === 6,
    eurcDecimals: Number(eurcDecimals) === 6,
    owner: owner.toLowerCase() === manifest.owner.toLowerCase(),
    rewardToken: rewardToken.toLowerCase() === manifest.audc.address.toLowerCase(),
    poolCount: poolCount === 2n,
    usdcPool: usdcPool.stakingToken.toLowerCase() === manifest.usdc.address.toLowerCase() && Number(usdcPool.stakingTokenDecimals) === 6 && usdcPool.active && usdcPool.rewardRate > 0n,
    eurcPool: eurcPool.stakingToken.toLowerCase() === manifest.eurc.address.toLowerCase() && Number(eurcPool.stakingTokenDecimals) === 6 && eurcPool.active && eurcPool.rewardRate > 0n,
    rewardFunding: rewardBalance <= ethers.parseUnits(manifest.staking.rewardFunding, 18),
    frontendAudc: configuredAudc.toLowerCase() === manifest.audc.address.toLowerCase(),
    frontendStaking: configuredStaking.toLowerCase() === manifest.staking.address.toLowerCase()
  };

  console.log('AUDC LIVE VERIFICATION');
  console.log(`Network: Arc Testnet (${network.chainId})`);
  console.log(`AUDC: ${manifest.audc.address}`);
  console.log(`Staking: ${manifest.staking.address}`);
  console.log(`Owner: ${owner}`);
  console.log(`USDC: ${manifest.usdc.address} (${usdcDecimals} decimals)`);
  console.log(`EURC: ${manifest.eurc.address} (${eurcDecimals} decimals)`);
  console.log(`AUDC decimals: ${audcDecimals}`);
  console.log(`AUDC reward balance: ${ethers.formatUnits(rewardBalance, 18)} AUDC`);
  console.log(`Owner AUDC balance: ${ethers.formatUnits(audcOwnerBalance, 18)} AUDC`);
  console.log(`Owner USDC balance: ${ethers.formatUnits(usdcOwnerBalance, 6)} USDC`);
  console.log(`Owner EURC balance: ${ethers.formatUnits(eurcOwnerBalance, 6)} EURC`);
  console.log(`USDC pool: active=${usdcPool.active} rate=${ethers.formatUnits(usdcPool.rewardRate, 18)} totalStaked=${usdcPool.totalStaked}`);
  console.log(`EURC pool: active=${eurcPool.active} rate=${ethers.formatUnits(eurcPool.rewardRate, 18)} totalStaked=${eurcPool.totalStaked}`);
  console.log(`Owner USDC position: amount=${ethers.formatUnits(usdcUser.amount, 6)} startedAt=${usdcUser.startedAt} earned=${ethers.formatUnits(usdcEarned, 18)} AUDC`);
  console.log(`Owner EURC position: amount=${ethers.formatUnits(eurcUser.amount, 6)} startedAt=${eurcUser.startedAt} earned=${ethers.formatUnits(eurcEarned, 18)} AUDC`);
  console.log('Checks:', checks);

  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failures.length) throw new Error(`Verification failed: ${failures.join(', ')}`);
  console.log('All deployment checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
