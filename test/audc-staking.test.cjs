const assert = require('node:assert/strict');
const { ethers } = require('hardhat');

const USDC = 0;
const EURC = 1;
const AUDC_PER_SECOND_PER_TOKEN = ethers.parseUnits('0.000001', 18);

async function increaseTime(seconds) {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  await ethers.provider.send('evm_mine');
}

async function deployFixture() {
  const [owner, alice, bob, attacker] = await ethers.getSigners();
  const Audc = await ethers.getContractFactory('AUDC');
  const audc = await Audc.deploy(owner.address, ethers.parseUnits('1000000', 18));
  const Staking = await ethers.getContractFactory('AUDCStaking');
  const staking = await Staking.deploy(owner.address, audc.target);
  const MockUSDC = await ethers.getContractFactory('MockUSDC');
  const usdc = await MockUSDC.deploy();
  const eurc = await MockUSDC.deploy();

  await usdc.transfer(alice.address, ethers.parseUnits('1000', 6));
  await usdc.transfer(bob.address, ethers.parseUnits('1000', 6));
  await eurc.transfer(alice.address, ethers.parseUnits('1000', 6));
  await eurc.transfer(bob.address, ethers.parseUnits('1000', 6));
  await audc.transfer(staking.target, ethers.parseUnits('10000', 18));
  await staking.initializePool(usdc.target, AUDC_PER_SECOND_PER_TOKEN);
  await staking.initializePool(eurc.target, AUDC_PER_SECOND_PER_TOKEN);

  return { owner, alice, bob, attacker, audc, staking, usdc, eurc };
}

describe('AUDCStaking', function () {
  it('deploys configured token and independent 6-decimal pools', async function () {
    const { staking, audc, usdc, eurc } = await deployFixture();
    assert.equal(await staking.rewardToken(), audc.target);
    assert.equal(await staking.poolCount(), 2n);
    const usdcPool = await staking.getPool(USDC);
    const eurcPool = await staking.getPool(EURC);
    assert.equal(usdcPool.stakingToken, usdc.target);
    assert.equal(eurcPool.stakingToken, eurc.target);
    assert.equal(usdcPool.stakingTokenDecimals, 6n);
    assert.equal(eurcPool.stakingTokenDecimals, 6n);
  });

  it('supports multiple users, multiple deposits, and time-based rewards', async function () {
    const { alice, bob, staking, usdc } = await deployFixture();
    const oneToken = ethers.parseUnits('1', 6);
    await usdc.connect(alice).approve(staking.target, oneToken * 10n);
    await usdc.connect(bob).approve(staking.target, oneToken * 10n);
    await staking.connect(alice).stake(USDC, oneToken);
    await increaseTime(100);
    await staking.connect(alice).stake(USDC, oneToken);
    await staking.connect(bob).stake(USDC, oneToken);
    await increaseTime(100);

    const aliceEarned = await staking.earned(USDC, alice.address);
    const bobEarned = await staking.earned(USDC, bob.address);
    assert(aliceEarned > bobEarned);
    assert(aliceEarned > 0n);
  });

  it('supports partial and full withdrawals while preserving accrued rewards', async function () {
    const { alice, staking, usdc } = await deployFixture();
    const amount = ethers.parseUnits('10', 6);
    await usdc.connect(alice).approve(staking.target, amount);
    await staking.connect(alice).stake(USDC, amount);
    await increaseTime(60);
    const beforeReward = await staking.earned(USDC, alice.address);
    await staking.connect(alice).withdraw(USDC, ethers.parseUnits('4', 6));
    const userAfterPartial = await staking.getUserInfo(USDC, alice.address);
    assert.equal(userAfterPartial.amount, ethers.parseUnits('6', 6));
    assert(userAfterPartial.rewards >= beforeReward);
    await staking.connect(alice).withdraw(USDC, ethers.parseUnits('6', 6));
    const userAfterFull = await staking.getUserInfo(USDC, alice.address);
    assert.equal(userAfterFull.amount, 0n);
    assert(userAfterFull.rewards > 0n);
  });

  it('claims once and rejects a second claim without new accrual', async function () {
    const { owner, alice, audc, staking, usdc } = await deployFixture();
    const amount = ethers.parseUnits('2', 6);
    await usdc.connect(alice).approve(staking.target, amount);
    await staking.connect(alice).stake(USDC, amount);
    await increaseTime(100);
    const expected = await staking.earned(USDC, alice.address);
    await staking.connect(owner).setRewardRate(USDC, 0n);
    await staking.connect(alice).claimRewards(USDC);
    assert((await audc.balanceOf(alice.address)) >= expected);
    await assert.rejects(staking.connect(alice).claimRewards(USDC), /ZeroAmount/);
  });

  it('rejects zero stake/withdrawal and blocks unauthorised administration', async function () {
    const { attacker, staking, usdc } = await deployFixture();
    await assert.rejects(staking.connect(attacker).setRewardRate(USDC, 0n), /OwnableUnauthorizedAccount/);
    await assert.rejects(staking.connect(attacker).fundRewards(1n), /OwnableUnauthorizedAccount/);
    await assert.rejects(staking.connect(attacker).stake(USDC, 0n), /ZeroAmount/);
    await assert.rejects(staking.connect(attacker).withdraw(USDC, 0n), /ZeroAmount/);
    await assert.rejects(staking.connect(attacker).recoverERC20(usdc.target, attacker.address, 1n), /OwnableUnauthorizedAccount/);
  });

  it('rejects claims when the reward pool is underfunded and protects principal recovery', async function () {
    const { owner, alice, audc, staking, usdc } = await deployFixture();
    const amount = ethers.parseUnits('100', 6);
    await usdc.connect(alice).approve(staking.target, amount);
    await staking.connect(alice).stake(USDC, amount);
    await increaseTime(100000000);
    await staking.connect(owner).setRewardRate(USDC, AUDC_PER_SECOND_PER_TOKEN);
    await assert.rejects(staking.connect(alice).claimRewards(USDC), /InsufficientRewardLiquidity/);
    await assert.rejects(staking.connect(owner).recoverERC20(usdc.target, owner.address, 1n), /PrincipalTokenProtected/);
    await assert.rejects(staking.connect(owner).recoverERC20(audc.target, owner.address, 1n), /RewardTokenProtected/);
  });

  it('applies rate changes only after updating prior accrual', async function () {
    const { owner, alice, staking, usdc } = await deployFixture();
    const amount = ethers.parseUnits('1', 6);
    await usdc.connect(alice).approve(staking.target, amount);
    await staking.connect(alice).stake(USDC, amount);
    await increaseTime(10);
    const beforeChange = await staking.earned(USDC, alice.address);
    await staking.connect(owner).setRewardRate(USDC, 2n * AUDC_PER_SECOND_PER_TOKEN);
    const afterChange = await staking.earned(USDC, alice.address);
    assert(afterChange >= beforeChange);
    await increaseTime(10);
    assert((await staking.earned(USDC, alice.address)) > afterChange);
  });

  it('allows principal emergency withdrawal while pausing new stake and claims', async function () {
    const { owner, alice, staking, usdc } = await deployFixture();
    const amount = ethers.parseUnits('2', 6);
    await usdc.connect(alice).approve(staking.target, amount);
    await staking.connect(alice).stake(USDC, amount);
    await staking.connect(owner).pause();
    await assert.rejects(staking.connect(alice).stake(USDC, amount), /EnforcedPause/);
    await staking.connect(alice).emergencyWithdraw(USDC);
    assert.equal((await staking.getUserInfo(USDC, alice.address)).amount, 0n);
    await staking.connect(owner).unpause();
  });

  it('rejects a reentrant token callback during staking', async function () {
    const { alice, staking } = await deployFixture();
    const Reentrant = await ethers.getContractFactory('ReentrantMockERC20');
    const token = await Reentrant.deploy();
    await token.transfer(alice.address, ethers.parseUnits('10', 6));
    await staking.initializePool(token.target, AUDC_PER_SECOND_PER_TOKEN);
    await token.connect(alice).approve(staking.target, ethers.parseUnits('1', 6));
    await token.configureAttack(staking.target, 2);
    await assert.rejects(staking.connect(alice).stake(2, ethers.parseUnits('1', 6)), /ReentrancyGuardReentrantCall/);
  });
});
