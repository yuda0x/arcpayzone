// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IYieldVault {
    function getPendingYield(address user) external view returns (uint256);
}

contract EURCVaultClaimAdapter {
    error NotOwner();
    error ZeroAddress();
    error ZeroAmount();
    error NothingToClaim();
    error InsufficientLiquidity();
    error TransferFailed();

    address public immutable owner;
    address public immutable vault;
    address public immutable rewardToken;
    mapping(address => uint256) public claimed;
    bool private locked;

    event RewardsFunded(address indexed funder, uint256 amount);
    event RewardsClaimed(address indexed account, uint256 amount);
    event EmergencyRecovery(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert TransferFailed();
        locked = true;
        _;
        locked = false;
    }

    constructor(address initialOwner, address vaultAddress, address rewardTokenAddress) {
        if (initialOwner == address(0) || vaultAddress == address(0) || rewardTokenAddress == address(0)) revert ZeroAddress();
        owner = initialOwner;
        vault = vaultAddress;
        rewardToken = rewardTokenAddress;
    }

    function claimable(address account) public view returns (uint256) {
        // Convert vault's 18-decimal pending yield to token's 6-decimal format
        uint256 pending = IYieldVault(vault).getPendingYield(account) / 1e12;
        uint256 alreadyClaimed = claimed[account];
        return pending > alreadyClaimed ? pending - alreadyClaimed : 0;
    }

    function rewardLiquidity() external view returns (uint256) {
        return IERC20(rewardToken).balanceOf(address(this));
    }

    function fundRewards(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!IERC20(rewardToken).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit RewardsFunded(msg.sender, amount);
    }

    function claim() external nonReentrant returns (uint256 amount) {
        amount = claimable(msg.sender);
        if (amount == 0) revert NothingToClaim();
        if (IERC20(rewardToken).balanceOf(address(this)) < amount) revert InsufficientLiquidity();
        if (!IERC20(rewardToken).transfer(msg.sender, amount)) revert TransferFailed();
        claimed[msg.sender] += amount;
        emit RewardsClaimed(msg.sender, amount);
    }

    function emergencyRecover(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        if (!IERC20(token).transfer(recipient, amount)) revert TransferFailed();
        emit EmergencyRecovery(token, recipient, amount);
    }
}
