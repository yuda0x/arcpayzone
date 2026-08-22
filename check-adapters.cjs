const { ethers } = require("ethers");

const RPC = "https://rpc.testnet.arc.io";

const adapters = {
  USDC: "0x3a9e2322b49F0dD9CEB9F0aE047975A1B96a8f82",
  EURC: "0x39E1f8c4D82f5EbbC42DBd6fc798cb134D86D01d"
};

const ABI = [
  "function owner() view returns (address)",
  "function vault() view returns (address)",
  "function rewardToken() view returns (address)",
  "function rewardLiquidity() view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  for (const [name, address] of Object.entries(adapters)) {
    console.log("");
    console.log("========== " + name + " ADAPTER ==========");
    console.log("Address:", address);

    const code = await provider.getCode(address);

    console.log("Contract deployed:", code !== "0x");
    console.log("Code length:", code.length);

    if (code === "0x") {
      console.log("ERROR: No contract code at this address.");
      continue;
    }

    const adapter = new ethers.Contract(address, ABI, provider);

    console.log("Owner:", await adapter.owner());
    console.log("Vault:", await adapter.vault());
    console.log("Reward token:", await adapter.rewardToken());

    const liquidity = await adapter.rewardLiquidity();

    console.log("Reward liquidity (raw):", liquidity.toString());
  }
}

main().catch(console.error);
