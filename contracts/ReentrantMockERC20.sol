// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface IStakeCallback {
    function stake(uint256 poolId, uint256 amount) external;
}

contract ReentrantMockERC20 is ERC20 {
    address public callbackTarget;
    uint256 public callbackPoolId;
    bool public attackEnabled;

    constructor() ERC20('Reentrant Mock', 'rMOCK') {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function configureAttack(address target, uint256 poolId) external {
        callbackTarget = target;
        callbackPoolId = poolId;
        attackEnabled = true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (attackEnabled && to == callbackTarget) {
            IStakeCallback(callbackTarget).stake(callbackPoolId, amount);
        }
        return super.transferFrom(from, to, amount);
    }
}