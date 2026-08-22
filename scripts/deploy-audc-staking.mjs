import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ethers } from 'ethers';

function loadLocalEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)=(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

loadLocalEnv();

const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io';
const expectedChainId = 5042002n;
const privateKey = process.env.ARC_DEPLOYER_PRIVATE_KEY;
const usdcAddress = process.env.USDC_ADDRESS;
const eurcAddress = process.env.EURC_ADDRESS;
const initialSupply = process.env.AUDC_INITIAL_SUPPLY;
const usdcRewardRate = process.env.AUDC_USDC_REWARD_RATE;
const eurcRewardRate = process.env.AUDC_EURC_REWARD_RATE;
const rewardFunding = process.env.AUDC_REWARD_FUNDING || '0';

for (const [name, value] of Object.entries({
  ARC_DEPLOYER_PRIVATE_KEY: privateKey,
  USDC_ADDRESS: usdcAddress,
  EURC_ADDRESS: eurcAddress,
  AUDC_INITIAL_SUPPLY: initialSupply,
  AUDC_USDC_REWARD_RATE: usdcRewardRate,
  AUDC_EURC_REWARD_RATE: eurcRewardRate
})) {
  if (!value) throw new Error(`${name} is required. Set the economic parameters locally; the private key is never printed.`);
}

for (const [name, value] of Object.entries({ USDC_ADDRESS: usdcAddress, EURC_ADDRESS: eurcAddress })) {
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address.`);
}

const provider = new ethers.JsonRpcProvider(rpcUrl, Number(expectedChainId), { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) throw new Error(`Wrong chain ID: ${network.chainId}`);

const deployer = new ethers.Wallet(privateKey, provider);
const nativeBalance = await provider.getBalance(deployer.address);
const tokenAbi = ['function decimals() view returns (uint8)', 'function totalSupply() view returns (uint256)'];
const usdc = new ethers.Contract(usdcAddress, tokenAbi, provider);
const eurc = new ethers.Contract(eurcAddress, tokenAbi, provider);
const [usdcCode, eurcCode, usdcDecimals, eurcDecimals] = await Promise.all([
  provider.getCode(usdcAddress),
  provider.getCode(eurcAddress),
  usdc.decimals(),
  eurc.decimals()
]);
if (usdcCode === '0x' || eurcCode === '0x') throw new Error('USDC_ADDRESS and EURC_ADDRESS must contain deployed token contracts.');
if (Number(usdcDecimals) !== 6 || Number(eurcDecimals) !== 6) throw new Error(`Expected 6-decimal staking tokens; got USDC=${usdcDecimals}, EURC=${eurcDecimals}.`);

console.log('Network: Arc Testnet');
console.log(`Chain ID: ${network.chainId}`);
console.log(`Deployer: ${deployer.address}`);
console.log(`Native gas balance: ${ethers.formatEther(nativeBalance)}`);
console.log(`USDC: ${usdcAddress} (decimals ${usdcDecimals})`);
console.log(`EURC: ${eurcAddress} (decimals ${eurcDecimals})`);
console.log(`AUDC initial supply: ${initialSupply} AUDC`);
console.log(`USDC reward rate: ${usdcRewardRate} AUDC per whole USDC per second`);
console.log(`EURC reward rate: ${eurcRewardRate} AUDC per whole EURC per second`);

function artifact(name) {
  return JSON.parse(fs.readFileSync(path.resolve(`.hardhat-artifacts/contracts/${name}.sol/${name}.json`), 'utf8'));
}

function setLocalPublicEnv(name, value) {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, 'utf8');
  const expression = new RegExp(`^${name}=.*$`, 'm');
  const line = `${name}=${value}`;
  content = expression.test(content) ? content.replace(expression, line) : `${content.trimEnd()}\n${line}\n`;
  fs.writeFileSync(envPath, content);
}

async function deploy(name, args) {
  const data = artifact(name);
  const contract = await new ethers.ContractFactory(data.abi, data.bytecode, deployer).deploy(...args);
  const tx = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const receipt = tx ? await tx.wait() : null;
  const address = await contract.getAddress();
  console.log(`${name}: ${address}`);
  console.log(`${name} deployment tx: ${tx?.hash || 'unknown'}`);
  console.log(`${name} deployment block: ${receipt?.blockNumber || 'unknown'}`);
  return { address, txHash: tx?.hash || null, blockNumber: receipt?.blockNumber || null };
}

const audc = await deploy('AUDC', [deployer.address, ethers.parseUnits(initialSupply, 18)]);
const staking = await deploy('AUDCStaking', [deployer.address, audc.address]);
setLocalPublicEnv('NEXT_PUBLIC_AUDC_TOKEN_ADDRESS', audc.address);
setLocalPublicEnv('NEXT_PUBLIC_AUDC_STAKING_ADDRESS', staking.address);
const stakingContract = new ethers.Contract(staking.address, artifact('AUDCStaking').abi, deployer);
const usdcPoolTx = await stakingContract.initializePool(usdcAddress, ethers.parseUnits(usdcRewardRate, 18));
await usdcPoolTx.wait();
const eurcPoolTx = await stakingContract.initializePool(eurcAddress, ethers.parseUnits(eurcRewardRate, 18));
await eurcPoolTx.wait();
console.log(`USDC pool initialization tx: ${usdcPoolTx.hash}`);
console.log(`EURC pool initialization tx: ${eurcPoolTx.hash}`);

let fundingTxHash = null;
if (rewardFunding !== '0') {
  const audcContract = new ethers.Contract(audc.address, artifact('AUDC').abi, deployer);
  const approveTx = await audcContract.approve(staking.address, ethers.parseUnits(rewardFunding, 18));
  await approveTx.wait();
  const fundTx = await stakingContract.fundRewards(ethers.parseUnits(rewardFunding, 18));
  await fundTx.wait();
  fundingTxHash = fundTx.hash;
  console.log(`AUDC reward funding: ${rewardFunding} AUDC`);
  console.log(`AUDC reward funding tx: ${fundingTxHash}`);
} else {
  console.log('AUDC reward funding: NOT PERFORMED (AUDC_REWARD_FUNDING is 0).');
}

const deployment = {
  network: 'Arc Testnet',
  chainId: Number(expectedChainId),
  owner: deployer.address,
  audc: { ...audc, decimals: 18, initialSupply },
  staking: { ...staking, rewardFunding, fundingTxHash },
  usdc: { address: usdcAddress, decimals: Number(usdcDecimals), poolId: 0, rewardRate: usdcRewardRate, initializationTx: usdcPoolTx.hash },
  eurc: { address: eurcAddress, decimals: Number(eurcDecimals), poolId: 1, rewardRate: eurcRewardRate, initializationTx: eurcPoolTx.hash }
};
fs.mkdirSync('deployments', { recursive: true });
fs.writeFileSync('deployments/audc-staking.json', `${JSON.stringify(deployment, null, 2)}\n`);
console.log('Deployment manifest: deployments/audc-staking.json');
