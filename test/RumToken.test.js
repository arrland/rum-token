const chai = require("chai");
// Ensure ethers is correctly imported at the top of your file
const { ethers } = require("hardhat");


const hre = require("hardhat");
const { expect } = chai;


describe("RumToken", function () {
  let RumToken;
  let rumToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let multisigWallet;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    RumToken = await hre.ethers.getContractFactory("RumToken");
    [owner, addr1, addr2, multisigWallet, ...addrs] = await hre.ethers.getSigners();
    rumToken = await RumToken.deploy(multisigWallet.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
        const DEFAULT_ADMIN_ROLE = await rumToken.DEFAULT_ADMIN_ROLE();
        expect(await rumToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should assign the total supply of tokens to the multisig wallet", async function () {
      const multisigWalletBalance = await rumToken.balanceOf(multisigWallet.address);
      expect(await rumToken.totalSupply()).to.equal(multisigWalletBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from multisig wallet to addr1
      await rumToken.connect(multisigWallet).transfer(addr1.address, hre.ethers.parseEther("50"));
      const addr1Balance = await rumToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(hre.ethers.parseEther("50"));
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialMultisigWalletBalance = await rumToken.balanceOf(multisigWallet.address);

      // Try to send 1 token from addr1 (0 tokens) to multisig wallet.
      // `require` will evaluate false and revert the transaction.
      await expect(
        rumToken.connect(addr1).transfer(multisigWallet.address, hre.ethers.parseEther("1"))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Multisig wallet balance shouldn't have changed.
      expect(await rumToken.balanceOf(multisigWallet.address)).to.equal(initialMultisigWalletBalance);
    });

    it("Cannot transfer to the zero address", async function () {
      await expect(
        rumToken.connect(multisigWallet).transfer(ethers.ZeroAddress, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });
  });

  describe("Burning", function () {
    it("Should burn tokens correctly", async function () {
      await rumToken.connect(multisigWallet).transfer(owner.address, hre.ethers.parseEther("100"));
      const initialOwnerBalance = await rumToken.balanceOf(owner.address);      
      await rumToken.burn(BigInt(ethers.parseEther("100").toString()));      
      const finalOwnerBalance = await rumToken.balanceOf(owner.address);      
      expect(BigInt(finalOwnerBalance.toString())).to.equal(initialOwnerBalance - BigInt(ethers.parseEther("100").toString()));
    });
    it("Allows a third party to burn owner's tokens when approved", async function () {
      await rumToken.connect(multisigWallet).transfer(owner.address, hre.ethers.parseEther("50"));
      const initialOwnerBalance = await rumToken.balanceOf(owner.address);
      const burnAmount = BigInt(ethers.parseEther("50").toString());
  
      // Owner approves addr1 to burn tokens on their behalf
      await rumToken.approve(addr1.address, burnAmount);
  
      // addr1 burns tokens from owner's balance
      await rumToken.connect(addr1).burnFrom(owner.address, burnAmount);
  
      const finalOwnerBalance = await rumToken.balanceOf(owner.address);
      expect(BigInt(finalOwnerBalance.toString())).to.equal(initialOwnerBalance - burnAmount);
  
      const totalSupplyAfterBurn = await rumToken.totalSupply();
      expect(BigInt(totalSupplyAfterBurn.toString())).to.equal(BigInt("1999999950000000000000000000"));
    });
  });

  describe("Role Management", function () {
    it("Should grant role correctly", async function () {
      const role = hre.ethers.keccak256(Buffer.from('NEW_ROLE'));
      await rumToken.grantRole(role, addr1.address);
      expect(await rumToken.hasRole(role, addr1.address)).to.be.true;
    });

    it("Should revoke role correctly", async function () {
      const role = hre.ethers.keccak256(Buffer.from('EXISTING_ROLE'));
      await rumToken.grantRole(role, addr1.address);
      await rumToken.revokeRole(role, addr1.address);
      expect(await rumToken.hasRole(role, addr1.address)).to.be.false;
    });
  });

});

describe("RumToken Supervised Transfer From", function () {
    let RumToken, rumToken;
    let owner, addr1, addr2, multisigWallet, addrs;

    beforeEach(async function () {
        // Deploy RumToken contract
        RumToken = await ethers.getContractFactory("RumToken");
        [owner, addr1, addr2, multisigWallet, ...addrs] = await ethers.getSigners();
        rumToken = await RumToken.deploy(multisigWallet.address);
        await rumToken.connect(multisigWallet).transfer(owner.address, hre.ethers.parseEther("200"));

    });

    it("Should start with transferFrom supervision enabled", async function () {
        expect(await rumToken.transferFromSupervisionEnabled()).to.equal(true);
    });

    it("Should correctly remove SUPERVISED_TRANSFER_FROM_ROLE and revoke permissions", async function () {
      // Grant SUPERVISED_TRANSFER_FROM_ROLE to addr1
      await rumToken.addSupervisedTransferFromRole(addr1.address);
      expect(await rumToken.hasRole(await rumToken.SUPERVISED_TRANSFER_FROM_ROLE(), addr1.address)).to.equal(true);

      // Ensure addr1 can perform a supervised transferFrom operation
      // First, owner approves addr1 to spend
      await rumToken.connect(owner).approve(addr1.address, ethers.parseEther("10"));
      // Then, addr1 transfers from owner to addr2 under supervision
      await expect(
          rumToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("10"))
      ).to.emit(rumToken, 'Transfer').withArgs(owner.address, addr2.address, ethers.parseEther("10"));

      // Now, remove the SUPERVISED_TRANSFER_FROM_ROLE from addr1
      await rumToken.revokeRole(await rumToken.SUPERVISED_TRANSFER_FROM_ROLE(), addr1.address);
      expect(await rumToken.hasRole(await rumToken.SUPERVISED_TRANSFER_FROM_ROLE(), addr1.address)).to.equal(false);

      // Attempting the same transferFrom operation should now fail due to lack of permissions
      await expect(
          rumToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("RumToken: Transfer from are currently supervised");
    });

    it("Restricts `transferFrom` under supervision mode", async function () {
      // Owner approves addr1 to spend on their behalf
      await rumToken.connect(addr1).approve(addr2.address, ethers.parseEther("100"));

      // Ensure transfer supervision is disabled
      expect(await rumToken.transferFromSupervisionEnabled()).to.equal(true);

      // addr1 uses `transferFrom` to transfer tokens from owner to addr2
      // This should fail because transfer supervision is disabled
      await expect(
          rumToken.connect(addr2).transferFrom(addr1.address, addr2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("RumToken: Transfer from are currently supervised");
    });

    it("Allows admin to disable transferFrom supervision exactly once", async function () {
        // Disable transferFrom supervision
        await rumToken.disableTransferFromSupervision();
        expect(await rumToken.transferFromSupervisionEnabled()).to.equal(false);

        // Attempt to disable transferFrom supervision again should fail
        await expect(rumToken.disableTransferFromSupervision()).to.be.revertedWith("RumToken: Transfer supervision is already disabled");
    });

    it("Prevents non-admins from disabling transferFrom supervision", async function () {
        // Attempt to disable transferFrom supervision from a non-admin account
        await expect(rumToken.connect(addr1).disableTransferFromSupervision()).to.be.revertedWith("RumToken: Caller is not an admin");
    });

    it("Allows admin to add supervised transfer from role", async function () {
        // Admin adds addr1 to SUPERVISED_TRANSFER_FROM_ROLE
        await rumToken.addSupervisedTransferFromRole(addr1.address);

        // Check if addr1 has the SUPERVISED_TRANSFER_FROM_ROLE
        expect(await rumToken.hasRole(await rumToken.SUPERVISED_TRANSFER_FROM_ROLE(), addr1.address)).to.equal(true);
    });
    it("Prevents non-admins from adding supervised transfer from role", async function () {
        // Attempt by addr2 to add addr1 to SUPERVISED_TRANSFER_FROM_ROLE should fail
        await expect(rumToken.connect(addr2).addSupervisedTransferFromRole(addr1.address)).to.be.revertedWith("RumToken: Caller is not an admin");
    });

    it("Allows transfers under supervision mode by accounts with SUPERVISED_TRANSFER_FROM_ROLE", async function () {
        // Admin adds addr1 to SUPERVISED_TRANSFER_FROM_ROLE
        await rumToken.addSupervisedTransferFromRole(addr1.address);

        // Owner approves addr1 to spend on their behalf
        await rumToken.connect(owner).approve(addr1.address, ethers.parseEther("100"));

        // Ensure transfer supervision is enabled
        expect(await rumToken.transferFromSupervisionEnabled()).to.equal(true);

        // addr1 uses `transferFrom` to transfer tokens from owner to addr2 under supervision
        // This should succeed because addr1 has the SUPERVISED_TRANSFER_FROM_ROLE
        await expect(
            rumToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("10"))
        ).to.emit(rumToken, 'Transfer').withArgs(owner.address, addr2.address, ethers.parseEther("10"));
    });

});

describe("RumToken AntiBot Integration", function () {
    let RumToken, rumToken;
    let owner, addr1, addr2, multisigWallet, addrs;

    beforeEach(async function () {
        // Deploy RumToken contract with AntiBot functionality
        RumToken = await ethers.getContractFactory("RumToken");
        [owner, addr1, addr2, multisigWallet, ...addrs] = await ethers.getSigners();      
        rumToken = await RumToken.deploy(multisigWallet.address);        
        await rumToken.connect(multisigWallet).transfer(owner.address, hre.ethers.parseEther("300"));
    });

    it("Allows admin to add BOT_ROLE to an account", async function () {
        // Admin adds BOT_ROLE to addr1
        await rumToken.connect(owner).grantRole(await rumToken.BOT_ROLE(), addr1.address);

        // Check if addr1 has the BOT_ROLE
        expect(await rumToken.hasRole(await rumToken.BOT_ROLE(), addr1.address)).to.equal(true);
    });

    it("Prevents non-admins from adding BOT_ROLE to an account", async function () {
        // Attempt by addr2 to add BOT_ROLE to addr1 should fail
        const BOT_ROLE = await rumToken.BOT_ROLE();
        await expect(rumToken.connect(addr2).grantRole(BOT_ROLE, addr1.address)).to.be.revertedWith("AccessControl: account " + addr2.address.toLowerCase() + " is missing role 0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should allow normal transfers", async function () {
        await rumToken.transfer(addr1.address, ethers.parseEther("100"));
        expect(await rumToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should block or flag rapid transactions (simulate AntiBot behavior)", async function () {
        // Adjust antiBotDepth to 1 block to easily trigger throttling
        await rumToken.connect(owner).setAntiBotDepth(1);
        expect(await rumToken.isAntibotEnabled()).to.equal(true);
    
        // Ensure addr1 and addr2 do not have the BOT_ROLE
        const BOT_ROLE = await rumToken.BOT_ROLE();
        expect(await rumToken.hasRole(BOT_ROLE, addr1.address)).to.equal(false);
        expect(await rumToken.hasRole(BOT_ROLE, addr2.address)).to.equal(false);
    
        const transferAmount = ethers.parseEther("200");
        await rumToken.connect(owner).transfer(addr1.address, transferAmount); // Transfer enough tokens to addr1
    
        // Disable automatic mining to control when the block gets mined
        await network.provider.send("evm_setAutomine", [false]);
    
        // Send the first transaction without waiting for it to be mined
        const tx1 = rumToken.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));

        // Send the second transaction, also without waiting for it to be mined
        const tx2 = rumToken.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));

        // Manually mine a block to include both transactions
        await network.provider.send("evm_mine");

        // Re-enable automatic mining after the test case
        await network.provider.send("evm_setAutomine", [true]);

        // Now, await the transactions and check their outcomes
        await expect(tx1).to.emit(rumToken, 'Transfer');
        await expect(tx2).to.be.revertedWith("Antibot: Transaction throttled");
    });

    it("Should allow rapid transactions when AntiBot is disabled", async function () {
        // Disable AntiBot mechanism
        await rumToken.connect(owner).toggleAntibot();
        expect(await rumToken.isAntibotEnabled()).to.equal(false);

        // Ensure addr1 and addr2 do not have the BOT_ROLE
        const BOT_ROLE = await rumToken.BOT_ROLE();
        expect(await rumToken.hasRole(BOT_ROLE, addr1.address)).to.equal(false);
        expect(await rumToken.hasRole(BOT_ROLE, addr2.address)).to.equal(false);

        const transferAmount = ethers.parseEther("200");
        await rumToken.connect(owner).transfer(addr1.address, transferAmount); // Transfer enough tokens to addr1

        // Disable automatic mining to control when the block gets mined
        await network.provider.send("evm_setAutomine", [false]);

        // Send the first transaction without waiting for it to be mined
        const tx1 = rumToken.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));

        // Send the second transaction, also without waiting for it to be mined
        const tx2 = rumToken.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));

        // Manually mine a block to include both transactions
        await network.provider.send("evm_mine");

        // Re-enable automatic mining after the test case
        await network.provider.send("evm_setAutomine", [true]);

        // Now, await the transactions and check their outcomes
        await expect(await tx1).to.emit(rumToken, 'Transfer');
        await expect(await tx2).to.emit(rumToken, 'Transfer');
    });

    it("Allows admin to toggle AntiBot mechanism", async function () {
        // Initially, AntiBot should be enabled
        expect(await rumToken.isAntibotEnabled()).to.equal(true);

        // Admin disables AntiBot
        await rumToken.toggleAntibot();
        expect(await rumToken.isAntibotEnabled()).to.equal(false);

        // Admin re-enables AntiBot
        await rumToken.toggleAntibot();
        expect(await rumToken.isAntibotEnabled()).to.equal(true);
    });

    it("Prevents non-admins from toggling AntiBot mechanism", async function () {
        // Attempt to disable AntiBot from a non-admin account should fail
        await expect(rumToken.connect(addr1).toggleAntibot()).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role 0x0000000000000000000000000000000000000000000000000000000000000000");
    });
});