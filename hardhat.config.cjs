require('@nomicfoundation/hardhat-ethers');

module.exports = {
  solidity: '0.8.24',
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './.hardhat-cache',
    artifacts: './.hardhat-artifacts'
  }
};
