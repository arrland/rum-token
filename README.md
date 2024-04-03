# RUM Token Smart Contract Documentation

## Overview

The RUM Token is an ERC20 token with additional features including anti-bot measures, burnability, permit functionality, and supervised transfers. It is designed for the "Pirates of The Arrland" project, providing a secure and flexible token for transactions within the ecosystem.

## Features

- **ERC20 Standard**: Implements the basic standard for fungible tokens.
- **Burnable**: Tokens can be burned, reducing the total supply and potentially increasing scarcity.
- **Permit**: Allows token spending without requiring a transaction for approval, saving gas and simplifying interactions.
- **Anti-Bot**: Includes mechanisms to prevent automated bots from manipulating transactions or prices.
- **Supervised Transfers**: Certain transfers can be supervised, requiring specific roles to execute, enhancing security against unauthorized transfers.

## Roles

- **DEFAULT_ADMIN_ROLE**: Has the ability to manage roles and execute administrative functions.
- **SUPERVISED_TRANSFER_FROM_ROLE**: Required for executing transfers when supervision is enabled.
- **BOT_ROLE**: This role is designated for addresses identified as bots. Addresses with this role can bypass anti-bot measures, allowing for specific automated interactions under controlled conditions.


## Functions

### Constructor

Initializes the token with a name ("RUM Pirates of The Arrland Token"), symbol ("RUM"), and mints an initial supply of 2 billion tokens to the deployer's address. It also sets up the deployer with the default admin role.

### `supportsInterface(bytes4 interfaceId)`

Overrides the `supportsInterface` function to correctly indicate supported interfaces including ERC165 and AccessControl.

### `disableTransferFromSupervision()`

Enables an admin to permanently disable the supervision of transfers, rendering all transfers unrestricted indefinitely.

### `addSupervisedTransferFromRole(address account)`

Grants the `SUPERVISED_TRANSFER_FROM_ROLE` to an account, allowing it to execute supervised transfers.

### `transfer(address recipient, uint256 amount)`

Overrides the ERC20 `transfer` function to include anti-bot measures.

### `transferFrom(address sender, address recipient, uint256 amount)`

Overrides the ERC20 `transferFrom` function to enforce transfer supervision and include anti-bot measures.

## Deployment with Thirdweb CLI

Deploying the RUM Token smart contract is straightforward with the Thirdweb CLI. Here's a step-by-step guide to get your contract live:

1. **Install Thirdweb CLI**: First, ensure that you have Node.js installed on your system. Then, open your terminal and run the following command to install the Thirdweb CLI globally:
   ```
   npm install -g @thirdweb-dev/cli
   ```
   This command makes the Thirdweb CLI available from any directory in your terminal.

2. **Log in to Thirdweb**: Once the CLI is installed, you need to log in to your Thirdweb account. If you don't have an account, you'll be prompted to create one. Run:
   ```
   thirdweb login
   ```
   Follow the instructions on your screen to authenticate.


3. **Deploy your contract**: Now that your project is set up, you can deploy your RUM Token smart contract. Make sure your contract files are in the `contracts` directory of your project. Then, run:
   ```
   thirdweb deploy
   ```
   You'll be prompted to select the contract you wish to deploy. Choose your RUM Token contract. The CLI will then compile your contract (if it hasn't been compiled yet) and deploy it to the blockchain network you select.

## Running Tests


1. **Install Dependencies**: If you haven't already, make sure to install the necessary dependencies for testing by running:
   ```
   yarn install
   ```

2. **Run Tests**: Open your terminal and execute the following command from the root of your project:
   ```
   npx hardhat test
   ```
   This command will compile your smart contracts (if they haven't been compiled yet) and run the test cases found in the `test` directory.







