import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ethers } from 'ethers';

const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io';
const expectedChainId = 5042002n;
const privateKey = process.env.ARC_DEPLOYER_PRIVATE_KEY;
const usdcArtifactPath = process.env.USDC_CLAIM_ADAPTER_ARTIFACT;
const eurcArtifactPath = process.env.EURC_CLAIM_ADAPTER_ARTIFACT;
const usdcVault = process.env.USDC_VAULT_ADDRESS;
const eurcVault = process.env.EURC_VAULT_ADDRESS;
const usdcAddress = process.env.USDC_ADDRESS;
const eurcAddress = process.env.EURC_ADDRESS;

for (const [name, value] of Object.entries({
  ARC_DEPLOYER_PRIVATE_KEY: privateKey,
  USDC_CLAIM_ADAPTER_ARTIFACT: usdcArtifactPath,
  EURC_CLAIM_ADAPTER_ARTIFACT: eurcArtifactPath,
  USDC_VAULT_ADDRESS: usdcVault,
  EURC_VAULT_ADDRESS: eurcVault,
  USDC_ADDRESS: usdcAddress,
  EURC_ADDRESS: eurcAddress
})) {
  if (!value) throw new Error(`${name} is required.`);
}

for (const [name, value] of Object.entries({ USDC_VAULT_ADDRESS: usdcVault, EURC_VAULT_ADDRESS: eurcVault, USDC_ADDRESS: usdcAddress, EURC_ADDRESS: eurcAddress })) {
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address.`);
}

function loadArtifact(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

const provider = new ethers.JsonRpcProvider(rpcUrl, Number(expectedChainId), { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) throw new Error(`Wrong chain ID: ${network.chainId}`);

const deployer = new ethers.Wallet(privateKey, provider);
console.log(`Network: Arc Testnet`);
console.log(`Chain ID: ${network.chainId}`);
console.log(`Deployer: ${deployer.address}`);

async function deploy(name, artifactPath, vault, token) {
  const artifact = loadArtifact(artifactPath);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(deployer.address, vault, token);
  const transaction = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = transaction ? await transaction.wait() : null;
  console.log(`${name} Claim Adapter: ${address}`);
  console.log(`${name} Vault: ${vault}`);
  console.log(`${name} Reward Token: ${token}`);
  console.log(`${name} Deployment Tx: ${transaction?.hash || 'unknown'}`);
  console.log(`${name} Deployment Block: ${receipt?.blockNumber || 'unknown'}`);
  return address;
}

await deploy('USDC', usdcArtifactPath, usdcVault, usdcAddress);
await deploy('EURC', eurcArtifactPath, eurcVault, eurcAddress);
