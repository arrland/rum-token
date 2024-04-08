// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";


contract AntiBot is AccessControl {
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    bool public isAntibotEnabled = true;

    uint256 public antiBotDepth = 3;

    mapping(bytes => uint256) private transactions;

    event AntibotUpdated(bool isAntibotEnabled);
    event AntiBotDepthUpdated(uint256 newDepth);

    modifier transactionThrottler(
        address from,
        address to,
        uint256 amount
    ) {        
        if (isAntibotEnabled && amount > 0) {
            bytes memory keyFromTo = abi.encodePacked(from, to);
            bytes memory keyToFrom = abi.encodePacked(to, from);

            bool skippable = hasRole(BOT_ROLE, from) || hasRole(BOT_ROLE, to);
            
            require(
                skippable ||
                    (transactions[keyFromTo] < block.number - antiBotDepth && transactions[keyToFrom] < block.number - antiBotDepth),
                "Antibot: Transaction throttled"
            );

            transactions[keyFromTo] = block.number;
            transactions[keyToFrom] = block.number;            
        }

        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());        
    }

    function toggleAntibot() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAntibotEnabled = !isAntibotEnabled;

        emit AntibotUpdated(isAntibotEnabled);
    }

    function setAntiBotDepth(uint256 depth) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(depth <= 10, "Antibot: value cannot be bigger than 10");
        antiBotDepth = depth;
        emit AntiBotDepthUpdated(depth);
    }
}