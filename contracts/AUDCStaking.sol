// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20, IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract AUDCStaking is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_REWARD_RATE = 1e15;

    error InvalidPool();
    error InvalidToken();
    error InvalidDecimals();
    error ZeroAmount();
    error ZeroAddress();
    error InactivePool();
    error InsufficientStake();
    error InsufficientRewardLiquidity();
    error RewardRateTooHigh();
    error PrincipalTokenProtected();
    error RewardTokenProtected();

    struct PoolInfo {
        IERC20 stakingToken;
        uint8 stakingTokenDecimals;
        uint256 rewardRate;
        uint256 totalStaked;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        bool active;
    }

    struct UserInfo {
        uint256 amount;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
        uint256 startedAt;
    }

    IERC20 public immutable rewardToken;
    PoolInfo[] private pools;
    mapping(uint256 => mapping(address => UserInfo)) private users;

    event PoolInitialized(uint256 indexed poolId, address indexed stakingToken, uint8 decimals, uint256 rewardRate);
    event PoolStatusChanged(uint256 indexed poolId, bool active);
    event RewardRateChanged(uint256 indexed poolId, uint256 rewardRate);
    event Staked(uint256 indexed poolId, address indexed account, uint256 amount);
    event Withdrawn(uint256 indexed poolId, address indexed account, uint256 amount);
    event EmergencyWithdrawn(uint256 indexed poolId, address indexed account, uint256 amount);
    event RewardPaid(uint256 indexed poolId, address indexed account, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount);
    event Recovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(address initialOwner, IERC20 rewardTokenAddress) Ownable(initialOwner) {
        if (address(rewardTokenAddress) == address(0)) revert ZeroAddress();
        rewardToken = rewardTokenAddress;
    }

    function initializePool(IERC20Metadata stakingToken, uint256 rewardRate) external onlyOwner returns (uint256 poolId) {
        if (address(stakingToken) == address(0)) revert ZeroAddress();
        if (address(stakingToken) == address(rewardToken)) revert RewardTokenProtected();
        if (rewardRate > MAX_REWARD_RATE) revert RewardRateTooHigh();

        uint8 decimals = stakingToken.decimals();
        if (decimals > 18) revert InvalidDecimals();

        poolId = pools.length;
        pools.push(PoolInfo({
            stakingToken: stakingToken,
            stakingTokenDecimals: decimals,
            rewardRate: rewardRate,
            totalStaked: 0,
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            active: true
        }));
        emit PoolInitialized(poolId, address(stakingToken), decimals, rewardRate);
    }

    function setPoolActive(uint256 poolId, bool active) external onlyOwner {
        PoolInfo storage pool = _pool(poolId);
        _updatePool(pool);
        pool.active = active;
        emit PoolStatusChanged(poolId, active);
    }

    function setRewardRate(uint256 poolId, uint256 rewardRate) external onlyOwner {
        if (rewardRate > MAX_REWARD_RATE) revert RewardRateTooHigh();
        PoolInfo storage pool = _pool(poolId);
        _updatePool(pool);
        pool.rewardRate = rewardRate;
        emit RewardRateChanged(poolId, rewardRate);
    }

    function stake(uint256 poolId, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        PoolInfo storage pool = _pool(poolId);
        if (!pool.active) revert InactivePool();

        UserInfo storage user = users[poolId][msg.sender];
        _updateUser(pool, user);
        pool.totalStaked += amount;
        user.amount += amount;
        if (user.startedAt == 0) user.startedAt = block.timestamp;
        pool.stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(poolId, msg.sender, amount);
    }

    function withdraw(uint256 poolId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        PoolInfo storage pool = _pool(poolId);
        UserInfo storage user = users[poolId][msg.sender];
        if (user.amount < amount) revert InsufficientStake();

        _updateUser(pool, user);
        user.amount -= amount;
        pool.totalStaked -= amount;
        if (user.amount == 0) user.startedAt = 0;
        pool.stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(poolId, msg.sender, amount);
    }

    function emergencyWithdraw(uint256 poolId) external nonReentrant {
        PoolInfo storage pool = _pool(poolId);
        UserInfo storage user = users[poolId][msg.sender];
        uint256 amount = user.amount;
        if (amount == 0) revert ZeroAmount();

        user.amount = 0;
        user.rewards = 0;
        user.rewardPerTokenPaid = pool.rewardPerTokenStored;
        user.startedAt = 0;
        pool.totalStaked -= amount;
        pool.stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(poolId, msg.sender, amount);
    }

    function claimRewards(uint256 poolId) external nonReentrant whenNotPaused returns (uint256 amount) {
        PoolInfo storage pool = _pool(poolId);
        UserInfo storage user = users[poolId][msg.sender];
        _updateUser(pool, user);
        amount = user.rewards;
        if (amount == 0) revert ZeroAmount();
        if (availableRewardBalance() < amount) revert InsufficientRewardLiquidity();

        user.rewards = 0;
        rewardToken.safeTransfer(msg.sender, amount);
        emit RewardPaid(poolId, msg.sender, amount);
    }

    function fundRewards(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    function availableRewardBalance() public view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    function rewardPerToken(uint256 poolId) public view returns (uint256) {
        PoolInfo storage pool = _pool(poolId);
        if (pool.totalStaked == 0 || pool.lastUpdateTime == block.timestamp) return pool.rewardPerTokenStored;
        return pool.rewardPerTokenStored + _rewardPerTokenIncrement(pool);
    }

    function earned(uint256 poolId, address account) public view returns (uint256) {
        UserInfo storage user = users[poolId][account];
        uint256 currentRewardPerToken = rewardPerToken(poolId);
        return user.rewards + (user.amount * (currentRewardPerToken - user.rewardPerTokenPaid)) / PRECISION;
    }

    function getPool(uint256 poolId) external view returns (PoolInfo memory) {
        return _pool(poolId);
    }

    function getUserInfo(uint256 poolId, address account) external view returns (UserInfo memory) {
        _pool(poolId);
        return users[poolId][account];
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function recoverERC20(IERC20 token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (address(token) == address(rewardToken)) revert RewardTokenProtected();
        for (uint256 poolId = 0; poolId < pools.length; poolId++) {
            if (address(pools[poolId].stakingToken) == address(token)) revert PrincipalTokenProtected();
        }
        token.safeTransfer(recipient, amount);
        emit Recovered(address(token), recipient, amount);
    }

    function _pool(uint256 poolId) internal view returns (PoolInfo storage pool) {
        if (poolId >= pools.length) revert InvalidPool();
        pool = pools[poolId];
    }

    function _updatePool(PoolInfo storage pool) internal {
        if (pool.active && pool.totalStaked > 0) pool.rewardPerTokenStored += _rewardPerTokenIncrement(pool);
        pool.lastUpdateTime = block.timestamp;
    }

    function _updateUser(PoolInfo storage pool, UserInfo storage user) internal {
        _updatePool(pool);
        user.rewards += (user.amount * (pool.rewardPerTokenStored - user.rewardPerTokenPaid)) / PRECISION;
        user.rewardPerTokenPaid = pool.rewardPerTokenStored;
    }

    function _rewardPerTokenIncrement(PoolInfo storage pool) internal view returns (uint256) {
        uint256 stakingUnit = 10 ** uint256(pool.stakingTokenDecimals);
        return (block.timestamp - pool.lastUpdateTime) * pool.rewardRate * PRECISION / stakingUnit;
    }
}