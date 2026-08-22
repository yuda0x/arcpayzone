const { ethers } = require("ethers");

const RPC = "https://rpc.testnet.arc.io";

const OWNER = "0x20EB9790C5dfc744103f8F870236493514C295D1";

const USDC_ADAPTER = "0x3a9e2322b49F0dD9CEB9F0aE047975A1B96a8f82";
const EURC_ADAPTER = "0x39E1f8c4D82f5EbbC42DBd6fc798cb134D86D01d";

const USDC_VAULT = "0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8";
const EURC_VAULT = "0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC";

const USDC = "0x3600000000000000000000000000000000000000";
const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const ADAPTER_ABI = [
  "function claimable(address) view returns (uint256)",
  "function claimed(address) view returns (uint256)",
  "function rewardLiquidity() view returns (uint256)"
];

const VAULT_ABI = [
  "function getPendingYield(address) view returns (uint256)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)"
];

async function check(name, adapterAddress, vaultAddress, tokenAddress, decimals) {
  const provider = new ethers.JsonRpcProvider(RPC);

  const adapter = new ethers.Contract(adapterAddress, ADAPTER_ABI, provider);
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  console.log("");
  console.log("========================================");
  console.log(name + " REWARD CHECK");
  console.log("========================================");

  const pending = await vault.getPendingYield(OWNER);
  const claimable = await adapter.claimable(OWNER);
  const claimed = await adapter.claimed(OWNER);
  const liquidity = await adapter.rewardLiquidity();
  const adapterBalance = await token.balanceOf(adapterAddress);
  const ownerBalance = await token.balanceOf(OWNER);

  console.log("Owner:", OWNER);
  console.log("Adapter:", adapterAddress);
  console.log("Vault:", vaultAddress);
  console.log("Reward token:", tokenAddress);

  console.log("");
  console.log("Pending yield raw:", pending.toString());
  console.log("Pending yield:", ethers.formatUnits(pending, 18));

  console.log("Claimable raw:", claimable.toString());
  console.log("Claimable:", ethers.formatUnits(claimable, decimals));

  console.log("Already claimed raw:", claimed.toString());
  console.log("Already claimed:", ethers.formatUnits(claimed, decimals));

  console.log("Adapter liquidity raw:", liquidity.toString());
  console.log("Adapter liquidity:", ethers.formatUnits(liquidity, decimals));

  console.log("Adapter token balance:", ethers.formatUnits(adapterBalance, decimals));
  console.log("Owner token balance:", ethers.formatUnits(ownerBalance, decimals));

  console.log("");
  console.log("Can claim:", claimable > 0n && claimable <= liquidity);
}

async function main() {
  await check(
    "USDC",
    USDC_ADAPTER,
    USDC_VAULT,
    USDC,
    6
  );

  await check(
    "EURC",
    EURC_ADAPTER,
    EURC_VAULT,
    EURC,
    6
  );
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error);
  process.exit(1);
});
