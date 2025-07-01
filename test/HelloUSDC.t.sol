// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {HelloUSDC} from "../src/HelloUSDC.sol";
import "wormhole-sdk/testing/WormholeRelayerTest.sol";
import "wormhole-sdk/interfaces/token/IERC20.sol";
import "forge-std/Test.sol";
import "forge-std/console.sol";

contract HelloUSDCTest is WormholeRelayerTest {
    uint16 private constant SOURCE_CHAIN_ID = CHAIN_ID_ETHEREUM;
    uint16 private constant TARGET_CHAIN_ID = CHAIN_ID_AVALANCHE;

    HelloUSDC public helloSource;
    IERC20 public sourceUsdc;

    function setUp() public override {
        // Set up forks
        setUpFork(SOURCE_CHAIN_ID);
        setUpFork(TARGET_CHAIN_ID);

        // Deploy on source chain
        selectFork(SOURCE_CHAIN_ID);
        sourceUsdc = usdc();
        
        helloSource = new HelloUSDC(
            address(wormholeRelayer()),
            address(cctpMessageTransmitter()),
            address(cctpTokenMessenger()),
            address(sourceUsdc)
        );
    }

    function testQuoteCrossChainDeposit() public {
        selectFork(SOURCE_CHAIN_ID);
        
        uint256 cost = helloSource.quoteCrossChainDeposit(TARGET_CHAIN_ID);
        assertGt(cost, 0, "Cost should be greater than 0");
    }

    function testSendCrossChainDeposit() public {
        selectFork(SOURCE_CHAIN_ID);
        
        uint256 amount = 100e6; // 100 USDC
        address recipient = makeAddr("recipient");
        address targetContract = makeAddr("targetContract");
        
        // Get some USDC
        dealUsdc(address(this), amount);
        
        // Approve HelloUSDC to spend USDC
        sourceUsdc.approve(address(helloSource), amount);
        
        // Get quote
        uint256 cost = helloSource.quoteCrossChainDeposit(TARGET_CHAIN_ID);
        
        // Ensure we have enough ETH
        vm.deal(address(this), cost);
        
        // Check initial balance
        uint256 initialBalance = sourceUsdc.balanceOf(address(this));
        
        // Record logs to capture the CCTP burn
        vm.recordLogs();
        
        // Send cross-chain deposit
        helloSource.sendCrossChainDeposit{value: cost}(
            TARGET_CHAIN_ID,
            targetContract,
            recipient,
            amount
        );
        
        // Verify USDC was transferred from sender
        assertEq(
            sourceUsdc.balanceOf(address(this)), 
            initialBalance - amount,
            "USDC should be transferred from sender"
        );
        
        // Verify CCTP burn occurred by checking logs
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool burnFound = false;
        for (uint i = 0; i < logs.length; i++) {
            // Look for DepositForBurn event
            if (logs[i].topics[0] == keccak256("DepositForBurn(uint64,address,uint256,address,bytes32,uint32,bytes32,bytes32)")) {
                burnFound = true;
                break;
            }
        }
        assertTrue(burnFound, "CCTP burn should have occurred");
    }

    function testSendCrossChainDepositInsufficientPayment() public {
        selectFork(SOURCE_CHAIN_ID);
        
        uint256 amount = 100e6;
        address recipient = makeAddr("recipient");
        address targetContract = makeAddr("targetContract");
        
        dealUsdc(address(this), amount);
        sourceUsdc.approve(address(helloSource), amount);
        
        uint256 cost = helloSource.quoteCrossChainDeposit(TARGET_CHAIN_ID);
        
        // Try to send with insufficient payment
        vm.expectRevert("msg.value must be at least quoteCrossChainDeposit(targetChain)");
        helloSource.sendCrossChainDeposit{value: cost - 1}(
            TARGET_CHAIN_ID,
            targetContract,
            recipient,
            amount
        );
    }

    function testSendCrossChainDepositUnsupportedChain() public {
        selectFork(SOURCE_CHAIN_ID);
        
        uint256 amount = 100e6;
        address recipient = makeAddr("recipient");
        address targetContract = makeAddr("targetContract");
        uint16 unsupportedChain = 999; // Non-existent chain
        
        dealUsdc(address(this), amount);
        sourceUsdc.approve(address(helloSource), amount);
        
        uint256 cost = helloSource.quoteCrossChainDeposit(unsupportedChain);
        vm.deal(address(this), cost);
        
        vm.expectRevert("Unsupported target chain");
        helloSource.sendCrossChainDeposit{value: cost}(
            unsupportedChain,
            targetContract,
            recipient,
            amount
        );
    }
}
