// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./AntiBot.sol";

/**
 * @title RumToken
 * @dev Implementation of the RumToken ERC20 with anti-bot features.
 */
contract RumToken is ERC20, ERC20Burnable, ERC20Permit, ERC165, AccessControl, AntiBot {    
    bytes32 public constant SUPERVISED_TRANSFER_FROM_ROLE = keccak256("SUPERVISED_TRANSFER_FROM_ROLE");
    bool public transferFromSupervisionEnabled = true;    

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "RumToken: Caller is not an admin");
        _;
    }

    modifier transferSupervision() {
        require(!transferFromSupervisionEnabled || hasRole(SUPERVISED_TRANSFER_FROM_ROLE, msg.sender), "RumToken: Transfer from are currently supervised");
        _;
    }

    constructor() ERC20("RUM Pirates of The Arrland Token", "RUM") ERC20Permit("RumToken") AntiBot() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _mint(msg.sender, 2_000_000_000 * 10 ** 18);        
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function disableTransferFromSupervision() public onlyAdmin {
        require(transferFromSupervisionEnabled, "RumToken: Transfer supervision is already disabled");
        transferFromSupervisionEnabled = false;
    }

    function addSupervisedTransferFromRole(address account) public onlyAdmin {
        grantRole(SUPERVISED_TRANSFER_FROM_ROLE, account);
    }

    function transfer(address recipient, uint256 amount) 
        public 
        virtual 
        override 
        transactionThrottler(msg.sender, recipient, amount)
        returns (bool) 
    {
        return super.transfer(recipient, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) 
        public 
        virtual 
        override 
        transferSupervision 
        transactionThrottler(sender, recipient, amount)
        returns (bool) 
    {
        return super.transferFrom(sender, recipient, amount);
    }
}
