// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract AUDC is ERC20, Ownable {
    constructor(address initialOwner, uint256 initialSupply)
        ERC20('AUDC', 'AUDC')
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }
}