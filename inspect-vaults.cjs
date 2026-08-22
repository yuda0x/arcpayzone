const { ethers } = require("ethers");

const RPC = "https://rpc.testnet.arc.io";

const vaults = {
  USDC: "0x0cbF1bA0D6F7e820f25FBE473Be352E516C0F1C8",
  EURC: "0x9b3D45Fb7Ce921baB078aB270f7f67b54Fc7c0AC"
};

const ABI = [
  "function decimals() view returns (uint8)",
  "function asset() view returns (address)",
  "function token() view returns (address)",
  "function underlying() view returns (address)",
  "function rewardToken() view returns (address)",
  "function getPendingYield(address) view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  for (const [name, address] of Object.entries(vaults)) {
    console.log("");
    console.log("========================================");
    console.log(name + " VAULT");
    console.log("========================================");
    console.log("Address:", address);

    const code = await provider.getCode(address);
    console.log("Deployed:", code !== "0x");
    console.log("Code length:", code.length);

    const vault = new ethers.Contract(address, ABI, provider);

    for (const fn of [
      "decimals",
      "asset",
      "token",
      "underlying",
      "rewardToken"
    ]) {
      try {
        const value = await vault[fn]();
        console.log(fn + ":", value.toString());
      } catch {
        console.log(fn + ": NOT AVAILABLE");
      }
    }
  }
}

main().catch(console.error);
